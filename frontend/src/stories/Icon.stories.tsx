import React from "react";
import Icon, { IconSize } from "../components/ui/Icon";
import { Home, Search, Settings } from "lucide-react";
import { CalendarIcon, UserIcon } from "@heroicons/react/24/outline";
import { ICON_REGISTRY, ICON_KEYS, getIconComponent } from "../components/ui/iconRegistry";

export default {
  title: "UI/Icon",
  component: Icon,
  parameters: {
    layout: "centered",
    tags: ["autodocs"],
  },
  argTypes: {
    // Hide the raw `icon` prop (a component/function) from Controls because it cannot be serialized.
    // We expose `iconName` (a string) instead and map it to actual components in the template.
    icon: { control: false },
    iconName: {
      control: "select",
      options: [
        "lucide:Home",
        "lucide:Search",
        "lucide:Settings",
        "hero:Calendar",
        "hero:User",
      ],
      description: "Choose a source icon (Lucide or Heroicons).",
    },
    // New serializable key-based control using the centralized registry
    iconKey: {
      control: "select",
      options: ICON_KEYS,
      description: "Choose an icon key from the centralized registry.",
      table: { category: "Content" },
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
    },
    color: { control: "color" },
    strokeWidth: { control: "number" },
  },
};

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  "lucide:Home": Home,
  "lucide:Search": Search,
  "lucide:Settings": Settings,
  "hero:Calendar": CalendarIcon,
  "hero:User": UserIcon,
};

const Template: any = (args: any) => {
  const Comp = ICON_MAP[args.iconName] || Home;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <Icon icon={Comp} size={args.size as IconSize} color={args.color} strokeWidth={args.strokeWidth} />
      <span>Example text aligned with icon (baseline)</span>
    </div>
  );
};

export const Default = Template.bind({});
Default.args = {
  iconName: "lucide:Home",
  size: "md",
  color: "#1f2937", // default neutral text color
  strokeWidth: undefined,
};

export const SizingRules = () => {
  const sizes: IconSize[] = ["xs", "sm", "md", "lg", "xl"];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      {/* Visual demonstration of sizes left-to-right */}
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        {sizes.map((s) => (
          <div key={s} style={{ textAlign: "center" }}>
            <Icon icon={Home} size={s} />
            <div style={{ marginTop: 8 }}>{s} ({String((s === 'xs' && 12) || (s === 'sm' && 16) || (s === 'md' && 20) || (s === 'lg' && 24) || (s === 'xl' && 32))}px)</div>
          </div>
        ))}
      </div>

      {/* Recommended usage contexts */}
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        {/* Inline text */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon icon={Search} size="sm" />
          <span>Inline text (sm)</span>
        </div>
        {/* Button */}
        <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
          <Icon icon={Settings} size="md" />
          <span>Button (md)</span>
        </button>
        {/* Nav / app icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon icon={CalendarIcon} size="lg" />
          <span>Nav (lg)</span>
        </div>
      </div>
    </div>
  );
};


