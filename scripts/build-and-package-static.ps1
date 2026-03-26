#Requires -Version 5.1
<#
  Production build of the onboarding SPA + timestamped zip for shared hosting (Hostinger File Manager / FTP).
  Prefers an output directory on a drive with enough free space (e.g. D:\ or E:\ when C: is tight).

  Usage:
    .\scripts\build-and-package-static.ps1
    .\scripts\build-and-package-static.ps1 -OutputDir "D:\deploy-artifacts"
    .\scripts\build-and-package-static.ps1 -SkipZip
    .\scripts\build-and-package-static.ps1 -ArabicUI
#>
param(
  [string]$OutputDir = "",
  [switch]$SkipZip,
  [switch]$SkipPreflight,
  [switch]$ArabicUI
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not $SkipPreflight) {
  & (Join-Path $Root "scripts\preflight.ps1") -MinFreeSpaceMB 100 -ArabicUI:$ArabicUI
}

$web = Join-Path $Root "web"
Push-Location $web
if (-not (Test-Path "node_modules")) {
  npm ci
}
npm run build
if (-not (Test-Path "dist\index.html")) {
  if ($ArabicUI) { Write-Error "فشل البناء: لا يوجد web/dist/index.html" }
  else { Write-Error "Build failed: web/dist/index.html missing." }
}
Pop-Location

if ($ArabicUI) { Write-Host "اكتمل البناء: $web\dist" -ForegroundColor Green }
else { Write-Host "Build OK: $web\dist" -ForegroundColor Green }

if ($SkipZip) { exit 0 }

if (-not $OutputDir) {
  $cFree = [math]::Round((Get-PSDrive C).Free / 1MB, 0)
  if ($cFree -ge 500) {
    $OutputDir = Join-Path $Root "build"
  } elseif ((Get-PSDrive D -ErrorAction SilentlyContinue) -and ((Get-PSDrive D).Free / 1MB -ge 50)) {
    $OutputDir = "D:\hyperswitch-onboarding-artifacts"
  } elseif ((Get-PSDrive E -ErrorAction SilentlyContinue) -and ((Get-PSDrive E).Free / 1MB -ge 50)) {
    $OutputDir = "E:\hyperswitch-onboarding-artifacts"
  } else {
    $OutputDir = Join-Path $Root "build"
  }
}

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$ts = Get-Date -Format "yyyyMMdd_HHmmss"
$zipName = "onboardingspa_$ts.zip"
$zipPath = Join-Path $OutputDir $zipName
$dist = Join-Path $web "dist"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }
Compress-Archive -Path (Join-Path $dist "*") -DestinationPath $zipPath -Force

if ($ArabicUI) {
  Write-Host "الأرشيف: $zipPath" -ForegroundColor Cyan
  Write-Host "الرفع: فك الضغط بحيث يكون index.html داخل public_html مباشرة (بدون مجلد إضافي)." -ForegroundColor Yellow
  Write-Host "في Supabase: سر PUBLIC_APP_VERIFY_URL يجب أن يطابق رابط الموقع العام (بدون / في النهاية)." -ForegroundColor Yellow
} else {
  Write-Host "Zip: $zipPath" -ForegroundColor Cyan
  Write-Host "Upload: extract so index.html sits in public_html (not inside an extra folder)." -ForegroundColor Yellow
  Write-Host "Supabase Edge secret PUBLIC_APP_VERIFY_URL must match your public site URL (no trailing slash)." -ForegroundColor Yellow
}
