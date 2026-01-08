import React from "react";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

interface IconProps {
  /** Accept either a React component (Lucide/Heroicons) or an already-instantiated element */
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>> | React.ReactElement;
  size?: IconSize;
  color?: string;
  strokeWidth?: number;
  /** If provided, icon will be treated as informative and announced to screen readers */
  ariaLabel?: string;
  className?: string;
}

// Size token mapping (matches design tokens)
const SIZE_PX: Record<IconSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
};

// Sensible stroke defaults that scale with size (thin for small, standard for medium/large)
const DEFAULT_STROKE: Record<IconSize, number> = {
  xs: 1,
  sm: 1.25,
  md: 2,
  lg: 2,
  xl: 2.5,
};

/**
 * Icon
 *
 * - Minimal API: `icon`, `size`, `color`, `strokeWidth`, `ariaLabel`
 * - Accessibility: decorative by default (aria-hidden). If `ariaLabel` is provided, role="img" and aria-label will be set.
 * - Accepts both Lucide and Heroicons components since both accept standard SVG props.
 */
export default function Icon({
  icon,
  size = "md",
  color = "currentColor",
  strokeWidth,
  ariaLabel,
  className,
}: IconProps) {
  const px = SIZE_PX[size];
  const computedStroke = strokeWidth ?? DEFAULT_STROKE[size];

  // Common props we apply to the underlying SVG. We use `style.color` so icons that rely on `currentColor`
  // (most outline icons) will pick it up; we also pass width/height and strokeWidth for libraries that support it.
  const sharedSvgProps: React.SVGProps<SVGSVGElement> = {
    width: px,
    height: px,
    strokeWidth: computedStroke as any,
    style: { color },
    className,
    // Accessibility: decorative by default
    "aria-hidden": ariaLabel ? undefined : true,
    role: ariaLabel ? "img" : undefined,
    "aria-label": ariaLabel,
  };

  // If `icon` is already an element, clone it with SVG props; otherwise instantiate the component.
  if (React.isValidElement(icon)) {
    return React.cloneElement(icon, {
      ...sharedSvgProps,
      ...(icon.props || {}),
    });
  }

  const IconComponent = icon as React.ComponentType<React.SVGProps<SVGSVGElement>>;
  return <IconComponent {...sharedSvgProps} />;
}