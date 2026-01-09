import React from "react";
import ICON_REGISTRY, { IconKey } from "./iconRegistry";

export type IconSize = "xs" | "sm" | "md" | "lg" | "xl";

interface IconProps {
  /** Either a component/element _or_ a registry name. `name` takes precedence when provided. */
  icon?: React.ComponentType<React.SVGProps<SVGSVGElement>> | React.ReactElement;
  /** Key into the project's allowed icon registry (prefer this) */
  name?: IconKey | string;
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
  name,
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

  // Resolve by `name` first (registry). This enforces allowed icon sources (Heroicons / Lucide).
  let ResolvedComponent: React.ComponentType<React.SVGProps<SVGSVGElement>> | undefined;
  if (name) {
    // Attempt registry lookup (allow string cast for flexibility). If not found, leave undefined.
    ResolvedComponent = (ICON_REGISTRY as Record<string, any>)[name as string];
  }

  // If name didn't resolve, fall back to provided `icon` prop.
  if (!ResolvedComponent && React.isValidElement(icon)) {
    return React.cloneElement(icon, {
      ...sharedSvgProps,
      ...(icon.props || {}),
    });
  }

  if (!ResolvedComponent && icon) {
    ResolvedComponent = icon as React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }

  if (!ResolvedComponent) {
    // No icon provided — render null to avoid unexpected markup.
    return null;
  }

  return <ResolvedComponent {...sharedSvgProps} />;
}