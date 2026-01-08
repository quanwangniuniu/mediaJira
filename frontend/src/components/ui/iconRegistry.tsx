import React from "react";
// Lucide (used widely in project)
import {
  Home as LucideHome,
  Search as LucideSearch,
  Settings as LucideSettings,
  Calendar as LucideCalendar,
  User as LucideUser,
  Bell as LucideBell,
  Trash as LucideTrash,
  Edit as LucideEdit,
  Plus as LucidePlus,
  Minus as LucideMinus,
  Check as LucideCheck,
  X as LucideX,
  ChevronRight as LucideChevronRight,
  ChevronLeft as LucideChevronLeft,
} from "lucide-react";

// Heroicons (outline) - used for some specific semantics / design preferences
import {
  CalendarIcon,
  UserIcon,
  MailIcon,
  BellIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  Cog6ToothIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

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
  home: LucideHome,
  search: LucideSearch,
  settings: LucideSettings,
  calendar: LucideCalendar,
  user: LucideUser,
  bell: LucideBell,
  mail: MailIcon,
  trash: LucideTrash,
  edit: LucideEdit,
  plus: LucidePlus,
  minus: LucideMinus,
  check: LucideCheck,
  close: LucideX,
  "chevron-right": LucideChevronRight,
  "chevron-left": LucideChevronLeft,
};

// Helper to get icon by key with a fallback
export function getIconComponent(name?: string) {
  if (!name) return LucideHome;
  return (ICON_REGISTRY as Record<string, any>)[name] || LucideHome;
}

// Export list of keys for Storybook controls
export const ICON_KEYS = Object.keys(ICON_REGISTRY) as IconKey[];

// NOTE: We purposely mix Lucide and Heroicons so teams can pick the icon with the best visual semantics.
// The registry centralizes usage: replace direct imports with `ICON_REGISTRY['home']` or `getIconComponent('home')`.


