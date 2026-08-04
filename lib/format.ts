const MONTHS_HR = [
  "siječnja",
  "veljače",
  "ožujka",
  "travnja",
  "svibnja",
  "lipnja",
  "srpnja",
  "kolovoza",
  "rujna",
  "listopada",
  "studenoga",
  "prosinca",
];

const MONTHS_SHORT_HR = [
  "sij",
  "velj",
  "ožu",
  "tra",
  "svi",
  "lip",
  "srp",
  "kol",
  "ruj",
  "lis",
  "stu",
  "pro",
];

function parse(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `12. rujna 1994.` */
export function formatDateLong(value?: string | null): string {
  const date = parse(value);
  if (!date) return "";
  return `${date.getDate()}. ${MONTHS_HR[date.getMonth()]} ${date.getFullYear()}.`;
}

/** `12.09.1994.` */
export function formatDateShort(value?: string | null): string {
  const date = parse(value);
  if (!date) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${date.getFullYear()}.`;
}

/** Day / month / year parts for the carved date block on news cards. */
export function dateParts(value?: string | null): {
  day: string;
  month: string;
  year: string;
} | null {
  const date = parse(value);
  if (!date) return null;
  return {
    day: String(date.getDate()).padStart(2, "0"),
    month: MONTHS_SHORT_HR[date.getMonth()],
    year: String(date.getFullYear()),
  };
}

/** `2026-08-04` for <time dateTime>. */
export function isoDate(value?: string | null): string {
  const date = parse(value);
  return date ? date.toISOString().slice(0, 10) : "";
}

const NON_BREAKING_SPACE = " ";

/**
 * Binds numeric ranges together so they survive wrapping: `18:30 - 19:00`
 * broken across two lines reads as two separate times rather than one span.
 *
 * The schedule fields are free text and the office does not only put clock
 * times in them — `Prije svake mise` is a real value in there. So the column
 * cannot simply be `whitespace-nowrap`: that keeps ranges intact but leaves
 * prose unable to wrap, which is exactly what pushed it out of its column.
 * Protecting only the ranges lets everything else break where it naturally
 * would.
 */
export function bindTimeRanges(value?: string | null): string {
  if (!value) return "";

  const dashes = /(\d)\s*(–|—|-)\s*(\d)/g;
  return value.replace(
    dashes,
    `$1${NON_BREAKING_SPACE}$2${NON_BREAKING_SPACE}$3`,
  );
}

/** Strips spaces and punctuation so `tel:` links dial correctly. */
export function telHref(phone?: string | null): string | undefined {
  if (!phone) return undefined;
  const cleaned = phone.replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : undefined;
}
