import Link from "next/link";
import type { AnchorHTMLAttributes, ReactNode } from "react";

import { HashLink } from "@/components/ui/HashLink";
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
 * `target="_blank"` with the matching `rel`.
 *
 * Anything carrying a fragment is handed to `HashLink`, which is the only
 * variant that needs to run on the client — so a page full of ordinary links
 * ships no extra JavaScript for it.
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
    <Link href={resolved} className={className} {...rest}>
      {children}
    </Link>
  );
}
