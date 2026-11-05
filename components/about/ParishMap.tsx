"use client";

import { motion, useInView, useReducedMotion } from "framer-motion";
import { useRef, useState } from "react";

import { Reveal } from "@/components/ui/Reveal";
import { SmartLink } from "@/components/ui/SmartLink";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { DURATION, EASE_PARISH, EASE_PARISH_IN_OUT } from "@/lib/motion";
import { PARISH_MAP } from "@/lib/parish-map-data";
import { ROUTES } from "@/lib/routes";

/**
 * The parish territory, drawn as a self-contained SVG.
 *
 * Deliberately not a tile map: the geometry is baked into
 * `lib/parish-map-data.ts` (see `scripts/build-parish-map.py`), so the map
 * makes no third-party request, needs no consent gate like the Google map on
 * the contact page, and costs nothing but a few KB of path data.
 *
 * On first view it draws itself — the boundary traces round, the streets
 * follow one after another, then the church pin drops in. Hovering, focusing or
 * tapping a street in the list lights that street up and dims the rest.
 *
 * The draw-in uses `pathLength`, which `MotionConfig` in the layout does not
 * cut for reduced motion, so that case is checked here and the map is simply
 * shown finished.
 */
export function ParishMap({ dict }: { dict: Dictionary }) {
  const a = dict.about;
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: "-120px" });
  const [active, setActive] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const reduced = Boolean(useReducedMotion());

  const [w, h] = PARISH_MAP.viewBox;
  const [cx, cy] = PARISH_MAP.church;
  const shown = reduced || inView;
  const focus = active ?? pinned;

  // Map data names → dictionary entries, in the dictionary's (alphabetical) order.
  const streets = a.parishStreets.map((entry) => ({
    ...entry,
    geometry: PARISH_MAP.streets.find((s) => s.name === entry.name),
  }));

  const draw = (delay: number, duration = 1.1) =>
    reduced
      ? { duration: 0 }
      : { pathLength: { duration, delay, ease: EASE_PARISH_IN_OUT }, opacity: { duration: 0.2, delay } };

  return (
    <section className="py-16 lg:py-24">
      <div className="shell">
        <Reveal className="max-w-2xl">
          <p className="eyebrow">{a.mapEyebrow}</p>
          <h2 className="mt-5 text-[1.9rem] leading-[1.18] text-ink-900 sm:text-[2.3rem]">
            {a.mapTitle}
          </h2>
          <p className="mt-4 text-[1rem] leading-relaxed text-ink-500">{a.mapIntro}</p>
        </Reveal>

        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-12 lg:gap-10">
          {/* The map */}
          <Reveal className="relative overflow-hidden bg-stone-100 ring-1 ring-stone-200 lg:col-span-8">
            <svg
              ref={ref}
              viewBox={`0 0 ${w} ${h}`}
              role="img"
              aria-label={a.mapAriaLabel}
              className="block h-auto w-full"
            >
              <defs>
                <radialGradient id="pm-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="var(--color-brass-300)" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="var(--color-brass-300)" stopOpacity="0" />
                </radialGradient>
                <pattern id="pm-hatch" width="9" height="9" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <line x1="0" y1="0" x2="0" y2="9" stroke="var(--color-brass-500)" strokeOpacity="0.14" strokeWidth="3" />
                </pattern>
                {/* Soft fade at the frame edges, so the city runs off rather than stops. */}
                <radialGradient id="pm-vignette-g" cx="50%" cy="50%" r="70%">
                  <stop offset="60%" stopColor="#fff" />
                  <stop offset="100%" stopColor="#000" />
                </radialGradient>
                <mask id="pm-vignette">
                  <rect width={w} height={h} fill="url(#pm-vignette-g)" />
                </mask>
              </defs>

              {/* City context */}
              <g mask="url(#pm-vignette)" fill="none" strokeLinecap="round" strokeLinejoin="round">
                <g stroke="var(--color-stone-300)" strokeOpacity="0.7" strokeWidth="1.4">
                  {PARISH_MAP.roads.minor.map((d, i) => (
                    <path key={i} d={d} />
                  ))}
                </g>
                <g stroke="var(--color-stone-300)" strokeWidth="3.2">
                  {PARISH_MAP.roads.mid.map((d, i) => (
                    <path key={i} d={d} />
                  ))}
                </g>
                <g stroke="var(--color-stone-300)" strokeWidth="5">
                  {PARISH_MAP.roads.major.map((d, i) => (
                    <path key={i} d={d} />
                  ))}
                </g>
                <g stroke="var(--color-ink-400)" strokeOpacity="0.35" strokeWidth="1.6" strokeDasharray="5 5">
                  {PARISH_MAP.rail.map((d, i) => (
                    <path key={i} d={d} />
                  ))}
                </g>
              </g>

              {/* Parish boundary: fill fades in once its outline has traced round. */}
              <motion.path
                d={PARISH_MAP.boundary}
                fill="url(#pm-hatch)"
                initial={{ opacity: 0 }}
                animate={shown ? { opacity: 1 } : undefined}
                transition={reduced ? { duration: 0 } : { duration: 0.9, delay: 1.2, ease: EASE_PARISH }}
              />
              <motion.path
                d={PARISH_MAP.boundary}
                fill="var(--color-brass-300)"
                initial={{ opacity: 0 }}
                animate={shown ? { opacity: 0.12 } : undefined}
                transition={reduced ? { duration: 0 } : { duration: 0.9, delay: 1.2, ease: EASE_PARISH }}
              />
              <motion.path
                d={PARISH_MAP.boundary}
                fill="none"
                stroke="var(--color-brass-500)"
                strokeWidth="2.4"
                strokeLinecap="round"
                initial={{ pathLength: reduced ? 1 : 0, opacity: reduced ? 1 : 0 }}
                animate={shown ? { pathLength: 1, opacity: 1 } : undefined}
                transition={draw(0.1, 1.6)}
              />
              {/* A slow dash crawling along the outline once it is drawn. */}
              {shown && !reduced ? (
                <path
                  d={PARISH_MAP.boundary}
                  fill="none"
                  stroke="var(--color-stone-50)"
                  strokeWidth="2.6"
                  strokeDasharray="2 14"
                  className="parish-map-march"
                />
              ) : null}

              {/* The parish streets */}
              <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                {streets.map((street, i) => {
                  const lit = focus === street.name;
                  const dim = focus !== null && !lit;
                  return (
                    <g
                      key={street.name}
                      className="transition-opacity"
                      style={{
                        opacity: dim ? 0.28 : 1,
                        transitionDuration: `${DURATION.hover}s`,
                      }}
                    >
                      {street.geometry?.d.map((d, j) => (
                        <g key={j}>
                          {/* Halo, so the street reads over the hatching */}
                          <motion.path
                            d={d}
                            stroke="var(--color-stone-50)"
                            strokeWidth={lit ? 13 : 9}
                            initial={{ pathLength: reduced ? 1 : 0, opacity: reduced ? 1 : 0 }}
                            animate={shown ? { pathLength: 1, opacity: 1 } : undefined}
                            transition={draw(0.6 + i * 0.12, 0.9)}
                          />
                          <motion.path
                            d={d}
                            stroke={lit ? "var(--color-brass-500)" : "var(--color-sea-800)"}
                            strokeWidth={lit ? 7 : 4.5}
                            style={{ transition: `stroke ${DURATION.hover}s, stroke-width ${DURATION.hover}s` }}
                            initial={{ pathLength: reduced ? 1 : 0, opacity: reduced ? 1 : 0 }}
                            animate={shown ? { pathLength: 1, opacity: 1 } : undefined}
                            transition={draw(0.6 + i * 0.12, 0.9)}
                          />
                        </g>
                      ))}
                    </g>
                  );
                })}
              </g>

              {/* Highlighted street's name, on the map */}
              {focus
                ? (() => {
                    const s = PARISH_MAP.streets.find((x) => x.name === focus);
                    if (!s) return null;
                    const [lx, ly] = s.anchor;
                    const x = Math.min(Math.max(lx, 90), w - 90);
                    return (
                      <motion.g
                        key={focus}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: DURATION.hover, ease: EASE_PARISH }}
                        pointerEvents="none"
                      >
                        <rect
                          x={x - focus.length * 5.4 - 14}
                          y={ly - 46}
                          width={focus.length * 10.8 + 28}
                          height={30}
                          rx={15}
                          fill="var(--color-ink-900)"
                        />
                        <text
                          x={x}
                          y={ly - 26}
                          textAnchor="middle"
                          fontSize="16"
                          fontWeight="600"
                          fill="var(--color-stone-50)"
                          style={{ letterSpacing: "0.02em" }}
                        >
                          {focus}
                        </text>
                      </motion.g>
                    );
                  })()
                : null}

              {/* Church pin */}
              <motion.g
                initial={{ opacity: 0, y: reduced ? 0 : -24 }}
                animate={shown ? { opacity: 1, y: 0 } : undefined}
                transition={reduced ? { duration: 0 } : { duration: 0.7, delay: 2.1, ease: EASE_PARISH }}
              >
                {!reduced ? (
                  <circle cx={cx} cy={cy} r="16" fill="url(#pm-glow)" className="parish-map-pulse" style={{ transformOrigin: `${cx}px ${cy}px` }} />
                ) : null}
                <circle cx={cx} cy={cy} r="34" fill="url(#pm-glow)" />
                <circle cx={cx} cy={cy} r="15" fill="var(--color-brass-500)" stroke="var(--color-stone-50)" strokeWidth="3" />
                {/* Cross */}
                <path
                  d={`M${cx} ${cy - 8}V${cy + 8}M${cx - 5.5} ${cy - 3}H${cx + 5.5}`}
                  stroke="var(--color-stone-50)"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </motion.g>
            </svg>

            {/* Legend + attribution */}
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-stone-200 bg-stone-50/80 px-5 py-3 text-[0.72rem] text-ink-400 backdrop-blur-sm">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-full bg-brass-500 ring-2 ring-brass-100" />
                  {a.mapChurch}
                </span>
                <span className="inline-flex items-center gap-2">
                  <span aria-hidden="true" className="inline-block h-0.75 w-5 rounded-full bg-sea-800" />
                  {a.mapEyebrow}
                </span>
              </div>
              <a
                href="https://www.openstreetmap.org/copyright"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-brass-600"
              >
                {a.mapAttribution}
              </a>
            </div>
          </Reveal>

          {/* The street list */}
          <Reveal delay={0.1} className="lg:col-span-4">
            <h3 className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-ink-400">
              {a.mapStreetsLabel}
            </h3>
            <ul className="mt-4 divide-y divide-stone-200 border-y border-stone-200" onMouseLeave={() => setActive(null)}>
              {streets.map((street, i) => {
                const lit = focus === street.name;
                return (
                  <motion.li
                    key={street.name}
                    initial={{ opacity: 0, x: reduced ? 0 : 12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: DURATION.move, delay: reduced ? 0 : 0.15 + i * 0.05, ease: EASE_PARISH }}
                  >
                    <button
                      type="button"
                      aria-pressed={pinned === street.name}
                      onMouseEnter={() => setActive(street.name)}
                      onFocus={() => setActive(street.name)}
                      onBlur={() => setActive(null)}
                      onClick={() => setPinned((p) => (p === street.name ? null : street.name))}
                      className={`group flex w-full cursor-pointer items-baseline gap-3 py-3 text-left transition-colors ${
                        lit ? "text-ink-900" : "text-ink-700"
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`relative -top-px inline-block h-2 w-2 shrink-0 rounded-full transition-all ${
                          lit ? "scale-125 bg-brass-500" : "bg-sea-800/70 group-hover:bg-brass-500"
                        }`}
                      />
                      <span className="flex-1">
                        <span className="block text-[0.98rem] font-medium">{street.name}</span>
                        <span className="block text-[0.8rem] text-ink-400">{street.range}</span>
                      </span>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
            <p className="mt-5 text-[0.85rem] text-ink-500">
              <SmartLink
                href={ROUTES.contact}
                className="text-sea-800 underline underline-offset-2 transition-colors hover:text-brass-600"
              >
                {a.mapNote}
              </SmartLink>
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
