/**
 * Utilities for transforming between Klaviyo ContentBlock[] format
 * and the email builder's CanvasBlocks format
 */

import {
  CanvasBlocks,
  CanvasBlock,
} from "@/components/mailchimp/email-builder/types";
import { ContentBlock } from "@/hooks/useKlaviyoData";

/**
 * Convert Klaviyo ContentBlock array to CanvasBlocks format for email builder
 */
export const contentBlocksToCanvasBlocks = (
  blocks: ContentBlock[]
): CanvasBlocks => {
  const canvasBlocks: CanvasBlocks = {
    header: [],
    body: [],
    footer: [],
  };

  // Sort blocks by order
  const sortedBlocks = [...blocks].sort((a, b) => a.order - b.order);

  sortedBlocks.forEach((block) => {
    try {
      // Parse the content JSON if it's a string
      const content = typeof block.content === "string" 
        ? JSON.parse(block.content) 
        : block.content;

      // Determine section based on block_type or content metadata
      const section = content.section || "body";

      // Create CanvasBlock from ContentBlock
      const canvasBlock: CanvasBlock = {
        id: `${block.block_type}-${block.id}`,
        type: block.block_type,
        label: block.block_type,
        ...content, // Spread all content properties
      };

      // Add to appropriate section
      if (section === "header" && canvasBlocks.header) {
        canvasBlocks.header.push(canvasBlock);
      } else if (section === "footer" && canvasBlocks.footer) {
        canvasBlocks.footer.push(canvasBlock);
      } else {
        canvasBlocks.body.push(canvasBlock);
      }
    } catch (error) {
      console.error(`Failed to parse block ${block.id}:`, error);
    }
  });

  return canvasBlocks;
};

/**
 * Convert CanvasBlocks format to Klaviyo ContentBlock array for API
 * Note: This returns data without 'id' and 'email_draft' as those are managed by backend
 */
export const canvasBlocksToContentBlocks = (
  canvasBlocks: CanvasBlocks
): Omit<ContentBlock, "id" | "email_draft">[] => {
  const contentBlocks: Omit<ContentBlock, "id" | "email_draft">[] = [];
  let order = 0;

  // Process header blocks
  if (canvasBlocks.header) {
    canvasBlocks.header.forEach((block) => {
      const { id, type, label, ...content } = block;
      contentBlocks.push({
        block_type: type,
        content: {
          ...content,
          section: "header",
        },
        order: order++,
      });
    });
  }

  // Process body blocks
  canvasBlocks.body.forEach((block) => {
    const { id, type, label, ...content } = block;
    contentBlocks.push({
      block_type: type,
      content: {
        ...content,
        section: "body",
      },
      order: order++,
    });
  });

  // Process footer blocks
  if (canvasBlocks.footer) {
    canvasBlocks.footer.forEach((block) => {
      const { id, type, label, ...content } = block;
      contentBlocks.push({
        block_type: type,
        content: {
          ...content,
          section: "footer",
        },
        order: order++,
      });
    });
  }

  return contentBlocks;
};

/**
 * Create default CanvasBlocks structure for new drafts
 */
export const createDefaultCanvasBlocks = (): CanvasBlocks => {
  const timestamp = Date.now();

  const headerTextBlock: CanvasBlock = {
    id: `Paragraph-${timestamp}-1`,
    type: "Paragraph",
    label: "Paragraph",
    content: "View this email in your browser",
    styles: {
      fontSize: 12,
      color: "#6b7280",
      textAlign: "center",
    },
  };

  const headerLogoBlock: CanvasBlock = {
    id: `Logo-${timestamp}-2`,
    type: "Logo",
    label: "Logo",
    content: "Logo",
  };

  const bodyHeadingBlock: CanvasBlock = {
    id: `Heading-${timestamp}-3`,
    type: "Heading",
    label: "Heading",
    content: "Heading",
    styles: {
      fontSize: 24,
      fontWeight: "bold",
      textAlign: "center",
      color: "#111827",
    },
  };

  const bodyParagraphBlock: CanvasBlock = {
    id: `Paragraph-${timestamp}-4`,
    type: "Paragraph",
    label: "Paragraph",
    content:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    styles: {
      fontSize: 14,
      color: "#374151",
      textAlign: "left",
    },
  };

  const bodyButtonBlock: CanvasBlock = {
    id: `Button-${timestamp}-5`,
    type: "Button",
    label: "Button",
    content: "Button",
    buttonLinkType: "Web",
    buttonLinkValue: "",
    buttonOpenInNewTab: true,
    buttonBlockStyles: {},
    buttonShape: "Square",
    buttonAlignment: "center",
    buttonTextColor: "#ffffff",
    buttonBackgroundColor: "#111827",
  };

  const footerSocialBlock: CanvasBlock = {
    id: `Social-${timestamp}-6`,
    type: "Social",
    label: "Social",
    socialLinks: [
      { id: "x", platform: "X", url: "", label: "X" },
      { id: "facebook", platform: "Facebook", url: "", label: "Facebook" },
      { id: "instagram", platform: "Instagram", url: "", label: "Instagram" },
    ],
    socialAlignment: "center",
  };

  const footerParagraphBlock: CanvasBlock = {
    id: `Paragraph-${timestamp}-7`,
    type: "Paragraph",
    label: "Paragraph",
    content:
      "No longer want to receive these emails? {% unsubscribe %}\nOrganization Name, Address",
    styles: {
      fontSize: 12,
      color: "#6b7280",
      textAlign: "center",
    },
  };

  return {
    header: [headerTextBlock, headerLogoBlock],
    body: [bodyHeadingBlock, bodyParagraphBlock, bodyButtonBlock],
    footer: [footerSocialBlock, footerParagraphBlock],
  };
};

