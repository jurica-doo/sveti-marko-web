import { Resend } from "resend";

import { getContactPage } from "@/lib/api";
import { EMAIL_LOGO_BASE64 } from "@/lib/email/logo";
import {
  LOGO_CID,
  confirmationEmail,
  officeEmail,
  type ParishDetails,
} from "@/lib/email/contact-templates";
import { hasLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { FALLBACK_SETTINGS } from "@/lib/site";
import { SITE_ORIGIN } from "@/lib/site-url";

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
 *   - a fixed recipient from the environment, and every visitor-typed value
 *     HTML-escaped in the templates, so the sender controls neither who
 *     receives the office mail nor any markup in it
 *   - line breaks stripped from the name before it enters the subject header
 *
 * Two e-mails go out, in order:
 *   1. "UPIT S WEB STRANICE" to the parish office (`RESEND_EMAIL`). Only if
 *      Resend accepts this one does the visitor get the success banner.
 *   2. A styled "thank you" confirmation to the visitor, from the no-reply
 *      sender (`RESEND_NOREPLY_FROM`). Sent only after (1) succeeded, so nobody
 *      is told "we received it" for a message that never arrived. A failure
 *      here is logged but does not turn the visitor's banner red — their
 *      message did reach the office. Skipped while `RESEND_NOREPLY_FROM` is
 *      unset: Resend can only send to arbitrary addresses from a verified
 *      domain, which the parish does not have yet.
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
    const parish = await parishDetails(locale);
    const logo = [{ filename: "logo.png", content: EMAIL_LOGO_BASE64, contentId: LOGO_CID }];

    const office = officeEmail({
      name,
      email,
      message,
      // Which language the visitor wrote from — the language to answer in.
      localeName: LOCALE_NAMES[locale],
      sentAt: new Intl.DateTimeFormat("hr-HR", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Zagreb",
      }).format(new Date()),
      parish,
      confirmsToSender: Boolean(process.env.RESEND_NOREPLY_FROM),
    });

    // Resend reports a rejected send (bad key, unverified sender, …) in the
    // result rather than by throwing, so it has to be checked explicitly —
    // otherwise the visitor would be told the message went out when it didn't.
    const { error } = await resend.emails.send({
      // The parish's own verified address once its domain is set up in Resend;
      // until then Resend's shared test sender, which only delivers to the
      // Resend account owner (the parish Gmail). Never the visitor's address —
      // that goes in Reply-To, so the office simply presses Reply.
      from: process.env.RESEND_FROM || "Web stranica župe <onboarding@resend.dev>",
      to: process.env.RESEND_EMAIL,
      subject: `UPIT S WEB STRANICE — ${subjectName}`,
      replyTo: email,
      html: office.html,
      text: office.text,
      attachments: logo,
    });

    if (error) {
      // The error's name and message only — never the visitor's message.
      console.error("Contact form error (Resend):", error.name, error.message);
      return Response.json({ error: apiContact.genericError }, { status: 502 });
    }

    if (process.env.RESEND_NOREPLY_FROM) {
      const confirmation = confirmationEmail({ name, message, copy: apiContact, parish });
      const sent = await resend.emails
        .send({
          from: process.env.RESEND_NOREPLY_FROM,
          to: email,
          subject: `${apiContact.confirmSubject} — ${parish.name}`,
          html: confirmation.html,
          text: confirmation.text,
          attachments: logo,
          headers: { "Auto-Submitted": "auto-replied", "X-Auto-Response-Suppress": "All" },
        })
        .catch((e: unknown) => ({ error: { name: "exception", message: e instanceof Error ? e.message : "unknown" } }));
      if (sent.error) {
        console.error("Contact confirmation error (Resend):", sent.error.name, sent.error.message);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error instanceof Error ? error.message : "unknown");
    return Response.json({ error: apiContact.genericError }, { status: 500 });
  }
}

/**
 * Address and phone for the e-mails, from the CMS contact page so they stay in
 * step with the site; a CMS outage falls back to the known office details
 * rather than holding up the send.
 */
async function parishDetails(locale: Locale): Promise<ParishDetails> {
  const page = await getContactPage(locale).catch(() => null);
  const c = page?.contact;
  return {
    name: FALLBACK_SETTINGS.siteName,
    officeName: c?.parishOfficeName || "Župni ured sv. Marka Evanđelista",
    street: c?.street || "Hercegovačka 157",
    postalCode: c?.postalCode || "21000",
    city: c?.city || "Split",
    phone: c?.phone ?? "(021) 367-422",
    mobile: c?.mobile,
    website: SITE_ORIGIN,
  };
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
