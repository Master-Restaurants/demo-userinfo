/**
 * Demo-Telemetrie — protokolliert Demo-Logins und benachrichtigt optional via Telegram.
 *
 * Aktivierung über zwei Env-Variablen (in Vercel oder `.env.local` setzen):
 *   - `DEMO_TELEGRAM_BOT_TOKEN` — der Bot-Token (von @BotFather, Format `123456:ABC-...`)
 *   - `DEMO_TELEGRAM_CHAT_ID`   — die Chat-ID (eigene oder Gruppe), wo Notifications hingehen
 *
 * Sind beide gesetzt, wird bei jedem Demo-Login eine Telegram-Nachricht ausgelöst.
 * Sind sie nicht gesetzt, wird nur in die Server-Console geloggt — kein Crash.
 *
 * Wird absichtlich `await`-frei aufgerufen (fire-and-forget): selbst wenn Telegram
 * langsam oder offline ist, blockiert das den Demo-Login nicht.
 */

export type DemoVisitInfo = {
  ip: string | null;
  userAgent: string | null;
  referer: string | null;
  acceptLanguage: string | null;
  timestamp: string; // ISO 8601
};

/** Best-effort IP-Extraktion aus Standard-Proxy-Headern (Vercel, Cloudflare, etc.). */
export function extractClientIp(headers: Headers): string | null {
  // Vercel und die meisten CDN/Proxies setzen `x-forwarded-for` (kommagetrennt, erster Eintrag = Client).
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const xRealIp = headers.get("x-real-ip");
  if (xRealIp) return xRealIp.trim();
  const cfConnecting = headers.get("cf-connecting-ip");
  if (cfConnecting) return cfConnecting.trim();
  return null;
}

/** Sammelt Visit-Informationen aus einem Request. */
export function collectVisitInfo(request: Request): DemoVisitInfo {
  return {
    ip: extractClientIp(request.headers),
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
    acceptLanguage: request.headers.get("accept-language"),
    timestamp: new Date().toISOString(),
  };
}

/** Schickt eine Telegram-Nachricht. Schluckt alle Fehler — Telegram ist optional. */
async function sendTelegramMessage(text: string): Promise<void> {
  const token = (process.env.DEMO_TELEGRAM_BOT_TOKEN ?? "").trim();
  const chatId = (process.env.DEMO_TELEGRAM_CHAT_ID ?? "").trim();
  if (!token || !chatId) {
    return; // Telegram nicht konfiguriert.
  }

  try {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err) {
    // Logging, aber kein throw — Telegram ist optional.
    console.warn(
      "[demo-telemetry] Telegram-Notification fehlgeschlagen:",
      err instanceof Error ? err.message : String(err)
    );
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString("de-DE", {
      timeZone: "Europe/Berlin",
      dateStyle: "medium",
      timeStyle: "medium",
    });
  } catch {
    return iso;
  }
}

/**
 * Benachrichtigt über einen Demo-Visit. Loggt server-side immer in die Console
 * und schickt zusätzlich eine Telegram-Nachricht falls der Bot konfiguriert ist.
 *
 * Fire-and-forget: blockiert den aufrufenden Request nicht.
 */
export function notifyDemoVisit(info: DemoVisitInfo): void {
  // Server-Console-Log (erscheint in Vercel-Function-Logs):
  console.log("[demo-visit]", JSON.stringify(info));

  // Telegram (asynchron, nicht awaiten):
  const lines = [
    "🚀 <b>Neuer Demo-Visit</b>",
    "",
    `🕒 <b>Zeit:</b> ${escapeHtml(formatTimestamp(info.timestamp))}`,
    `🌍 <b>IP:</b> <code>${escapeHtml(info.ip ?? "unbekannt")}</code>`,
    `🧭 <b>Browser:</b> ${escapeHtml(info.userAgent ?? "unbekannt").slice(0, 200)}`,
    info.referer ? `🔗 <b>Referer:</b> ${escapeHtml(info.referer)}` : null,
    info.acceptLanguage
      ? `🗣 <b>Sprache:</b> ${escapeHtml(info.acceptLanguage.split(",")[0] ?? "")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n");

  void sendTelegramMessage(lines);
}
