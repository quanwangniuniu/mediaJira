import React from "react";
// Lucide (used widely in project)
import {
  Home as LucideHome,
  Users as LucideUsers,
  FolderOpen as LucideFolderOpen,
  BarChart3 as LucideBarChart3,
  ListTodo as LucideListTodo,
  Mail as LucideMail,
  Notebook as LucideNotebook,
  Facebook as LucideFacebook,
  Video as LucideVideo,
  Target as LucideTarget,
  FileText as LucideFileText,
  MessageSquare as LucideMessageSquare,
  Grid3x3 as LucideGrid3x3,
  HelpCircle as LucideHelpCircle,
  Globe as LucideGlobe,
  LogOut as LucideLogOut,
  Calendar as LucideCalendar,
  Settings as LucideSettings,
  Search as LucideSearch,
  Bell as LucideBell,
  User as LucideUser,
} from "lucide-react";

// Heroicons (outline) - used for some specific semantics / design preferences
// (No direct heroicons imported here; we prefer Lucide for these keys. Add heroicons only when necessary.)

// Registry key type
export type IconKey =
  | "home"
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
  | "calendar"
  | "settings"
  | "search"
  | "bell"
  | "user"
  | "help"
  | "globe"
  | "logout"
  | "grid";

// Map of keys -> React component (SVG)
export const ICON_REGISTRY: Record<IconKey, React.ComponentType<React.SVGProps<SVGSVGElement>>> = {
  home: LucideHome,
  teams: LucideUsers,
  projects: LucideFolderOpen,
  campaigns: LucideBarChart3,
  tasks: LucideListTodo,
  mailchimp: LucideMail,
  klaviyo: LucideMail,
  notion: LucideNotebook,
  facebook: LucideFacebook,
  tiktok: LucideVideo,
  "google-ads": LucideTarget,
  reports: LucideFileText,
  messages: LucideMessageSquare,
  calendar: LucideCalendar,
  help: LucideHelpCircle,
  globe: LucideGlobe,
  logout: LucideLogOut,
  settings: LucideSettings,
  search: LucideSearch,
  bell: LucideBell,
  user: LucideUser,
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


