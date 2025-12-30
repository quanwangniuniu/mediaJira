/**
 * Klaviyo-specific block utilities
 * These functions handle Klaviyo block types and map them to mailchimp-compatible types
 */

/**
 * Get Klaviyo-specific block label
 */
export const getKlaviyoBlockLabel = (blockType: string): string => {
  const labelMap: Record<string, string> = {
    Paragraph: "Text",
    Heading: "Text",
    Text: "Text",
    Layout: "Layout",
    Split: "Split",
    HeaderBar: "Header bar",
    DropShadow: "Drop shadow",
    Table: "Table",
    ReviewQuote: "Review quote",
    Social: "Social links",
    Code: "HTML",
  };
  return labelMap[blockType] || blockType;
};

/**
 * Map Klaviyo block type to mailchimp-compatible type
 * This is used when creating blocks that need to be compatible with mailchimp components
 */
export const mapKlaviyoBlockType = (blockType: string): string => {
  const typeMap: Record<string, string> = {
    Text: "Heading", // Text blocks use Heading rendering logic
    Split: "Layout", // Split blocks are Layout blocks
  };
  return typeMap[blockType] || blockType;
};

/**
 * Check if a block type is a Klaviyo-specific type that needs special handling
 */
export const isKlaviyoSpecificBlock = (blockType: string): boolean => {
  return ["Text", "Split", "HeaderBar", "DropShadow", "Table", "ReviewQuote"].includes(blockType);
};

/**
 * Get default styles for Klaviyo block types
 */
export const getKlaviyoBlockDefaultStyles = (blockType: string) => {
  if (blockType === "Text" || blockType === "Heading") {
    return { fontSize: 31, fontWeight: "bold" as const, padding: "12px" };
  }
  return undefined;
};

