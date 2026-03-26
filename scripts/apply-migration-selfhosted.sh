#!/usr/bin/env bash
# استخدام على Linux/VPS داخل مجلد supabase/docker:
#   bash /path/to/apply-migration-selfhosted.sh /path/to/20250326120000_email_then_otp.sql
set -euo pipefail
SQL_FILE="${1:?Usage: $0 /path/to/20250326120000_email_then_otp.sql}"
docker compose exec -T db psql -U postgres -d postgres < "$SQL_FILE"
