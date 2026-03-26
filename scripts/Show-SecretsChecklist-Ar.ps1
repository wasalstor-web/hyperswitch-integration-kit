#Requires -Version 5.1
<#
  يعرض قائمة أسرار Edge Functions (بدون قيم) - للمراجعة قبل الإنتاج.
#>
$lines = @(
  "",
  "=== قائمة أسرار Supabase Edge Functions ===",
  "",
  "  [إلزامي للإنتاج] PUBLIC_APP_VERIFY_URL",
  "      نفس أصل الواجهة العامة (بدون / أخيرة)، مثال: https://onboard.example.com",
  "",
  "  [اختياري] MESSAGE_GATEWAY_URL / MESSAGE_GATEWAY_KEY",
  "      بوابة إرسال البريد أو الرسائل (JSON).",
  "",
  "  [Hyperswitch] HYPERSWITCH_BASE_URL",
  "  [اختياري] HYPERSWITCH_ADMIN_API_KEY - إن وضع التسجيل admin_merchant",
  "  [اختياري] HYPERSWITCH_REGISTRATION_MODE",
  "",
  "  [تطوير فقط - ممنوع إنتاج] DANGEROUS_RETURN_TOKEN, DANGEROUS_RETURN_OTP, DANGEROUS_RETURN_HS_JWT",
  "",
  "التعيين: لوحة Supabase - Project Settings - Edge Functions - Secrets",
  "أو: supabase secrets set --project-ref REF NAME=value",
  "",
  "المزيد: docs/complete-runbook-ar.md",
  ""
)
$lines | ForEach-Object { Write-Host $_ }
