#!/usr/bin/env bash
# Database tests against the LOCAL Supabase stack (start it first: npx supabase start).
# 1) pgTAP RLS/constraint tests  2) app data layer integration test with real users.
set -euo pipefail
npx supabase test db
eval "$(npx supabase status -o env | grep -E '^(API_URL|ANON_KEY|SERVICE_ROLE_KEY)=')"
SUPABASE_TEST_URL="$API_URL" SUPABASE_TEST_ANON_KEY="$ANON_KEY" SUPABASE_TEST_SERVICE_KEY="$SERVICE_ROLE_KEY" \
  npx vitest run src/lib/charts.integration.test.ts
