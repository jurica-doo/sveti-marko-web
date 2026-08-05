import type { AnchorHTMLAttributes, ReactNode } from "react";

import { HashLink } from "@/components/ui/HashLink";
import { SamePageLink } from "@/components/ui/SamePageLink";
import { internalHref, isExternalHref } from "@/lib/routes";

type SmartLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

/**
 * The only link component in the app.
 *
 * Internal paths are normalised to the trailing-slash form the site is served
 * under, so no navigation ever costs a 308 redirect. External links get
 * `target="_blank"` with the matching `rel` and stay a plain `<a>`.
 *
 * Both internal variants run on the client, because both have to answer a click
 * that the router would otherwise treat as a no-op: `HashLink` scrolls to a
 * fragment already on the page, and `SamePageLink` scrolls back to the top when
 * the link points at the page you are reading. They are two small components
 * shared by every link on the site, not per-link JavaScript.
 */
export function SmartLink({ href, children, className, ...rest }: SmartLinkProps) {
  if (isExternalHref(href)) {
    const opensNewTab = href.startsWith("http") || href.startsWith("//");
    return (
      <a
        href={href}
        className={className}
        {...(opensNewTab
          ? { target: "_blank", rel: "noopener noreferrer" }
          : {})}
        {...rest}
      >
        {children}
      </a>
    );
  }

  const resolved = internalHref(href);

  if (resolved.includes("#")) {
    return (
      <HashLink href={resolved} className={className} {...rest}>
        {children}
      </HashLink>
    );
  }

  return (
    <SamePageLink href={resolved} className={className} {...rest}>
      {children}
    </SamePageLink>
  );
}
