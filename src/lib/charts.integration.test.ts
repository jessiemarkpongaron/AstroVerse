/**
 * Integration test: the app's chart functions against a real local Supabase (Auth + PostgREST +
 * RLS). Runs only via `npm run test:db`, which starts nothing itself — run `npx supabase start`.
 */
import { createClient } from '@supabase/supabase-js';
import type { BirthInput } from './astro/types.ts';
import { ChartsError, deleteAccount, deleteChart, listCharts, saveChart } from './charts.ts';
import type { Database } from './database.types.ts';
import type { AppSupabaseClient } from './supabase.ts';

// Read Node env without requiring Node types in the browser tsconfig.
const env =
  (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};
const URL = env.SUPABASE_TEST_URL;
const ANON = env.SUPABASE_TEST_ANON_KEY;
const SERVICE = env.SUPABASE_TEST_SERVICE_KEY;

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

describe.skipIf(!URL || !ANON || !SERVICE)('charts against local Supabase', () => {
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  // Created lazily: describe bodies run during collection even when the suite is skipped.
  let adminClient: AppSupabaseClient | null = null;
  const admin = () =>
    (adminClient ??= createClient<Database>(URL as string, SERVICE as string, opts));
  const run = Date.now();
  const users: string[] = [];

  async function signedInClient(name: string): Promise<AppSupabaseClient> {
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
    const { error: signInError } = await client.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    return client;
  }

  afterAll(async () => {
    for (const id of users) await admin().auth.admin.deleteUser(id);
  });

  it('save → list → isolate between users → delete (with readings cascade)', async () => {
    const alice = await signedInClient('alice');
    const bob = await signedInClient('bob');

    const mine = await saveChart(alice, input, {
      label: 'Me',
      isSelf: true,
      consentConfirmed: false,
    });
    const friend = await saveChart(
      alice,
      { ...input, time: null, timeAccuracy: 'unknown' },
      { label: 'Mama', isSelf: false, consentConfirmed: true },
    );
    expect(mine.birth_time).toBe('15:30:00');
    expect(friend.birth_time).toBeNull();

    const aliceCharts = await listCharts(alice);
    expect(aliceCharts.map((c) => c.label)).toEqual(['Me', 'Mama']); // "Me" first
    expect(await listCharts(bob)).toEqual([]);

    // A second "Me" chart is rejected with a friendly message.
    await expect(
      saveChart(alice, input, { label: 'Me again', isSelf: true, consentConfirmed: false }),
    ).rejects.toThrow(/already have a chart marked as your own/);

    // Bob deleting Alice's chart has no effect.
    await deleteChart(bob, mine.id);
    expect(await listCharts(alice)).toHaveLength(2);

    // A reading written by the service role (Edge Function path) is visible to Alice only,
    // and is removed when the chart is deleted.
    const { error: rErr } = await admin()
      .from('readings')
      .insert({
        chart_id: mine.id,
        kind: 'natal',
        input_hash: 'a'.repeat(64),
        content: { summary: 'test' },
        model: 'test',
        prompt_version: 'v1',
      });
    expect(rErr).toBeNull();
    expect((await alice.from('readings').select('id')).data).toHaveLength(1);
    expect((await bob.from('readings').select('id')).data).toHaveLength(0);
    const { error: writeErr } = await alice.from('readings').insert({
      chart_id: mine.id,
      kind: 'career',
      input_hash: 'b'.repeat(64),
      content: {},
      model: 'x',
      prompt_version: 'v1',
    });
    expect(writeErr?.code).toBe('42501');

    await deleteChart(alice, mine.id);
    expect((await listCharts(alice)).map((c) => c.label)).toEqual(['Mama']);
    const { data: left } = await admin().from('readings').select('id').eq('chart_id', mine.id);
    expect(left).toEqual([]);
  });

  it('signed-out (anon) clients cannot read or write charts', async () => {
    const anon = createClient<Database>(URL as string, ANON as string, opts);
    await expect(listCharts(anon)).rejects.toBeInstanceOf(ChartsError);
    await expect(
      saveChart(anon, input, { label: 'X', isSelf: true, consentConfirmed: false }),
    ).rejects.toBeInstanceOf(ChartsError);
  });

  it('deleteAccount removes the user and their charts, signs out, and leaves others alone', async () => {
    const erin = await signedInClient('erin');
    const frank = await signedInClient('frank');
    const erinId = (await erin.auth.getUser()).data.user?.id as string;
    await saveChart(erin, input, { label: 'Me', isSelf: true, consentConfirmed: false });
    await saveChart(frank, input, { label: 'Me', isSelf: true, consentConfirmed: false });

    await deleteAccount(erin);

    expect((await erin.auth.getSession()).data.session).toBeNull();
    const { data: gone } = await admin().auth.admin.getUserById(erinId);
    expect(gone.user).toBeNull();
    const { data: charts } = await admin().from('charts').select('id').eq('user_id', erinId);
    expect(charts).toEqual([]);
    expect(await listCharts(frank)).toHaveLength(1);
  });
});
