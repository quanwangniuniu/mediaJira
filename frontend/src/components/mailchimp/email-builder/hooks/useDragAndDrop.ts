import { useState, useCallback } from "react";
import { CanvasBlock, CanvasBlocks, DragOverIndex, SocialLink } from "../types";
import { getBlockLabel } from "../utils/helpers";

export const useDragAndDrop = (
  setCanvasBlocks: React.Dispatch<React.SetStateAction<CanvasBlocks>>
) => {
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<DragOverIndex | null>(
    null
  );

  const handleDragStart = useCallback(
    (e: React.DragEvent, blockType: string, columns?: number) => {
      e.dataTransfer.setData("blockType", blockType);
      e.dataTransfer.setData("source", "sidebar");
      if (columns !== undefined) {
        e.dataTransfer.setData("columns", columns.toString());
      }
      e.dataTransfer.effectAllowed = "move";
    },
    []
  );

  const handleBlockDragStart = useCallback(
    (e: React.DragEvent, blockId: string, blockType: string, section: string) => {
      e.dataTransfer.setData("blockType", blockType);
      e.dataTransfer.setData("blockId", blockId);
      e.dataTransfer.setData("section", section);
      e.dataTransfer.setData("source", "canvas");
      e.dataTransfer.effectAllowed = "move";
      // Add visual feedback
      if (e.currentTarget instanceof HTMLElement) {
        e.currentTarget.style.opacity = "0.5";
      }
    },
    []
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent, section: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      setDragOverSection(section);
    },
    []
  );

  const handleDragLeave = useCallback(() => {
    setDragOverSection(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, section: string, index?: number) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverSection(null);
      setDragOverIndex(null);
      
      const source = e.dataTransfer.getData("source");
      const blockType = e.dataTransfer.getData("blockType");
      const blockId = e.dataTransfer.getData("blockId");
      const sourceSection = e.dataTransfer.getData("section");
      const columnsData = e.dataTransfer.getData("columns");

      // Restore opacity for dragged element
      const draggedElement = document.querySelector('[draggable="true"]');
      if (draggedElement instanceof HTMLElement) {
        draggedElement.style.opacity = "1";
      }

      if (!blockType) return;

      // Handle reordering existing block
      if (source === "canvas" && blockId) {
        setCanvasBlocks((prev) => {
          const sourceBlocks = [...prev[sourceSection as keyof typeof prev]];
          const targetBlocks = [...prev[section as keyof typeof prev]];
          
          // Find the block being moved
          const blockIndex = sourceBlocks.findIndex((b) => b.id === blockId);
          if (blockIndex === -1) return prev;

          const blockToMove = sourceBlocks[blockIndex];

          // Calculate target index
          let targetIndex = index !== undefined ? index : targetBlocks.length;

          // Handle same-section moves
          if (sourceSection === section) {
            // Prevent dropping block on itself or at same position
            if (blockIndex === targetIndex || blockIndex === targetIndex - 1) {
              return prev;
            }
            
            // Create new array and move block
            const newBlocks = [...sourceBlocks];
            const [movedBlock] = newBlocks.splice(blockIndex, 1);
            
            // Adjust target index if moving forward (removing shifts indices)
            if (blockIndex < targetIndex) {
              targetIndex -= 1;
            }
            
            newBlocks.splice(targetIndex, 0, movedBlock);
            
            return {
              ...prev,
              [section]: newBlocks,
            };
          } else {
            // Cross-section move: remove from source, add to target
            const newSourceBlocks = sourceBlocks.filter((b) => b.id !== blockId);
            const newTargetBlocks = [...targetBlocks];
            newTargetBlocks.splice(targetIndex, 0, blockToMove);

            return {
              ...prev,
              [sourceSection]: newSourceBlocks,
              [section]: newTargetBlocks,
            };
          }
        });
        return;
      }

      // Handle adding new block from sidebar
      const numColumns = columnsData ? parseInt(columnsData, 10) : undefined;
      // Initialize columnsWidths: evenly distribute 12 grid units
      let columnsWidths: number[] | undefined = undefined;
      if (blockType === "Layout" && numColumns) {
        const baseWidth = Math.floor(12 / numColumns);
        const remainder = 12 % numColumns;
        columnsWidths = Array(numColumns).fill(baseWidth);
        // Distribute remainder to first columns
        for (let i = 0; i < remainder; i++) {
          columnsWidths[i]++;
        }
      }

      // Default styles for Heading blocks (Heading 1) with padding 12px on all sides
      const defaultHeadingStyles = blockType === "Heading" 
        ? { fontSize: 31, fontWeight: "bold" as const, padding: "12px" }
        : undefined;

      const isImageLikeBlock = blockType === "Image" || blockType === "Logo";
      const isButtonBlock = blockType === "Button";
      const isSocialBlock = blockType === "Social";

      // Default padding for Button blocks: top/bottom 12px, left/right 24px
      const defaultButtonBlockStyles = isButtonBlock
        ? {
            paddingTop: "12px",
            paddingBottom: "12px",
            paddingLeft: "24px",
            paddingRight: "24px",
          }
        : undefined;

      // Default social links for Social blocks
      const defaultSocialLinks: SocialLink[] = isSocialBlock
        ? ([
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
          ] as SocialLink[])
        : [];

      const newBlock: CanvasBlock = {
        id: `${blockType}-${Date.now()}`,
        type: blockType,
        label: getBlockLabel(blockType),
        content: "",
        columns: numColumns,
        columnsWidths: columnsWidths,
        ...(defaultHeadingStyles && { styles: defaultHeadingStyles }),
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
    [setCanvasBlocks]
  );

  const handleDragOverDropZone = useCallback(
    (e: React.DragEvent, section: string, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setDragOverIndex({ section, index });
      setDragOverSection(null);
    },
    []
  );

  const handleDragLeaveDropZone = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if we're moving to another element that's not a drop zone
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && !relatedTarget.closest(".drop-zone")) {
      setDragOverIndex(null);
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // Restore opacity after drag ends
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
  }, []);

  return {
    dragOverSection,
    setDragOverSection,
    dragOverIndex,
    setDragOverIndex,
    handleDragStart,
    handleBlockDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    handleDragOverDropZone,
    handleDragLeaveDropZone,
  };
};

