"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useId, useState, type FormEvent, type ReactNode } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";
import { waHref } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/interpolate";
import { DURATION, EASE_PARISH_IN_OUT } from "@/lib/motion";
import { ROUTES } from "@/lib/routes";

type Channel = "whatsapp" | "email";
type Status = "idle" | "sending" | "sent" | "error";
type FieldName = "name" | "email" | "message";
type FieldErrors = Partial<Record<FieldName, string>>;

const INPUT_CLASSES =
  "w-full border px-4 py-3 text-[0.95rem] text-ink-900 transition-colors placeholder:text-ink-400/60 focus:outline-none";

const INPUT_OK = "border-stone-200 bg-stone-50 focus:border-brass-500";
const INPUT_INVALID = "border-red-300 bg-red-50 focus:border-red-400";

// Deliberately loose: it only catches the obvious slips (no `@`, no domain).
// Whether the address really exists is for the reply to find out.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/*
 * The per-field message under an input. It opens the same way the e-mail row
 * does — height and fade together on the parish in-out curve — just quicker,
 * since it is a note on a field rather than a field of its own.
 */
const HINT_TRANSITION = { duration: DURATION.hover, ease: EASE_PARISH_IN_OUT };

/** The rhythm between rows — see the note on the form's own spacing below. */
const ROW_SPACING = "pb-5";

/*
 * Opening and closing the e-mail row.
 *
 * Height and opacity are deliberately out of step. Fading the field in while
 * its box is still opening reads as one gesture — the field arrives together
 * with the space being made for it — so the fade occupies the last stretch of
 * the opening and the first stretch of the closing. Run in lockstep instead,
 * the label and box look squashed against the moving edge.
 *
 * The two are exact mirrors: `HEIGHT - FADE` is the delay in, and the same
 * span leading out, so opening and closing are one movement played each way.
 *
 * `EASE_PARISH_IN_OUT` rather than the default curve, for the reason given
 * where it is defined: the default is front-loaded and snaps on anything that
 * unfolds.
 *
 * Nothing here branches on reduced motion. `height` is one of Framer's
 * positional keys, so the `MotionConfig` in the layout already cuts it to an
 * instant change when the OS asks — while still crossfading the opacity, which
 * is the part that keeps the swap legible.
 */
const ROW_HEIGHT_TRANSITION = { duration: DURATION.move, ease: EASE_PARISH_IN_OUT };
const ROW_FADE_TRANSITION = { duration: DURATION.hover, ease: EASE_PARISH_IN_OUT };

/*
 * The row clips its content only while it is moving. Clipping is what lets the
 * field appear to unfold rather than spill out, but left on once the row is
 * open it also cuts off the input's focus ring, which `:focus-visible` draws
 * 3px *outside* the box — the row is exactly the input's width, so the ring's
 * left and right edges vanished. `transitionEnd` lifts the clip once the row
 * has finished opening, and the collapsed/closed states put it back before
 * anything starts to shrink.
 */
const ROW_COLLAPSED = { height: 0, opacity: 0, overflow: "hidden" };

const ROW_OPEN = {
  height: "auto",
  opacity: 1,
  overflow: "hidden",
  transition: {
    height: ROW_HEIGHT_TRANSITION,
    opacity: { ...ROW_FADE_TRANSITION, delay: DURATION.move - DURATION.hover },
  },
  transitionEnd: { overflow: "visible" },
};

const ROW_CLOSED = {
  ...ROW_COLLAPSED,
  transition: { height: ROW_HEIGHT_TRANSITION, opacity: ROW_FADE_TRANSITION },
};

/**
 * The contact form, offered as two ways to reach the parish office rather
 * than one. WhatsApp needs no server round-trip — the browser hands the
 * pre-filled message straight to `wa.me` — so the pill above the fields picks
 * which path a submit takes, not just how the message is labelled.
 */
export function ContactForm({
  whatsappNumber,
  dict,
}: {
  whatsappNumber?: string | null;
  dict: Dictionary;
}) {
  const [channel, setChannel] = useState<Channel>("email");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const c = dict.contact;

  function selectChannel(next: Channel) {
    setChannel(next);
    setStatus("idle");
    setError(null);
    setFieldErrors({});
  }

  // Typing into a flagged field clears its flag straight away, so the red
  // never outstays the problem it pointed at.
  function clearFieldError(field: FieldName) {
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // One message in flight at a time. The button is disabled while sending,
    // but a fast double Enter or a re-render can still reach this twice.
    if (status === "sending") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    const errors: FieldErrors = {};
    if (!name) errors.name = c.errorFieldRequired;
    if (channel === "email") {
      if (!email) errors.email = c.errorFieldRequired;
      else if (!EMAIL_PATTERN.test(email)) errors.email = c.errorEmailInvalid;
    }
    if (!message) errors.message = c.errorFieldRequired;

    setFieldErrors(errors);
    const firstInvalid = (["name", "email", "message"] as const).find((field) => errors[field]);
    if (firstInvalid) {
      setStatus("idle");
      setError(null);
      form.querySelector<HTMLElement>(`[name="${firstInvalid}"]`)?.focus();
      return;
    }

    if (channel === "whatsapp") {
      // The visitor's own words first, signed off with their name at the end.
      const href = waHref(whatsappNumber, `${message.trim()}\n\n${t(c.whatsappSignoff, { name })}`);
      if (!href) {
        setStatus("error");
        setError(c.errorWhatsappUnavailable);
        return;
      }
      /*
       * Opened without the `noopener` feature on purpose: with it,
       * `window.open` always returns null, so a tab stopped by a popup or
       * ad blocker (uBlock and similar often catch wa.me) was indistinguishable
       * from one that opened — the visitor saw "opening in a new tab" and
       * nothing happened. Now a blocked tab is detected and WhatsApp opens in
       * this tab instead, which no blocker intercepts. The opener link is cut
       * by hand, which is all `noopener` was for.
       */
      const tab = window.open(href, "_blank");
      if (tab) {
        tab.opener = null;
        setStatus("sent");
        form.reset();
      } else {
        window.location.href = href;
      }
      return;
    }

    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // A provider that never answers must not leave the button spinning
        // forever: after this the visitor gets the error, with their text kept.
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          name,
          email,
          message,
          locale: dict.locale,
          website: String(data.get("website") ?? ""),
        }),
      });

      const body = await res.json().catch(() => null);

      // "Sent" only when the server says Resend accepted the office e-mail —
      // not merely on a 2xx, which a proxy or captive portal can also return.
      if (!res.ok || body?.success !== true) {
        setStatus("error");
        // The server's own message is already written for the visitor, in
        // their language; anything else gets the generic one.
        setError(typeof body?.error === "string" ? body.error : c.errorGeneric);
        return;
      }

      setStatus("sent");
      form.reset();
    } catch {
      // Timeout, offline, or a connection dropped mid-request. The browser's
      // own wording for those ("signal timed out", "Failed to fetch") is not
      // something to show a visitor, so they all get the localized message.
      setStatus("error");
      setError(c.errorGeneric);
    }
  }

  return (
    <Reveal className="bg-stone-100 px-6 py-9 ring-1 ring-stone-200 lg:px-10 lg:py-11">
      <p className="eyebrow">{c.eyebrow}</p>
      <h2 className="mt-5 text-[1.9rem] leading-[1.18] text-ink-900 sm:text-[2.1rem]">
        {c.heading}
      </h2>
      <p className="mt-3 max-w-lg text-[1rem] text-ink-500">{c.intro}</p>

      <div
        role="radiogroup"
        aria-label={c.channelGroupLabel}
        className="mt-8 inline-flex gap-1 rounded-full bg-stone-50 p-1 ring-1 ring-stone-200"
      >
        <ChannelPill
          active={channel === "email"}
          onSelect={() => selectChannel("email")}
          icon={<MailIcon />}
        >
          {c.emailTab}
        </ChannelPill>
        <ChannelPill
          active={channel === "whatsapp"}
          onSelect={() => selectChannel("whatsapp")}
          icon={<WhatsAppIcon />}
        >
          {c.whatsappTab}
        </ChannelPill>
      </div>

      {/*
        * The gap between rows is `pb-5` on each row rather than the grid's own
        * `gap-y`, because the e-mail row collapses.
        *
        * A grid track's gap is applied whether or not the track has any height,
        * so a row animating down to `height: 0` still leaves its 1.25rem behind
        * — the form would lose the height of the field but keep a double gap
        * where it used to be, and the rows below would stop 20px short of where
        * they belong. Carrying the spacing *inside* the collapsing box means it
        * closes up with the box, and everything below travels exactly the
        * distance the field occupied.
        *
        * `gap-x-5` stays: it is the column gutter, and nothing about it moves.
        */}
      {/*
        `method="post"` matters only before hydration: a form submitted then has
        no handler yet and falls back to the browser's default, which for a
        method-less form is a GET — the visitor's name, e-mail and message would
        land in the URL, the history and the server logs. As a POST they stay in
        the request body.
      */}
      <form
        method="post"
        onSubmit={handleSubmit}
        noValidate
        className="mt-8 grid gap-x-5 sm:grid-cols-2"
      >
        {/*
          Honeypot. Off-screen rather than `display: none` (which some bots
          skip), out of the tab order and hidden from assistive technology, so
          no person ever fills it. The server treats a filled one as a bot.
        */}
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Website
            <input type="text" name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>

        <Field
          label={c.nameLabel}
          requiredLabel={c.requiredLabel}
          error={fieldErrors.name}
          className={`${ROW_SPACING} sm:col-span-2`}
        >
          {(control) => (
            <input
              {...control}
              name="name"
              maxLength={120}
              autoComplete="name"
              onChange={() => clearFieldError("name")}
            />
          )}
        </Field>

        {/*
          * `initial={false}` so the row is simply *there* on first paint —
          * e-mail is the default channel, and a form that unfolds itself as the
          * page arrives would be animating at nobody.
          */}
        <AnimatePresence initial={false}>
          {channel === "email" ? (
            <motion.div
              key="email"
              initial={ROW_COLLAPSED}
              animate={ROW_OPEN}
              exit={ROW_CLOSED}
              className="sm:col-span-2"
            >
              <Field
                label={c.emailLabel}
                requiredLabel={c.requiredLabel}
                error={fieldErrors.email}
                className={ROW_SPACING}
              >
                {(control) => (
                  <input
                    {...control}
                    name="email"
                    maxLength={254}
                    type="email"
                    autoComplete="email"
                    onChange={() => clearFieldError("email")}
                  />
                )}
              </Field>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <Field
          label={c.messageLabel}
          requiredLabel={c.requiredLabel}
          error={fieldErrors.message}
          className={`${ROW_SPACING} sm:col-span-2`}
        >
          {(control) => (
            <textarea
              {...control}
              name="message"
              maxLength={5000}
              rows={5}
              className={`${control.className} resize-none`}
              onChange={() => clearFieldError("message")}
            />
          )}
        </Field>

        <div className="flex flex-wrap items-center gap-5 sm:col-span-2">
          <button
            type="submit"
            disabled={status === "sending"}
            className={`${buttonClasses("solid")} cursor-pointer disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {status === "sending"
              ? c.sendingLabel
              : channel === "whatsapp"
                ? c.openWhatsapp
                : c.sendMessage}
          </button>

          {status === "sent" ? (
            <p className="text-[0.85rem] text-sea-700">
              {channel === "whatsapp" ? c.sentWhatsapp : c.sentEmail}
            </p>
          ) : null}

          {status === "error" && error ? (
            <p className="text-[0.85rem] text-red-700">{error}</p>
          ) : null}
        </div>

        {/* What happens to what they type, said where they type it. */}
        <p className="mt-6 text-[0.8rem] leading-relaxed text-ink-400 sm:col-span-2">
          {c.privacyNote}{" "}
          <SmartLink
            href={ROUTES.privacy}
            className="text-sea-800 underline underline-offset-2 transition-colors hover:text-brass-600"
          >
            {dict.privacy.linkLabel}
          </SmartLink>
        </p>
      </form>
    </Reveal>
  );
}

function ChannelPill({
  active,
  onSelect,
  icon,
  children,
}: {
  active: boolean;
  onSelect: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={`press inline-flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
        active ? "bg-sea-800 text-stone-50" : "text-ink-500 hover:text-ink-900"
      }`}
    >
      {icon}
      {/* Icon-only on phones; the label stays as the radio's accessible name. */}
      <span className="sr-only sm:not-sr-only">{children}</span>
    </button>
  );
}

type ControlProps = {
  id: string;
  required: true;
  "aria-invalid": boolean;
  "aria-describedby"?: string;
  className: string;
};

/**
 * A labelled, required form control with its own error line.
 *
 * The control itself comes from `children` so the same shell serves both the
 * `<input>`s and the message `<textarea>`; the shell owns everything the two
 * share — the label and its asterisk, the invalid styling, and the message
 * that slides open underneath.
 *
 * The asterisk is decoration only: screen readers get `required` on the
 * control plus a visually hidden "required field" in the label, which reads
 * better than "star".
 */
function Field({
  label,
  requiredLabel,
  error,
  className = "",
  children,
}: {
  label: string;
  requiredLabel: string;
  error?: string;
  className?: string;
  children: (control: ControlProps) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400"
      >
        {label}
        <span aria-hidden="true" className="ml-1 text-red-700">
          *
        </span>
        <span className="sr-only"> ({requiredLabel})</span>
      </label>

      <div className="mt-2">
        {children({
          id,
          required: true,
          "aria-invalid": Boolean(error),
          "aria-describedby": error ? errorId : undefined,
          className: `${INPUT_CLASSES} ${error ? INPUT_INVALID : INPUT_OK}`,
        })}
      </div>

      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            key="error"
            id={errorId}
            role="alert"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={HINT_TRANSITION}
            className="overflow-hidden"
          >
            <span className="block pt-2 text-[0.82rem] text-red-700">{error}</span>
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/*
 * Sized in CSS rather than via the `width`/`height` attributes: the pill's
 * label wraps to two lines below `sm` (there isn't room for it beside the
 * icon otherwise), which leaves the icon sitting next to a taller block of
 * text than a single-line pill would — a fixed 15px icon read as an
 * afterthought next to it. Growing the icon (not the pill's own padding)
 * answers that without making the pill itself any wider.
 */
const PILL_ICON_CLASSES = "h-4.5 w-4.5 shrink-0 lg:h-5 lg:w-5";

function WhatsAppIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={PILL_ICON_CLASSES}
    >
      <path d="M12 5.5a6.4 6.4 0 00-5.5 9.7L5.6 19l3.9-1a6.4 6.4 0 102.5-12.5zm0 11.7a5.3 5.3 0 01-2.7-.7l-.2-.1-2.3.6.6-2.2-.1-.2a5.3 5.3 0 114.7 2.6z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
      className={PILL_ICON_CLASSES}
    >
      <rect x="4" y="6" width="16" height="12" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}
