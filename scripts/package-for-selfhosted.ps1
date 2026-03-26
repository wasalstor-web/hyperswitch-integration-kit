#Requires -Version 5.1
# يجهّز مجلداً لنسخه إلى supabase/docker/volumes/functions/ على الـ VPS (ذاتي الاستضافة).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$src = Join-Path $Root "supabase\functions"
$dst = Join-Path $Root "build\selfhosted-edge-functions"

$dirs = @(
  "_shared",
  "request-email-verification",
  "confirm-email",
  "request-otp",
  "verify-otp",
  "register-hyperswitch-merchant"
)

if (-not (Test-Path $src)) {
  Write-Error "Missing: $src"
}

Remove-Item $dst -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path $dst | Out-Null

foreach ($d in $dirs) {
  $from = Join-Path $src $d
  if (-not (Test-Path $from)) {
    Write-Error "Missing: $from"
  }
  Copy-Item $from (Join-Path $dst $d) -Recurse
}

Write-Host "OK: $dst" -ForegroundColor Green
Write-Host "Copy this folder contents into supabase/docker/volumes/functions/ on the VPS (next to main and hello)." -ForegroundColor Cyan
