export type DeviceMode = "desktop" | "mobile";

export interface LayoutBlockProps {
  block: CanvasBlock;
  section?: string;
  isSelected?: boolean;
  updateLayoutColumns: (
    section: string,
    blockId: string,
    columnIndex: number,
    delta: number
  ) => void;
  isMobile: boolean;
}

export interface TextStyles {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: "normal" | "bold";
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline" | "line-through";
  textAlign?: "left" | "center" | "right" | "justify";
  color?: string;
  backgroundColor?: string;
  // Layout-related styles
  borderRadius?: number | string;
  padding?: number | string;
  margin?: number | string;
  // Per-side spacing (optional)
  paddingTop?: number | string;
  paddingRight?: number | string;
  paddingBottom?: number | string;
  paddingLeft?: number | string;
  marginTop?: number | string;
  marginRight?: number | string;
  marginBottom?: number | string;
  marginLeft?: number | string;
  // Colors separation
  // Background color of the whole block
  blockBackgroundColor?: string;
  // Inline text highlight color (wrap content in a span)
  textHighlightColor?: string;
  // Border
  borderStyle?:
    | "none"
    | "solid"
    | "dashed"
    | "dotted"
    | "double"
    | "groove"
    | "ridge"
    | "inset"
    | "outset";
  borderWidth?: number | string;
  borderColor?: string;
  direction?: "ltr" | "rtl";
  lineHeight?: number | string;
  letterSpacing?: number | string;
  listType?: "unordered" | "ordered" | null;
}

export type ImageSizeMode = "Original" | "Fill" | "Scale";
export type ImageLinkType = "Web" | "Email" | "Phone";
export type ButtonLinkType = "Web" | "Email" | "Phone";
export type ButtonShape = "Square" | "Round" | "Pill";
export type ButtonSize = "Small" | "Medium" | "Large";
export type SocialType = "Follow" | "Share";
export type SocialPlatform =
  | "Facebook"
  | "Instagram"
  | "X"
  | "LinkedIn"
  | "YouTube"
  | "TikTok"
  | "Pinterest"
  | "Snapchat";
export type SocialDisplay = "Icon only" | "Icon and text";
export type SocialIconStyle = "Plain" | "Filled" | "Outlined";
export type SocialLayout =
  | "Horizontal-right"
  | "Horizontal-bottom"
  | "Vertical-right"
  | "Vertical-bottom";
export type SocialSize = "Small" | "Medium" | "Large";
export type SocialAlignment = "left" | "center" | "right";

export interface SocialLink {
  id: string;
  platform: SocialPlatform;
  url: string;
  label: string;
}

export interface BlockBoxStyles {
  backgroundColor?: string;
  borderStyle?:
    | "none"
    | "solid"
    | "dashed"
    | "dotted"
    | "double"
    | "groove"
    | "ridge"
    | "inset"
    | "outset";
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
}

export interface CanvasBlock {
  id: string;
  type: string;
  label: string;
  content?: string;
  imageUrl?: string; // For image blocks
  columns?: number; // For layout blocks
  columnsWidths?: number[]; // For layout blocks: each number represents grid units out of 12
  styles?: TextStyles; // Text styling for Heading and Paragraph blocks
  imageDisplayMode?: ImageSizeMode;
  imageLinkType?: ImageLinkType;
  imageLinkValue?: string;
  imageOpenInNewTab?: boolean;
  imageAltText?: string;
  imageScalePercent?: number;
  imageBlockStyles?: BlockBoxStyles;
  imageFrameStyles?: BlockBoxStyles;
  imageAlignment?: "left" | "center" | "right";
  // Button block properties
  buttonLinkType?: ButtonLinkType;
  buttonLinkValue?: string;
  buttonOpenInNewTab?: boolean;
  buttonBlockStyles?: BlockBoxStyles;
  buttonShape?: ButtonShape;
  buttonAlignment?: "left" | "center" | "right";
  buttonTextColor?: string;
  buttonBackgroundColor?: string;
  buttonSize?: ButtonSize;
  // Divider block properties
  dividerBlockStyles?: BlockBoxStyles;
  dividerLineColor?: string;
  dividerStyle?: "solid" | "dashed" | "dotted" | "double";
  dividerThickness?: number | string;
  // Spacer block properties
  spacerBlockStyles?: BlockBoxStyles;
  spacerHeight?: number | string;
  // Social block properties
  socialType?: SocialType;
  socialLinks?: SocialLink[];
  socialBlockStyles?: BlockBoxStyles;
  socialDisplay?: SocialDisplay;
  socialIconStyle?: SocialIconStyle;
  socialLayout?: SocialLayout;
  socialIconColor?: string;
  socialSize?: SocialSize;
  socialAlignment?: SocialAlignment;
  socialSpacing?: number | string;
  // Layout block properties
  layoutBlockStyles?: BlockBoxStyles;
  columnRatio?: "Equal" | "Wide left" | "Wide right" | "Narrow center";
  mobileContentOrientation?: "Stack left" | "Stack right" | "Stack center";
}

export interface CanvasBlocks {
  header: CanvasBlock[];
  body: CanvasBlock[];
  footer: CanvasBlock[];
}

export interface SelectedBlock {
  section: string;
  id: string;
}

export interface HoveredBlock {
  section: string;
  id: string;
}

export interface DragOverIndex {
  section: string;
  index: number;
}

export interface UploadedFile {
  id: string;
  url: string;
  name: string;
  type: string;
}

export interface SelectedFileInStudio {
  id: string;
  url: string;
  name: string;
}
