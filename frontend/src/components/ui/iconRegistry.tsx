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
  Mail as LucideMail,
  Users as LucideUsers,
  Folder as LucideFolder,
  BarChart3 as LucideBarChart3,
  ListChecks as LucideListChecks,
  Notebook as LucideNotebook,
  Facebook as LucideFacebook,
  Video as LucideVideo,
  Target as LucideTarget,
  FileText as LucideFileText,
  MessageSquare as LucideMessageSquare,
  Grid3x3 as LucideGrid3x3,
} from "lucide-react";

// Heroicons (outline) - used for some specific semantics / design preferences
// (No direct heroicons imported here; we prefer Lucide for these keys. Add heroicons only when necessary.)

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
  | "chevron-left"
  // Project-specific (from UI screenshots)
  | "teams"
  | "projects"
  | "campaigns"
  | "tasks"
  | "mailchimp"
  | "klaviyo"
  | "notion"
  | "facebook"
  | "tiktok"
  | "google-ads"
  | "reports"
  | "messages"
  | "grid";

// Map of keys -> React component (SVG)
export const ICON_REGISTRY: Record<IconKey, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  home: LucideHome,
  search: LucideSearch,
  settings: LucideSettings,
  calendar: LucideCalendar,
  user: LucideUser,
  bell: LucideBell,
  mail: LucideMail,
  trash: LucideTrash,
  edit: LucideEdit,
  plus: LucidePlus,
  minus: LucideMinus,
  check: LucideCheck,
  close: LucideX,
  "chevron-right": LucideChevronRight,
  "chevron-left": LucideChevronLeft,
  // Project-specific mappings (prefer Lucide equivalents)
  teams: LucideUsers,
  projects: LucideFolder,
  campaigns: LucideBarChart3,
  tasks: LucideListChecks,
  mailchimp: LucideMail,
  klaviyo: LucideMail,
  notion: LucideNotebook,
  facebook: LucideFacebook,
  tiktok: LucideVideo,
  "google-ads": LucideTarget,
  reports: LucideFileText,
  messages: LucideMessageSquare,
  grid: LucideGrid3x3,
};

// Helper to get icon by key with a fallback
export function getIconComponent(name?: string) {
  if (!name) return LucideHome;
  return (ICON_REGISTRY as Record<string, any>)[name] || LucideHome;
}

// Export list of keys for Storybook controls
export const ICON_KEYS = Object.keys(ICON_REGISTRY) as IconKey[];

// Default export for convenience
export default ICON_REGISTRY;


