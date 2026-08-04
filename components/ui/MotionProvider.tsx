"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * `reducedMotion="user"` lets Framer honour the OS setting internally: it drops
 * transform/layout animation but keeps rendering the same DOM. Branching on
 * `useReducedMotion()` in components instead would render a different element
 * on the client than on the server, which breaks hydration.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
