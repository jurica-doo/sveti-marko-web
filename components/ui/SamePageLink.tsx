"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

import { isCurrentPage } from "@/lib/routes";
import {
  isModifiedClick,
  requestScrollGlide,
  scrollToDeferred,
} from "@/lib/scroll";

/** Fired on `window` when a link changes only this page's query; `detail` is the query. */
export const QUERY_JUMP_EVENT = "samepagelink:query";

type SamePageLinkProps = {
  /** Already normalised by `internalHref`, and carries no fragment. */
  href: string;
  children: ReactNode;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

/**
 * An internal link that answers when it points at the page you are already on.
 *
 * Clicking "Kontakt" in the header while reading /kontakt/ is otherwise the one
 * link on the site that does nothing at all: the router sees the same route,
 * renders nothing new, and the viewer is left wondering whether the click
 * landed. Gliding back to the top is the acknowledgement — the same motion the
 * `#raspored` links already make, so a click means the same thing everywhere.
 *
 * Every other case falls through to the router untouched.
 */
export function SamePageLink({
  href,
  children,
  onClick,
  ...rest
}: SamePageLinkProps) {
  const pathname = usePathname();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (event.defaultPrevented) return;

    // Leave new-tab, new-window and middle clicks to the browser.
    if (isModifiedClick(event)) return;

    /*
     * Going somewhere else. The router does the navigating, but `scroll={false}`
     * below leaves it to land at the outgoing page's offset; flagging it here
     * lets `ScrollReset` glide the new page up to the top once it has rendered.
     */
    /*
     * Same page, new query (`/raspored/` → `/raspored/?otvori=liturgija`). The
     * router updates the address without scrolling or remounting, so glide to
     * the top here and announce the query for the page to act on — that also
     * covers pressing the same link twice, when the address does not change
     * at all and nothing else would notice.
     */
    const queryAt = href.indexOf("?");
    if (queryAt !== -1 && isCurrentPage(pathname, href.slice(0, queryAt))) {
      scrollToDeferred(0);
      window.dispatchEvent(
        new CustomEvent(QUERY_JUMP_EVENT, { detail: href.slice(queryAt + 1).split("#")[0] }),
      );
      return;
    }

    if (!isCurrentPage(pathname, href)) {
      requestScrollGlide();
      return;
    }

    event.preventDefault();
    scrollToDeferred(0);
  }

  /*
   * `scroll={false}` hands the landing position to `ScrollReset`.
   *
   * Left on, the router jumps the page itself — to 80px, or not at all — before
   * anything of ours runs, and the glide would then start from there instead of
   * from where the viewer actually was. Switching it off keeps the incoming page
   * at the outgoing page's offset, which is where the animation has to begin.
   *
   * It also switches off the router's `domNode.focus()`, which costs nothing
   * here: the segment it focuses is not a focusable element, so focus stays on
   * the link that was clicked either way.
   */
  return (
    <Link href={href} onClick={handleClick} scroll={false} {...rest}>
      {children}
    </Link>
  );
}
