#!/bin/bash
# Creates a fresh local database "sd_e2e": Supabase stub -> test auth columns -> site schema -> seed.
set -e
export PGOPTIONS="--client-min-messages=warning"
HERE=$(cd "$(dirname "$0")" && pwd); ROOT=$(dirname "$HERE")
PG=${PG:-postgresql://postgres:postgres@127.0.0.1:5432}
psql "$PG/postgres" -qc "drop database if exists sd_e2e" -c "create database sd_e2e"
for f in "$ROOT/supabase/tests/00_supabase_stub.sql" "$HERE/emu_auth.sql" "$ROOT/supabase/migrations/0001_schema.sql" "$ROOT/supabase/seed.sql" "$ROOT/supabase/migrations/0003_admin_panel.sql"; do
  psql "$PG/sd_e2e" -v ON_ERROR_STOP=1 -q -f "$f" >/dev/null
done
echo "reset ok"
