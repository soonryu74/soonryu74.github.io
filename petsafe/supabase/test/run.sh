#!/usr/bin/env bash
# 로컬 PostgreSQL에 마이그레이션·시드를 적용하고 RLS 테스트를 실행한다.
# 사용: npm run db:test   (PGUSER/PGHOST 등 표준 libpq 환경변수를 존중한다)
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="${PETSAFE_TEST_DB:-petsafe_test}"
PSQL="${PSQL:-psql}"
run() { $PSQL -v ON_ERROR_STOP=1 -q -d "$DB" -f "$1"; }
$PSQL -v ON_ERROR_STOP=1 -q -d postgres -c "drop database if exists $DB" -c "create database $DB"
run supabase/test/local_auth_shim.sql
for f in supabase/migrations/0001_core.sql supabase/migrations/0002_content_legal.sql supabase/migrations/0003_insurance_facilities.sql; do
  echo "apply $f"; run "$f"
done
# 0004_storage.sql 은 Supabase Storage 스키마가 필요해 로컬에서는 건너뛴다.
if [ -f supabase/seed.sql ]; then echo "apply supabase/seed.sql"; run supabase/seed.sql; fi
echo "run supabase/test/rls.test.sql"; run supabase/test/rls.test.sql
