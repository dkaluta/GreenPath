import type { SVGProps } from "react";

/*
 * The line icons from the wireframes. They draw in `currentColor`, so they
 * follow the text colour. Decorative: the button or text next to them says
 * what they mean.
 */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** The tree marker: a round crown on a trunk. */
export function TreeIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="9" r="5" />
      <path d="M12 14v7" />
    </Svg>
  );
}

/** A tree with a plus: one that should be on the map. */
export function TreeAddIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="10" r="5" />
      <path d="M10 15v6M18 3v6M15 6h6" />
    </Svg>
  );
}

/** A dashed tree: one that should be here and isn't. */
export function TreeMissingIcon(props: IconProps) {
  return (
    <Svg {...props} strokeDasharray="2.5 2.5">
      <circle cx="12" cy="9" r="5" />
      <path d="M12 14v7" />
    </Svg>
  );
}

/** A tree with an exclamation mark: a damaged one. */
export function TreeDamagedIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="10" cy="10" r="5" />
      <path d="M10 15v6M19 4v6M19 13.5v.5" />
    </Svg>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </Svg>
  );
}

/**
 * A "back" chevron. It points to the start side, so it is mirrored in
 * right-to-left languages (see .flipInRtl in the page CSS).
 */
export function BackIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M15 5l-7 7 7 7" />
    </Svg>
  );
}
