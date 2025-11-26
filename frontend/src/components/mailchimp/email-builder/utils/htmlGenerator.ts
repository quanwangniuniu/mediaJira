import { CanvasBlock, CanvasBlocks } from "../types";
import React from "react";

/**
 * Helper function to escape HTML special characters
 */
function escapeHtml(text: string): string {
  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * Helper function to convert style object to inline style string
 */
function styleToString(styles: React.CSSProperties): string {
  return Object.entries(styles)
    .map(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      return `${cssKey}: ${value}`;
    })
    .join("; ");
}

function toCssSize(value?: string | number | null): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") {
    return `${value}px`;
  }
  return value;
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

function extractSpacingData(styles?: Record<string, any>) {
  if (!styles) return null;
  const data: Record<string, string | number> = {};
  spacingKeys.forEach((key) => {
    const value = styles[key];
    if (value !== undefined && value !== null && value !== "") {
      data[key] = value;
    }
  });
  return Object.keys(data).length > 0 ? data : null;
}

/**
 * Helper function to build href for image/button links
 */
function buildHref(
  linkValue?: string,
  linkType: "Web" | "Email" | "Phone" = "Web"
): string | null {
  const rawValue = linkValue?.trim();
  if (!rawValue) return null;

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
    default: {
      if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(rawValue)) {
        return rawValue;
      }
      return `https://${rawValue}`;
    }
  }
}

/**
 * Helper function to generate inline styles from BlockBoxStyles
 */
function getBlockBoxStyles(styles?: {
  backgroundColor?: string;
  borderStyle?: string;
  borderWidth?: number | string;
  borderColor?: string;
  borderRadius?: number | string;
  padding?: number | string;
  margin?: number | string;
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  marginTop?: number | string;
  marginRight?: number | string;
  marginBottom?: number | string;
  marginLeft?: number | string;
}): string {
  if (!styles) return "";

  const styleObj: React.CSSProperties = {};

  if (styles.backgroundColor) styleObj.backgroundColor = styles.backgroundColor;
  if (styles.borderStyle && styles.borderStyle !== "none") {
    styleObj.borderStyle = styles.borderStyle as any;
    styleObj.borderWidth = toCssSize(styles.borderWidth) || "1px";
    if (styles.borderColor) styleObj.borderColor = styles.borderColor;
  }
  if (styles.borderRadius)
    styleObj.borderRadius = toCssSize(styles.borderRadius);
  if (styles.padding) styleObj.padding = toCssSize(styles.padding);
  if (styles.margin) styleObj.margin = toCssSize(styles.margin);
  if (styles.paddingTop) styleObj.paddingTop = toCssSize(styles.paddingTop);
  if (styles.paddingRight)
    styleObj.paddingRight = toCssSize(styles.paddingRight);
  if (styles.paddingBottom)
    styleObj.paddingBottom = toCssSize(styles.paddingBottom);
  if (styles.paddingLeft) styleObj.paddingLeft = toCssSize(styles.paddingLeft);
  if (styles.marginTop) styleObj.marginTop = toCssSize(styles.marginTop);
  if (styles.marginRight) styleObj.marginRight = toCssSize(styles.marginRight);
  if (styles.marginBottom)
    styleObj.marginBottom = toCssSize(styles.marginBottom);
  if (styles.marginLeft) styleObj.marginLeft = toCssSize(styles.marginLeft);

  return styleToString(styleObj);
}

/**
 * Generate HTML for a Heading block
 */
function generateHeadingHTML(block: CanvasBlock): string {
  const styles = block.styles || {};
  const content = escapeHtml(block.content || "Heading text");
  const linkHref =
    block.textLinkValue && block.textLinkValue.trim()
      ? buildHref(block.textLinkValue, block.textLinkType || "Web")
      : null;
  const wrapWithTextLink = (innerHtml: string) => {
    if (!linkHref) return innerHtml;
    const targetAttr =
      block.textLinkOpenInNewTab ?? true
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";
    const linkColor = styles.color || "#0f766e";
    return `<a href="${escapeHtml(
      linkHref
    )}"${targetAttr} style="color: ${linkColor}; text-decoration: underline;">${innerHtml}</a>`;
  };

  const styleObj: React.CSSProperties = {
    fontFamily: styles.fontFamily || "Helvetica, Arial, sans-serif",
    fontSize: styles.fontSize ? `${styles.fontSize}px` : undefined,
    fontWeight: styles.fontWeight || "bold",
    fontStyle: styles.fontStyle || "normal",
    textDecoration: styles.textDecoration || "none",
    textAlign: (styles.textAlign || "center") as any,
    color: styles.color || "#111827",
    backgroundColor: styles.blockBackgroundColor || "transparent",
  };
  if (styles.direction) {
    styleObj.direction = styles.direction;
  }

  if (styles.borderStyle && styles.borderStyle !== "none") {
    styleObj.borderStyle = styles.borderStyle as any;
    styleObj.borderWidth = toCssSize(styles.borderWidth) || "1px";
    if (styles.borderColor) styleObj.borderColor = styles.borderColor;
  }
  if (styles.borderRadius)
    styleObj.borderRadius = toCssSize(styles.borderRadius);
  if (styles.padding) styleObj.padding = toCssSize(styles.padding);
  if (styles.margin) styleObj.margin = toCssSize(styles.margin);
  if (styles.paddingTop) styleObj.paddingTop = toCssSize(styles.paddingTop);
  if (styles.paddingRight)
    styleObj.paddingRight = toCssSize(styles.paddingRight);
  if (styles.paddingBottom)
    styleObj.paddingBottom = toCssSize(styles.paddingBottom);
  if (styles.paddingLeft) styleObj.paddingLeft = toCssSize(styles.paddingLeft);
  if (styles.marginTop) styleObj.marginTop = toCssSize(styles.marginTop);
  if (styles.marginRight) styleObj.marginRight = toCssSize(styles.marginRight);
  if (styles.marginBottom)
    styleObj.marginBottom = toCssSize(styles.marginBottom);
  if (styles.marginLeft) styleObj.marginLeft = toCssSize(styles.marginLeft);

  const inlineStyle = styleToString(styleObj);
  const highlightStyle = styles.textHighlightColor
    ? `background-color: ${styles.textHighlightColor};`
    : "";

  const spacingData = extractSpacingData(styles);
  const spacingAttr = spacingData
    ? ` data-block-spacing="${escapeHtml(JSON.stringify(spacingData))}"`
    : "";

  const textMarkup = highlightStyle
    ? `<span style="${highlightStyle}">${content}</span>`
    : content;

  return `<h2 data-block-type="Heading"${spacingAttr} style="${inlineStyle}">${wrapWithTextLink(
    textMarkup
  )}</h2>`;
}

/**
 * Generate HTML for a Paragraph block
 */
function generateParagraphHTML(block: CanvasBlock): string {
  const styles = block.styles || {};
  const content = escapeHtml(block.content || "Paragraph text");
  const linkHref =
    block.textLinkValue && block.textLinkValue.trim()
      ? buildHref(block.textLinkValue, block.textLinkType || "Web")
      : null;
  const wrapWithTextLink = (innerHtml: string) => {
    if (!linkHref) return innerHtml;
    const targetAttr =
      block.textLinkOpenInNewTab ?? true
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";
    const linkColor = styles.color || "#0f766e";
    return `<a href="${escapeHtml(
      linkHref
    )}"${targetAttr} style="color: ${linkColor}; text-decoration: underline;">${innerHtml}</a>`;
  };

  const styleObj: React.CSSProperties = {
    fontFamily: styles.fontFamily || "Helvetica, Arial, sans-serif",
    fontSize: styles.fontSize ? `${styles.fontSize}px` : undefined,
    fontWeight: styles.fontWeight || "normal",
    fontStyle: styles.fontStyle || "normal",
    textDecoration: styles.textDecoration || "none",
    textAlign: (styles.textAlign || "center") as any,
    color: styles.color || "#374151",
    backgroundColor: styles.blockBackgroundColor || "transparent",
  };
  if (styles.direction) {
    styleObj.direction = styles.direction;
  }

  if (styles.borderStyle && styles.borderStyle !== "none") {
    styleObj.borderStyle = styles.borderStyle as any;
    styleObj.borderWidth = toCssSize(styles.borderWidth) || "1px";
    if (styles.borderColor) styleObj.borderColor = styles.borderColor;
  }
  if (styles.borderRadius)
    styleObj.borderRadius = toCssSize(styles.borderRadius);
  if (styles.padding) styleObj.padding = toCssSize(styles.padding);
  if (styles.margin) styleObj.margin = toCssSize(styles.margin);
  if (styles.paddingTop) styleObj.paddingTop = toCssSize(styles.paddingTop);
  if (styles.paddingRight)
    styleObj.paddingRight = toCssSize(styles.paddingRight);
  if (styles.paddingBottom)
    styleObj.paddingBottom = toCssSize(styles.paddingBottom);
  if (styles.paddingLeft) styleObj.paddingLeft = toCssSize(styles.paddingLeft);
  if (styles.marginTop) styleObj.marginTop = toCssSize(styles.marginTop);
  if (styles.marginRight) styleObj.marginRight = toCssSize(styles.marginRight);
  if (styles.marginBottom)
    styleObj.marginBottom = toCssSize(styles.marginBottom);
  if (styles.marginLeft) styleObj.marginLeft = toCssSize(styles.marginLeft);

  const inlineStyle = styleToString(styleObj);
  const highlightStyle = styles.textHighlightColor
    ? `background-color: ${styles.textHighlightColor};`
    : "";

  const spacingData = extractSpacingData(styles);
  const spacingAttr = spacingData
    ? ` data-block-spacing="${escapeHtml(JSON.stringify(spacingData))}"`
    : "";

  const textMarkup = highlightStyle
    ? `<span style="${highlightStyle}">${content}</span>`
    : content;

  return `<p data-block-type="Paragraph"${spacingAttr} style="${inlineStyle}">${wrapWithTextLink(
    textMarkup
  )}</p>`;
}

/**
 * Generate HTML for an Image block
 */
function generateImageHTML(block: CanvasBlock): string {
  const imageAlt = escapeHtml(block.imageAltText?.trim() || "Image");
  const imageUrl = block.imageUrl ? escapeHtml(block.imageUrl) : null;
  const displayMode = block.imageDisplayMode || "Original";
  const alignment = block.imageAlignment || "center";

  // Build image styles
  const imageStyles: React.CSSProperties = {
    display: "block",
    maxWidth: "100%",
    height: "auto",
  };

  if (displayMode === "Scale") {
    const scalePercent = Math.min(
      100,
      Math.max(10, block.imageScalePercent ?? 85)
    );
    imageStyles.width = `${scalePercent}%`;
  } else if (displayMode === "Fill") {
    imageStyles.width = "100%";
    imageStyles.height = "100%";
    imageStyles.objectFit = "cover" as any;
  }

  const imageStyleStr = styleToString(imageStyles);

  // Build wrapper styles
  const wrapperStyles: React.CSSProperties = {
    width: "100%",
    textAlign: alignment as any,
  };

  // Add block styles
  const blockStyles = getBlockBoxStyles(block.imageBlockStyles);

  // Build frame styles
  const frameStyles = getBlockBoxStyles(block.imageFrameStyles);
  const hasCustomFramePadding = !!(
    block.imageFrameStyles?.padding ||
    block.imageFrameStyles?.paddingTop ||
    block.imageFrameStyles?.paddingRight ||
    block.imageFrameStyles?.paddingBottom ||
    block.imageFrameStyles?.paddingLeft
  );

  // Build image element / placeholder
  let imageElement = imageUrl
    ? `<img src="${imageUrl}" alt="${imageAlt}" style="${imageStyleStr}" />`
    : `<div style="width: 200px; height: 140px; border: 2px dashed #9ca3af; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 14px;">${imageAlt}</div>`;

  if (imageUrl) {
    // Wrap in link if needed
    const href = buildHref(block.imageLinkValue, block.imageLinkType);
    if (href) {
      const target =
        block.imageOpenInNewTab ?? true
          ? ' target="_blank" rel="noopener noreferrer"'
          : "";
      imageElement = `<a href="${escapeHtml(
        href
      )}"${target} style="display: block; width: 100%; height: 100%; text-decoration: none;">${imageElement}</a>`;
    }
  }

  // Wrap in frame div
  const framePadding = hasCustomFramePadding ? "" : "padding: 12px 24px;";
  const frameDiv = `<div data-block-frame="true" style="display: inline-flex; align-items: center; justify-content: center; ${frameStyles} ${framePadding}">${imageElement}</div>`;

  // Wrap in alignment wrapper
  const wrapperStyleStr = styleToString(wrapperStyles);
  const combinedWrapperStyle = [wrapperStyleStr, blockStyles]
    .filter((str) => Boolean(str && str.trim()))
    .map((str) => str.trim().replace(/;$/, ""))
    .join("; ");

  return `<div data-block-type="Image" style="${combinedWrapperStyle}">${frameDiv}</div>`;
}

/**
 * Generate HTML for a Button block
 */
function generateButtonHTML(block: CanvasBlock): string {
  const content = escapeHtml(block.content || "Button text");
  const buttonTextColor = block.buttonTextColor || "#ffffff";
  const buttonBackgroundColor = block.buttonBackgroundColor || "#111827";
  const buttonShape = block.buttonShape || "Square";
  const buttonAlignment = block.buttonAlignment || "center";
  const buttonSize = block.buttonSize || "Small";

  // Size-based width
  const sizeWidths: { [key: string]: string } = {
    Small: "150px",
    Medium: "200px",
    Large: "300px",
  };
  const buttonWidth = sizeWidths[buttonSize] || sizeWidths.Small;

  // Calculate border radius based on shape
  let borderRadius = "0px";
  if (buttonShape === "Round") {
    borderRadius = "8px";
  } else if (buttonShape === "Pill") {
    borderRadius = "9999px";
  }

  // Build button styles
  const buttonStyles: React.CSSProperties = {
    backgroundColor: buttonBackgroundColor,
    color: buttonTextColor,
    borderRadius: block.buttonBlockStyles?.borderRadius || borderRadius,
    width: buttonWidth,
    padding: "12px 24px",
    fontSize: "16px",
    fontWeight: "600",
    textAlign: "center" as any,
    textDecoration: "none",
    display: "inline-block",
    border: "none",
    cursor: "pointer",
  };

  if (
    block.buttonBlockStyles?.borderStyle &&
    block.buttonBlockStyles.borderStyle !== "none"
  ) {
    buttonStyles.borderStyle = block.buttonBlockStyles.borderStyle as any;
    buttonStyles.borderWidth = block.buttonBlockStyles.borderWidth || "1px";
    if (block.buttonBlockStyles.borderColor) {
      buttonStyles.borderColor = block.buttonBlockStyles.borderColor;
    }
  }

  const buttonStyleStr = styleToString(buttonStyles);

  // Build button element
  const buttonElement = `<button style="${buttonStyleStr}">${content}</button>`;

  // Wrap in link if needed
  const href = buildHref(block.buttonLinkValue, block.buttonLinkType);
  let wrappedButton = buttonElement;
  if (href) {
    const target =
      block.buttonOpenInNewTab ?? true
        ? ' target="_blank" rel="noopener noreferrer"'
        : "";
    wrappedButton = `<a href="${escapeHtml(
      href
    )}"${target} style="text-decoration: none; display: inline-block;">${buttonElement}</a>`;
  }

  // Build wrapper styles for alignment and spacing
  const wrapperStyles: React.CSSProperties = {
    width: "100%",
    textAlign: buttonAlignment as any,
  };

  // Add block styles (padding, margin, etc.)
  const blockStyles = getBlockBoxStyles(block.buttonBlockStyles);

  const wrapperStyleStr = styleToString(wrapperStyles);
  const combinedWrapperStyle = [wrapperStyleStr, blockStyles]
    .filter((str) => Boolean(str && str.trim()))
    .map((str) => str.trim().replace(/;$/, ""))
    .join("; ");

  return `<div style="${combinedWrapperStyle}">${wrappedButton}</div>`;
}

/**
 * Generate HTML for a Divider block
 */
function generateDividerHTML(block: CanvasBlock): string {
  const dividerStyle = block.dividerStyle || "solid";
  const dividerLineColor = block.dividerLineColor || "#000000";
  const dividerThickness =
    typeof block.dividerThickness === "number"
      ? `${block.dividerThickness}px`
      : block.dividerThickness || "2px";

  const blockStyles = block.dividerBlockStyles || {};
  const blockBackgroundColor = blockStyles.backgroundColor || "transparent";
  const paddingTop = blockStyles.paddingTop || blockStyles.padding || "20px";
  const paddingBottom =
    blockStyles.paddingBottom || blockStyles.padding || "20px";
  const paddingLeft = blockStyles.paddingLeft || blockStyles.padding || "24px";
  const paddingRight =
    blockStyles.paddingRight || blockStyles.padding || "24px";

  const containerStyle = styleToString({
    backgroundColor: blockBackgroundColor,
    paddingTop,
    paddingBottom,
    paddingLeft,
    paddingRight,
  } as React.CSSProperties);

  const dividerStyleStr = styleToString({
    borderTopStyle: dividerStyle,
    borderTopWidth: dividerThickness,
    borderTopColor: dividerLineColor,
    width: "100%",
    margin: 0,
    padding: 0,
  } as React.CSSProperties);

  return `<div style="${containerStyle}"><div style="${dividerStyleStr}"></div></div>`;
}

/**
 * Generate HTML for a Spacer block
 */
function generateSpacerHTML(block: CanvasBlock): string {
  const spacerHeight =
    typeof block.spacerHeight === "number"
      ? `${block.spacerHeight}px`
      : block.spacerHeight || "20px";
  const blockStyles = block.spacerBlockStyles || {};
  const blockBackgroundColor = blockStyles.backgroundColor || "transparent";

  const spacerStyle = styleToString({
    height: spacerHeight,
    backgroundColor: blockBackgroundColor,
    width: "100%",
  } as React.CSSProperties);

  return `<div style="${spacerStyle}"></div>`;
}

/**
 * Generate HTML for a Logo block
 */
function generateLogoHTML(block: CanvasBlock): string {
  const imageAlt = escapeHtml(block.imageAltText?.trim() || "Logo");
  const imageUrl = block.imageUrl ? escapeHtml(block.imageUrl) : null;
  const displayMode = block.imageDisplayMode || "Original";
  const alignment = block.imageAlignment || "center";

  const imageStyles: React.CSSProperties = {
    display: "block",
    maxWidth: "100%",
    height: "auto",
  };

  if (displayMode === "Scale") {
    const scalePercent = Math.min(
      100,
      Math.max(10, block.imageScalePercent ?? 85)
    );
    imageStyles.width = `${scalePercent}%`;
  } else if (displayMode === "Fill") {
    imageStyles.width = "100%";
    imageStyles.height = "100%";
    imageStyles.objectFit = "cover" as any;
  }

  const imageStyleStr = styleToString(imageStyles);

  const wrapperStyles: React.CSSProperties = {
    width: "100%",
    textAlign: alignment as any,
  };

  const blockStyles = getBlockBoxStyles(block.imageBlockStyles);
  const frameStyles = getBlockBoxStyles(block.imageFrameStyles);
  const hasCustomFramePadding = !!(
    block.imageFrameStyles?.padding ||
    block.imageFrameStyles?.paddingTop ||
    block.imageFrameStyles?.paddingRight ||
    block.imageFrameStyles?.paddingBottom ||
    block.imageFrameStyles?.paddingLeft
  );

  let imageElement = imageUrl
    ? `<img src="${imageUrl}" alt="${imageAlt}" style="${imageStyleStr}" />`
    : `<div style="width: 120px; height: 120px; border: 2px dashed #9ca3af; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em;">Logo</div>`;

  if (imageUrl) {
    const href = buildHref(block.imageLinkValue, block.imageLinkType);
    if (href) {
      const target =
        block.imageOpenInNewTab ?? true
          ? ' target="_blank" rel="noopener noreferrer"'
          : "";
      imageElement = `<a href="${escapeHtml(
        href
      )}"${target} style="display: block; width: 100%; height: 100%; text-decoration: none;">${imageElement}</a>`;
    }
  }

  const framePadding = hasCustomFramePadding ? "" : "padding: 12px 24px;";
  const frameDiv = `<div data-block-frame="true" style="display: inline-flex; align-items: center; justify-content: center; ${frameStyles} ${framePadding}">${imageElement}</div>`;

  const wrapperStyleStr = styleToString(wrapperStyles);
  const combinedWrapperStyle = [wrapperStyleStr, blockStyles]
    .filter((str) => Boolean(str && str.trim()))
    .map((str) => str.trim().replace(/;$/, ""))
    .join("; ");

  return `<div data-block-type="Logo" style="${combinedWrapperStyle}">${frameDiv}</div>`;
}

/**
 * Generate HTML for a Social block (simplified - can be enhanced)
 */
function generateSocialHTML(block: CanvasBlock): string {
  const socialLinks =
    block.socialLinks && block.socialLinks.length > 0
      ? block.socialLinks
      : [
          {
            id: `${block.id}-social-1`,
            platform: "Facebook",
            url: "https://facebook.com/",
            label: "Facebook",
          },
          {
            id: `${block.id}-social-2`,
            platform: "Instagram",
            url: "https://instagram.com/",
            label: "Instagram",
          },
          {
            id: `${block.id}-social-3`,
            platform: "X",
            url: "https://x.com/",
            label: "Twitter",
          },
        ];

  const alignment = block.socialAlignment || "center";
  const layout = block.socialLayout || "Horizontal-bottom";
  const socialSpacing =
    typeof block.socialSpacing === "number"
      ? `${block.socialSpacing}px`
      : block.socialSpacing || "12px";
  const display = block.socialDisplay || "Icon only";
  const iconStyle = block.socialIconStyle || "Plain";
  const iconColor = block.socialIconColor || "#000000";
  const socialSize = block.socialSize || "Medium";
  const sizeMap: Record<string, number> = {
    Small: 24,
    Medium: 32,
    Large: 40,
  };
  const iconSize = `${sizeMap[socialSize] || sizeMap.Medium}px`;

  const wrapperStyles: React.CSSProperties = {
    width: "100%",
    textAlign: alignment as any,
  };
  const blockStyles = getBlockBoxStyles(block.socialBlockStyles);
  const wrapperStyleStr = styleToString(wrapperStyles);
  const combinedWrapperStyle = [wrapperStyleStr, blockStyles]
    .filter((str) => Boolean(str && str.trim()))
    .map((str) => str.trim().replace(/;$/, ""))
    .join("; ");

  const isVertical = layout.startsWith("Vertical");

  const listStyle = styleToString({
    display: "inline-flex",
    flexDirection: isVertical ? "column" : "row",
    gap: socialSpacing,
    alignItems: "center",
    justifyContent: "center",
  });

  const iconWrapperStyles = ({
    filled,
    outlined,
  }: {
    filled: boolean;
    outlined: boolean;
  }) =>
    styleToString({
      width: iconSize,
      height: iconSize,
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      borderRadius: "9999px",
      backgroundColor: filled ? iconColor : "transparent",
      border: outlined ? `1px solid ${iconColor}` : "none",
      color: filled ? "#ffffff" : iconColor,
      fontWeight: 600,
      textTransform: "uppercase",
      textDecoration: "none",
    });

  const linkItems = socialLinks
    .map((link) => {
      const href = escapeHtml(link.url || "#");
      const label = escapeHtml(link.label || link.platform);
      const platformInitial = escapeHtml(link.platform?.[0] || "?");
      const useFilled = iconStyle === "Filled";
      const useOutlined = iconStyle === "Outlined";
      const iconSpan = `<span style="${iconWrapperStyles({
        filled: useFilled,
        outlined: useOutlined,
      })}">${platformInitial}</span>`;
      const textSpan =
        display === "Icon and text"
          ? `<span style="margin-left: 8px; color: ${iconColor}; font-size: 14px;">${label}</span>`
          : "";
      return `<a href="${href}" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; text-decoration: none; color: ${iconColor}; margin: ${
        isVertical ? "4px 0" : "0 4px"
      };">${iconSpan}${textSpan}</a>`;
    })
    .join("");

  return `<div data-block-type="Social" style="${combinedWrapperStyle}"><div style="${listStyle}">${linkItems}</div></div>`;
}

/**
 * Generate HTML for a single block
 */
export function generateBlockHTML(block: CanvasBlock): string {
  switch (block.type) {
    case "Heading":
      return generateHeadingHTML(block);
    case "Paragraph":
      return generateParagraphHTML(block);
    case "Image":
      return generateImageHTML(block);
    case "Button":
      return generateButtonHTML(block);
    case "Divider":
      return generateDividerHTML(block);
    case "Spacer":
      return generateSpacerHTML(block);
    case "Logo":
      return generateLogoHTML(block);
    case "Social":
      return generateSocialHTML(block);
    case "Layout":
      // Layout blocks don't render themselves
      return "";
    default:
      return `<div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center; color: #6b7280; font-size: 14px;">${escapeHtml(
        block.label || block.type
      )}</div>`;
  }
}

/**
 * Generate sections HTML from canvasBlocks
 * Returns an object mapping block IDs (with section prefix) to their HTML strings
 * Format: { "header-block-id-1": "<HTML>", "body-block-id-2": "<HTML>", ... }
 */
export function generateSectionsHTML(canvasBlocks: CanvasBlocks): {
  [blockId: string]: string;
} {
  const sections: { [blockId: string]: string } = {};

  // Process header blocks
  canvasBlocks.header.forEach((block) => {
    const html = generateBlockHTML(block);
    if (html) {
      sections[`header-${block.id}`] = html;
    }
  });

  // Process body blocks
  canvasBlocks.body.forEach((block) => {
    const html = generateBlockHTML(block);
    if (html) {
      sections[`body-${block.id}`] = html;
    }
  });

  // Process footer blocks
  canvasBlocks.footer.forEach((block) => {
    const html = generateBlockHTML(block);
    if (html) {
      sections[`footer-${block.id}`] = html;
    }
  });

  return sections;
}

/**
 * Generate section mapping for reverse lookup
 * Returns an object mapping block IDs to their section names
 */
export function generateSectionMapping(canvasBlocks: CanvasBlocks): {
  [blockId: string]: "header" | "body" | "footer";
} {
  const mapping: { [blockId: string]: "header" | "body" | "footer" } = {};

  canvasBlocks.header.forEach((block) => {
    mapping[`header-${block.id}`] = "header";
  });

  canvasBlocks.body.forEach((block) => {
    mapping[`body-${block.id}`] = "body";
  });

  canvasBlocks.footer.forEach((block) => {
    mapping[`footer-${block.id}`] = "footer";
  });

  return mapping;
}
