"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";

import { isCurrentPage } from "@/lib/routes";
import { isModifiedClick, scrollToDeferred } from "@/lib/scroll";

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

    // Going somewhere else — let the router navigate and land at the top.
    if (!isCurrentPage(pathname, href)) return;

    event.preventDefault();
    scrollToDeferred(0);
  }

  return (
    <Link href={href} onClick={handleClick} {...rest}>
      {children}
    </Link>
  );
}
