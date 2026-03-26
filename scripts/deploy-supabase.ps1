#Requires -Version 5.1
<#
  ينشر الـ migration والدوال إلى مشروع Supabase السحابي.
  مطلوب: رمز وصول من https://supabase.com/dashboard/account/tokens

  الاستخدام:
    $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
    .\scripts\deploy-supabase.ps1

  مرجع المشروع (إلزامي):
    $env:SUPABASE_PROJECT_REF = "your_project_ref"
    # أو انسخ .supabase-project-ref.example إلى .supabase-project-ref وعدّل القيمة (سطر واحد، غير مُدَرَّج في git)
#>
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

$tokenFile = Join-Path $Root ".supabase-access-token"
if (-not $env:SUPABASE_ACCESS_TOKEN -and (Test-Path $tokenFile)) {
  $env:SUPABASE_ACCESS_TOKEN = (Get-Content $tokenFile -Raw).Trim()
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "التحقق من جلسة CLI (بعد npx supabase login)..." -ForegroundColor DarkGray
  npx --yes supabase projects list 2>$null | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "مطلوب رمز وصول. أحد الخيارات:" -ForegroundColor Red
    Write-Host "  1) ملف .supabase-access-token في جذر المشروع (سطر واحد = الرمز)" -ForegroundColor Yellow
    Write-Host "  2) `$env:SUPABASE_ACCESS_TOKEN = 'sbp_...'" -ForegroundColor Yellow
    Write-Host "  3) مرة واحدة: npx supabase login --token 'sbp_...'" -ForegroundColor Yellow
    Write-Host "  الرمز من: https://supabase.com/dashboard/account/tokens" -ForegroundColor Yellow
    exit 1
  }
  Write-Host "استخدام تسجيل الدخول المحفوظ في Supabase CLI." -ForegroundColor Cyan
}

$refFile = Join-Path $Root ".supabase-project-ref"
$ref = $env:SUPABASE_PROJECT_REF
if (-not $ref -and (Test-Path $refFile)) {
  $ref = (Get-Content $refFile -Raw).Trim()
}
if (-not $ref) {
  Write-Host "مطلوب مرجع المشروع (project ref). أحد الخيارين:" -ForegroundColor Red
  Write-Host "  1) انسخ .supabase-project-ref.example إلى .supabase-project-ref وضع الـ ref في سطر واحد" -ForegroundColor Yellow
  Write-Host "  2) أو: `$env:SUPABASE_PROJECT_REF = 'xxxxxxxx'" -ForegroundColor Yellow
  Write-Host "  الـ ref من: لوحة Supabase → Project Settings → General" -ForegroundColor Yellow
  exit 1
}

Write-Host "ربط المشروع: $ref" -ForegroundColor Cyan
npx --yes supabase link --project-ref $ref

Write-Host "دفع الـ migrations..." -ForegroundColor Cyan
npx --yes supabase db push

Write-Host "نشر كل Edge Functions..." -ForegroundColor Cyan
npx --yes supabase functions deploy

Write-Host @"

تم. اضبط الأسرار من لوحة Supabase - Edge Functions - Secrets (أو CLI):
  supabase secrets set --project-ref $ref PUBLIC_APP_VERIFY_URL="https://your-app/verify-email"
  # اختياري: بوابة رسائل
  # supabase secrets set --project-ref $ref MESSAGE_GATEWAY_URL="..." MESSAGE_GATEWAY_KEY="..."
  # تطوير فقط (لا للإنتاج):
  # supabase secrets set --project-ref $ref DANGEROUS_RETURN_TOKEN=true DANGEROUS_RETURN_OTP=true

"@ -ForegroundColor Green
