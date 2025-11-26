import { CanvasBlock, CanvasBlocks, BlockBoxStyles } from "../types";

const blockBoxStyleKeys: (keyof BlockBoxStyles)[] = [
  "backgroundColor",
  "borderStyle",
  "borderWidth",
  "borderColor",
  "borderRadius",
  "padding",
  "paddingTop",
  "paddingRight",
  "paddingBottom",
  "paddingLeft",
  "margin",
  "marginTop",
  "marginRight",
  "marginBottom",
  "marginLeft",
];

function extractBlockBoxStyles(styles: {
  [key: string]: string;
}): BlockBoxStyles | undefined {
  const blockStyles: Partial<BlockBoxStyles> = {};

  blockBoxStyleKeys.forEach((key) => {
    const value = styles[key as string];
    if (value !== undefined) {
      blockStyles[key] = value as any;
    }
  });

  return Object.keys(blockStyles).length > 0
    ? (blockStyles as BlockBoxStyles)
    : undefined;
}

/**
 * Helper function to parse inline styles string to object
 */
function parseInlineStyles(styleString: string): { [key: string]: string } {
  const styles: { [key: string]: string } = {};
  if (!styleString) return styles;

  styleString.split(";").forEach((rule) => {
    const [key, value] = rule.split(":").map((s) => s.trim());
    if (key && value) {
      // Convert kebab-case to camelCase
      const camelKey = key.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      styles[camelKey] = value;
    }
  });

  return styles;
}

/**
 * Helper function to unescape HTML entities
 */
function unescapeHtml(html: string): string {
  const map: { [key: string]: string } = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#039;": "'",
  };
  return html.replace(/&amp;|&lt;|&gt;|&quot;|&#039;/g, (m) => map[m]);
}

function extractSpacingFromAttr(html: string): Record<string, string> | null {
  const match = html.match(/data-block-spacing="([^"]*)"/i);
  if (!match) return null;
  try {
    const decoded = unescapeHtml(match[1]);
    const parsed = JSON.parse(decoded);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    // Ignore malformed data attribute
  }
  return null;
}

/**
 * Parse Heading HTML to CanvasBlock
 */
function parseHeadingBlock(html: string, blockId: string): CanvasBlock {
  // Extract content and styles from h2 tag
  const h2Match = html.match(/<h2[^>]*style="([^"]*)"[^>]*>(.*?)<\/h2>/i);
  if (!h2Match) {
    return {
      id: blockId,
      type: "Heading",
      label: "Heading",
      content: "",
      styles: {},
    };
  }

  const styleStr = h2Match[1];
  let contentHtml = h2Match[2];
  const styles = parseInlineStyles(styleStr);

  let textLinkType: "Web" | "Email" | "Phone" | undefined;
  let textLinkValue: string | undefined;
  let textLinkOpenInNewTab: boolean | undefined;
  const anchorMatch = contentHtml.match(
    /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/i
  );
  if (anchorMatch) {
    const href = unescapeHtml(anchorMatch[1]);
    const anchorTag = anchorMatch[0];
    contentHtml = anchorMatch[2];
    textLinkOpenInNewTab = /target="_blank"/i.test(anchorTag);
    if (href.startsWith("mailto:")) {
      textLinkType = "Email";
      textLinkValue = href.replace(/^mailto:/i, "");
    } else if (href.startsWith("tel:")) {
      textLinkType = "Phone";
      textLinkValue = href.replace(/^tel:/i, "");
    } else {
      textLinkType = "Web";
      textLinkValue = href;
    }
  }

  // Extract text content (handle span tags)
  let content = contentHtml;
  const spanMatch = contentHtml.match(/<span[^>]*>(.*?)<\/span>/i);
  if (spanMatch) {
    content = spanMatch[1];
  }
  content = unescapeHtml(content);

  // Convert styles to TextStyles format
  const textStyles: any = {
    color: styles.color || "#111827",
    fontWeight: styles.fontWeight || "bold",
    fontStyle: styles.fontStyle || "normal",
    textAlign: styles.textAlign || "center",
    textDecoration: styles.textDecoration || "none",
    blockBackgroundColor: styles.backgroundColor || "transparent",
  };
  if (styles.direction) {
    textStyles.direction = styles.direction as "ltr" | "rtl";
  }

  if (styles.fontSize) {
    textStyles.fontSize = parseInt(styles.fontSize);
  }
  if (styles.fontFamily) {
    textStyles.fontFamily = styles.fontFamily;
  }
  if (styles.borderStyle && styles.borderStyle !== "none") {
    textStyles.borderStyle = styles.borderStyle;
    textStyles.borderWidth = styles.borderWidth;
    textStyles.borderColor = styles.borderColor;
  }
  if (styles.borderRadius) {
    textStyles.borderRadius = styles.borderRadius;
  }
  // Preserve spacing-related styles so padding/margins survive round-trips
  const spacingKeys = [
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
  ] as const;
  spacingKeys.forEach((key) => {
    if (styles[key]) {
      textStyles[key] = styles[key];
    }
  });
  if (styles.lineHeight) {
    textStyles.lineHeight = styles.lineHeight;
  }
  if (styles.letterSpacing) {
    textStyles.letterSpacing = styles.letterSpacing;
  }

  const spacingAttrData = extractSpacingFromAttr(html);
  if (spacingAttrData) {
    Object.entries(spacingAttrData).forEach(([key, value]) => {
      textStyles[key as keyof typeof textStyles] = value;
    });
  }

  // Extract highlight color if present
  const highlightMatch = contentHtml.match(
    /style="[^"]*background-color:\s*([^;"]+)/i
  );
  if (highlightMatch) {
    textStyles.textHighlightColor = highlightMatch[1].trim();
  }

  return {
    id: blockId,
    type: "Heading",
    label: "Heading",
    content,
    styles: textStyles,
    ...(textLinkValue
      ? {
          textLinkType: textLinkType || "Web",
          textLinkValue,
          textLinkOpenInNewTab: textLinkOpenInNewTab ?? false,
        }
      : {}),
  };
}

/**
 * Parse Paragraph HTML to CanvasBlock
 */
function parseParagraphBlock(html: string, blockId: string): CanvasBlock {
  // Extract content and styles from p tag
  const pMatch = html.match(/<p[^>]*style="([^"]*)"[^>]*>(.*?)<\/p>/i);
  if (!pMatch) {
    return {
      id: blockId,
      type: "Paragraph",
      label: "Text",
      content: "",
      styles: {},
    };
  }

  const styleStr = pMatch[1];
  let contentHtml = pMatch[2];
  const styles = parseInlineStyles(styleStr);

  let textLinkType: "Web" | "Email" | "Phone" | undefined;
  let textLinkValue: string | undefined;
  let textLinkOpenInNewTab: boolean | undefined;
  const anchorMatch = contentHtml.match(
    /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/i
  );
  if (anchorMatch) {
    const href = unescapeHtml(anchorMatch[1]);
    const anchorTag = anchorMatch[0];
    contentHtml = anchorMatch[2];
    textLinkOpenInNewTab = /target="_blank"/i.test(anchorTag);
    if (href.startsWith("mailto:")) {
      textLinkType = "Email";
      textLinkValue = href.replace(/^mailto:/i, "");
    } else if (href.startsWith("tel:")) {
      textLinkType = "Phone";
      textLinkValue = href.replace(/^tel:/i, "");
    } else {
      textLinkType = "Web";
      textLinkValue = href;
    }
  }

  // Extract text content (handle span tags)
  let content = contentHtml;
  const spanMatch = contentHtml.match(/<span[^>]*>(.*?)<\/span>/i);
  if (spanMatch) {
    content = spanMatch[1];
  }
  content = unescapeHtml(content);

  // Convert styles to TextStyles format
  const textStyles: any = {
    color: styles.color || "#374151",
    fontWeight: styles.fontWeight || "normal",
    fontStyle: styles.fontStyle || "normal",
    textAlign: styles.textAlign || "center",
    textDecoration: styles.textDecoration || "none",
    blockBackgroundColor: styles.backgroundColor || "transparent",
  };
  if (styles.direction) {
    textStyles.direction = styles.direction as "ltr" | "rtl";
  }

  if (styles.fontSize) {
    textStyles.fontSize = parseInt(styles.fontSize);
  }
  if (styles.fontFamily) {
    textStyles.fontFamily = styles.fontFamily;
  }
  if (styles.borderStyle && styles.borderStyle !== "none") {
    textStyles.borderStyle = styles.borderStyle;
    textStyles.borderWidth = styles.borderWidth;
    textStyles.borderColor = styles.borderColor;
  }
  if (styles.borderRadius) {
    textStyles.borderRadius = styles.borderRadius;
  }
  // Preserve spacing-related styles so padding/margins survive round-trips
  const spacingKeys = [
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
  ] as const;
  spacingKeys.forEach((key) => {
    if (styles[key]) {
      textStyles[key] = styles[key];
    }
  });
  if (styles.lineHeight) {
    textStyles.lineHeight = styles.lineHeight;
  }
  if (styles.letterSpacing) {
    textStyles.letterSpacing = styles.letterSpacing;
  }

  const spacingAttrData = extractSpacingFromAttr(html);
  if (spacingAttrData) {
    Object.entries(spacingAttrData).forEach(([key, value]) => {
      textStyles[key as keyof typeof textStyles] = value;
    });
  }

  // Extract highlight color if present
  const highlightMatch = contentHtml.match(
    /style="[^"]*background-color:\s*([^;"]+)/i
  );
  if (highlightMatch) {
    textStyles.textHighlightColor = highlightMatch[1].trim();
  }

  return {
    id: blockId,
    type: "Paragraph",
    label: "Text",
    content,
    styles: textStyles,
    ...(textLinkValue
      ? {
          textLinkType: textLinkType || "Web",
          textLinkValue,
          textLinkOpenInNewTab: textLinkOpenInNewTab ?? false,
        }
      : {}),
  };
}

/**
 * Parse Image/Logo HTML to CanvasBlock
 */
function parseImageLikeBlock(
  html: string,
  blockId: string,
  blockType: "Image" | "Logo"
): CanvasBlock {
  // Extract image URL
  const imgMatch = html.match(/<img[^>]*src="([^"]*)"[^>]*>/i);
  const imageUrl = imgMatch ? unescapeHtml(imgMatch[1]) : "";

  // Extract alt text
  const altMatch = html.match(/alt="([^"]*)"/i);
  const imageAltText = altMatch ? unescapeHtml(altMatch[1]) : "";

  // Extract link if present
  const linkMatch = html.match(/<a[^>]*href="([^"]*)"[^>]*>/i);
  const imageLinkValue = linkMatch ? unescapeHtml(linkMatch[1]) : undefined;
  const imageLinkType: "Web" | "Email" | "Phone" = imageLinkValue?.startsWith(
    "mailto:"
  )
    ? "Email"
    : imageLinkValue?.startsWith("tel:")
    ? "Phone"
    : "Web";

  // Extract alignment
  const alignmentMatch = html.match(/text-align:\s*([^;"]+)/i);
  const imageAlignment = alignmentMatch
    ? (alignmentMatch[1].trim() as "left" | "center" | "right")
    : "center";

  // Extract image styles
  const imgStyleMatch = html.match(/<img[^>]*style="([^"]*)"[^>]*>/i);
  const imgStyles = imgStyleMatch ? parseInlineStyles(imgStyleMatch[1]) : {};

  let imageDisplayMode: "Original" | "Fill" | "Scale" = "Original";
  let imageScalePercent: number | undefined;
  if (imgStyles.width === "100%" && imgStyles.height === "100%") {
    imageDisplayMode = "Fill";
  } else if (imgStyles.width && imgStyles.width !== "100%") {
    const widthMatch = imgStyles.width.match(/(\d+)%/);
    if (widthMatch) {
      imageDisplayMode = "Scale";
      imageScalePercent = parseInt(widthMatch[1]);
    }
  }

  let imageBlockStyles: BlockBoxStyles | undefined;
  const wrapperMatch = html.match(
    /<div[^>]*data-block-type="(?:Image|Logo)"[^>]*style="([^"]*)"[^>]*>/i
  );
  if (wrapperMatch) {
    const wrapperStyles = parseInlineStyles(wrapperMatch[1]);
    imageBlockStyles = extractBlockBoxStyles(wrapperStyles);
  }

  let imageFrameStyles: BlockBoxStyles | undefined;
  let frameMatch = html.match(
    /<div[^>]*data-block-frame="true"[^>]*style="([^"]*)"[^>]*>/i
  );
  if (!frameMatch) {
    frameMatch = html.match(
      /<div[^>]*style="([^"]*)"[^>]*>\s*(?:<(?:a|img|div))/i
    );
  }
  if (frameMatch) {
    const frameStyles = parseInlineStyles(frameMatch[1]);
    imageFrameStyles = extractBlockBoxStyles(frameStyles);
  }

  return {
    id: blockId,
    type: blockType,
    label: blockType,
    imageUrl,
    imageAltText,
    imageDisplayMode,
    imageLinkType,
    imageLinkValue: imageLinkValue?.replace(/^(mailto:|tel:)/i, ""),
    imageOpenInNewTab: html.includes('target="_blank"'),
    imageAlignment,
    ...(imageScalePercent !== undefined && !Number.isNaN(imageScalePercent)
      ? { imageScalePercent }
      : {}),
    ...(imageBlockStyles ? { imageBlockStyles } : {}),
    ...(imageFrameStyles ? { imageFrameStyles } : {}),
  };
}

/**
 * Parse Image HTML to CanvasBlock
 */
function parseImageBlock(html: string, blockId: string): CanvasBlock {
  return parseImageLikeBlock(html, blockId, "Image");
}

/**
 * Parse Button HTML to CanvasBlock
 */
function parseButtonBlock(html: string, blockId: string): CanvasBlock {
  // Extract button text
  const buttonMatch = html.match(/<button[^>]*>(.*?)<\/button>/i);
  const content = buttonMatch ? unescapeHtml(buttonMatch[1]) : "Button text";

  // Extract link if present
  const linkMatch = html.match(/<a[^>]*href="([^"]*)"[^>]*>/i);
  const buttonLinkValue = linkMatch ? unescapeHtml(linkMatch[1]) : undefined;
  const buttonLinkType: "Web" | "Email" | "Phone" = buttonLinkValue?.startsWith(
    "mailto:"
  )
    ? "Email"
    : buttonLinkValue?.startsWith("tel:")
    ? "Phone"
    : "Web";

  // Extract button styles
  const buttonStyleMatch = html.match(/<button[^>]*style="([^"]*)"[^>]*>/i);
  const buttonStyles = buttonStyleMatch
    ? parseInlineStyles(buttonStyleMatch[1])
    : {};

  // Extract alignment
  const alignmentMatch = html.match(/text-align:\s*([^;"]+)/i);
  const buttonAlignment = alignmentMatch
    ? (alignmentMatch[1].trim() as "left" | "center" | "right")
    : "center";

  // Determine button shape from border-radius
  let buttonShape: "Square" | "Round" | "Pill" = "Square";
  if (
    buttonStyles.borderRadius === "9999px" ||
    buttonStyles.borderRadius === "50%"
  ) {
    buttonShape = "Pill";
  } else if (buttonStyles.borderRadius && buttonStyles.borderRadius !== "0px") {
    buttonShape = "Round";
  }

  // Determine button size from width
  let buttonSize: "Small" | "Medium" | "Large" = "Small";
  if (buttonStyles.width === "300px") {
    buttonSize = "Large";
  } else if (buttonStyles.width === "200px") {
    buttonSize = "Medium";
  }

  let buttonBlockStyles: BlockBoxStyles | undefined;
  const wrapperMatch = html.match(/<div[^>]*style="([^"]*)"[^>]*>/i);
  if (wrapperMatch) {
    const wrapperStyles = parseInlineStyles(wrapperMatch[1]);
    buttonBlockStyles = extractBlockBoxStyles(wrapperStyles);
  }

  return {
    id: blockId,
    type: "Button",
    label: "Button",
    content,
    buttonLinkType,
    buttonLinkValue: buttonLinkValue?.replace(/^(mailto:|tel:)/i, ""),
    buttonOpenInNewTab: html.includes('target="_blank"'),
    buttonAlignment,
    buttonShape,
    buttonSize,
    buttonTextColor: buttonStyles.color || "#ffffff",
    buttonBackgroundColor: buttonStyles.backgroundColor || "#111827",
    ...(buttonBlockStyles ? { buttonBlockStyles } : {}),
  };
}

/**
 * Parse Divider HTML to CanvasBlock
 */
function parseDividerBlock(html: string, blockId: string): CanvasBlock {
  // Extract divider styles from inner div
  const dividerMatch = html.match(
    /<div[^>]*style="[^"]*border-top-style:\s*([^;"]+)/i
  );
  const dividerStyle = dividerMatch
    ? (dividerMatch[1].trim() as "solid" | "dashed" | "dotted" | "double")
    : "solid";

  const colorMatch = html.match(/border-top-color:\s*([^;"]+)/i);
  const dividerLineColor = colorMatch ? colorMatch[1].trim() : "#000000";

  const thicknessMatch = html.match(/border-top-width:\s*([^;"]+)/i);
  const dividerThickness = thicknessMatch ? thicknessMatch[1].trim() : "2px";

  let dividerBlockStyles: BlockBoxStyles | undefined;
  const containerMatch = html.match(/<div[^>]*style="([^"]*)"[^>]*>\s*<div/i);
  if (containerMatch) {
    const containerStyles = parseInlineStyles(containerMatch[1]);
    dividerBlockStyles = extractBlockBoxStyles(containerStyles);
  }

  return {
    id: blockId,
    type: "Divider",
    label: "Divider",
    dividerStyle,
    dividerLineColor,
    dividerThickness,
    ...(dividerBlockStyles ? { dividerBlockStyles } : {}),
  };
}

/**
 * Parse Spacer HTML to CanvasBlock
 */
function parseSpacerBlock(html: string, blockId: string): CanvasBlock {
  const heightMatch = html.match(/height:\s*([^;"]+)/i);
  const spacerHeight = heightMatch ? heightMatch[1].trim() : "20px";
  let spacerBlockStyles: BlockBoxStyles | undefined;
  const divMatch = html.match(/<div[^>]*style="([^"]*)"[^>]*>/i);
  if (divMatch) {
    const styles = parseInlineStyles(divMatch[1]);
    spacerBlockStyles = extractBlockBoxStyles(styles);
  }

  return {
    id: blockId,
    type: "Spacer",
    label: "Spacer",
    spacerHeight,
    ...(spacerBlockStyles ? { spacerBlockStyles } : {}),
  };
}

/**
 * Parse Logo HTML to CanvasBlock
 */
function parseLogoBlock(html: string, blockId: string): CanvasBlock {
  if (html.includes('data-block-type="Logo"') || html.includes("<img")) {
    return parseImageLikeBlock(html, blockId, "Logo");
  }

  const logoMatch = html.match(/<p[^>]*style="([^"]*)"[^>]*>(.*?)<\/p>/i);
  if (!logoMatch) {
    return {
      id: blockId,
      type: "Logo",
      label: "Logo",
      content: "Logo",
      styles: {},
    };
  }

  const styleStr = logoMatch[1];
  const contentHtml = logoMatch[2];
  const styles = parseInlineStyles(styleStr);
  const content = unescapeHtml(contentHtml.replace(/<[^>]+>/g, ""));

  const textStyles: any = {
    color: styles.color || "#111827",
    fontWeight: styles.fontWeight || "bold",
    fontStyle: styles.fontStyle || "normal",
    textAlign: styles.textAlign || "center",
    textDecoration: styles.textDecoration || "none",
    blockBackgroundColor: styles.backgroundColor || "transparent",
  };

  if (styles.fontSize) {
    textStyles.fontSize = parseInt(styles.fontSize);
  }
  if (styles.fontFamily) {
    textStyles.fontFamily = styles.fontFamily;
  }
  if (styles.letterSpacing) {
    textStyles.letterSpacing = styles.letterSpacing;
  }
  if (styles.borderStyle && styles.borderStyle !== "none") {
    textStyles.borderStyle = styles.borderStyle;
    textStyles.borderWidth = styles.borderWidth;
    textStyles.borderColor = styles.borderColor;
  }
  if (styles.borderRadius) {
    textStyles.borderRadius = styles.borderRadius;
  }

  const spacingKeys = [
    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",
    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",
  ] as const;
  spacingKeys.forEach((key) => {
    if (styles[key]) {
      textStyles[key] = styles[key];
    }
  });

  if (styles.lineHeight) {
    textStyles.lineHeight = styles.lineHeight;
  }

  const spacingAttrData = extractSpacingFromAttr(html);
  if (spacingAttrData) {
    Object.entries(spacingAttrData).forEach(([key, value]) => {
      textStyles[key as keyof typeof textStyles] = value;
    });
  }

  return {
    id: blockId,
    type: "Logo",
    label: "Logo",
    content,
    styles: textStyles,
  };
}

/**
 * Determine block type from HTML
 */
function detectBlockType(html: string): string {
  // First check for explicit data-block-type attribute (highest priority)
  const blockTypeMatch = html.match(/data-block-type="([^"]+)"/i);
  if (blockTypeMatch) {
    return blockTypeMatch[1];
  }

  // Then check for HTML elements and other indicators
  if (html.includes("<h1") || html.includes("<h2") || html.includes("<h3")) {
    return "Heading";
  }
  if (html.includes("<img")) {
    return "Image";
  }
  if (html.includes("<button")) {
    return "Button";
  }
  if (html.includes("border-top-style") || html.includes("border-top-width")) {
    return "Divider";
  }
  if (
    html.includes("height:") &&
    !html.includes("<img") &&
    !html.includes("<button")
  ) {
    return "Spacer";
  }
  if (
    html.includes("Social Links") ||
    html.includes('data-block-type="Social"')
  ) {
    return "Social";
  }
  if (html.includes("<p")) {
    // Check if it's a paragraph or logo
    if (
      html.includes("text-transform: uppercase") ||
      html.includes("letter-spacing")
    ) {
      return "Logo";
    }
    return "Paragraph";
  }
  return "Paragraph"; // Default fallback
}

/**
 * Parse HTML string to CanvasBlock
 */
function parseSocialBlock(html: string, blockId: string): CanvasBlock {
  // Default social links
  const socialLinks = [
    {
      id: `${blockId}-social-1`,
      platform: "Facebook" as const,
      url: "https://facebook.com/",
      label: "Facebook",
    },
    {
      id: `${blockId}-social-2`,
      platform: "Instagram" as const,
      url: "https://instagram.com/",
      label: "Instagram",
    },
    {
      id: `${blockId}-social-3`,
      platform: "X" as const,
      url: "https://x.com/",
      label: "Twitter",
    },
  ];

  let socialAlignment: "left" | "center" | "right" = "center";
  let socialBlockStyles: BlockBoxStyles | undefined;
  const wrapperMatch = html.match(
    /<div[^>]*data-block-type="Social"[^>]*style="([^"]*)"[^>]*>/i
  );
  if (wrapperMatch) {
    const wrapperStyles = parseInlineStyles(wrapperMatch[1]);
    if (wrapperStyles.textAlign) {
      const align = wrapperStyles.textAlign as "left" | "center" | "right";
      if (align === "left" || align === "center" || align === "right") {
        socialAlignment = align;
      }
      delete wrapperStyles.textAlign;
    }
    socialBlockStyles = extractBlockBoxStyles(wrapperStyles);
  }

  return {
    id: blockId,
    type: "Social",
    label: "Social",
    content: "",
    socialType: "Follow",
    socialLinks,
    ...(socialBlockStyles ? { socialBlockStyles } : {}),
    socialDisplay: "Icon only",
    socialIconStyle: "Plain",
    socialLayout: "Horizontal-bottom",
    socialIconColor: "#000000",
    socialSize: "Medium",
    socialAlignment,
  };
}

function parseHTMLToBlock(html: string, blockId: string): CanvasBlock | null {
  if (!html || !html.trim()) {
    return null;
  }

  const blockType = detectBlockType(html);

  switch (blockType) {
    case "Heading":
      return parseHeadingBlock(html, blockId);
    case "Paragraph":
      return parseParagraphBlock(html, blockId);
    case "Image":
      return parseImageBlock(html, blockId);
    case "Button":
      return parseButtonBlock(html, blockId);
    case "Divider":
      return parseDividerBlock(html, blockId);
    case "Spacer":
      return parseSpacerBlock(html, blockId);
    case "Logo":
      return parseLogoBlock(html, blockId);
    case "Social":
      return parseSocialBlock(html, blockId);
    default:
      // Default to paragraph if unknown
      return parseParagraphBlock(html, blockId);
  }
}

/**
 * Parse sections (block ID to HTML mapping) to CanvasBlocks structure
 * Supports section prefixes in block IDs (e.g., "header-block-id-1", "body-block-id-2")
 * Maintains order by extracting sequence numbers from block IDs
 */
export function parseHTMLToBlocks(sections: {
  [key: string]: string;
}): CanvasBlocks {
  const result: CanvasBlocks = {
    header: [],
    body: [],
    footer: [],
  };

  // Parse all blocks with their order information
  const blocksWithOrder: Array<{
    block: CanvasBlock;
    section: "header" | "body" | "footer";
    order: number;
  }> = [];

  Object.entries(sections).forEach(([blockId, html]) => {
    // Extract section prefix and original block ID
    let section: "header" | "body" | "footer" = "body";
    let originalBlockId = blockId;

    if (blockId.startsWith("header-")) {
      section = "header";
      originalBlockId = blockId.replace(/^header-/, "");
    } else if (blockId.startsWith("footer-")) {
      section = "footer";
      originalBlockId = blockId.replace(/^footer-/, "");
    } else if (blockId.startsWith("body-")) {
      section = "body";
      originalBlockId = blockId.replace(/^body-/, "");
    }

    // Extract order number from block ID (e.g., "Paragraph-1234567890-1" -> 1)
    const orderMatch = originalBlockId.match(/-(\d+)$/);
    const order = orderMatch ? parseInt(orderMatch[1], 10) : 0;

    const block = parseHTMLToBlock(html, originalBlockId);
    if (block) {
      blocksWithOrder.push({ block, section, order });
    }
  });

  // Sort by section and order, then add to result
  blocksWithOrder.sort((a, b) => {
    // First sort by section (header < body < footer)
    const sectionOrder: { [key: string]: number } = {
      header: 0,
      body: 1,
      footer: 2,
    };
    const sectionDiff = sectionOrder[a.section] - sectionOrder[b.section];
    if (sectionDiff !== 0) {
      return sectionDiff;
    }
    // Then sort by order within the same section
    return a.order - b.order;
  });

  // Add sorted blocks to result
  blocksWithOrder.forEach(({ block, section }) => {
    result[section].push(block);
  });

  return result;
}

/**
 * Parse sections with explicit section mapping
 * This version uses the provided mapping instead of inferring from block ID prefix
 */
export function parseHTMLToBlocksWithMapping(
  sections: { [key: string]: string },
  sectionMapping: { [blockId: string]: "header" | "body" | "footer" }
): CanvasBlocks {
  const result: CanvasBlocks = {
    header: [],
    body: [],
    footer: [],
  };

  Object.entries(sections).forEach(([blockId, html]) => {
    const section = sectionMapping[blockId] || "body";
    const block = parseHTMLToBlock(html, blockId);
    if (block) {
      result[section].push(block);
    }
  });

  return result;
}
