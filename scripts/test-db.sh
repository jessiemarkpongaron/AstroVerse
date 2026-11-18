#!/usr/bin/env bash
# Database + Edge Function tests against the LOCAL Supabase stack (start it first: npx supabase start).
# 1) pgTAP RLS/constraint tests  2) app data layer integration test with real users
# 3) generate-reading Edge Function end to end, with a mock Claude API (no API key, no spend).
set -euo pipefail
npx supabase test db
eval "$(npx supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
export SUPABASE_TEST_URL="$API_URL" SUPABASE_TEST_ANON_KEY="$ANON_KEY" SUPABASE_TEST_SERVICE_KEY="$SERVICE_ROLE_KEY"
npx vitest run src/lib/charts.integration.test.ts

# The function runs in Docker; it reaches the mock (started by the test) via the network gateway.
PROJECT_ID=$(sed -n 's/^project_id = "\(.*\)"/\1/p' supabase/config.toml)
GATEWAY=$(docker network inspect "supabase_network_${PROJECT_ID}" -f '{{range .IPAM.Config}}{{.Gateway}}{{end}}')
export READING_MOCK_PORT=54399
ENV_FILE=$(mktemp)
LOG_FILE=$(mktemp)
printf 'ANTHROPIC_API_KEY=test-key-not-real\nANTHROPIC_BASE_URL=http://%s:%s\n' "$GATEWAY" "$READING_MOCK_PORT" >"$ENV_FILE"
# Own process group, so the whole npx → supabase tree stops on exit (and its container with it).
setsid npx supabase functions serve --env-file "$ENV_FILE" >"$LOG_FILE" 2>&1 &
SERVE_PID=$!
cleanup() {
  kill -- -"$SERVE_PID" 2>/dev/null || true
  wait "$SERVE_PID" 2>/dev/null || true
  rm -f "$ENV_FILE"
}
trap cleanup EXIT
for _ in $(seq 1 90); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "$API_URL/functions/v1/generate-reading" || true)
  [ "$code" = "204" ] && break
  sleep 2
done
if [ "$code" != "204" ]; then
  echo "generate-reading did not start; log:"; cat "$LOG_FILE"; exit 1
fi
npx vitest run src/lib/readings.integration.test.ts || { echo "--- function log ---"; cat "$LOG_FILE"; exit 1; }
