import { Resend } from "resend";

import { hasLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n/dictionaries";

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
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const locale = hasLocale(body?.locale) ? body.locale : "hr";
  const apiContact = getDictionary(locale).apiContact;

  try {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_EMAIL) {
      console.error("Contact form error: RESEND_API_KEY / RESEND_EMAIL not configured");
      return Response.json({ error: apiContact.emailUnavailable }, { status: 503 });
    }

    const { name, email, message } = body ?? {};

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return Response.json({ error: apiContact.requiredFields }, { status: 400 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Resend reports a rejected send (bad key, unverified sender, …) in the
    // result rather than by throwing, so it has to be checked explicitly —
    // otherwise the visitor would be told the message went out when it didn't.
    const { error } = await resend.emails.send({
      from: "Kontakt forma <onboarding@resend.dev>",
      to: process.env.RESEND_EMAIL,
      subject: `${apiContact.subjectPrefix} ${name}`,
      replyTo: email,
      text: [`Ime: ${name}`, `E-mail: ${email}`, ``, `Poruka:`, message].join("\n"),
    });

    if (error) {
      console.error("Contact form error (Resend):", error);
      return Response.json({ error: apiContact.genericError }, { status: 502 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return Response.json({ error: apiContact.genericError }, { status: 500 });
  }
}
