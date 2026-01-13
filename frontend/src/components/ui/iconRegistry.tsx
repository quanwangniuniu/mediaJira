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
  Loader2 as LucideLoader2,
  Plus as LucidePlus,
  RefreshCcw as LucideRefreshCcw,
  AlertTriangle as LucideAlertTriangle,
  AlertCircle as LucideAlertCircle,
  GitBranch as LucideGitBranch,
  X as LucideX,
  Edit2 as LucideEdit2,
  Trash2 as LucideTrash2,
  Check as LucideCheck,
  ChevronDown as LucideChevronDown,
  ChevronUp as LucideChevronUp,
  XCircle as LucideXCircle,
  Play as LucidePlay,
  Instagram as LucideInstagram,
  Share2 as LucideShare2,
  Image as LucideImage,
  List as LucideList,
  LayoutGrid as LucideLayoutGrid,
  Upload as LucideUpload,
  Download as LucideDownload,
  MoreHorizontal as LucideMoreHorizontal,
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
  | "grid"
  | "loader"
  | "plus"
  | "refresh"
  | "alertTriangle"
  | "alertCircle"
  | "gitBranch"
  | "x"
  | "edit2"
  | "trash2"
  | "check"
  | "chevron-down"
  | "chevron-up"
  | "x-circle"
  | "play"
  | "instagram"
  | "share2"
  | "image"
  | "list"
  | "layout-grid"
  | "upload"
  | "download"
  | "more"
  // Additional future-proof keys
  | "billing"
  | "subscriptions"
  | "api"
  | "integrations"
  | "sync"
  | "export"
  | "import"
  | "backup"
  | "schedule"
  | "approval"
  | "permission"
  | "role"
  | "audit"
  | "comment"
  | "attachment"
  | "tag"
  | "favorite"
  | "status-success"
  | "status-warning"
  | "status-error"
  | "performance"
  | "chart-line"
  | "chart-pie"
  | "database"
  | "server"
  | "cloud"
  | "offline"
  | "online"
  | "ticket"
  | "badge"
  | "qr-code"
  | "camera"
  | "mic"
  | "map"
  | "code"
  | "automation"
  | "experiment"
  | "duplicate"
  | "sort"
  | "filter"
  | "view-toggle"
  | "accessibility"
  | "translations"
  | "onboarding"
  | "license"
  | "analytics";

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
  // Common utilities & actions
  loader: LucideLoader2,
  plus: LucidePlus,
  refresh: LucideRefreshCcw,
  alertTriangle: LucideAlertTriangle,
  alertCircle: LucideAlertCircle,
  gitBranch: LucideGitBranch,
  x: LucideX,
  edit2: LucideEdit2,
  trash2: LucideTrash2,
  check: LucideCheck,
  "chevron-down": LucideChevronDown,
  "chevron-up": LucideChevronUp,
  "x-circle": LucideXCircle,
  play: LucidePlay,
  instagram: LucideInstagram,
  share2: LucideShare2,
  image: LucideImage,
  list: LucideList,
  "layout-grid": LucideLayoutGrid,
  upload: LucideUpload,
  download: LucideDownload,
  more: LucideMoreHorizontal,
  // Additional future-proof mappings (map to sensible existing icons as placeholders)
  billing: LucideFileText,
  subscriptions: LucideRefreshCcw,
  api: LucideGitBranch,
  integrations: LucideShare2,
  sync: LucideRefreshCcw,
  export: LucideDownload,
  import: LucideUpload,
  backup: LucideUpload,
  schedule: LucideCalendar,
  approval: LucideCheck,
  permission: LucideXCircle,
  role: LucideUsers,
  audit: LucideFileText,
  comment: LucideMessageSquare,
  attachment: LucideImage,
  tag: LucideMoreHorizontal,
  favorite: LucideMoreHorizontal,
  "status-success": LucideCheck,
  "status-warning": LucideAlertTriangle,
  "status-error": LucideXCircle,
  performance: LucideBarChart3,
  "chart-line": LucideBarChart3,
  "chart-pie": LucideBarChart3,
  database: LucideFileText,
  server: LucideTarget,
  cloud: LucideGlobe,
  offline: LucideXCircle,
  online: LucideCheck,
  ticket: LucideFileText,
  badge: LucideMoreHorizontal,
  "qr-code": LucideImage,
  camera: LucideImage,
  mic: LucidePlay,
  map: LucideTarget,
  code: LucideGitBranch,
  automation: LucideGitBranch,
  experiment: LucidePlay,
  duplicate: LucidePlus,
  sort: LucideList,
  filter: LucideList,
  "view-toggle": LucideLayoutGrid,
  accessibility: LucideHelpCircle,
  translations: LucideGlobe,
  onboarding: LucidePlay,
  license: LucideFileText,
  analytics: LucideBarChart3,
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


