import { useCallback } from "react";
import { useDragAndDrop } from "@/components/mailchimp/email-builder/hooks/useDragAndDrop";
import {
  CanvasBlocks,
  CanvasBlock,
  SocialLink,
  DragOverIndex,
} from "@/components/mailchimp/email-builder/types";
import {
  getKlaviyoBlockLabel,
  mapKlaviyoBlockType,
  getKlaviyoBlockDefaultStyles,
} from "@/lib/utils/klaviyoBlockUtils";

/**
 * Klaviyo-specific drag and drop hook
 * This hook wraps the mailchimp useDragAndDrop and adds support for
 * Klaviyo-specific block types (Text, Split, HeaderBar, DropShadow, Table, ReviewQuote)
 */
export const useKlaviyoDragAndDrop = (
  setCanvasBlocks: React.Dispatch<React.SetStateAction<CanvasBlocks>>
) => {
  const {
    handleDragStart: originalHandleDragStart,
    handleBlockDragStart,
    handleDragOverDropZone,
    handleDragLeaveDropZone,
    handleDrop: originalHandleDrop,
    handleDragEnd,
    dragOverIndex,
  } = useDragAndDrop(setCanvasBlocks);

  // Override handleDragStart to pass through Klaviyo block types
  const handleDragStart = useCallback(
    (e: React.DragEvent, blockType: string, columns?: number) => {
      originalHandleDragStart(e, blockType, columns);
    },
    [originalHandleDragStart]
  );

  // Override handleDrop to handle Klaviyo-specific block creation
  const handleDrop = useCallback(
    (e: React.DragEvent, section: string, index?: number) => {
      e.preventDefault();
      const blockType = e.dataTransfer.getData("blockType");
      const source = e.dataTransfer.getData("source");
      const blockId = e.dataTransfer.getData("blockId");
      const sourceSection = e.dataTransfer.getData("section");
      const columnsData = e.dataTransfer.getData("columns");

      // Handle moving existing blocks (no special handling needed)
      if (source === "canvas" && blockId) {
        originalHandleDrop(e, section, index);
        return;
      }

      // Handle creating new blocks from sidebar
      const numColumns = columnsData ? parseInt(columnsData, 10) : undefined;
      
      // Map Klaviyo block types to mailchimp-compatible types for internal handling
      const mappedBlockType = mapKlaviyoBlockType(blockType);
      
      // Initialize columnsWidths for Layout/Split blocks
      let columnsWidths: number[] | undefined = undefined;
      if ((mappedBlockType === "Layout" || blockType === "Split") && numColumns) {
        const baseWidth = Math.floor(12 / numColumns);
        const remainder = 12 % numColumns;
        columnsWidths = Array(numColumns).fill(baseWidth);
        for (let i = 0; i < remainder; i++) {
          columnsWidths[i]++;
        }
      }

      // Get default styles for Text blocks
      const defaultStyles = getKlaviyoBlockDefaultStyles(blockType);

      const isImageLikeBlock = mappedBlockType === "Image" || mappedBlockType === "Logo";
      const isButtonBlock = mappedBlockType === "Button";
      const isSocialBlock = mappedBlockType === "Social";
      const isCodeBlock = blockType === "Code";

      const defaultButtonBlockStyles = isButtonBlock
        ? {
            paddingTop: "12px",
            paddingBottom: "12px",
            paddingLeft: "24px",
            paddingRight: "24px",
          }
        : undefined;

      const defaultSocialLinks: SocialLink[] = isSocialBlock
        ? [
            {
              id: `social-${Date.now()}-1`,
              platform: "Facebook",
              url: "https://facebook.com/",
              label: "Facebook",
            },
            {
              id: `social-${Date.now()}-2`,
              platform: "Instagram",
              url: "https://instagram.com/",
              label: "Instagram",
            },
            {
              id: `social-${Date.now()}-3`,
              platform: "X",
              url: "https://x.com/",
              label: "Twitter",
            },
          ]
        : undefined;

      // Create the block with Klaviyo block type (not mapped type)
      // The renderer will handle the mapping
      const newBlock: CanvasBlock = {
        id: `${blockType}-${Date.now()}`,
        type: blockType, // Keep original Klaviyo type
        label: getKlaviyoBlockLabel(blockType),
        content: isCodeBlock ? "<strong>HTML Block</strong>" : "",
        columns: numColumns,
        columnsWidths: columnsWidths,
        ...(defaultStyles && { styles: defaultStyles }),
        ...(isImageLikeBlock && {
          imageDisplayMode: "Original" as const,
          imageLinkType: "Web" as const,
          imageLinkValue: "",
          imageOpenInNewTab: true,
          imageAltText: "",
          imageScalePercent: 85,
          imageAlignment: "center",
        }),
        ...(defaultButtonBlockStyles && {
          buttonBlockStyles: defaultButtonBlockStyles,
        }),
        ...(isSocialBlock && {
          socialType: "Follow" as const,
          socialLinks: defaultSocialLinks,
        }),
      };

      setCanvasBlocks((prev) => {
        const sectionBlocks = [...prev[section as keyof typeof prev]];
        if (index !== undefined) {
          sectionBlocks.splice(index, 0, newBlock);
        } else {
          sectionBlocks.push(newBlock);
        }
        return {
          ...prev,
          [section]: sectionBlocks,
        };
      });
    },
    [originalHandleDrop, setCanvasBlocks]
  );

  return {
    handleDragStart,
    handleBlockDragStart,
    handleDragOverDropZone,
    handleDragLeaveDropZone,
    handleDrop,
    handleDragEnd,
    dragOverIndex,
  };
};

