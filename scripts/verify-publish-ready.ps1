#Requires -Version 5.1
<#
  فحوصات قبل النشر المستقل: تجاهل الأسرار، ترخيص، عدم تتبع ملفات حساسة، وبناء اختياري بقيم قالبية.

  Usage:
    .\scripts\verify-publish-ready.ps1
    .\scripts\verify-publish-ready.ps1 -SkipBuild
    .\scripts\verify-publish-ready.ps1 -ScanDistOnly
    .\scripts\verify-publish-ready.ps1 -ArabicUI
#>
param(
  [switch]$SkipBuild,
  [switch]$ScanDistOnly,
  [switch]$ArabicUI
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function T($ar, $en) {
  if ($ArabicUI) { return $ar }
  return $en
}

function Test-DistClean {
  $dist = Join-Path $Root "web\dist"
  if (-not (Test-Path $dist)) {
    throw (T "لا يوجد web/dist. شغّل npm run build في web أولاً." "web/dist missing. Run npm run build in web first.")
  }
  $badPat = "lwntppvnwjtkhtovcydc|sbp_[a-zA-Z0-9_]{24,}|service_role"
  Get-ChildItem $dist -Filter "*.js" -Recurse -File | ForEach-Object {
    $raw = Get-Content $_.FullName -Raw -Encoding UTF8
    if ($raw -match $badPat) {
      throw (T "سلسلة مشبوهة داخل $($_.FullName) — أعد البناء بـ VITE_* قالبية." "Suspicious pattern in $($_.FullName); rebuild with template VITE_* env.")
    }
  }
  if ($ArabicUI) { Write-Host "  dist: نظيف من أنماط تسريب واضحة." -ForegroundColor Green }
  else { Write-Host "  dist: no obvious leaked patterns." -ForegroundColor Green }
}

if ($ScanDistOnly) {
  if ($ArabicUI) { Write-Host "=== فحص dist فقط ===" -ForegroundColor Cyan }
  else { Write-Host "=== Scan dist only ===" -ForegroundColor Cyan }
  Test-DistClean
  Write-Host (T "تم." "OK.") -ForegroundColor Green
  exit 0
}

if ($ArabicUI) { Write-Host "=== جاهزية النشر ===" -ForegroundColor Cyan }
else { Write-Host "=== Publish readiness ===" -ForegroundColor Cyan }

$gitignorePath = Join-Path $Root ".gitignore"
if (-not (Test-Path $gitignorePath)) { throw ".gitignore missing" }
$gi = Get-Content $gitignorePath -Raw
$requiredIgnore = @(
  ".supabase-access-token",
  ".supabase-project-ref",
  "web/.env.local",
  "web/dist"
)
foreach ($line in $requiredIgnore) {
  if ($gi -notmatch [regex]::Escape($line)) {
    throw (T "السطر المطلوب في .gitignore مفقود: $line" ".gitignore must contain: $line")
  }
}
if ($ArabicUI) { Write-Host "  .gitignore: موافق." -ForegroundColor Green }
else { Write-Host "  .gitignore: OK." -ForegroundColor Green }

if (-not (Test-Path (Join-Path $Root "LICENSE"))) {
  throw (T "ملف LICENSE مفقود." "LICENSE file missing.")
}
if ($ArabicUI) { Write-Host "  LICENSE: موجود." -ForegroundColor Green }
else { Write-Host "  LICENSE: present." -ForegroundColor Green }

$notices = Join-Path $Root "THIRD_PARTY_NOTICES.md"
if (-not (Test-Path $notices)) {
  throw (T "THIRD_PARTY_NOTICES.md مفقود. نفّذ: npm run licenses:notices" "THIRD_PARTY_NOTICES.md missing. Run: npm run licenses:notices")
}
if ((Get-Item $notices).Length -lt 200) {
  throw (T "THIRD_PARTY_NOTICES.md يبدو فارغاً جداً." "THIRD_PARTY_NOTICES.md seems too small.")
}
if ($ArabicUI) { Write-Host "  THIRD_PARTY_NOTICES: موجود." -ForegroundColor Green }
else { Write-Host "  THIRD_PARTY_NOTICES: present." -ForegroundColor Green }

$ifaceDoc = Join-Path $Root "docs\OPEN_SOURCE_INTERFACES_AR.md"
if (-not (Test-Path $ifaceDoc)) {
  throw (T "docs/OPEN_SOURCE_INTERFACES_AR.md مفقود." "docs/OPEN_SOURCE_INTERFACES_AR.md missing.")
}
if ($ArabicUI) { Write-Host "  OPEN_SOURCE_INTERFACES_AR: موجود." -ForegroundColor Green }
else { Write-Host "  OPEN_SOURCE_INTERFACES_AR: present." -ForegroundColor Green }

if (-not (Test-Path (Join-Path $Root "web\package-lock.json"))) {
  throw (T "web/package-lock.json مفقود (مطلوب لـ npm ci في CI)." "web/package-lock.json missing (needed for npm ci).")
}
if (-not (Test-Path (Join-Path $Root "package-lock.json"))) {
  throw (T "package-lock.json في الجذر مفقود (مطلوب لـ Prisma/الجذر)." "Root package-lock.json missing (needed for root npm ci / Prisma).")
}
if ($ArabicUI) { Write-Host "  package-lock: الجذر + web موجود." -ForegroundColor Green }
else { Write-Host "  package-lock: root + web present." -ForegroundColor Green }

$gitDir = Join-Path $Root ".git"
if (Test-Path $gitDir) {
  Push-Location $Root
  try {
    $forbidden = @(".supabase-access-token", ".supabase-project-ref", "web/.env.local")
    foreach ($path in $forbidden) {
      $tracked = & git ls-files -- $path 2>$null
      if ($tracked) {
        throw (T "ملف حساس مُتتبَّع في git (يجب إزالته من الفهرس): $path" "Sensitive file is tracked by git: $path")
      }
    }
  }
  finally {
    Pop-Location
  }
  if ($ArabicUI) { Write-Host "  git: لا ملفات أسرار في الفهرس." -ForegroundColor Green }
  else { Write-Host "  git: no secret files tracked." -ForegroundColor Green }
}
else {
  if ($ArabicUI) { Write-Host "  git: غير مستخدم — تخطي فحص التتبع." -ForegroundColor DarkGray }
  else { Write-Host "  git: not a repo — skip tracked-files check." -ForegroundColor DarkGray }
}

if (-not $SkipBuild) {
  if ($ArabicUI) { Write-Host "  بناء الواجهة بقيم قالبية..." -ForegroundColor Cyan }
  else { Write-Host "  Building web with template env..." -ForegroundColor Cyan }
  $env:VITE_SUPABASE_URL = "https://YOUR_PROJECT.supabase.co"
  $env:VITE_SUPABASE_ANON_KEY = ""
  Push-Location (Join-Path $Root "web")
  try {
    npm run build
  }
  finally {
    Pop-Location
  }
  Test-DistClean
}

if ($ArabicUI) { Write-Host "`nجاهزية النشر: اكتملت الفحوصات." -ForegroundColor Green }
else { Write-Host "`nPublish readiness checks passed." -ForegroundColor Green }
