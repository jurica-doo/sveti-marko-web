"use client";

import { useState, type FormEvent, type ReactNode } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { waHref } from "@/lib/format";

type Channel = "whatsapp" | "email";
type Status = "idle" | "sending" | "sent" | "error";

const INPUT_CLASSES =
  "w-full border border-stone-200 bg-stone-50 px-4 py-3 text-[0.95rem] text-ink-900 transition-colors placeholder:text-ink-400/60 focus:border-brass-500 focus:outline-none";

/**
 * The contact form, offered as two ways to reach the parish office rather
 * than one. WhatsApp needs no server round-trip — the browser hands the
 * pre-filled message straight to `wa.me` — so the pill above the fields picks
 * which path a submit takes, not just how the message is labelled.
 */
export function ContactForm({
  whatsappNumber,
}: {
  whatsappNumber?: string | null;
}) {
  const [channel, setChannel] = useState<Channel>("whatsapp");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

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
      setError(
        channel === "email"
          ? "Ime, e-mail i poruka su obavezni."
          : "Ime i poruka su obavezni.",
      );
      return;
    }

    if (channel === "whatsapp") {
      const href = waHref(whatsappNumber, `Pozdrav, ja sam ${name}.\n\n${message}`);
      if (!href) {
        setStatus("error");
        setError("WhatsApp trenutno nije dostupan — pošaljite e-mail poruku.");
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
        body: JSON.stringify({ name, email, message }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Nešto je pošlo po krivu.");
      }

      setStatus("sent");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Nešto je pošlo po krivu.");
    }
  }

  return (
    <Reveal className="bg-stone-100 px-6 py-9 ring-1 ring-stone-200 lg:px-10 lg:py-11">
      <p className="eyebrow">Javite nam se</p>
      <h2 className="mt-5 text-[1.9rem] leading-[1.18] text-ink-900 sm:text-[2.1rem]">
        Pošaljite poruku
      </h2>
      <p className="mt-3 max-w-lg text-[1rem] text-ink-500">
        Odaberite kako vam je lakše javiti se — poruka na WhatsApp ili izravno
        na e-mail župnog ureda.
      </p>

      <div
        role="radiogroup"
        aria-label="Način slanja poruke"
        className="mt-8 inline-flex gap-1 rounded-full bg-stone-50 p-1 ring-1 ring-stone-200"
      >
        <ChannelPill
          active={channel === "whatsapp"}
          onSelect={() => selectChannel("whatsapp")}
          icon={<WhatsAppIcon />}
        >
          WhatsApp poruka
        </ChannelPill>
        <ChannelPill
          active={channel === "email"}
          onSelect={() => selectChannel("email")}
          icon={<MailIcon />}
        >
          E-mail poruka
        </ChannelPill>
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-8 grid gap-5 sm:grid-cols-2">
        <Field
          label="Ime i prezime"
          name="name"
          autoComplete="name"
          required
          className="sm:col-span-2"
        />

        {channel === "email" ? (
          <Field
            label="E-mail"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="sm:col-span-2"
          />
        ) : null}

        <label className="block sm:col-span-2">
          <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
            Poruka
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
            className={`${buttonClasses("solid")} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {status === "sending"
              ? "Šalje se…"
              : channel === "whatsapp"
                ? "Otvori WhatsApp"
                : "Pošalji poruku"}
          </button>

          {status === "sent" ? (
            <p className="text-[0.85rem] text-sea-700">
              {channel === "whatsapp"
                ? "WhatsApp se otvara u novoj kartici."
                : "Poruka je poslana. Javit ćemo vam se uskoro."}
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
      className={`press inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.14em] transition-colors ${
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

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 5.5a6.4 6.4 0 00-5.5 9.7L5.6 19l3.9-1a6.4 6.4 0 102.5-12.5zm0 11.7a5.3 5.3 0 01-2.7-.7l-.2-.1-2.3.6.6-2.2-.1-.2a5.3 5.3 0 114.7 2.6z" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="4" y="6" width="16" height="12" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}
