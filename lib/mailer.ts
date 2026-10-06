import "server-only";

/**
 * Email for document signing, through Resend's HTTP API (the same account as
 * the classes site, whose vicentegomez.cl domain is verified there).
 *
 * Needs RESEND_API_KEY. Without it, local dev prints each email to the server
 * console instead — codes included — so the flow can be tried end to end;
 * production refuses, since a signer who never gets their code is stuck.
 */

const DEFAULT_FROM = "Vicente G. Gómez · Firmas <firmas@vicentegomez.cl>";

export interface Attachment {
  filename: string;
  content: Buffer;
}

export interface Email {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
  attachments?: Attachment[];
}

export function canSendEmail(): boolean {
  return Boolean(process.env.RESEND_API_KEY) || process.env.NODE_ENV !== "production";
}

export async function sendEmail(email: Email): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY is not set.");
    console.info(
      `[mailer] (dev, not sent) to ${email.to} — ${email.subject}\n${email.text}` +
        (email.attachments?.length
          ? `\n[attachments: ${email.attachments.map((a) => a.filename).join(", ")}]`
          : ""),
    );
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.SIGNING_EMAIL_FROM || DEFAULT_FROM,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(email.replyTo ? { reply_to: email.replyTo } : {}),
      ...(email.attachments?.length
        ? {
            attachments: email.attachments.map((a) => ({
              filename: a.filename,
              content: a.content.toString("base64"),
            })),
          }
        : {}),
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    throw new Error(`Resend answered ${response.status}: ${await response.text()}`);
  }
}

const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** Anything a person typed (names, titles, reasons) goes through this. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

/** The plain-text twin of `emailLayout`'s paragraphs. */
export function textFrom(paragraphs: string[]): string {
  const decode = (t: string) =>
    t.replace(/<[^>]+>/g, "").replace(/&(amp|lt|gt|quot|#39);/g, (_, e) =>
      ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[e as string] ?? "",
    );
  return paragraphs.map(decode).join("\n\n");
}

/** A plain, readable email: a few paragraphs and at most one button. */
export function emailLayout(paragraphs: string[], button?: { label: string; url: string }): string {
  const body = paragraphs
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.5;color:#1d1d1f">${p}</p>`)
    .join("");
  const cta = button
    ? `<p style="margin:22px 0"><a href="${escapeHtml(button.url)}" style="display:inline-block;background:#1d1d1f;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:999px">${escapeHtml(button.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f5f5f7;padding:24px 12px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><div style="max-width:520px;margin:0 auto;background:#fff;border-radius:20px;padding:28px">${body}${cta}<p style="margin:24px 0 0;font-size:12px;color:#86868b">Vicente G. Gómez · resume.vicentegomez.cl</p></div></body></html>`;
}
