#Requires -Version 5.1
<#
  نقطة دخول واحدة: بناء الواجهة + أرشيف للرفع، مع رسائل عربية في الطرفية.

  الاستخدام:
    .\scripts\Complete-Production-Ar.ps1
    .\scripts\Complete-Production-Ar.ps1 -OutputDir "D:\deploy"
    .\scripts\Complete-Production-Ar.ps1 -SkipZip

  الدليل الكامل: docs/complete-runbook-ar.md
#>
param(
  [string]$OutputDir = "",
  [switch]$SkipZip,
  [switch]$SkipPreflight
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Write-Host ""
Write-Host "  إكمال الإنتاج - واجهة التسجيل (SPA)" -ForegroundColor Cyan
Write-Host "  راجع: docs\complete-runbook-ar.md" -ForegroundColor DarkGray
Write-Host ""

$script = Join-Path $Root "scripts\build-and-package-static.ps1"
if ($OutputDir) {
  & $script -OutputDir $OutputDir -ArabicUI -SkipZip:$SkipZip -SkipPreflight:$SkipPreflight
} else {
  & $script -ArabicUI -SkipZip:$SkipZip -SkipPreflight:$SkipPreflight
}
