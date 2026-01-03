"use client";
import React from "react";
import NavigationSidebar from "@/components/mailchimp/email-builder/components/NavigationSidebar";
import { LucideIcon } from "lucide-react";

interface ContentBlock {
  icon: LucideIcon;
  label: string;
  color: string;
  type: string;
}

interface BlankLayout {
  columns: number;
  label: string;
  icon: LucideIcon;
}

interface KlaviyoNavigationSidebarProps {
  activeNav: string;
  contentBlocks: ContentBlock[];
  blankLayouts: BlankLayout[];
  showMoreBlocks: boolean;
  setShowMoreBlocks: (show: boolean) => void;
  showMoreLayouts: boolean;
  setShowMoreLayouts: (show: boolean) => void;
  handleDragStart: (
    e: React.DragEvent,
    blockType: string,
    columns?: number
  ) => void;
  emailBackgroundColor?: string;
  setEmailBackgroundColor?: (color: string) => void;
  emailBodyColor?: string;
  setEmailBodyColor?: (color: string) => void;
  emailMobilePaddingLeft?: number;
  setEmailMobilePaddingLeft?: (value: number) => void;
  emailMobilePaddingRight?: number;
  setEmailMobilePaddingRight?: (value: number) => void;
}

/**
 * Klaviyo-specific NavigationSidebar wrapper
 * This component wraps the mailchimp NavigationSidebar but ensures all blocks are displayed
 * (no 9-block limit for Klaviyo)
 */
const KlaviyoNavigationSidebar: React.FC<KlaviyoNavigationSidebarProps> = ({
  activeNav,
  contentBlocks,
  blankLayouts,
  showMoreBlocks,
  setShowMoreBlocks,
  showMoreLayouts,
  setShowMoreLayouts,
  handleDragStart,
  emailBackgroundColor,
  setEmailBackgroundColor,
  emailBodyColor,
  setEmailBodyColor,
  emailMobilePaddingLeft,
  setEmailMobilePaddingLeft,
  emailMobilePaddingRight,
  setEmailMobilePaddingRight,
}) => {
  // For Klaviyo, we always show all blocks (no limit)
  // Pass showMoreBlocks as true to the underlying component
  return (
    <NavigationSidebar
      activeNav={activeNav}
      contentBlocks={contentBlocks}
      blankLayouts={blankLayouts}
      showMoreBlocks={true} // Always show all blocks for Klaviyo
      setShowMoreBlocks={setShowMoreBlocks}
      showMoreLayouts={showMoreLayouts}
      setShowMoreLayouts={setShowMoreLayouts}
      handleDragStart={handleDragStart}
      emailBackgroundColor={emailBackgroundColor}
      setEmailBackgroundColor={setEmailBackgroundColor}
      emailBodyColor={emailBodyColor}
      setEmailBodyColor={setEmailBodyColor}
      emailMobilePaddingLeft={emailMobilePaddingLeft}
      setEmailMobilePaddingLeft={setEmailMobilePaddingLeft}
      emailMobilePaddingRight={emailMobilePaddingRight}
      setEmailMobilePaddingRight={setEmailMobilePaddingRight}
    />
  );
};

export default KlaviyoNavigationSidebar;

