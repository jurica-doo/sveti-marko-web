"use client";

import { useState } from "react";

import { SmartLink } from "@/components/ui/SmartLink";
import { ROUTES } from "@/lib/routes";

/**
 * The Google map on the contact page, loaded only when the visitor asks.
 *
 * An embedded map is a request to Google the moment it renders: Google gets the
 * visitor's IP address and may set its own cookies. Without this the contact
 * page did that for everyone who opened it. Now it shows a placeholder the
 * same size as the map, says plainly what showing the map involves, and loads
 * the iframe on click. Nothing is remembered between visits — no cookie, no
 * storage — so the choice is made fresh each time.
 *
 * The "Otvori u Google Kartama" link under it keeps working without this, for
 * anyone who would rather go straight to Google.
 */
export function MapEmbed({
  src,
  title,
  labels,
}: {
  src: string;
  title: string;
  labels: { notice: string; show: string; privacy: string };
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="mt-5 aspect-4/3 w-full overflow-hidden bg-stone-200 ring-1 ring-stone-200 lg:aspect-auto lg:min-h-64 lg:flex-1">
      {loaded ? (
        <iframe
          src={src}
          title={title}
          referrerPolicy="no-referrer-when-downgrade"
          className="h-full w-full border-0"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-5 bg-stone-100 px-6 py-8 text-center">
          <PinIcon />
          <p className="max-w-xs text-[0.88rem] leading-relaxed text-ink-500">
            {labels.notice}{" "}
            <SmartLink
              href={ROUTES.privacy}
              className="text-sea-800 underline underline-offset-2 transition-colors hover:text-brass-600"
            >
              {labels.privacy}
            </SmartLink>
          </p>
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="press cursor-pointer bg-sea-800 px-6 py-3 text-[0.72rem] font-semibold tracking-[0.16em] text-stone-50 uppercase transition-colors hover:bg-sea-700"
          >
            {labels.show}
          </button>
        </div>
      )}
    </div>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
      className="h-9 w-9 text-brass-600"
    >
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 1113 0c0 5.4-6.5 11-6.5 11z" />
      <circle cx="12" cy="10" r="2.4" />
    </svg>
  );
}
