#Requires -Version 5.1
<#
  Production preflight: Node/npm, disk space, optional web/.env.local for dev.

  Usage:
    .\scripts\preflight.ps1
    .\scripts\preflight.ps1 -RequireEnvLocal
    .\scripts\preflight.ps1 -MinFreeSpaceMB 500
#>
param(
  [int]$MinFreeSpaceMB = 200,
  [switch]$RequireEnvLocal,
  [switch]$ArabicUI
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot

function Test-DriveFreeMB {
  param([string]$Path)
  $drive = (Get-Item $Path).PSDrive.Name
  $free = (Get-PSDrive $drive).Free / 1MB
  return [math]::Round($free, 0)
}

if ($ArabicUI) {
  Write-Host "=== فحص أولي ===" -ForegroundColor Cyan
} else {
  Write-Host "=== Preflight ===" -ForegroundColor Cyan
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  if ($ArabicUI) { Write-Error "Node.js غير موجود في PATH. ثبّت LTS من https://nodejs.org/" }
  else { Write-Error "Node.js is not on PATH. Install LTS from https://nodejs.org/" }
}
$nodeV = node -v
if ($ArabicUI) { Write-Host "إصدار Node: $nodeV" -ForegroundColor Green }
else { Write-Host "Node: $nodeV" -ForegroundColor Green }

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  if ($ArabicUI) { Write-Error "npm غير موجود في PATH." }
  else { Write-Error "npm is not on PATH." }
}

$freeMb = Test-DriveFreeMB -Path $Root
if ($ArabicUI) {
  Write-Host "المساحة الحرة على قرص المشروع: $freeMb ميجابايت" -ForegroundColor $(if ($freeMb -lt $MinFreeSpaceMB) { "Yellow" } else { "Green" })
} else {
  Write-Host "Free space on project drive: $freeMb MB" -ForegroundColor $(if ($freeMb -lt $MinFreeSpaceMB) { "Yellow" } else { "Green" })
}
if ($freeMb -lt $MinFreeSpaceMB) {
  if ($ArabicUI) {
    Write-Host "تحذير: أقل من $MinFreeSpaceMB ميجابايت؛ قد يفشل البناء. استخدم -OutputDir على D:\ أو E:\." -ForegroundColor Yellow
  } else {
    Write-Host "Warning: less than $MinFreeSpaceMB MB free. Build may fail; use a drive with more space or run build-and-package-static.ps1 -OutputDir D:\..." -ForegroundColor Yellow
  }
}

$envLocal = Join-Path $Root "web\.env.local"
if ($RequireEnvLocal) {
  if (-not (Test-Path $envLocal)) {
    if ($ArabicUI) { Write-Error "لا يوجد web/.env.local - انسخ من web/.env.example واضبط VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY." }
    else { Write-Error "Missing web/.env.local. Copy web/.env.example to web/.env.local and set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY." }
  }
  $raw = Get-Content $envLocal -Raw
  if ($raw -notmatch "VITE_SUPABASE_URL\s*=\s*https?://") {
    if ($ArabicUI) { Write-Error "web/.env.local: VITE_SUPABASE_URL يجب أن يكون رابط http أو https صالحاً." }
    else { Write-Error "web/.env.local: VITE_SUPABASE_URL must be a valid http(s) URL." }
  }
  if ($raw -match "VITE_SUPABASE_ANON_KEY\s*=\s*eyJ\.\.\." -or $raw -notmatch "VITE_SUPABASE_ANON_KEY\s*=\s*eyJ") {
    if ($ArabicUI) { Write-Error "web/.env.local: ضع مفتاح anon حقيقي من لوحة Supabase." }
    else { Write-Error "web/.env.local: set a real VITE_SUPABASE_ANON_KEY (anon JWT from Supabase)." }
  }
}

if ($ArabicUI) { Write-Host "الفحص الأولي: نجح." -ForegroundColor Green }
else { Write-Host "Preflight OK." -ForegroundColor Green }
