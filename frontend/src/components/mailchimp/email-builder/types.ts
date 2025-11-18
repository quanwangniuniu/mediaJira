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

