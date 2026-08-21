/**
 * `"Pozdrav, ja sam {name}."` → `"Pozdrav, ja sam Ana."`
 *
 * Split out from `dictionaries.ts` on purpose: that module is `server-only`
 * (it does the JSON imports), and this helper is used from client components
 * like `ContactForm` that already hold a `Dictionary` value passed down as a
 * prop — they just need to fill in a placeholder, not load one themselves.
 */
export function t(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    key in vars ? String(vars[key]) : match,
  );
}
