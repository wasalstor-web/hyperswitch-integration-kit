#Requires -Version 5.1
<#
  Builds web + self-hosted function bundle; deploys to Supabase cloud if SUPABASE_ACCESS_TOKEN or .supabase-access-token exists.

  Usage:
    .\scripts\complete-setup.ps1
    .\scripts\complete-setup.ps1 -SkipSupabase
    .\scripts\complete-setup.ps1 -StartMockGateway
    .\scripts\complete-setup.ps1 -SkipPreflight
#>
param(
  [switch]$SkipSupabase,
  [switch]$StartMockGateway,
  [switch]$SkipPreflight
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

if (-not $SkipPreflight) {
  & (Join-Path $Root "scripts\preflight.ps1") -MinFreeSpaceMB 100
}

Write-Host "=== [1/4] Build web (Vite) ===" -ForegroundColor Cyan
Push-Location (Join-Path $Root "web")
if (-not (Test-Path "node_modules")) { npm install }
npm run build
Pop-Location

Write-Host "=== [2/4] Package edge functions for self-hosted ===" -ForegroundColor Cyan
& (Join-Path $Root "scripts\package-for-selfhosted.ps1")

if ($StartMockGateway) {
  Write-Host "=== [3/4] Start mock MESSAGE_GATEWAY (new window) ===" -ForegroundColor Cyan
  Start-Process powershell -ArgumentList @(
    "-NoProfile", "-Command",
    "cd `"$Root`"; node tools/mock-message-gateway.mjs"
  )
} else {
  Write-Host "=== [3/4] Mock gateway skipped (use -StartMockGateway) ===" -ForegroundColor DarkGray
}

if ($SkipSupabase) {
  Write-Host "=== [4/4] Skip Supabase (-SkipSupabase) ===" -ForegroundColor Yellow
  Write-Host "Done locally: web/dist and build/selfhosted-edge-functions" -ForegroundColor Green
  exit 0
}

$tokenFile = Join-Path $Root ".supabase-access-token"
if (-not $env:SUPABASE_ACCESS_TOKEN -and (Test-Path $tokenFile)) {
  $env:SUPABASE_ACCESS_TOKEN = (Get-Content $tokenFile -Raw).Trim()
}

if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Host "=== [4/4] Supabase: no access token ===" -ForegroundColor Yellow
  Write-Host "Cloud deploy skipped. Set SUPABASE_ACCESS_TOKEN or create .supabase-access-token, then run deploy-supabase.ps1 or re-run this script." -ForegroundColor Green
  exit 0
}

$refFile = Join-Path $Root ".supabase-project-ref"
$hasRef = $env:SUPABASE_PROJECT_REF -or (Test-Path $refFile)
if (-not $hasRef) {
  Write-Host "=== [4/4] Supabase: no project ref ===" -ForegroundColor Yellow
  Write-Host "Cloud deploy skipped. Copy .supabase-project-ref.example to .supabase-project-ref or set SUPABASE_PROJECT_REF, then run deploy-supabase.ps1 or re-run this script." -ForegroundColor Green
  exit 0
}

Write-Host "=== [4/4] Supabase deploy (link + db push + functions) ===" -ForegroundColor Cyan
& (Join-Path $Root "scripts\deploy-supabase.ps1")
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "Done." -ForegroundColor Green
