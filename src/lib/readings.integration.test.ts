/**
 * Integration test: the generate-reading Edge Function end to end — real Auth, RLS, rate-limit
 * function, cache and inserts — with a mock Claude API on this machine (no API spend).
 * Runs only via `npm run test:db`, which serves the function with ANTHROPIC_BASE_URL pointed
 * at the mock started here.
 */
import { createServer, type Server } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { SECTION_IDS } from '../../supabase/functions/_shared/reading.ts';
import { sampleReading } from '../../supabase/functions/_shared/readingFixtures.ts';
import { buildChart } from './astro/chart.ts';
import type { BirthInput } from './astro/types.ts';
import { saveChart } from './charts.ts';
import type { Database } from './database.types.ts';
import { buildNatalPayload } from './interpret/buildPayload.ts';
import { ReadingError, findCachedReading, requestNatalReading } from './readings.ts';
import type { AppSupabaseClient } from './supabase.ts';

// Read Node env without requiring Node types in the browser tsconfig.
const env =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const URL = env.SUPABASE_TEST_URL;
const ANON = env.SUPABASE_TEST_ANON_KEY;
const SERVICE = env.SUPABASE_TEST_SERVICE_KEY;
const MOCK_PORT = Number(env.READING_MOCK_PORT ?? 0);

const input: BirthInput = {
  date: '1990-05-31',
  time: '15:30',
  timeAccuracy: 'exact',
  place: {
    name: 'Carrascal, Surigao del Sur, Philippines',
    lat: 9.37028,
    lon: 125.94917,
    tz: 'Asia/Manila',
  },
};
const payload = buildNatalPayload(buildChart(input));

// The first call cold-starts the function in Docker.
vi.setConfig({ testTimeout: 60_000 });

describe.skipIf(!URL || !ANON || !SERVICE || !MOCK_PORT)(
  'generate-reading against local Supabase',
  () => {
    const opts = { auth: { persistSession: false, autoRefreshToken: false } };
    let adminClient: AppSupabaseClient | null = null;
    const admin = () =>
      (adminClient ??= createClient<Database>(URL as string, SERVICE as string, opts));
    const run = Date.now();
    const users: string[] = [];
    const requests: { headers: Record<string, unknown>; body: string }[] = [];
    let server: Server;

    beforeAll(async () => {
      server = createServer((req, res) => {
        let body = '';
        req.on('data', (c: Buffer) => (body += c.toString()));
        req.on('end', () => {
          requests.push({ headers: req.headers, body });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              id: `msg_${requests.length}`,
              type: 'message',
              role: 'assistant',
              model: 'claude-opus-5-5',
              content: [{ type: 'text', text: JSON.stringify(sampleReading()) }],
              stop_reason: 'end_turn',
              stop_details: null,
              stop_sequence: null,
              usage: { input_tokens: 10, output_tokens: 10 },
            }),
          );
        });
      });
      await new Promise<void>((resolve) => server.listen(MOCK_PORT, '0.0.0.0', resolve));
    });

    afterAll(async () => {
      server.close();
      for (const id of users) await admin().auth.admin.deleteUser(id);
    });

    async function signedInClient(
      name: string,
    ): Promise<{ client: AppSupabaseClient; id: string }> {
      const email = `${name}-${run}@test.local`;
      const password = `pw-${run}-${name}`;
      const { data, error } = await admin().auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) throw error;
      users.push(data.user.id);
      const client = createClient<Database>(URL as string, ANON as string, opts);
      const { error: e2 } = await client.auth.signInWithPassword({ email, password });
      if (e2) throw e2;
      return { client, id: data.user.id };
    }

    const code = (p: Promise<unknown>) =>
      p.then(
        () => 'ok',
        (e: unknown) => (e instanceof ReadingError ? e.code : String(e)),
      );

    it('writes once, then serves from cache; other users and anon are refused', async () => {
      const alice = await signedInClient('alice');
      const chart = await saveChart(alice.client, input, {
        label: 'Me',
        isSelf: true,
        consentConfirmed: false,
      });

      expect(await findCachedReading(alice.client, chart.id, payload)).toBeNull();

      const first = await requestNatalReading(alice.client, chart.id, payload);
      expect(first.cached).toBe(false);
      expect(first.reading.sections.map((s) => s.id)).toEqual([...SECTION_IDS]);
      expect(requests).toHaveLength(1);

      // What reached "Claude": the right model and key, the guardrail prompt, and no
      // birth data or names.
      const sent = requests[0];
      // SDK 1.x sends the API key as a bearer token.
      expect(sent?.headers.authorization).toBe('Bearer test-key-not-real');
      const body = JSON.parse(sent?.body ?? '{}') as {
        model: string;
        system: string;
        fallbacks: string;
      };
      expect(body.model).toBe('claude-opus-5-5');
      expect(body.fallbacks).toBe('default');
      expect(body.system).toContain('Use ONLY the placements in the data');
      for (const secret of ['1990', '15:30', 'Carrascal', 'Manila', 'Me"', alice.id]) {
        expect(sent?.body).not.toContain(secret);
      }

      // Cached: readable through RLS, and the function answers without calling Claude again.
      expect((await findCachedReading(alice.client, chart.id, payload))?.reading).toEqual(
        first.reading,
      );
      const second = await requestNatalReading(alice.client, chart.id, payload);
      expect(second.cached).toBe(true);
      expect(requests).toHaveLength(1);

      // Bob can neither read nor generate for Alice's chart.
      const bob = await signedInClient('bob');
      expect(await findCachedReading(bob.client, chart.id, payload)).toBeNull();
      expect(await code(requestNatalReading(bob.client, chart.id, payload))).toBe('not-found');

      // Signed out: refused.
      const anon = createClient<Database>(URL as string, ANON as string, opts);
      expect(await code(requestNatalReading(anon, chart.id, payload))).toBe('unauthorized');

      // A tampered payload (time accuracy differs from the saved chart) is rejected.
      expect(
        await code(
          requestNatalReading(alice.client, chart.id, { ...payload, timeAccuracy: 'approximate' }),
        ),
      ).toBe('bad-request');
    });

    it('enforces the daily generation limit', async () => {
      const carol = await signedInClient('carol');
      const chart = await saveChart(carol.client, input, {
        label: 'Me',
        isSelf: true,
        consentConfirmed: false,
      });
      const { error } = await admin()
        .from('reading_generations')
        .insert(Array.from({ length: 20 }, () => ({ user_id: carol.id })));
      if (error) throw error;
      const before = requests.length;
      expect(await code(requestNatalReading(carol.client, chart.id, payload))).toBe('rate-limited');
      expect(requests.length).toBe(before);
    });
  },
);
