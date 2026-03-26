const cfg = () => ({
  url: (import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, ""),
  anon: (import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim(),
});

function dashboardProjectFromUrl(urlStr) {
  try {
    const host = new URL(urlStr).hostname;
    if (!host.endsWith(".supabase.co")) return null;
    const ref = host.replace(/\.supabase\.co$/i, "");
    return ref || null;
  } catch {
    return null;
  }
}

function linkDashboardApi(urlStr) {
  const ref = dashboardProjectFromUrl(urlStr);
  const href = ref
    ? `https://supabase.com/dashboard/project/${ref}/settings/api`
    : "https://supabase.com/dashboard/projects";
  return `<a href="${href}" target="_blank" rel="noopener">لوحة المشروع → Settings → API</a>`;
}

function linkDashboardHome(urlStr) {
  const ref = dashboardProjectFromUrl(urlStr);
  const href = ref
    ? `https://supabase.com/dashboard/project/${ref}`
    : "https://supabase.com/dashboard/projects";
  return `<a href="${href}" target="_blank" rel="noopener">فتح لوحة المشروع</a>`;
}

function sessionEmail() {
  return sessionStorage.getItem("onb_email") || "";
}
function setSessionEmail(e) {
  sessionStorage.setItem("onb_email", (e || "").trim().toLowerCase());
}

async function invokeFn(name, body) {
  const { url, anon } = cfg();
  if (!url || !anon) {
    throw new Error("أنشئ web/.env.local وضع VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY");
  }
  let res;
  try {
    res = await fetch(`${url}/functions/v1/${name}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anon}`,
        apikey: anon,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error(
      `تعذّر الاتصال بـ Supabase.\nهل المشروع «متوقف»؟ ${linkDashboardHome(url)}\nثم نفّذ من الجهاز: .\\scripts\\deploy-supabase.ps1`,
    );
  }
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    const err = json.error || json.message || text || String(res.status);
    throw new Error(typeof err === "string" ? err : JSON.stringify(err));
  }
  return json;
}

const stepsEl = document.getElementById("steps");
const panelsEl = document.getElementById("panels");

const STEP_LABELS = [
  "البريد",
  "تأكيد البريد",
  "OTP",
  "التحقق",
  "Hyperswitch",
  "تم",
];

function renderSteps(current) {
  stepsEl.innerHTML = STEP_LABELS.map((l, i) => {
    const on = i <= current ? "on" : "";
    return `<span class="${on}">${i + 1}. ${l}</span>`;
  }).join("");
}

function panel(id, title, inner) {
  return `
    <div class="card hidden" data-panel="${id}">
      <h2 style="font-size:1rem;margin:0 0 1rem;font-weight:600">${title}</h2>
      ${inner}
    </div>
  `;
}

function showPanel(id) {
  panelsEl.querySelectorAll("[data-panel]").forEach((el) => {
    el.classList.toggle("hidden", el.dataset.panel !== id);
  });
}

function msg(html, type) {
  return `<div class="msg ${type}">${escapeHtml(html)}</div>`;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function initPanels() {
  panelsEl.innerHTML =
    panel(
      "email",
      "الخطوة 1 — البريد",
      `
      <label for="em">البريد الإلكتروني</label>
      <input type="email" id="em" autocomplete="email" />
      <button type="button" id="btn-req-email">إرسال رابط التحقق</button>
      <div id="out-email"></div>
    `,
    ) +
    panel(
      "confirm",
      "الخطوة 2 — تأكيد البريد",
      `
      <p class="sub" style="margin:0 0 1rem">إن وصلك رابط، افتحه من البريد (نفس هذا الموقع مع <code>email</code> و <code>token</code>).</p>
      <label for="tok">رمز التحقق (للتطوير إن ظهر في الاستجابة)</label>
      <input type="text" id="tok" autocomplete="one-time-code" placeholder="الصق التوكن هنا" />
      <button type="button" id="btn-confirm">تأكيد البريد</button>
      <div id="out-confirm"></div>
    `,
    ) +
    panel(
      "otp-req",
      "الخطوة 3 — طلب رمز OTP",
      `
      <button type="button" id="btn-req-otp">إرسال OTP للبريد</button>
      <div id="out-otp-req"></div>
    `,
    ) +
    panel(
      "otp-verify",
      "الخطوة 4 — إدخال OTP",
      `
      <label for="otp">الرمز المكوّن من 6 أرقام</label>
      <input type="text" id="otp" inputmode="numeric" maxlength="6" />
      <button type="button" id="btn-verify-otp">تحقق</button>
      <div id="out-otp-verify"></div>
    `,
    ) +
    panel(
      "hs",
      "الخطوة 5 — ربط Hyperswitch",
      `
      <label for="co">اسم النشاط / الشركة</label>
      <input type="text" id="co" autocomplete="organization" />
      <label for="nm">اسم الشخص (اختياري)</label>
      <input type="text" id="nm" autocomplete="name" />
      <label for="pw">كلمة مرور لوحة Hyperswitch</label>
      <input type="password" id="pw" autocomplete="new-password" />
      <button type="button" id="btn-hs">تسجيل في البوابة</button>
      <div id="out-hs"></div>
    `,
    ) +
    panel(
      "done",
      "تم",
      `
      <p id="done-text" class="sub" style="margin:0;color:var(--ok)"></p>
      <button type="button" class="secondary" id="btn-reset">بدء جلسة جديدة</button>
    `,
    );

  document.getElementById("btn-req-email").onclick = async () => {
    const email = document.getElementById("em").value.trim().toLowerCase();
    const out = document.getElementById("out-email");
    out.innerHTML = "";
    if (!email.includes("@")) {
      out.innerHTML = msg("بريد غير صالح", "err");
      return;
    }
    try {
      setSessionEmail(email);
      const r = await invokeFn("request-email-verification", { email });
      let extra = "";
      if (r.dev_token) {
        extra = `\n\nتوكن التطوير: ${r.dev_token}\nيمكنك لصقه في الخطوة التالية.`;
        document.getElementById("tok").value = r.dev_token;
      }
      out.innerHTML = msg((r.message || "تم") + extra, "ok");
      renderSteps(1);
      showPanel("confirm");
    } catch (e) {
      out.innerHTML = msg(e.message, "err");
    }
  };

  document.getElementById("btn-confirm").onclick = async () => {
    const email = sessionEmail();
    const token = document.getElementById("tok").value.trim();
    const out = document.getElementById("out-confirm");
    out.innerHTML = "";
    if (!email || !token) {
      out.innerHTML = msg("أدخل التوكن أو افتح الرابط من البريد", "err");
      return;
    }
    try {
      const r = await invokeFn("confirm-email", { email, token });
      out.innerHTML = msg(r.message || "تم تأكيد البريد", "ok");
      renderSteps(2);
      showPanel("otp-req");
    } catch (e) {
      out.innerHTML = msg(e.message, "err");
    }
  };

  document.getElementById("btn-req-otp").onclick = async () => {
    const email = sessionEmail();
    const out = document.getElementById("out-otp-req");
    out.innerHTML = "";
    try {
      const r = await invokeFn("request-otp", { email });
      let extra = "";
      if (r.dev_otp) {
        extra = `\n\nOTP للتطوير: ${r.dev_otp}`;
        document.getElementById("otp").value = r.dev_otp;
      }
      out.innerHTML = msg((r.message || "تم") + extra, "ok");
      renderSteps(3);
      showPanel("otp-verify");
    } catch (e) {
      out.innerHTML = msg(e.message, "err");
    }
  };

  document.getElementById("btn-verify-otp").onclick = async () => {
    const email = sessionEmail();
    const code = document.getElementById("otp").value.replace(/\D/g, "").slice(0, 6);
    const out = document.getElementById("out-otp-verify");
    out.innerHTML = "";
    if (code.length !== 6) {
      out.innerHTML = msg("أدخل 6 أرقام", "err");
      return;
    }
    try {
      const r = await invokeFn("verify-otp", { email, code });
      out.innerHTML = msg(r.message || "تم التحقق", "ok");
      renderSteps(4);
      showPanel("hs");
    } catch (e) {
      out.innerHTML = msg(e.message, "err");
    }
  };

  document.getElementById("btn-hs").onclick = async () => {
    const email = sessionEmail();
    const company_name = document.getElementById("co").value.trim();
    const name = document.getElementById("nm").value.trim();
    const password = document.getElementById("pw").value;
    const out = document.getElementById("out-hs");
    out.innerHTML = "";
    if (!company_name || !password) {
      out.innerHTML = msg("اسم النشاط وكلمة المرور مطلوبان", "err");
      return;
    }
    try {
      const r = await invokeFn("register-hyperswitch-merchant", {
        email,
        password,
        company_name,
        ...(name ? { name } : {}),
      });
      let text = r.message || JSON.stringify(r, null, 2);
      if (r.merchant_id) text += `\n\nمعرّف التاجر: ${r.merchant_id}`;
      out.innerHTML = msg(text, "ok");
      document.getElementById("done-text").textContent = text;
      renderSteps(5);
      showPanel("done");
    } catch (e) {
      out.innerHTML = msg(e.message, "err");
    }
  };

  document.getElementById("btn-reset").onclick = () => {
    sessionStorage.removeItem("onb_email");
    location.href = location.pathname;
  };
}

async function tryAutoConfirmFromUrl() {
  const q = new URLSearchParams(window.location.search);
  const email = (q.get("email") || "").trim().toLowerCase();
  const token = (q.get("token") || "").trim();
  if (email && token) {
    setSessionEmail(email);
    document.getElementById("em").value = email;
    document.getElementById("tok").value = token;
    renderSteps(1);
    showPanel("confirm");
    try {
      const r = await invokeFn("confirm-email", { email, token });
      document.getElementById("out-confirm").innerHTML = msg(r.message || "تم تأكيد البريد", "ok");
      renderSteps(2);
      showPanel("otp-req");
    } catch (e) {
      document.getElementById("out-confirm").innerHTML = msg(e.message, "err");
    }
    const u = new URL(window.location.href);
    u.search = "";
    window.history.replaceState({}, "", u.pathname + u.hash);
  }
}

const alertsEl = document.getElementById("alerts");

function alertCard(className, title, bodyHtml) {
  return `<div class="card ${className}"><strong>${title}</strong><div style="margin-top:0.5rem">${bodyHtml}</div></div>`;
}

async function pingSupabase() {
  const { url, anon } = cfg();
  if (!url || !anon) return { ok: false, skipped: true };
  try {
    const res = await fetch(`${url}/auth/v1/health`, { method: "GET" });
    return { ok: res.ok, status: res.status };
  } catch {
    return { ok: false, status: 0 };
  }
}

renderSteps(0);
initPanels();
showPanel("email");

(async () => {
  const { url, anon } = cfg();
  if (!url) {
    alertsEl.innerHTML = alertCard(
      "errline",
      "تنبيه إعداد:",
      `ضع <code>VITE_SUPABASE_URL</code> في <code>web/.env.local</code> (انسخ من <code>.env.example</code>) ثم أعد تشغيل <code>npm run dev</code>.`,
    );
    return;
  }
  if (!anon) {
    alertsEl.innerHTML = alertCard(
      "errline",
      "تنبيه إعداد:",
      `ضع <code>VITE_SUPABASE_ANON_KEY</code> (مفتاح anon) في <code>web/.env.local</code>. المصدر: ${linkDashboardApi(url)} → <em>anon public</em>. ثم أعد تشغيل السيرفر.`,
    );
    return;
  }

  const ping = await pingSupabase();
  if (!ping.ok && !ping.skipped) {
    const st = ping.status;
    let hint =
      st === 503
        ? "الخدمة تردّ 503 — المشروع غالباً <strong>متوقف (Paused)</strong>. من اللوحة اضغط <strong>Restore project</strong> وانتظر حتى يصبح نشطاً."
        : st === 402
          ? "رمز 402 — قيود فوترة أو استخدام على المؤسسة؛ راجع الفوترة في Supabase."
          : `الاستجابة ${st || "خطأ شبكة"} — تحقق من المشروع ومن نشر الدوال (<code>deploy-supabase.ps1</code>).`;
    alertsEl.innerHTML = alertCard(
      "warn",
      "Supabase غير جاهز:",
      `${hint}<br /><br />${linkDashboardHome(url)} · ${linkDashboardApi(url)}`,
    );
  }

  tryAutoConfirmFromUrl();
})();
