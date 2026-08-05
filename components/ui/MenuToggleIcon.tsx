import type { ComponentProps } from "react";

/**
 * Menu button that morphs between the bars and a cross.
 *
 * The top shape is one continuous path drawn as a dashed stroke: changing
 * `stroke-dasharray` alters how much of it is painted and `stroke-dashoffset`
 * slides that painted window along the path. Closed, the window sits over two
 * short horizontal runs and reads as bars; open, it lengthens and slides to a
 * stretch that reads as a diagonal. Rotating the whole icon -45° at the same
 * time lands that diagonal, and the static middle line, on a cross.
 *
 * Doing it in one path is why the change looks drawn rather than swapped — the
 * stroke is never cut, it only travels.
 */
export function MenuToggleIcon({
  open,
  className = "",
  ...props
}: ComponentProps<"svg"> & { open: boolean }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`menu-toggle-icon ${open ? "-rotate-45" : ""} ${className}`}
      {...props}
    >
      <path
        className={
          open
            ? "[stroke-dasharray:20_300] [stroke-dashoffset:-32.42px]"
            : "[stroke-dasharray:12_63]"
        }
        d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
      />
      <path d="M7 16 27 16" />
    </svg>
  );
}
