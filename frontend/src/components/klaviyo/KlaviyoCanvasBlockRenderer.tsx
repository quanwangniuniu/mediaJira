"use client";
import React from "react";
import CanvasBlockRenderer from "@/components/mailchimp/email-builder/components/CanvasBlockRenderer";
import {
  CanvasBlock,
  DeviceMode,
  BlockBoxStyles,
} from "@/components/mailchimp/email-builder/types";
import { mapKlaviyoBlockType } from "@/lib/utils/klaviyoBlockUtils";
import {
  Menu,
  Layers,
  Table,
  MessageSquare,
} from "lucide-react";

interface KlaviyoCanvasBlockRendererProps {
  block: CanvasBlock;
  section?: string;
  isSelected?: boolean;
  updateLayoutColumns: (
    section: string,
    blockId: string,
    columnIndex: number,
    delta: number
  ) => void;
  deviceMode: DeviceMode;
  updateBlockContent?: (
    section: string,
    blockId: string,
    content: string
  ) => void;
}

/**
 * Klaviyo-specific CanvasBlockRenderer wrapper
 * This component wraps the mailchimp CanvasBlockRenderer and adds support for
 * Klaviyo-specific block types (Text, Split, HeaderBar, DropShadow, Table, ReviewQuote)
 */
const KlaviyoCanvasBlockRenderer: React.FC<KlaviyoCanvasBlockRendererProps> = ({
  block,
  section,
  isSelected,
  updateLayoutColumns,
  deviceMode,
  updateBlockContent,
}) => {
  // Handle Klaviyo-specific block types
  switch (block.type) {
    case "Text":
      // Text blocks use Paragraph rendering logic
      return (
        <CanvasBlockRenderer
          block={{ ...block, type: "Paragraph" }}
          section={section}
          isSelected={isSelected}
          updateLayoutColumns={updateLayoutColumns}
          deviceMode={deviceMode}
          updateBlockContent={updateBlockContent}
        />
      );
    case "Split":
      // Split blocks are Layout blocks
      return (
        <CanvasBlockRenderer
          block={{ ...block, type: "Layout" }}
          section={section}
          isSelected={isSelected}
          updateLayoutColumns={updateLayoutColumns}
          deviceMode={deviceMode}
          updateBlockContent={updateBlockContent}
        />
      );
    case "HeaderBar":
      return (
        <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
          <Menu className="h-8 w-8 mx-auto mb-2 text-gray-700" />
          <p className="text-sm font-medium">{block.label || "Header bar"}</p>
        </div>
      );
    case "DropShadow":
      return (
        <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
          <Layers className="h-8 w-8 mx-auto mb-2 text-gray-600" />
          <p className="text-sm font-medium">{block.label || "Drop shadow"}</p>
        </div>
      );
    case "Table":
      return (
        <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
          <Table className="h-8 w-8 mx-auto mb-2 text-blue-600" />
          <p className="text-sm font-medium">{block.label || "Table"}</p>
        </div>
      );
    case "ReviewQuote":
      return (
        <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
          <MessageSquare className="h-8 w-8 mx-auto mb-2 text-green-600" />
          <p className="text-sm font-medium">{block.label || "Review quote"}</p>
        </div>
      );
    case "Button":
      // Custom Button rendering with text styles support
      const getBoxStyleProps = (styles?: BlockBoxStyles) => {
        if (!styles) return {};
        const hasUnifiedPadding = styles.padding !== undefined;
        const hasUnifiedMargin = styles.margin !== undefined;

        return {
          backgroundColor: styles.backgroundColor,
          borderStyle: styles.borderStyle,
          borderWidth: styles.borderWidth,
          borderColor: styles.borderColor,
          borderRadius: styles.borderRadius,
          ...(hasUnifiedPadding ? { padding: styles.padding } : {}),
          ...(!hasUnifiedPadding
            ? {
                paddingTop: styles.paddingTop,
                paddingRight: styles.paddingRight,
                paddingBottom: styles.paddingBottom,
                paddingLeft: styles.paddingLeft,
              }
            : {}),
          ...(hasUnifiedMargin ? { margin: styles.margin } : {}),
          ...(!hasUnifiedMargin
            ? {
                marginTop: styles.marginTop,
                marginRight: styles.marginRight,
                marginBottom: styles.marginBottom,
                marginLeft: styles.marginLeft,
              }
            : {}),
        };
      };

      const normalizeWebUrl = (url: string) => {
        if (!url) return "";
        if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
          return url;
        }
        return `https://${url}`;
      };

      const buildButtonHref = (currentBlock: CanvasBlock) => {
        const rawValue = currentBlock.buttonLinkValue?.trim();
        if (!rawValue) return null;
        const linkType = currentBlock.buttonLinkType || "Web";

        switch (linkType) {
          case "Email": {
            const value = rawValue.replace(/^mailto:/i, "");
            return value ? `mailto:${value}` : null;
          }
          case "Phone": {
            const value = rawValue.replace(/^tel:/i, "");
            return value ? `tel:${value}` : null;
          }
          case "Web":
          default:
            return normalizeWebUrl(rawValue);
        }
      };

      const buttonBlockStyles = getBoxStyleProps(
        block.buttonBlockStyles
      ) as React.CSSProperties;
      const buttonHref = buildButtonHref(block);
      const buttonOpenInNewTab = block.buttonOpenInNewTab ?? true;
      const buttonTextColor = block.buttonTextColor || "#ffffff";
      const buttonBackgroundColor = block.buttonBackgroundColor || "#111827";
      const buttonShape = block.buttonShape || "Square";
      const buttonAlignment = block.buttonAlignment || "center";
      const buttonSize = block.buttonSize || "Small";

      // Get text styles from block.styles
      const textStyles = block.styles || {};
      const textColor = textStyles.color || buttonTextColor;
      const fontFamily = textStyles.fontFamily;
      const fontSize = textStyles.fontSize
        ? `${textStyles.fontSize}px`
        : undefined;
      const fontWeight = textStyles.fontWeight;
      const fontStyle = textStyles.fontStyle;
      const textDecoration = textStyles.textDecoration;
      const lineHeight = textStyles.lineHeight
        ? `${textStyles.lineHeight}px`
        : undefined;

      // Size-based width
      const sizeWidths: Record<string, string> = {
        Small: "150px",
        Medium: "200px",
        Large: "300px",
      };
      const buttonWidth = sizeWidths[buttonSize] || sizeWidths.Small;

      // Calculate border radius based on shape
      const getShapeBorderRadius = (shape: string): string => {
        switch (shape) {
          case "Round":
            return "8px";
          case "Pill":
            return "9999px";
          case "Square":
          default:
            return "0px";
        }
      };

      const buttonStyle: React.CSSProperties = {
        backgroundColor: buttonBackgroundColor,
        color: textColor,
        fontFamily: fontFamily,
        fontSize: fontSize,
        fontWeight: fontWeight,
        fontStyle: fontStyle,
        textDecoration: textDecoration,
        lineHeight: lineHeight,
        borderRadius:
          (buttonBlockStyles.borderRadius as string) ||
          getShapeBorderRadius(buttonShape),
        borderStyle: buttonBlockStyles.borderStyle as string,
        borderWidth: buttonBlockStyles.borderWidth as string,
        borderColor: buttonBlockStyles.borderColor as string,
        width: buttonWidth,
      };

      const alignmentStyles: Record<
        "left" | "center" | "right",
        React.CSSProperties
      > = {
        left: { display: "flex", justifyContent: "flex-start" },
        center: { display: "flex", justifyContent: "center" },
        right: { display: "flex", justifyContent: "flex-end" },
      };

      const buttonWrapperStyle: React.CSSProperties = {
        ...alignmentStyles[buttonAlignment],
        ...(buttonBlockStyles.padding && {
          padding: buttonBlockStyles.padding as string,
        }),
        ...(buttonBlockStyles.paddingTop && {
          paddingTop: buttonBlockStyles.paddingTop as string,
        }),
        ...(buttonBlockStyles.paddingRight && {
          paddingRight: buttonBlockStyles.paddingRight as string,
        }),
        ...(buttonBlockStyles.paddingBottom && {
          paddingBottom: buttonBlockStyles.paddingBottom as string,
        }),
        ...(buttonBlockStyles.paddingLeft && {
          paddingLeft: buttonBlockStyles.paddingLeft as string,
        }),
        ...(buttonBlockStyles.margin && {
          margin: buttonBlockStyles.margin as string,
        }),
        ...(buttonBlockStyles.marginTop && {
          marginTop: buttonBlockStyles.marginTop as string,
        }),
        ...(buttonBlockStyles.marginRight && {
          marginRight: buttonBlockStyles.marginRight as string,
        }),
        ...(buttonBlockStyles.marginBottom && {
          marginBottom: buttonBlockStyles.marginBottom as string,
        }),
        ...(buttonBlockStyles.marginLeft && {
          marginLeft: buttonBlockStyles.marginLeft as string,
        }),
        ...(buttonBlockStyles.backgroundColor && {
          backgroundColor: buttonBlockStyles.backgroundColor as string,
        }),
        width: "100%",
      };

      const buttonElement = (
        <button
          style={buttonStyle}
          className="px-6 py-2 transition-colors"
        >
          {block.content || "Button text"}
        </button>
      );

      return (
        <div style={buttonWrapperStyle}>
          {buttonHref ? (
            <a
              href={buttonHref}
              target={buttonOpenInNewTab ? "_blank" : undefined}
              rel={buttonOpenInNewTab ? "noreferrer noopener" : undefined}
              style={{ textDecoration: "none", display: "inline-block" }}
            >
              {buttonElement}
            </a>
          ) : (
            buttonElement
          )}
        </div>
      );
    default:
      // For all other block types, use the original renderer
      // Map Klaviyo types to mailchimp types if needed
      const mappedBlock = {
        ...block,
        type: mapKlaviyoBlockType(block.type),
      };
      return (
        <CanvasBlockRenderer
          block={mappedBlock}
          section={section}
          isSelected={isSelected}
          updateLayoutColumns={updateLayoutColumns}
          deviceMode={deviceMode}
          updateBlockContent={updateBlockContent}
        />
      );
  }
};

export default KlaviyoCanvasBlockRenderer;

