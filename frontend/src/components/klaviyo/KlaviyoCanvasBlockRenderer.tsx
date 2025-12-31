"use client";
import React from "react";
import CanvasBlockRenderer from "@/components/mailchimp/email-builder/components/CanvasBlockRenderer";
import {
  CanvasBlock,
  DeviceMode,
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

