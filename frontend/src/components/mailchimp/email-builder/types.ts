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

