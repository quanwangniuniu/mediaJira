import React from "react";
import * as LucideIcons from "lucide-react";
import * as HeroIcons from "@heroicons/react/24/outline";
import Icon from "../components/ui/Icon";
import ICON_REGISTRY, { ICON_KEYS } from "../components/ui/iconRegistry";

export default {
  title: "UI/Icon Gallery",
  component: Icon,
  parameters: { layout: "padded", tags: ["autodocs"] },
};

// Curated list of icon names found across the project (Lucide export names or Heroicons names).
const ICON_NAMES = [
  // Lucide names
  "Home",
  "FolderOpen",
  "Shield",
  "MessageSquare",
  "Settings",
  "ChevronLeft",
  "ChevronRight",
  "Users",
  "BarChart3",
  "FileText",
  "Calendar",
  "Bell",
  "ListTodo",
  "UserRoundCog",
  "Facebook",
  "Video",
  "Notebook",
  "Target",
  "Mail",
  "LayoutDashboard",
  "ArrowRight",
  "ArrowLeft",
  "MoreHorizontal",
  "Check",
  "Upload",
  "AlignLeft",
  "AlignCenter",
  "AlignRight",
  "AlignJustify",
  "X",
  "Loader2",
  "Plus",
  "RefreshCw",
  "Search",
  "AlertCircle",
  "GitBranch",
  "Edit2",
  "Trash2",
  "ChevronDown",
  "ChevronUp",
  "XCircle",
  "Play",
  "Instagram",
  "Share2",
  "Image",
  "MoreHorizontal",
  "Minus",
  "AlertTriangle",
  "Info",
  "RefreshCcw",
  "List",
  "ArrowDown",
  "LayoutGrid",
  "TrendingUp",
  "Hand",
  // Heroicons (use exact exported names with Icon suffix where appropriate)
  "ChevronDownIcon",
  "EyeIcon",
  "EyeSlashIcon",
  "XCircleIcon",
  "XMarkIcon",
  "MagnifyingGlassIcon",
  "ShieldExclamationIcon",
  "ArrowLeftIcon",
  "PlusIcon",
  "FunnelIcon",
];

function resolveIconComponent(name: string) {
  // Try lucide first
  if ((LucideIcons as Record<string, any>)[name]) return (LucideIcons as Record<string, any>)[name];
  // Try heroicons as given
  if ((HeroIcons as Record<string, any>)[name]) return (HeroIcons as Record<string, any>)[name];
  // Try pascal + Icon for heroicons
  const pascal = name
    .split(/[-_ ]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
  if ((HeroIcons as Record<string, any>)[pascal + "Icon"]) return (HeroIcons as Record<string, any>)[pascal + "Icon"];
  // fallback null
  return null;
}

export const Gallery = () => {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 16 }}>
      {ICON_NAMES.map((name) => {
        const Comp = resolveIconComponent(name);
        return (
          <div key={name} style={{ padding: 12, border: "1px solid #eee", borderRadius: 8, textAlign: "center" }}>
            {Comp ? <Comp width={32} height={32} style={{ color: "#374151" }} /> : <div style={{ height: 32 }} />}
            <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280", wordBreak: "break-word" }}>{name}</div>
          </div>
        );
      })}
    </div>
  );
};
export const AllIcons = () => {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 20 }}>
      {ICON_KEYS.map((key) => (
        <div
          key={key}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: 12,
            borderRadius: 8,
            border: "1px solid rgba(0,0,0,0.06)",
            background: "#fff",
          }}
        >
          <Icon name={key} size="lg" />
          <div style={{ marginTop: 8, fontSize: 12, color: "#374151", textAlign: "center", wordBreak: "break-word" }}>{key}</div>
          <div style={{ marginTop: 6, display: "flex", gap: 8 }}>
            <Icon name={key} size="xs" />
            <Icon name={key} size="sm" />
            <Icon name={key} size="md" />
            <Icon name={key} size="lg" />
            <Icon name={key} size="xl" />
          </div>
        </div>
      ))}
    </div>
  );
};


