import React from "react";
// Import full modules for flexible lookups (avoid needing to list every named import).
import * as LucideIcons from "lucide-react";
import * as HeroIcons from "@heroicons/react/24/outline";

// Registry key type
export type IconKey =
  | "home"
  | "search"
  | "settings"
  | "calendar"
  | "user"
  | "bell"
  | "mail"
  | "trash"
  | "edit"
  | "plus"
  | "minus"
  | "check"
  | "close"
  | "chevron-right"
  | "chevron-left";

// Map of keys -> React component (SVG)
export const ICON_REGISTRY: Record<IconKey, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  home: (LucideIcons as any).Home,
  search: (LucideIcons as any).Search,
  settings: (LucideIcons as any).Settings,
  calendar: (LucideIcons as any).Calendar,
  user: (LucideIcons as any).User,
  bell: (LucideIcons as any).Bell,
  mail: (LucideIcons as any).Mail,
  trash: (LucideIcons as any).Trash,
  edit: (LucideIcons as any).Edit,
  plus: (LucideIcons as any).Plus,
  minus: (LucideIcons as any).Minus,
  check: (LucideIcons as any).Check,
  close: (LucideIcons as any).X,
  "chevron-right": (LucideIcons as any).ChevronRight,
  "chevron-left": (LucideIcons as any).ChevronLeft,
};

// Helper to get icon by key with a fallback
export function getIconComponent(name?: string) {
  if (!name) return (LucideIcons as any).Home;

  // First check explicit registry (preferred curated list)
  const fromRegistry = (ICON_REGISTRY as Record<string, any>)[name];
  if (fromRegistry) return fromRegistry;

  // Try lucide export by PascalCase name
  const tryLucide = (LucideIcons as Record<string, any>)[name];
  if (tryLucide) return tryLucide;

  // Try converting kebab-case or lowercase to PascalCase and lookup
  const pascal = name
    .split(/[-_ ]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
  if ((LucideIcons as Record<string, any>)[pascal]) return (LucideIcons as Record<string, any>)[pascal];

  // Try Heroicons (they typically have Icon suffix)
  if ((HeroIcons as Record<string, any>)[name]) return (HeroIcons as Record<string, any>)[name];
  if ((HeroIcons as Record<string, any>)[pascal + "Icon"]) return (HeroIcons as Record<string, any>)[pascal + "Icon"];

  // Fallback to a neutral icon
  return (LucideIcons as any).Home;
}

// Export list of keys for Storybook controls
export const ICON_KEYS = Object.keys(ICON_REGISTRY) as IconKey[];

// Default export for convenience
export default ICON_REGISTRY;


