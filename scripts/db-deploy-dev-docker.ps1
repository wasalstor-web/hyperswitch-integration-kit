# يشغّل Postgres التجريبي ثم يطبّق كل هجرات Prisma (من جذر المستودع)
# متطلبات: Docker Desktop يعمل
# الاستخدام: .\scripts\db-deploy-dev-docker.ps1

$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

Write-Host "تشغيل docker-compose.dev.yml ..."
docker compose -f docker-compose.dev.yml up -d
if ($LASTEXITCODE -ne 0) {
  Write-Error "فشل تشغيل Docker. شغّل Docker Desktop ثم أعد المحاولة."
}

$env:DATABASE_URL = "postgresql://app:app@127.0.0.1:5433/onboarding"
Write-Host "تطبيق الهجرات: $env:DATABASE_URL"
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
  Write-Error "فشل prisma migrate deploy"
}

Write-Host "تم. يمكنك ضبط DATABASE_URL في .env على نفس القيمة للخادم المحلي مع Postgres."
