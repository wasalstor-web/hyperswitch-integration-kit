#!/bin/sh
set -e
cd /app
if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi
echo "[entrypoint] prisma migrate deploy..."
npx prisma migrate deploy
exec "$@"
