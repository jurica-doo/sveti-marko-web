/**
 * The Framer Motion half of the motion system.
 *
 * The values here mirror the `--duration-*` and `--ease-parish` tokens in
 * `app/globals.css` one for one, so a JS-driven animation and the CSS hover
 * next to it run on the same curve for the same time. Nothing in the app should
 * write a raw duration or cubic-bézier: import from here instead.
 */

/** `--ease-parish`, in the tuple form Framer wants. */
export const EASE_PARISH: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * `--ease-parish-in-out`. The default curve above is heavily front-loaded — it
 * covers 40% of the distance in the first 10% of the time, which is right for
 * something answering a pointer but reads as a snap on anything that unfolds.
 * This one eases at both ends, so opening and closing feel like the same
 * gesture run forwards and backwards.
 */
export const EASE_PARISH_IN_OUT: [number, number, number, number] = [
  0.65, 0, 0.35, 1,
];

/** Seconds, matching the CSS tokens of the same name. */
export const DURATION = {
  press: 0.12,
  hover: 0.32,
  move: 0.5,
  reveal: 0.7,
  zoom: 0.9,
} as const;

type DurationName = keyof typeof DURATION;

/**
 * Page scrolling, in seconds, kept apart from the element scale above.
 *
 * A scroll covers a whole viewport or more, where an element animation covers a
 * few pixels, so the two cannot share a duration — at element speed a full-page
 * jump reads as a lurch. `perPixel` sets the pace, `min` and `max` keep a short
 * hop from feeling abrupt and a long one from outstaying its welcome.
 */
export const SCROLL = {
  min: 0.7,
  max: 1.2,
  perPixel: 0.0007,
} as const;

/**
 * Transition for a `motion` element.
 *
 * `transition("move")` is the whole vocabulary; `delay` is the only thing a
 * caller ever varies, for staggering a list.
 */
export function transition(name: DurationName, delay = 0) {
  return { duration: DURATION[name], delay, ease: EASE_PARISH };
}

/**
 * `--ease-parish` as a plain function of progress, for animations the browser
 * runs for us but the platform will not ease — scrolling, chiefly, where every
 * native path is instant once the OS asks for reduced motion.
 *
 * A CSS timing function maps x (elapsed fraction) to y (eased fraction), but a
 * cubic bézier is only defined parametrically, so x has to be inverted first.
 * Newton–Raphson converges in a couple of steps across almost the whole curve;
 * bisection is the fallback for the flat stretch at the end, where the
 * derivative approaches zero and Newton would overshoot.
 */
export function easeParish(x: number): number {
  const [x1, y1, x2, y2] = EASE_PARISH;

  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  if (x <= 0) return 0;
  if (x >= 1) return 1;

  let t = x;

  for (let i = 0; i < 8; i += 1) {
    const error = sampleX(t) - x;
    if (Math.abs(error) < 1e-5) return sampleY(t);

    const slope = slopeX(t);
    if (Math.abs(slope) < 1e-6) break;

    t -= error / slope;
  }

  let low = 0;
  let high = 1;
  t = x;

  for (let i = 0; i < 24; i += 1) {
    const error = sampleX(t) - x;
    if (Math.abs(error) < 1e-5) break;

    if (error > 0) high = t;
    else low = t;

    t = (low + high) / 2;
  }

  return sampleY(t);
}
