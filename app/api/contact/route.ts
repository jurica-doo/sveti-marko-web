import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { type, name, email, phone, message } = await req.json();

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return Response.json(
        { error: "Ime, email i poruka su obavezni." },
        { status: 400 },
      );
    }

    const inquiryType = type === "business" ? "Tvrtka" : "Osoba";

    const resendResponse = await resend.emails.send({
      from: "Contact <onboarding@resend.dev>",
      to: process.env.RESEND_EMAIL!,
      subject: `Nova poruka od ${name} (${inquiryType})`,
      replyTo: email,
      text: [
        `Tip upita: ${inquiryType}`,
        `Ime: ${name}`,
        `Email: ${email}`,
        phone ? `Telefon: ${phone}` : null,
        ``,
        `Poruka:`,
        message,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    console.log("Resend API response:", resendResponse);

    return Response.json({ success: true });
  } catch (error) {
    console.error("Contact form error:", error);
    return Response.json(
      { error: "Nešto je pošlo po krivu. Pokušajte ponovo." },
      { status: 500 },
    );
  }
}
