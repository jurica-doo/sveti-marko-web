/**
 * HTML e-mails sent by the contact form.
 *
 *   officeEmail         to the parish office: "UPIT S WEB STRANICE"
 *   confirmationEmail   back to the visitor, from the no-reply sender
 *
 * Built the way e-mail clients need: tables for layout, every style inline,
 * system fonts with a serif for headings, no external CSS or images (the logo
 * travels as an inline attachment, `cid:logo`). Each has a plain-text twin for
 * clients that do not render HTML and for spam scoring.
 *
 * Everything the visitor typed goes through `esc()` — they control the name
 * and the message, and none of it may become markup in the parish inbox.
 */

export const LOGO_CID = "logo";

const C = {
  page: "#f2f0ea",
  card: "#faf9f6",
  line: "#e3dfd4",
  ink: "#101d26",
  body: "#465a67",
  muted: "#606d77",
  sea: "#12475a",
  brass: "#a8813c",
  brassSoft: "#ebdcbb",
};

const SERIF = "Georgia, 'Times New Roman', Times, serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

export type ParishDetails = {
  name: string;
  officeName: string;
  street: string;
  postalCode: string;
  city: string;
  phone?: string | null;
  mobile?: string | null;
  website: string;
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** The visitor's message as HTML: escaped, line breaks kept. */
function messageHtml(message: string): string {
  return esc(message).replace(/\r?\n/g, "<br>");
}

function telHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.startsWith("+") ? digits : `+385${digits.replace(/^0/, "")}`;
}

function shell({ preheader, body, footer }: { preheader: string; body: string; footer: string }) {
  return `<!doctype html>
<html lang="hr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(preheader)}</title>
</head>
<body style="margin:0;padding:0;background:${C.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.page};">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:${C.card};border:1px solid ${C.line};">
${body}
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
<tr><td style="padding:20px 8px 0;font-family:${SANS};font-size:12px;line-height:18px;color:${C.muted};text-align:center;">
${footer}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Logo, parish name and a brass rule — the top of both e-mails. */
function header(parish: ParishDetails, eyebrow: string) {
  return `<tr><td align="center" style="padding:36px 32px 8px;">
<img src="cid:${LOGO_CID}" width="72" height="72" alt="${esc(parish.name)}" style="display:block;border:0;width:72px;height:72px;">
</td></tr>
<tr><td align="center" style="padding:8px 32px 0;font-family:${SERIF};font-size:18px;line-height:24px;color:${C.ink};">
${esc(parish.name)}
</td></tr>
<tr><td align="center" style="padding:4px 32px 0;font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.muted};">
${esc(parish.city)}
</td></tr>
<tr><td align="center" style="padding:24px 32px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="width:40px;"><div style="height:1px;line-height:1px;font-size:0;background:${C.brass};">&nbsp;</div></td>
<td style="padding:0 12px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${C.brass};text-align:center;">${esc(eyebrow)}</td>
<td valign="middle" style="width:40px;"><div style="height:1px;line-height:1px;font-size:0;background:${C.brass};">&nbsp;</div></td>
</tr></table>
</td></tr>`;
}

function quote(label: string, message: string) {
  return `<tr><td style="padding:0 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;border:1px solid ${C.line};border-left:3px solid ${C.brass};">
<tr><td style="padding:18px 20px 6px;font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.muted};">${esc(label)}</td></tr>
<tr><td style="padding:0 20px 20px;font-family:${SANS};font-size:15px;line-height:24px;color:${C.ink};">${messageHtml(message)}</td></tr>
</table>
</td></tr>`;
}

/* ---------------------------------------------------------------- office */

export function officeEmail({
  name,
  email,
  message,
  localeName,
  sentAt,
  parish,
  confirmsToSender,
}: {
  name: string;
  email: string;
  message: string;
  localeName: string;
  sentAt: string;
  parish: ParishDetails;
  /** Whether the visitor is sent an automatic confirmation — said in the footer. */
  confirmsToSender: boolean;
}) {
  const row = (label: string, value: string) => `<tr>
<td valign="top" style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${C.muted};width:120px;">${esc(label)}</td>
<td valign="top" style="padding:10px 0;border-bottom:1px solid ${C.line};font-family:${SANS};font-size:15px;color:${C.ink};">${value}</td>
</tr>`;

  const body = `${header(parish, "Upit s web stranice")}
<tr><td align="center" style="padding:20px 32px 4px;font-family:${SERIF};font-size:26px;line-height:34px;color:${C.ink};">
Nova poruka
</td></tr>
<tr><td align="center" style="padding:0 32px 28px;font-family:${SANS};font-size:14px;line-height:22px;color:${C.body};">
Netko je ispunio kontakt obrazac na mrežnoj stranici župe.
</td></tr>
<tr><td style="padding:0 32px 24px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.line};">
${row("Ime", esc(name))}
${row("E-mail", `<a href="mailto:${esc(email)}" style="color:${C.sea};text-decoration:underline;">${esc(email)}</a>`)}
${row("Jezik", esc(localeName))}
${row("Poslano", esc(sentAt))}
</table>
</td></tr>
${quote("Poruka", message)}
<tr><td align="center" style="padding:28px 32px 36px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="background:${C.sea};">
<a href="mailto:${esc(email)}?subject=${encodeURIComponent(`Re: Upit s web stranice`)}" style="display:inline-block;padding:14px 28px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#ffffff;text-decoration:none;">Odgovori pošiljatelju</a>
</td>
</tr></table>
<p style="margin:14px 0 0;font-family:${SANS};font-size:12px;line-height:18px;color:${C.muted};">Ili jednostavno pritisnite „Odgovori” — odgovor ide izravno pošiljatelju.</p>
</td></tr>`;

  const html = shell({
    preheader: `Upit s web stranice — ${name}`,
    body,
    footer: `Poslano putem kontakt obrasca na <a href="${esc(parish.website)}" style="color:${C.muted};">${esc(parish.website.replace(/^https?:\/\//, ""))}</a>.${confirmsToSender ? "<br>Pošiljatelju je automatski poslana potvrda primitka." : ""}`,
  });

  const text = [
    `UPIT S WEB STRANICE`,
    ``,
    `Ime: ${name}`,
    `E-mail: ${email}`,
    `Jezik stranice: ${localeName}`,
    `Poslano: ${sentAt}`,
    ``,
    `Poruka:`,
    message,
    ``,
    `—`,
    `Poslano putem kontakt obrasca na mrežnoj stranici župe. Odgovorom na ovaj e-mail pišete izravno pošiljatelju.`,
  ].join("\n");

  return { html, text };
}

/* ----------------------------------------------------------- confirmation */

export type ConfirmationCopy = {
  confirmSubject: string;
  confirmGreeting: string;
  confirmBody: string;
  confirmCopyLabel: string;
  confirmSignoff: string;
  confirmNoReply: string;
  confirmVisit: string;
};

export function confirmationEmail({
  name,
  message,
  copy,
  parish,
}: {
  name: string;
  message: string;
  copy: ConfirmationCopy;
  parish: ParishDetails;
}) {
  const greeting = copy.confirmGreeting.replace("{name}", name);
  const address = `${parish.street}, ${parish.postalCode} ${parish.city}`;
  const phones = [parish.phone, parish.mobile].filter((p): p is string => Boolean(p));

  const contactRow = (icon: string, html: string) => `<tr>
<td valign="top" width="28" style="padding:6px 0;font-family:${SANS};font-size:14px;color:${C.brass};">${icon}</td>
<td valign="top" style="padding:6px 0;font-family:${SANS};font-size:14px;line-height:20px;color:${C.ink};">${html}</td>
</tr>`;

  const body = `${header(parish, copy.confirmSubject)}
<tr><td style="padding:28px 32px 0;font-family:${SERIF};font-size:22px;line-height:30px;color:${C.ink};">
${esc(greeting)}
</td></tr>
<tr><td style="padding:10px 32px 26px;font-family:${SANS};font-size:15px;line-height:24px;color:${C.body};">
${esc(copy.confirmBody)}
</td></tr>
${quote(copy.confirmCopyLabel, message)}
<tr><td style="padding:28px 32px 0;font-family:${SANS};font-size:15px;line-height:24px;color:${C.body};">
${esc(copy.confirmSignoff)}<br>
<span style="font-family:${SERIF};font-size:17px;color:${C.ink};">${esc(parish.officeName)}</span>
</td></tr>
<tr><td style="padding:28px 32px 0;"><div style="height:1px;background:${C.line};font-size:0;line-height:0;">&nbsp;</div></td></tr>
<tr><td style="padding:20px 32px 0;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
${contactRow("&#9679;", esc(address))}
${phones
  .map((p) =>
    contactRow(
      "&#9742;",
      `<a href="tel:${telHref(p)}" style="color:${C.sea};text-decoration:none;font-weight:600;">${esc(p)}</a>`,
    ),
  )
  .join("\n")}
${contactRow("&#10022;", `<a href="${esc(parish.website)}" style="color:${C.sea};text-decoration:none;font-weight:600;">${esc(parish.website.replace(/^https?:\/\//, ""))}</a>`)}
</table>
</td></tr>
<tr><td align="center" style="padding:28px 32px 36px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td style="border:1px solid ${C.sea};">
<a href="${esc(parish.website)}" style="display:inline-block;padding:13px 28px;font-family:${SANS};font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.sea};text-decoration:none;">${esc(copy.confirmVisit)}</a>
</td>
</tr></table>
</td></tr>`;

  const html = shell({
    preheader: copy.confirmSubject,
    body,
    footer: `${esc(copy.confirmNoReply)}<br><br>${esc(parish.name)} · ${esc(address)}`,
  });

  const text = [
    greeting,
    ``,
    copy.confirmBody,
    ``,
    `${copy.confirmCopyLabel}:`,
    message,
    ``,
    copy.confirmSignoff,
    parish.officeName,
    ``,
    address,
    ...phones.map((p) => `Tel: ${p}`),
    parish.website,
    ``,
    `—`,
    copy.confirmNoReply,
  ].join("\n");

  return { html, text };
}
