"use client";
import React from "react";
import Image from "next/image";
import {
  Image as ImageIcon,
  Sparkles,
  ListChecks,
  Code,
  Grid3x3,
  ShoppingBag,
  Heart,
} from "lucide-react";
import LayoutBlock from "../LayoutBlock";
import { CanvasBlock, DeviceMode } from "../types";

interface CanvasBlockRendererProps {
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
}

const CanvasBlockRenderer: React.FC<CanvasBlockRendererProps> = ({
  block,
  section,
  isSelected,
  updateLayoutColumns,
  deviceMode,
}) => {
  // Helper function to render list items
  const renderListItems = (content: string, listType: "unordered" | "ordered") => {
    if (!content) return [];
    const items = content.split("\n").filter((item) => item.trim());
    return items;
  };

  // Helper function to get all style properties
  const getStyleProps = (styles: any) => {
    return {
      fontFamily: styles.fontFamily || "Helvetica, Arial, sans-serif",
      fontSize: styles.fontSize ? `${styles.fontSize}px` : undefined,
      fontWeight: styles.fontWeight || undefined,
      fontStyle: styles.fontStyle || "normal",
      textDecoration: styles.textDecoration || "none",
      textAlign: styles.textAlign || "center",
      color: styles.color || undefined,
      backgroundColor: styles.blockBackgroundColor || "transparent",
      borderStyle: styles.borderStyle,
      borderWidth:
        styles.borderStyle && styles.borderStyle !== "none"
          ? styles.borderWidth || "1px"
          : 0,
      borderColor: styles.borderColor,
      borderRadius: styles.borderRadius,
      padding: styles.padding,
      margin: styles.margin,
      paddingTop: styles.paddingTop,
      paddingRight: styles.paddingRight,
      paddingBottom: styles.paddingBottom,
      paddingLeft: styles.paddingLeft,
      marginTop: styles.marginTop,
      marginRight: styles.marginRight,
      marginBottom: styles.marginBottom,
      marginLeft: styles.marginLeft,
      direction: styles.direction || undefined, // Only set if explicitly defined
      lineHeight: styles.lineHeight
        ? typeof styles.lineHeight === "number"
          ? styles.lineHeight
          : styles.lineHeight
        : undefined,
      letterSpacing: styles.letterSpacing || undefined,
    };
  };

  switch (block.type) {
    case "Image":
      return (
        <div className="w-full bg-amber-50 border border-gray-200 rounded overflow-hidden flex items-center justify-center min-h-[192px]">
          {block.imageUrl ? (
            <Image
              src={block.imageUrl}
              alt="Image"
              width={800}
              height={600}
              style={{ width: "100%", height: "auto" }}
              className="block"
              unoptimized
              onError={() => {
                // Fallback handled by CSS
              }}
            />
          ) : (
            <div className="w-full h-48 flex items-center justify-center">
              <div className="text-center">
                <div className="w-16 h-16 border-2 border-dashed border-gray-400 rounded flex items-center justify-center mx-auto mb-2">
                  <ImageIcon className="h-8 w-8 text-gray-400" />
                </div>
                <span className="text-sm text-gray-500">Image</span>
              </div>
            </div>
          )}
        </div>
      );
    case "Heading":
      const headingStyles = block.styles || {};
      const headingStyleProps = getStyleProps(headingStyles);
      
      // If list type is set, render as list
      if (headingStyles.listType) {
        const listItems = renderListItems(block.content || "", headingStyles.listType);
        const ListTag = headingStyles.listType === "ordered" ? "ol" : "ul";
        return (
          <ListTag
            className="text-2xl py-4"
            style={{
              ...headingStyleProps,
              color: headingStyleProps.color || "#111827",
              listStylePosition: "inside",
              paddingLeft: "0",
            }}
          >
            {listItems.length > 0 ? (
              listItems.map((item, idx) => (
                <li key={idx}>
                  <span
                    style={{
                      backgroundColor: headingStyles.textHighlightColor,
                    }}
                  >
                    {item.trim()}
                  </span>
                </li>
              ))
            ) : (
              <li>
                <span
                  style={{
                    backgroundColor: headingStyles.textHighlightColor,
                  }}
                >
                  Heading
                </span>
              </li>
            )}
          </ListTag>
        );
      }

      return (
        <h2
          className="text-2xl py-4"
          style={{
            ...headingStyleProps,
            color: headingStyleProps.color || "#111827",
          }}
        >
          <span
            style={{
              backgroundColor: headingStyles.textHighlightColor,
            }}
          >
            {block.content || "Heading"}
          </span>
        </h2>
      );
    case "Paragraph":
      const paragraphStyles = block.styles || {};
      const paragraphStyleProps = getStyleProps(paragraphStyles);
      
      // If list type is set, render as list
      if (paragraphStyles.listType) {
        const listItems = renderListItems(block.content || "", paragraphStyles.listType);
        const ListTag = paragraphStyles.listType === "ordered" ? "ol" : "ul";
        return (
          <ListTag
            className="text-base py-4"
            style={{
              ...paragraphStyleProps,
              color: paragraphStyleProps.color || "#374151",
              listStylePosition: "inside",
              paddingLeft: "0",
            }}
          >
            {listItems.length > 0 ? (
              listItems.map((item, idx) => (
                <li key={idx}>
                  <span
                    style={{
                      backgroundColor: paragraphStyles.textHighlightColor,
                    }}
                  >
                    {item.trim()}
                  </span>
                </li>
              ))
            ) : (
              <li>
                <span
                  style={{
                    backgroundColor: paragraphStyles.textHighlightColor,
                  }}
                >
                  Text content
                </span>
              </li>
            )}
          </ListTag>
        );
      }

      return (
        <p
          className="text-base py-4"
          style={{
            ...paragraphStyleProps,
            color: paragraphStyleProps.color || "#374151",
          }}
        >
          <span
            style={{
              backgroundColor: paragraphStyles.textHighlightColor,
            }}
          >
            {block.content || "Text content"}
          </span>
        </p>
      );
    case "Button":
      return (
        <div className="flex justify-center py-4">
          <button className="px-6 py-2 bg-gray-900 text-white rounded hover:bg-gray-800">
            {block.content || "Button text"}
          </button>
        </div>
      );
    case "Divider":
      return <div className="h-px bg-gray-300"></div>;
    case "Spacer":
      return <div className="h-8"></div>;
    case "Social":
      return (
        <div className="flex justify-center space-x-4 py-4">
          <button className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">f</span>
          </button>
          <button className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
            <span className="text-white text-lg">IG</span>
          </button>
          <button className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-bold">X</span>
          </button>
        </div>
      );
    case "CreativeAssistant":
      return (
        <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
          <Sparkles className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
          <p className="text-sm font-medium">{block.label}</p>
        </div>
      );
    case "Survey":
      return (
        <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
          <ListChecks className="h-8 w-8 mx-auto mb-2 text-blue-600" />
          <p className="text-sm font-medium">{block.label}</p>
        </div>
      );
    case "Code":
      return (
        <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
          <Code className="h-8 w-8 mx-auto mb-2 text-gray-800" />
          <p className="text-sm font-medium">{block.label}</p>
        </div>
      );
    case "Apps":
      return (
        <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
          <Grid3x3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
          <p className="text-sm font-medium">{block.label}</p>
        </div>
      );
    case "Product":
      return (
        <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
          <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-orange-600" />
          <p className="text-sm font-medium">{block.label}</p>
        </div>
      );
    case "ProductRec":
      return (
        <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
          <Heart className="h-8 w-8 mx-auto mb-2 text-pink-600" />
          <p className="text-sm font-medium">{block.label}</p>
        </div>
      );
    case "Layout":
      return (
        <LayoutBlock
          block={block}
          section={section}
          isSelected={isSelected}
          updateLayoutColumns={updateLayoutColumns}
          isMobile={deviceMode === "mobile"}
        />
      );
    default:
      return (
        <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
          {block.label}
        </div>
      );
  }
};

export default CanvasBlockRenderer;

