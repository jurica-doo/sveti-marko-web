"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { HASH_JUMP_EVENT } from "@/components/ui/HashLink";
import { DURATION } from "@/lib/motion";

type AccordionState = {
  openId: string | null;
  /** Phones: open this section or close it again, pinning `anchor` meanwhile. */
  toggle: (id: string, anchor: HTMLElement) => void;
  /** Desktop board: show this section. Never closes — a tile is always chosen. */
  select: (id: string) => void;
};

const AccordionContext = createContext<AccordionState | null>(null);

export function useScheduleAccordion(): AccordionState {
  const value = useContext(AccordionContext);
  if (!value) throw new Error("ScheduleSection must be rendered inside ScheduleAccordion");
  return value;
}

/**
 * The one piece of state the Raspored page has — which section is open — shared
 * by its two layouts: the folding sections on phones (`ScheduleSection`) and the
 * tile board on desktop (`ScheduleBoard`).
 *
 * On phones it behaves as one accordion: everything starts closed, and opening
 * a section closes whichever one was open.
 *
 * The catch with "one open at a time" is the page jumping. Open "Zborovi" while
 * "Vjeronauk" above it is open, and Vjeronauk's table folds away above the
 * reader — everything below it, including the heading they just tapped, slides
 * up by that table's height, often off the screen entirely. So for the length
 * of the fold the tapped heading is pinned: each frame, whatever distance it
 * has drifted from where it was tapped is scrolled back. To the reader the
 * heading stays under their finger while the content above it disappears.
 *
 * The browser's own scroll anchoring would try to make the same correction by
 * its own rules, and the two would fight; the wrapper switches it off
 * (`overflow-anchor: none`) so this is the only thing moving the page. Any
 * wheel, touch or key from the reader cancels the pinning at once — their
 * scroll always wins.
 *
 * A link straight to a section (`/raspored/#vjeronauk`, as the footer uses)
 * opens that one section on arrival.
 */
export function ScheduleAccordion({ children }: { children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const cancelPin = useRef<(() => void) | null>(null);

  useEffect(() => {
    const target = window.location.hash.slice(1);
    // After the first paint, so the server and client markup still agree.
    const frame = target
      ? requestAnimationFrame(() => setOpenId(decodeURIComponent(target)))
      : undefined;

    // Already on the page and sent to a section again by a footer link: open it.
    const onJump = (event: Event) =>
      setOpenId(decodeURIComponent((event as CustomEvent<string>).detail));
    window.addEventListener(HASH_JUMP_EVENT, onJump);

    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener(HASH_JUMP_EVENT, onJump);
    };
  }, []);

  useEffect(() => () => cancelPin.current?.(), []);

  const pin = useCallback((anchor: HTMLElement) => {
    cancelPin.current?.();

    const startTop = anchor.getBoundingClientRect().top;
    // The fold runs for `--duration-move`; a little slack covers the last frame.
    const until = performance.now() + DURATION.move * 1000 + 100;
    let frame = 0;

    const stop = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchstart", stop);
      window.removeEventListener("keydown", stop);
      cancelPin.current = null;
    };

    const step = (now: number) => {
      const drift = anchor.getBoundingClientRect().top - startTop;
      if (Math.abs(drift) > 0.5) window.scrollBy({ top: drift, behavior: "instant" });
      if (now < until) frame = requestAnimationFrame(step);
      else stop();
    };

    const options = { passive: true } as const;
    window.addEventListener("wheel", stop, options);
    window.addEventListener("touchstart", stop, options);
    window.addEventListener("keydown", stop);
    frame = requestAnimationFrame(step);
    cancelPin.current = stop;
  }, []);

  const toggle = useCallback(
    (id: string, anchor: HTMLElement) => {
      setOpenId((current) => (current === id ? null : id));
      pin(anchor);
    },
    [pin],
  );

  const value = useMemo(() => ({ openId, toggle, select: setOpenId }), [openId, toggle]);

  return (
    <AccordionContext.Provider value={value}>
      <div className="[overflow-anchor:none]">{children}</div>
    </AccordionContext.Provider>
  );
}
