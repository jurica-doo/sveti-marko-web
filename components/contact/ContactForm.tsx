"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, type FormEvent, type ReactNode } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { waHref } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { t } from "@/lib/i18n/interpolate";
import { DURATION, EASE_PARISH_IN_OUT } from "@/lib/motion";

type Channel = "whatsapp" | "email";
type Status = "idle" | "sending" | "sent" | "error";

const INPUT_CLASSES =
  "w-full border border-stone-200 bg-stone-50 px-4 py-3 text-[0.95rem] text-ink-900 transition-colors placeholder:text-ink-400/60 focus:border-brass-500 focus:outline-none";

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

const ROW_COLLAPSED = { height: 0, opacity: 0 };

const ROW_OPEN = {
  height: "auto",
  opacity: 1,
  transition: {
    height: ROW_HEIGHT_TRANSITION,
    opacity: { ...ROW_FADE_TRANSITION, delay: DURATION.move - DURATION.hover },
  },
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
  const c = dict.contact;

  function selectChannel(next: Channel) {
    setChannel(next);
    setStatus("idle");
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    const message = String(data.get("message") ?? "").trim();

    if (!name || !message || (channel === "email" && !email)) {
      setStatus("error");
      setError(channel === "email" ? c.errorRequiredWithEmail : c.errorRequired);
      return;
    }

    if (channel === "whatsapp") {
      const href = waHref(whatsappNumber, t(c.whatsappGreeting, { name }) + `\n\n${message}`);
      if (!href) {
        setStatus("error");
        setError(c.errorWhatsappUnavailable);
        return;
      }
      window.open(href, "_blank", "noopener,noreferrer");
      setStatus("sent");
      form.reset();
      return;
    }

    setStatus("sending");
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, locale: dict.locale }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || c.errorGeneric);
      }

      setStatus("sent");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : c.errorGeneric);
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
      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-x-5 sm:grid-cols-2">
        <Field
          label={c.nameLabel}
          name="name"
          autoComplete="name"
          required
          className={`${ROW_SPACING} sm:col-span-2`}
        />

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
              className="overflow-hidden sm:col-span-2"
            >
              <Field
                label={c.emailLabel}
                name="email"
                type="email"
                autoComplete="email"
                required
                className={ROW_SPACING}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <label className={`block ${ROW_SPACING} sm:col-span-2`}>
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
            {c.messageLabel}
          </span>
          <textarea
            name="message"
            required
            rows={5}
            className={`${INPUT_CLASSES} mt-2 resize-none`}
          />
        </label>

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
      {children}
    </button>
  );
}

function Field({
  label,
  className = "",
  ...rest
}: {
  label: string;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
        {label}
      </span>
      <input {...rest} className={`${INPUT_CLASSES} mt-2`} />
    </label>
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
