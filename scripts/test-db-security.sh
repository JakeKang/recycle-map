#!/usr/bin/env bash
set -euo pipefail

: "${DATABASE_URL:?DATABASE_URL is required}"

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/test-db-bootstrap.sql
for migration in supabase/migrations/*.sql; do
  if [[ "$(basename "$migration")" == "20260901090000_security_hardening.sql" ]]; then
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/test-db-pre-hardening.sql
  fi
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$migration"
done
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/verify-db-security.sql
