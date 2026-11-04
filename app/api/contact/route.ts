import { Resend } from "resend";

import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Backs the "E-mail poruka" option on the contact form. The WhatsApp option
 * never reaches this route — it opens `wa.me` straight from the browser
 * instead, see `ContactForm`.
 *
 * Built lazily, inside the handler: the SDK throws the moment it is
 * constructed without a key, and a module-level `new Resend(...)` runs
 * during route collection at build time — before `.env` for the target
 * environment is necessarily in place — which would fail the build itself
 * rather than just this route at request time.
 *
 * This route is not nested under `app/[lang]/` (it has no page of its own to
 * localize), so the caller sends its own `locale` in the body — `ContactForm`
 * already knows it via `dict.locale` — rather than it being read from a URL
 * segment.
 *
 * It is public and sends email, so it is built not to become spam
 * infrastructure — in order of the checks below:
 *   - same-origin only: a browser on another site cannot post here
 *   - a hard cap on the body size, read before parsing
 *   - a per-client rate limit (see `lib/rate-limit` for its reach)
 *   - a honeypot field: filled means a bot, answered as if it worked
 *   - strict server-side validation of every field, with length limits
 *   - a fixed recipient from the environment and a plain-text body, so the
 *     sender controls neither who receives the mail nor any markup in it
 *   - line breaks stripped from the name before it enters the subject header
 */

const MAX_BODY_BYTES = 16 * 1024;
const LIMITS = { name: 120, email: 254, message: 5000 } as const;
const RATE = { limit: 5, windowMs: 10 * 60 * 1000 } as const;

/** Spelled out in Croatian, for the office reading the e-mail. */
const LOCALE_NAMES = { hr: "hrvatski", en: "engleski", it: "talijanski", pl: "poljski" } as const;

// Deliberately loose, the same shape the form checks: it rejects the obvious
// slips without trying to second-guess real addresses. Linear, so it cannot be
// made to backtrack.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  // Locale comes from the body, which is read below; until then errors use hr.
  let apiContact = getDictionary("hr").apiContact;

  if (!isSameOrigin(req)) {
    return Response.json({ error: apiContact.genericError }, { status: 403 });
  }

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return Response.json({ error: apiContact.genericError }, { status: 413 });
  }

  const raw = await req.text().catch(() => "");
  if (raw.length > MAX_BODY_BYTES) {
    return Response.json({ error: apiContact.genericError }, { status: 413 });
  }

  let body: Record<string, unknown> | null = null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      body = parsed as Record<string, unknown>;
    }
  } catch {
    body = null;
  }

  const requestedLocale = typeof body?.locale === "string" ? body.locale : "";
  const locale = hasLocale(requestedLocale) ? requestedLocale : "hr";
  apiContact = getDictionary(locale).apiContact;

  if (!body) {
    return Response.json({ error: apiContact.requiredFields }, { status: 400 });
  }

  const { allowed, retryAfterSeconds } = rateLimit(`contact:${clientIp(req)}`, RATE);
  if (!allowed) {
    return Response.json(
      { error: apiContact.rateLimited },
      { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
    );
  }

  // Honeypot: a field no person can see or reach. A bot that fills every input
  // gets the same success a person would, so it learns nothing to adapt to.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return Response.json({ success: true });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || !email || !message) {
    return Response.json({ error: apiContact.requiredFields }, { status: 400 });
  }

  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    message.length > LIMITS.message ||
    !EMAIL_PATTERN.test(email)
  ) {
    return Response.json({ error: apiContact.invalidFields }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_EMAIL) {
    console.error("Contact form error: RESEND_API_KEY / RESEND_EMAIL not configured");
    return Response.json({ error: apiContact.emailUnavailable }, { status: 503 });
  }

  // A header value must stay on one line; anything that could start a new
  // header is flattened to a space.
  const subjectName = name.replace(/[\r\n\t]+/g, " ");

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);

    // Resend reports a rejected send (bad key, unverified sender, …) in the
    // result rather than by throwing, so it has to be checked explicitly —
    // otherwise the visitor would be told the message went out when it didn't.
    const { error } = await resend.emails.send({
      // The parish's own verified address once its domain is set up in Resend;
      // until then Resend's shared test sender, which only delivers to the
      // Resend account owner. Never the visitor's address — that goes in
      // Reply-To, so the office simply presses Reply.
      from: process.env.RESEND_FROM || "Kontakt forma <onboarding@resend.dev>",
      to: process.env.RESEND_EMAIL,
      subject: `[Web] ${apiContact.subjectPrefix} ${subjectName}`,
      replyTo: email,
      text: [
        `Ime: ${name}`,
        `E-mail: ${email}`,
        // Which language the visitor wrote from — the language to answer in.
        `Jezik stranice: ${LOCALE_NAMES[locale]}`,
        ``,
        `Poruka:`,
        message,
        ``,
        `—`,
        `Poslano putem kontakt obrasca na mrežnoj stranici župe.`,
      ].join("\n"),
    });

    if (error) {
      // The error's name and message only — never the visitor's message.
      console.error("Contact form error (Resend):", error.name, error.message);
      return Response.json({ error: apiContact.genericError }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: apiContact.genericError }, { status: 500 });
  }
}

/**
 * A browser always sends `Origin` on a cross-site POST, so a mismatch means
 * another site is posting here. No `Origin` at all (curl, server-to-server) is
 * let through — the checks after this one still apply to it — and a malformed
 * one, including the literal `null` from sandboxed frames, is refused.
 */
function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(req.url).host;
  } catch {
    return false;
  }
}
