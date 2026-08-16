import { Resend } from "resend";

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
 */
export async function POST(req: Request) {
  try {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_EMAIL) {
      console.error("Contact form error: RESEND_API_KEY / RESEND_EMAIL not configured");
      return Response.json(
        { error: "Slanje e-maila trenutno nije dostupno. Pokušajte putem WhatsAppa." },
        { status: 503 },
      );
    }

    const { name, email, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return Response.json(
        { error: "Ime, e-mail i poruka su obavezni." },
        { status: 400 },
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "Kontakt forma <onboarding@resend.dev>",
      to: process.env.RESEND_EMAIL,
      subject: `Nova poruka od ${name}`,
      replyTo: email,
      text: [`Ime: ${name}`, `E-mail: ${email}`, ``, `Poruka:`, message].join("\n"),
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return Response.json(
      { error: "Nešto je pošlo po krivu. Pokušajte ponovo." },
      { status: 500 },
    );
  }
}
