import { Fragment, type ReactNode } from "react";

import { SmartLink } from "@/components/ui/SmartLink";
import type { RichText, RichTextNode } from "./types";

/**
 * Minimal renderer for Payload's Lexical output. The parish editor only ever
 * uses headings, paragraphs, lists, links and basic marks, so a full converter
 * package would be dead weight.
 */

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
const HEADING_TAGS = new Set<string>(["h1", "h2", "h3", "h4", "h5", "h6"]);

const FORMAT_BOLD = 1;
const FORMAT_ITALIC = 1 << 1;
const FORMAT_UNDERLINE = 1 << 3;

function renderText(node: RichTextNode, key: string): ReactNode {
  const format = typeof node.format === "number" ? node.format : 0;
  let content: ReactNode = node.text ?? "";

  if (format & FORMAT_BOLD) content = <strong>{content}</strong>;
  if (format & FORMAT_ITALIC) content = <em>{content}</em>;
  if (format & FORMAT_UNDERLINE) content = <u>{content}</u>;

  return <Fragment key={key}>{content}</Fragment>;
}

function renderChildren(node: RichTextNode, keyPrefix: string): ReactNode[] {
  return (node.children ?? []).map((child, index) =>
    renderNode(child, `${keyPrefix}-${index}`),
  );
}

function renderNode(node: RichTextNode, key: string): ReactNode {
  switch (node.type) {
    case "text":
      return renderText(node, key);

    case "linebreak":
      return <br key={key} />;

    case "heading": {
      // The tag name comes from the stored document, so it is checked against
      // the headings Lexical can produce: a tampered `"tag": "script"` would
      // otherwise render a live <script> into the server HTML.
      const Tag = HEADING_TAGS.has(node.tag as string) ? (node.tag as HeadingTag) : "h3";
      return <Tag key={key}>{renderChildren(node, key)}</Tag>;
    }

    case "list": {
      const Tag = node.listType === "number" ? "ol" : "ul";
      return <Tag key={key}>{renderChildren(node, key)}</Tag>;
    }

    case "listitem":
      return <li key={key}>{renderChildren(node, key)}</li>;

    case "quote":
      return <blockquote key={key}>{renderChildren(node, key)}</blockquote>;

    case "link":
    case "autolink": {
      const href = node.fields?.url || node.url || "#";
      return (
        <SmartLink key={key} href={href}>
          {renderChildren(node, key)}
        </SmartLink>
      );
    }

    case "paragraph": {
      const children = renderChildren(node, key);
      if (children.length === 0) return null;
      return <p key={key}>{children}</p>;
    }

    default:
      return <Fragment key={key}>{renderChildren(node, key)}</Fragment>;
  }
}

export function RichTextRenderer({
  content,
  className = "prose-parish",
}: {
  content?: RichText;
  className?: string;
}) {
  const children = content?.root?.children;
  if (!children?.length) return null;

  return (
    <div className={className}>
      {children.map((node, index) => renderNode(node, `rt-${index}`))}
    </div>
  );
}

/** Plain-text version of a rich text field — used for meta descriptions. */
export function richTextToPlain(content?: RichText, maxLength = 180): string {
  const walk = (node: RichTextNode): string => {
    if (node.type === "text") return node.text ?? "";
    return (node.children ?? []).map(walk).join(" ");
  };

  const text = (content?.root?.children ?? [])
    .map(walk)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
}
