"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { transition } from "@/lib/motion";

/**
 * Scroll-triggered reveal. One shared easing/offset for the whole site so the
 * page reads as a single, calm sequence rather than a set of separate effects.
 *
 * The element type never changes between server and client — the OS
 * reduced-motion preference is handled by `MotionConfig` in the layout, and
 * `data-reveal` lets the no-JS stylesheet force the content visible.
 */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li" | "article";
}) {
  const Component = motion[as];

  return (
    <Component
      data-reveal=""
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={transition("reveal", delay)}
    >
      {children}
    </Component>
  );
}
