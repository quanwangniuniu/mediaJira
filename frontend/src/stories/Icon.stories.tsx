import React from "react";
import Icon, { IconSize } from "../components/ui/Icon";
import ICON_REGISTRY, { ICON_KEYS } from "../components/ui/iconRegistry";

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
      options: ICON_KEYS,
      description: "Choose a project-approved icon key (Lucide or Heroicons).",
    },
    size: {
      control: "select",
      options: ["xs", "sm", "md", "lg", "xl"],
    },
    color: { control: "color" },
    strokeWidth: { control: "number" },
  },
};

const Template: any = (args: any) => {
  // Pass registry key directly to Icon via `name` so Storybook controls work with serializable values.
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 12 }}>
      <Icon name={args.iconName} size={args.size as IconSize} color={args.color} strokeWidth={args.strokeWidth} />
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
            <Icon name="home" size={s} />
            <div style={{ marginTop: 8 }}>{s} ({String((s === 'xs' && 12) || (s === 'sm' && 16) || (s === 'md' && 20) || (s === 'lg' && 24) || (s === 'xl' && 32))}px)</div>
          </div>
        ))}
      </div>

      {/* Recommended usage contexts */}
      <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
        {/* Inline text */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="search" size="sm" />
          <span>Inline text (sm)</span>
        </div>
        {/* Button */}
        <button style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px" }}>
          <Icon name="settings" size="md" />
          <span>Button (md)</span>
        </button>
        {/* Nav / app icon */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="calendar" size="lg" />
          <span>Nav (lg)</span>
        </div>
      </div>
    </div>
  );
};

export const Gallery = () => {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 16 }}>
      {ICON_KEYS.map((key) => (
        <div key={key} style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
          <Icon name={key} size="lg" />
          <div style={{ marginTop: 8, fontSize: 12, color: "#374151" }}>{key}</div>
        </div>
      ))}
    </div>
  );
};


