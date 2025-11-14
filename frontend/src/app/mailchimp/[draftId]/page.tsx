"use client";
import React, { useState } from "react";
import Image from "next/image";
import Layout from "@/components/layout/Layout";
import {
  Monitor,
  Smartphone,
  Undo2,
  Redo2,
  MessageSquare,
  Save,
  ChevronDown,
  Paintbrush,
  Gauge,
  Image as ImageIcon,
  Type,
  FileText,
  RectangleHorizontal,
  Minus,
  Square,
  Video,
  Share2,
  Hexagon,
  HelpCircle,
  Check,
  X,
  XCircle,
  ChevronLeft,
  Sparkles,
  ListChecks,
  Code,
  Grid3x3,
  ShoppingBag,
  Heart,
  ChevronUp,
  Columns2,
  Columns3,
  Columns4,
  Link,
  Anchor,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  MoreHorizontal,
  List,
  ListOrdered,
  Strikethrough,
  Info,
  CirclePlus,
  Play,
  Search,
  Upload,
  Folder,
  Grid,
  Cloud,
  Instagram,
  ImagePlus,
  Palette,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

// LayoutBlock Component for resizable columns
interface LayoutBlockProps {
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

const LayoutBlock: React.FC<LayoutBlockProps> = ({
  block,
  section = "",
  isSelected = false,
  updateLayoutColumns,
  isMobile,
}) => {
  const columns = block.columns || 1;
  // Use block.columnsWidths directly, don't create new array each render
  const columnsWidths =
    block.columnsWidths || Array(columns).fill(Math.floor(12 / columns));

  const [isDragging, setIsDragging] = useState(false);
  const innerContainerRef = React.useRef<HTMLDivElement>(null);

  // Use refs to avoid closure issues
  const dragStateRef = React.useRef<{
    startX: number;
    columnIndex: number;
    accumulatedDelta: number;
  } | null>(null);

  const handleMouseDown = (e: React.MouseEvent, columnIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
    dragStateRef.current = {
      startX: e.clientX,
      columnIndex,
      accumulatedDelta: 0,
    };
  };

  const handleMouseMove = React.useCallback(
    (e: MouseEvent) => {
      if (!dragStateRef.current || !innerContainerRef.current || !section)
        return;

      const deltaX = e.clientX - dragStateRef.current.startX;
      const containerWidth = innerContainerRef.current.offsetWidth;

      // Calculate delta in grid units (12 units total)
      const pixelsPerUnit = containerWidth / 12;
      const totalDeltaGrid = Math.round(deltaX / pixelsPerUnit);

      // Calculate incremental delta since last update
      const incrementalDelta =
        totalDeltaGrid - dragStateRef.current.accumulatedDelta;

      // Only update if incremental delta is at least 1 unit
      if (Math.abs(incrementalDelta) >= 1) {
        updateLayoutColumns(
          section,
          block.id,
          dragStateRef.current.columnIndex,
          incrementalDelta
        );
        dragStateRef.current.accumulatedDelta = totalDeltaGrid;
      }
    },
    [section, block.id, updateLayoutColumns]
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
    dragStateRef.current = null;
  }, []);

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  return (
    <div className="w-full relative layout-container" data-block-id={block.id}>
      {/* Layout Content Area */}
      <div
        ref={innerContainerRef}
        className={`relative w-full ${
          isMobile ? "flex flex-col gap-2" : "flex"
        }`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {columnsWidths.map((width, idx) => {
          const previousColumnsWidth = columnsWidths
            .slice(0, idx + 1)
            .reduce((a, b) => a + b, 0);

          return (
            <React.Fragment key={idx}>
              {/* Column content */}
              <div
                className="min-h-[240px] flex flex-col items-center justify-center relative px-3 py-5"
                style={
                  isMobile
                    ? { width: "100%" }
                    : {
                        flex: `0 0 ${(width / 12) * 100}%`,
                      }
                }
                onMouseDown={(e) => e.stopPropagation()}
              >
                <div className="flex-1 w-full bg-gray-50 border border-dashed border-gray-300 rounded flex flex-col items-center text-center justify-center">
                  <div className="w-8 h-8 rounded-full border-2 border-emerald-600 flex items-center justify-center mb-2">
                    <span className="text-emerald-600 text-lg font-bold">
                      +
                    </span>
                  </div>
                  <span className="text-sm font-medium text-emerald-600 mb-1">
                    Add block
                  </span>
                  <span className="text-xs text-gray-500">
                    or drop content here
                  </span>
                </div>
              </div>

              {/* Column divider with resize handle - only show when selected and desktop */}
              {!isMobile && idx < columnsWidths.length - 1 && isSelected && (
                <div
                  className="layout-resize-handle absolute flex items-center justify-center cursor-col-resize group z-20"
                  style={{
                    left: `${(previousColumnsWidth / 12) * 100}%`,
                    top: 0,
                    bottom: 0,
                    width: "12px",
                    transform: "translateX(-50%)",
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleMouseDown(e, idx);
                  }}
                >
                  <div
                    className="absolute top-0 bottom-0 border-l border-dashed border-emerald-700"
                    style={{
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: 0,
                    }}
                  ></div>

                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white rounded-full p-1.5 shadow-md border border-emerald-500 group-hover:border-emerald-600 transition-all">
                      <div className="w-1 h-4 bg-emerald-500 group-hover:bg-emerald-600 rounded"></div>
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

interface CanvasBlock {
  id: string;
  type: string;
  label: string;
  content?: string;
  imageUrl?: string; // For image blocks
  columns?: number; // For layout blocks
  columnsWidths?: number[]; // For layout blocks: each number represents grid units out of 12
}

export default function EmailBuilderPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("Add");
  const [activeTab, setActiveTab] = useState("Styles");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [activeCommentsTab, setActiveCommentsTab] = useState<
    "Open" | "Resolved"
  >("Open");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<"Desktop" | "Mobile" | "Inbox">(
    "Desktop"
  );
  const [showMoreBlocks, setShowMoreBlocks] = useState(false);
  const [isContentStudioOpen, setIsContentStudioOpen] = useState(false);
  const [contentStudioSource, setContentStudioSource] = useState<
    "Uploads" | "Stock images" | "My products" | "Instagram" | "Giphy" | "Canva"
  >("Uploads");
  const [contentStudioViewMode, setContentStudioViewMode] = useState<
    "grid" | "list"
  >("grid");
  const [isUploadDropdownOpen, setIsUploadDropdownOpen] = useState(false);
  const [isImportUrlModalOpen, setIsImportUrlModalOpen] = useState(false);
  const [importUrl, setImportUrl] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ id: string; url: string; name: string; type: string }>
  >([]);
  const [selectedFileInStudio, setSelectedFileInStudio] = useState<{
    id: string;
    url: string;
    name: string;
  } | null>(null);
  const [isAddImageDropdownOpen, setIsAddImageDropdownOpen] = useState(false);
  const addImageDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const [showMoreLayouts, setShowMoreLayouts] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<{
    section: string;
    index: number;
  } | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<{
    section: string;
    id: string;
  } | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<{
    section: string;
    id: string;
  } | null>(null);
  const [canvasBlocks, setCanvasBlocks] = useState<{
    header: CanvasBlock[];
    body: CanvasBlock[];
    footer: CanvasBlock[];
  }>({
    header: [],
    body: [],
    footer: [],
  });

  const selectedBlockData = React.useMemo(() => {
    if (!selectedBlock) return null;
    const sectionBlocks =
      canvasBlocks[selectedBlock.section as keyof typeof canvasBlocks];
    if (!sectionBlocks) return null;
    return sectionBlocks.find((block) => block.id === selectedBlock.id) || null;
  }, [selectedBlock, canvasBlocks]);

  const selectedBlockType = selectedBlockData?.type;
  const isTextBlockSelected =
    !!selectedBlockType && ["Paragraph", "Heading"].includes(selectedBlockType);
  const isImageBlockSelected =
    !!selectedBlockType && ["Image", "Logo"].includes(selectedBlockType);
  const isSectionSelected = !!selectedSection && !selectedBlock;
  const [activeBlockTab, setActiveBlockTab] = useState<
    "Content" | "Styles" | "Visibility"
  >("Styles");
  const [isPaddingLinked, setIsPaddingLinked] = useState(true);
  const [isMarginLinked, setIsMarginLinked] = useState(true);
  const toolbarContainerRef = React.useRef<HTMLDivElement | null>(null);
  const overflowMenuRef = React.useRef<HTMLDivElement | null>(null);
  const measurementWrapperRef = React.useRef<HTMLDivElement | null>(null);
  const measurementRefs = React.useRef<(HTMLDivElement | null)[]>([]);
  const uploadDropdownRef = React.useRef<HTMLDivElement | null>(null);
  const [toolbarWidth, setToolbarWidth] = useState(0);
  const [isOverflowOpen, setIsOverflowOpen] = useState(false);
  const [groupWidths, setGroupWidths] = useState<number[]>([]);

  React.useEffect(() => {
    if (!isTextBlockSelected) {
      setActiveBlockTab("Content");
    }
  }, [isTextBlockSelected]);

  React.useEffect(() => {
    if (!isTextBlockSelected) return;
    const element = toolbarContainerRef.current;
    if (!element) return;

    const updateWidth = () => {
      setToolbarWidth(element.offsetWidth);
    };

    updateWidth();

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver((entries) => {
        if (!entries.length) return;
        setToolbarWidth(entries[0].contentRect.width);
      });
      resizeObserver.observe(element);
    } else {
      window.addEventListener("resize", updateWidth);
    }

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, [isTextBlockSelected]);

  React.useEffect(() => {
    if (!isTextBlockSelected) {
      setIsOverflowOpen(false);
    }
  }, [isTextBlockSelected]);

  React.useEffect(() => {
    if (!isOverflowOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        overflowMenuRef.current &&
        !overflowMenuRef.current.contains(event.target as Node)
      ) {
        setIsOverflowOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOverflowOpen]);

  React.useEffect(() => {
    if (!isUploadDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        uploadDropdownRef.current &&
        !uploadDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUploadDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isUploadDropdownOpen]);

  React.useEffect(() => {
    if (!isAddImageDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        addImageDropdownRef.current &&
        !addImageDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAddImageDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isAddImageDropdownOpen]);

  const baseToolbarButtonClasses =
    "rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100 flex items-center justify-center";

  const toolbarGroups = React.useMemo(
    () => [
      {
        key: "block-settings",
        element: (
          <div className="flex items-center gap-2">
            <select className="bg-white border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600">
              <option>Paragraph</option>
              <option>Heading 1</option>
              <option>Heading 2</option>
            </select>
            <select className="bg-white border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600">
              <option>Helvetica</option>
              <option>Arial</option>
              <option>Georgia</option>
            </select>
            <input
              type="number"
              defaultValue={16}
              className="w-16 bg-white border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        ),
      },
      {
        key: "text-style",
        element: (
          <div className="flex items-center gap-1">
            <button type="button" className={`${baseToolbarButtonClasses}`}>
              <span className="underline">A</span>
            </button>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-white bg-gray-900 hover:bg-gray-800 flex items-center justify-center"
            >
              A
            </button>
            <button
              type="button"
              className={`${baseToolbarButtonClasses} font-semibold`}
            >
              B
            </button>
            <button
              type="button"
              className={`${baseToolbarButtonClasses} italic`}
            >
              I
            </button>
            <button
              type="button"
              className={`${baseToolbarButtonClasses} underline`}
            >
              U
            </button>
            <button
              type="button"
              className={`${baseToolbarButtonClasses} line-through`}
            >
              S
            </button>
          </div>
        ),
      },
      {
        key: "insert",
        element: (
          <div className="flex items-center gap-1">
            <button type="button" className={baseToolbarButtonClasses}>
              <Link className="h-4 w-4" />
            </button>
            <button type="button" className={baseToolbarButtonClasses}>
              <Anchor className="h-4 w-4" />
            </button>
            <button type="button" className={baseToolbarButtonClasses}>
              <ImageIcon className="h-4 w-4" />
            </button>
          </div>
        ),
      },
      {
        key: "alignment",
        element: (
          <div className="flex items-center gap-1">
            <button type="button" className={baseToolbarButtonClasses}>
              <AlignLeft className="h-4 w-4" />
            </button>
            <button type="button" className={baseToolbarButtonClasses}>
              <AlignCenter className="h-4 w-4" />
            </button>
            <button type="button" className={baseToolbarButtonClasses}>
              <AlignRight className="h-4 w-4" />
            </button>
            <button type="button" className={baseToolbarButtonClasses}>
              <AlignJustify className="h-4 w-4" />
            </button>
          </div>
        ),
      },
      {
        key: "spacing",
        element: (
          <div className="flex items-center gap-1">
            <button type="button" className={baseToolbarButtonClasses}>
              A↔
            </button>
            <button type="button" className={baseToolbarButtonClasses}>
              ↕
            </button>
            <button type="button" className={baseToolbarButtonClasses}>
              VA
            </button>
          </div>
        ),
      },
    ],
    [baseToolbarButtonClasses]
  );

  const updateGroupWidths = React.useCallback(() => {
    if (!toolbarGroups.length) {
      setGroupWidths([]);
      return;
    }

    const widths = toolbarGroups.map((_, index) => {
      const el = measurementRefs.current[index];
      return el ? el.offsetWidth : 0;
    });
    setGroupWidths(widths);
  }, [toolbarGroups]);

  React.useLayoutEffect(() => {
    if (!isTextBlockSelected) return;

    updateGroupWidths();

    if (
      typeof ResizeObserver !== "undefined" &&
      measurementWrapperRef.current
    ) {
      const observer = new ResizeObserver(() => updateGroupWidths());
      observer.observe(measurementWrapperRef.current);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateGroupWidths);
    return () => {
      window.removeEventListener("resize", updateGroupWidths);
    };
  }, [isTextBlockSelected, updateGroupWidths]);

  const hasStaticOverflowContent = true;
  const isInspectorOpen =
    isTextBlockSelected || isImageBlockSelected || isSectionSelected;
  const textInspectorTitleMap: Record<string, string> = {
    Paragraph: "Text",
    Heading: "Heading",
  };
  const textInspectorTitle = selectedBlockType
    ? textInspectorTitleMap[selectedBlockType] || "Text"
    : "Text";
  const textInspectorHelpLabel = `How to use ${textInspectorTitle.toLowerCase()} blocks`;

  const effectiveVisibleCount = React.useMemo(() => {
    if (!toolbarGroups.length) return 0;
    if (!toolbarWidth) return toolbarGroups.length;

    const horizontalPadding = 32; // px-4 on each side
    const interGroupGap = 12;
    const overflowButtonWidth = 44;

    const widths =
      groupWidths.length && groupWidths.some((value) => value > 0)
        ? groupWidths.map((value) => (value > 0 ? value : 160))
        : toolbarGroups.map(() => 160);

    const capacity = Math.max(
      0,
      toolbarWidth -
        horizontalPadding -
        (hasStaticOverflowContent ? overflowButtonWidth : 0)
    );

    let used = 0;
    let count = 0;

    for (let i = 0; i < widths.length; i++) {
      const width = widths[i];
      const additional = width + (count > 0 ? interGroupGap : 0);
      if (used + additional > capacity) {
        break;
      }
      used += additional;
      count += 1;
    }

    if (count === 0) {
      return Math.min(1, widths.length);
    }

    return Math.min(count, widths.length);
  }, [toolbarWidth, toolbarGroups, groupWidths, hasStaticOverflowContent]);

  const visibleGroups = React.useMemo(
    () => toolbarGroups.slice(0, effectiveVisibleCount),
    [toolbarGroups, effectiveVisibleCount]
  );

  const overflowGroups = React.useMemo(
    () => toolbarGroups.slice(effectiveVisibleCount),
    [toolbarGroups, effectiveVisibleCount]
  );

  const shouldShowOverflowButton =
    hasStaticOverflowContent || overflowGroups.length > 0;

  const renderSpacingControl = (
    label: string,
    isLinked: boolean,
    setIsLinked: React.Dispatch<React.SetStateAction<boolean>>,
    defaultValue: number
  ) => (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <label className="flex items-center gap-2 text-xs text-gray-600 font-medium">
          Apply to all sides
          <input
            type="checkbox"
            className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
            checked={isLinked}
            onChange={(e) => setIsLinked(e.target.checked)}
          />
        </label>
      </div>
      {isLinked ? (
        <div className="flex items-center gap-2">
          <input
            type="number"
            defaultValue={defaultValue}
            className="w-full border border-gray-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-sm"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {["Top", "Bottom", "Left", "Right"].map((side) => (
            <div key={`${label}-${side}`} className="space-y-1">
              <span className="text-xs text-gray-500">{side}</span>
              <input
                type="number"
                defaultValue={defaultValue}
                className="w-full border border-gray-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-sm"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const contentBlocks = [
    {
      icon: ImageIcon,
      label: "Image",
      color: "text-purple-600",
      type: "Image",
    },
    { icon: Type, label: "Heading", color: "text-blue-600", type: "Heading" },
    {
      icon: FileText,
      label: "Paragraph",
      color: "text-green-600",
      type: "Paragraph",
    },
    {
      icon: RectangleHorizontal,
      label: "Button",
      color: "text-orange-600",
      type: "Button",
    },
    { icon: Minus, label: "Divider", color: "text-gray-600", type: "Divider" },
    { icon: Square, label: "Spacer", color: "text-pink-600", type: "Spacer" },
    { icon: Video, label: "Video", color: "text-red-600", type: "Video" },
    { icon: Share2, label: "Social", color: "text-indigo-600", type: "Social" },
    { icon: Hexagon, label: "Logo", color: "text-emerald-600", type: "Logo" },
    {
      icon: Sparkles,
      label: "Creative Assistant",
      color: "text-yellow-600",
      type: "CreativeAssistant",
    },
    {
      icon: ListChecks,
      label: "Survey",
      color: "text-blue-600",
      type: "Survey",
    },
    { icon: Code, label: "Code", color: "text-gray-800", type: "Code" },
    { icon: Grid3x3, label: "Apps", color: "text-purple-600", type: "Apps" },
    {
      icon: ShoppingBag,
      label: "Product",
      color: "text-orange-600",
      type: "Product",
    },
    {
      icon: Heart,
      label: "Product Rec",
      color: "text-pink-600",
      type: "ProductRec",
    },
  ];

  const getBlockLabel = (blockType: string) => {
    if (blockType === "Paragraph") return "Text";
    if (blockType === "Layout") return "Layout";
    return blockType;
  };

  const handleDragStart = (
    e: React.DragEvent,
    blockType: string,
    columns?: number
  ) => {
    e.dataTransfer.setData("blockType", blockType);
    if (columns !== undefined) {
      e.dataTransfer.setData("columns", columns.toString());
    }
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, section: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSection(section);
  };

  const handleDragLeave = () => {
    setDragOverSection(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, section: string, index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSection(null);
    setDragOverIndex(null);
    const blockType = e.dataTransfer.getData("blockType");
    const columnsData = e.dataTransfer.getData("columns");

    if (blockType) {
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

      const newBlock: CanvasBlock = {
        id: `${blockType}-${Date.now()}`,
        type: blockType,
        label: getBlockLabel(blockType),
        content: "",
        columns: numColumns,
        columnsWidths: columnsWidths,
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
    }
  };

  const handleDragOverDropZone = (
    e: React.DragEvent,
    section: string,
    index: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex({ section, index });
    setDragOverSection(null);
  };

  const handleDragLeaveDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if we're moving to another element that's not a drop zone
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && !relatedTarget.closest(".drop-zone")) {
      setDragOverIndex(null);
    }
  };

  const renderCanvasBlock = (
    block: CanvasBlock,
    section?: string,
    isSelected?: boolean
  ) => {
    switch (block.type) {
      case "Image":
        return (
          <div className="w-full bg-amber-50 border border-gray-200 rounded overflow-hidden flex items-center justify-center min-h-[192px]">
            {block.imageUrl ? (
              <Image
                src={block.imageUrl}
                alt="Image"
                width={800}
                height={600}
                style={{ width: "100%", height: "auto" }}
                className="block"
                unoptimized
                onError={() => {
                  // Fallback handled by CSS
                }}
              />
            ) : (
              <div className="w-full h-48 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-16 h-16 border-2 border-dashed border-gray-400 rounded flex items-center justify-center mx-auto mb-2">
                    <ImageIcon className="h-8 w-8 text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-500">Image</span>
                </div>
              </div>
            )}
          </div>
        );
      case "Heading":
        return (
          <h2 className="text-2xl font-bold text-gray-900 py-4 text-center">
            {block.content || "Heading"}
          </h2>
        );
      case "Paragraph":
        return (
          <p className="text-base text-gray-700 py-4 text-center">
            {block.content || "Text content"}
          </p>
        );
      case "Button":
        return (
          <div className="flex justify-center py-4">
            <button className="px-6 py-2 bg-gray-900 text-white rounded hover:bg-gray-800">
              {block.content || "Button text"}
            </button>
          </div>
        );
      case "Divider":
        return <div className="h-px bg-gray-300"></div>;
      case "Spacer":
        return <div className="h-8"></div>;
      case "Social":
        return (
          <div className="flex justify-center space-x-4 py-4">
            <button className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">f</span>
            </button>
            <button className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">IG</span>
            </button>
            <button className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">X</span>
            </button>
          </div>
        );
      case "CreativeAssistant":
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <p className="text-sm font-medium">{block.label}</p>
          </div>
        );
      case "Survey":
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            <ListChecks className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="text-sm font-medium">{block.label}</p>
          </div>
        );
      case "Code":
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            <Code className="h-8 w-8 mx-auto mb-2 text-gray-800" />
            <p className="text-sm font-medium">{block.label}</p>
          </div>
        );
      case "Apps":
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            <Grid3x3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <p className="text-sm font-medium">{block.label}</p>
          </div>
        );
      case "Product":
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <p className="text-sm font-medium">{block.label}</p>
          </div>
        );
      case "ProductRec":
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            <Heart className="h-8 w-8 mx-auto mb-2 text-pink-600" />
            <p className="text-sm font-medium">{block.label}</p>
          </div>
        );
      case "Layout":
        return (
          <LayoutBlock
            block={block}
            section={section}
            isSelected={isSelected}
            updateLayoutColumns={updateLayoutColumns}
            isMobile={deviceMode === "mobile"}
          />
        );
      default:
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            {block.label}
          </div>
        );
    }
  };

  const removeBlock = (section: string, blockId: string) => {
    setCanvasBlocks((prev) => ({
      ...prev,
      [section]: prev[section as keyof typeof prev].filter(
        (b) => b.id !== blockId
      ),
    }));
  };

  const updateLayoutColumns = (
    section: string,
    blockId: string,
    columnIndex: number,
    delta: number
  ) => {
    setCanvasBlocks((prev) => {
      const sectionBlocks = [...prev[section as keyof typeof prev]];
      const blockIndex = sectionBlocks.findIndex((b) => b.id === blockId);
      if (blockIndex === -1) return prev;

      const currentBlock = sectionBlocks[blockIndex];

      // Initialize columnsWidths if it doesn't exist
      let currentWidths = currentBlock.columnsWidths;
      if (!currentWidths && currentBlock.columns) {
        const baseWidth = Math.floor(12 / currentBlock.columns);
        const remainder = 12 % currentBlock.columns;
        currentWidths = Array(currentBlock.columns).fill(baseWidth);
        for (let i = 0; i < remainder; i++) {
          currentWidths[i]++;
        }
      }

      if (!currentWidths) return prev;

      const newWidths = [...currentWidths];
      const nextColumnIndex = columnIndex + 1;

      // Ensure we're within bounds
      if (nextColumnIndex >= newWidths.length) return prev;

      // Calculate new widths
      const newLeftWidth = newWidths[columnIndex] + delta;
      const newRightWidth = newWidths[nextColumnIndex] - delta;

      // Validate: each column must be at least 3 grid units (3/12)
      if (newLeftWidth < 3 || newRightWidth < 3) return prev;

      newWidths[columnIndex] = newLeftWidth;
      newWidths[nextColumnIndex] = newRightWidth;

      const updatedBlocks = [...sectionBlocks];
      updatedBlocks[blockIndex] = {
        ...updatedBlocks[blockIndex],
        columnsWidths: newWidths,
      };

      return {
        ...prev,
        [section]: updatedBlocks,
      };
    });
  };

  const renderDropZone = (section: string, index: number) => {
    const isActive =
      dragOverIndex?.section === section && dragOverIndex?.index === index;
    return (
      <div
        key={`dropzone-${section}-${index}`}
        className={`drop-zone transition-all ${
          isActive
            ? "h-8 bg-emerald-500 border-2 border-emerald-600"
            : "h-0 bg-transparent hover:h-4 hover:bg-emerald-100 border-2 border-transparent"
        } -mx-4`}
        onDragOver={(e) => handleDragOverDropZone(e, section, index)}
        onDragLeave={handleDragLeaveDropZone}
        onDrop={(e) => handleDrop(e, section, index)}
      />
    );
  };

  const renderSectionBlocks = (section: string, blocks: CanvasBlock[]) => {
    if (blocks.length === 0) {
      return (
        <div
          className={`flex-1 flex justify-center drop-zone py-8 text-center text-sm transition-all ${
            dragOverIndex?.section === section && dragOverIndex?.index === 0
              ? "bg-emerald-100 text-emerald-700 border-2 border-dashed border-emerald-500 rounded"
              : "text-gray-400"
          }`}
          onDragOver={(e) => handleDragOverDropZone(e, section, 0)}
          onDragLeave={handleDragLeaveDropZone}
          onDrop={(e) => handleDrop(e, section, 0)}
        >
          Drag content blocks here
        </div>
      );
    }

    return (
      <div className="space-y-0">
        {/* Drop zone before first block */}
        {renderDropZone(section, 0)}

        {blocks.map((block, index) => (
          <div key={block.id}>
            <div
              className={`relative border transition-all ${
                selectedBlock?.section === section &&
                selectedBlock?.id === block.id
                  ? "border-emerald-700"
                  : "border-transparent hover:border-emerald-700"
              }`}
              onClick={(e) => {
                // Don't select if clicking on layout resize handle
                if (
                  (e.target as HTMLElement).closest(".layout-resize-handle")
                ) {
                  return;
                }
                e.stopPropagation();
                setSelectedBlock({ section, id: block.id });
                setSelectedSection(null);
              }}
              onMouseEnter={() => {
                setHoveredBlock({ section, id: block.id });
              }}
              onMouseLeave={() => {
                setHoveredBlock(null);
              }}
            >
              {/* label badge */}
              <div
                className={`absolute left-0 top-0 text-[10px] px-2 py-0.5 rounded-br bg-emerald-700 text-white transition-opacity pointer-events-none ${
                  (selectedBlock?.section === section &&
                    selectedBlock?.id === block.id) ||
                  (hoveredBlock?.section === section &&
                    hoveredBlock?.id === block.id)
                    ? "opacity-100"
                    : "opacity-0"
                }`}
              >
                {block.label}
              </div>
              {/* actions */}
              <div
                className={`absolute top-1 right-1 flex items-center gap-1 transition-opacity z-30 ${
                  (selectedBlock?.section === section &&
                    selectedBlock?.id === block.id) ||
                  (hoveredBlock?.section === section &&
                    hoveredBlock?.id === block.id)
                    ? "opacity-100"
                    : "opacity-0"
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBlock(section, block.id);
                  }}
                  className="bg-red-500 text-white rounded p-1 hover:bg-red-600 transition-colors"
                  aria-label="Remove block"
                  title="Delete layout"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {renderCanvasBlock(
                block,
                section,
                selectedBlock?.section === section &&
                  selectedBlock?.id === block.id
              )}
            </div>
            {/* Drop zone after each block */}
            {renderDropZone(section, index + 1)}
          </div>
        ))}
      </div>
    );
  };

  // Visual helpers for section containers
  const getSectionClassName = (name: string, baseMinHeight: string) => {
    const isSelected = selectedSection === name;
    return `relative border-2 flex flex-col ${
      isSelected
        ? "border-emerald-700"
        : "border-transparent hover:border-emerald-700 hover:border-dashed"
    } transition-all ${baseMinHeight} w-full`;
  };

  const blankLayouts = [
    { columns: 1, label: "1", icon: Square },
    { columns: 2, label: "2", icon: Columns2 },
    { columns: 3, label: "3", icon: Columns3 },
    { columns: 4, label: "4", icon: Columns4 },
  ];

  measurementRefs.current = measurementRefs.current.slice(
    0,
    toolbarGroups.length
  );

  const renderTextInspector = () => {
    const stylesContent = (
      <>
        <div className="space-y-3">
          <span className="uppercase text-[11px] font-semibold text-gray-500">
            All devices
          </span>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Colors
              </label>
              <button className="w-full border border-gray-200 rounded-md px-3 py-3 flex items-center justify-between text-sm text-gray-800 hover:border-gray-300">
                Block Background
                <span className="w-6 h-6 rounded-full border border-gray-300 flex items-center justify-center text-gray-400 text-xs">
                  ⌀
                </span>
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Border
              </label>
              <div className="border border-gray-200 rounded-md px-3 py-2">
                <select className="w-full bg-transparent text-sm text-gray-800 focus:outline-none">
                  <option>None</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Rounded Corners
              </label>
              <div className="border border-gray-200 rounded-md p-3 space-y-3">
                <label className="flex items-center justify-between text-sm text-gray-700">
                  <span>Apply to all sides</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                    defaultChecked
                  />
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-9 h-9 border border-gray-200 rounded text-gray-500 text-lg">
                    ⌗
                  </div>
                  <input
                    type="number"
                    defaultValue={0}
                    className="flex-1 border border-gray-200 rounded px-2 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-600 text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <span className="uppercase text-[11px] font-semibold text-gray-500">
            Device-specific
          </span>
          <div className="border border-gray-200 rounded-md divide-y divide-gray-200">
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-sm font-medium text-gray-700">
                Link Desktop and Mobile Styles
              </span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-600 transition-colors"></div>
                <div className="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5"></div>
              </label>
            </div>
            <div className="px-3 py-3 space-y-4">
              {renderSpacingControl(
                "Padding",
                isPaddingLinked,
                setIsPaddingLinked,
                48
              )}
              <div className="border-t border-gray-200" />
              {renderSpacingControl(
                "Margin",
                isMarginLinked,
                setIsMarginLinked,
                0
              )}
            </div>
          </div>
        </div>
      </>
    );

    const visibilityContent = (
      <div className="space-y-4 text-sm text-gray-600">
        <p>Visibility settings for this block will appear here.</p>
      </div>
    );

    const codeContent = (
      <div className="space-y-4 text-sm text-gray-600">
        <p>Custom code options for this block will appear here.</p>
      </div>
    );

    const currentContent =
      activeBlockTab === "Styles"
        ? stylesContent
        : activeBlockTab === "Visibility"
        ? visibilityContent
        : codeContent;

    return (
      <div className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <button
            onClick={() => setSelectedBlock(null)}
            className="flex items-center text-sm text-emerald-700 hover:text-emerald-800 gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Done
          </button>
          <span className="text-base font-semibold text-gray-900">
            {textInspectorTitle}
          </span>
          <button className="text-emerald-600 hover:text-emerald-700 text-xs flex items-center gap-1">
            <HelpCircle className="h-4 w-4" />
            {textInspectorHelpLabel}
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          {(["Content", "Styles", "Visibility"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveBlockTab(tab)}
              className={`flex-1 text-sm font-medium py-3 ${
                activeBlockTab === tab
                  ? "text-emerald-700 border-b-2 border-emerald-700"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-6">
          {currentContent}
        </div>

        {activeBlockTab === "Styles" && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center gap-2 flex-shrink-0">
            <button className="flex-1 border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
              Clear styles
            </button>
            <button className="flex-1 bg-emerald-700 text-white rounded-md px-3 py-2 text-sm hover:bg-emerald-800">
              Apply to all
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderImageInspector = () => (
    <div className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => setSelectedBlock(null)}
          className="flex items-center text-sm text-emerald-700 hover:text-emerald-800 gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Done
        </button>
        <span className="text-base font-semibold text-gray-900">Image</span>
        <button className="text-emerald-600 hover:text-emerald-700 text-xs flex items-center gap-1">
          <HelpCircle className="h-4 w-4" />
          How to use image blocks
        </button>
      </div>

      <div className="flex border-b border-gray-200">
        {(["Content", "Styles", "Visibility"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveBlockTab(tab)}
            className={`flex-1 text-sm font-medium py-3 ${
              activeBlockTab === tab
                ? "text-emerald-700 border-b-2 border-emerald-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-6">
        {activeBlockTab === "Content" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <span className="block text-xs font-medium text-gray-600">
                Image
              </span>
              <div className="flex flex-col items-center gap-2 w-full">
                <div className="border border-gray-200 rounded-xl bg-gray-50 h-24 flex items-center justify-center w-full overflow-hidden relative">
                  {selectedBlockData?.imageUrl ? (
                    <Image
                      src={selectedBlockData.imageUrl}
                      alt="Selected image"
                      fill
                      className="object-cover w-full"
                      unoptimized
                      onError={() => {
                        // Fallback handled by CSS
                      }}
                    />
                  ) : (
                    <div className="text-center text-sm text-gray-500">
                      <div className="h-12 w-12 mx-auto border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                        <ImageIcon className="h-6 w-6 text-gray-400" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="relative" ref={addImageDropdownRef}>
                  <button
                    onClick={() =>
                      setIsAddImageDropdownOpen(!isAddImageDropdownOpen)
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Add
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {/* Dropdown Menu */}
                  {isAddImageDropdownOpen && (
                    <div className="absolute left-0 top-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[240px] z-[100] overflow-hidden">
                      <button
                        onClick={() => {
                          setIsAddImageDropdownOpen(false);
                          setIsContentStudioOpen(true);
                          // Could also trigger file upload here
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          Upload Image
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          Anyone with the link can access uploaded files.
                        </div>
                      </button>
                      <button
                        onClick={() => {
                          setIsAddImageDropdownOpen(false);
                          setIsContentStudioOpen(true);
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-t border-gray-200"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          Browse Images
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <span className="block text-sm font-semibold text-gray-900">
                  Size
                </span>
                <div className="grid grid-cols-3 bg-gray-100 rounded-lg p-1 text-sm font-medium text-gray-700">
                  {(["Original", "Fill", "Scale"] as const).map((option) => (
                    <button
                      key={option}
                      className={`py-2 rounded-md ${
                        option === "Original"
                          ? "bg-white shadow text-gray-900"
                          : "hover:bg-gray-200"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-900">
                Link to
              </label>
              <select className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
                <option>Web</option>
                <option>Email</option>
                <option>Phone</option>
              </select>
              <input
                type="text"
                placeholder="https://example.com"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  defaultChecked
                  className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                />
                Open link in new tab
              </label>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                Alt Text
                <Info className="h-4 w-4 text-gray-400" />
              </label>
              <input
                type="text"
                placeholder="Describe what you see in the image"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>
        )}

        {activeBlockTab === "Styles" && (
          <div className="space-y-4 text-sm text-gray-600">
            <p>Image style options will be added here.</p>
          </div>
        )}

        {activeBlockTab === "Visibility" && (
          <div className="space-y-4 text-sm text-gray-600">
            <p>Visibility settings for this image will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderSectionInspector = () => (
    <div className="flex-1 flex flex-col bg-white min-h-0 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
        <button
          onClick={() => setSelectedSection(null)}
          className="flex items-center text-sm text-emerald-700 hover:text-emerald-800 gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Done
        </button>
        <span className="text-base font-semibold text-gray-900 capitalize">
          {selectedSection} Section
        </span>
        <button
          onClick={() => setSelectedSection(null)}
          className="text-gray-400 hover:text-gray-600"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 text-sm">
        <div className="space-y-2">
          {["Section Backgrounds", "Text", "Link", "Padding", "Border"].map(
            (label) => (
              <div key={label} className="border border-gray-200 rounded">
                <button className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50">
                  <span>{label}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            )
          )}
        </div>
      </div>
      <div className="px-4 py-3 border-t border-gray-200 flex-shrink-0">
        <button className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 border border-gray-200 rounded">
          Clear section styles
        </button>
      </div>
    </div>
  );

  const renderContentStudio = () => {
    const contentSources = [
      {
        key: "Uploads" as const,
        label: "Uploads",
        icon: Cloud,
      },
      // {
      //   key: "Stock images" as const,
      //   label: "Stock images",
      //   icon: ImageIcon,
      //   badge: "New",
      // },
      // {
      //   key: "My products" as const,
      //   label: "My products",
      //   icon: ShoppingBag,
      // },
      // {
      //   key: "Instagram" as const,
      //   label: "Instagram",
      //   icon: Instagram,
      // },
      // {
      //   key: "Giphy" as const,
      //   label: "Giphy",
      //   icon: ImagePlus,
      // },
      // {
      //   key: "Canva" as const,
      //   label: "Canva",
      //   icon: Palette,
      // },
    ];

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-black/40"
        onClick={() => setIsContentStudioOpen(false)}
      >
        <div
          className="mt-auto bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 h-[95vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 pt-6 pb-4 flex-shrink-0">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Content Studio
              </h2>
              <p className="text-sm text-gray-500">
                Manage and upload images for your email
              </p>
            </div>
            <button
              onClick={() => setIsContentStudioOpen(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
            {/* Left Sidebar */}
            <div className="w-64 border-r border-gray-200 bg-gray-50 flex flex-col flex-shrink-0">
              <div className="flex-1 overflow-y-auto py-4">
                {contentSources.map((source) => {
                  const Icon = source.icon;
                  const isActive = contentStudioSource === source.key;
                  return (
                    <button
                      key={source.key}
                      onClick={() => setContentStudioSource(source.key)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isActive
                          ? "bg-white text-emerald-700 border-r-2 border-emerald-700"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="flex-1 text-sm font-medium">
                        {source.label}
                      </span>
                      {(source as any).badge && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-pink-100 text-pink-700 rounded">
                          {(source as any).badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Content Area */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Top Toolbar */}
              <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0 space-y-4">
                <div className="flex items-center gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search files"
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>

                  {/* Upload Button with Dropdown */}
                  <div className="relative" ref={uploadDropdownRef}>
                    <div className="inline-flex items-center rounded-lg overflow-hidden bg-emerald-600">
                      <button
                        onClick={() => {
                          // Handle direct upload
                          setIsUploadDropdownOpen(false);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition-colors"
                      >
                        <Upload className="h-4 w-4" />
                        Upload
                      </button>
                      <button
                        onClick={() =>
                          setIsUploadDropdownOpen(!isUploadDropdownOpen)
                        }
                        className="px-2 py-2 bg-emerald-600 text-white hover:bg-emerald-700 transition-colors border-l border-emerald-700"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Dropdown Menu */}
                    {isUploadDropdownOpen && (
                      <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px] z-50 overflow-hidden">
                        <button
                          onClick={() => {
                            setIsUploadDropdownOpen(false);
                            setIsImportUrlModalOpen(true);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          Import from URL
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Info Banner */}
                <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-800">
                    Any file uploaded to Mailchimp&apos;s Content Studio can be
                    accessed by anyone with the link. Do not upload sensitive or
                    private information.
                  </p>
                </div>

                {/* Filters and View */}
                <div className="flex items-center gap-4">
                  <select className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
                    <option>Filter</option>
                  </select>
                  <select className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
                    <option>Folder</option>
                  </select>
                  <div className="flex items-center gap-2 ml-auto">
                    <span className="text-sm text-gray-600">Sort by</span>
                    <select className="border border-gray-200 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600">
                      <option>Newest first</option>
                      <option>Oldest first</option>
                      <option>Name A-Z</option>
                      <option>Name Z-A</option>
                    </select>
                  </div>
                  <div className="flex items-center border border-gray-200 rounded-md overflow-hidden">
                    <button
                      onClick={() => setContentStudioViewMode("grid")}
                      className={`p-2 ${
                        contentStudioViewMode === "grid"
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <Grid className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setContentStudioViewMode("list")}
                      className={`p-2 border-l border-gray-200 ${
                        contentStudioViewMode === "list"
                          ? "bg-gray-100 text-gray-900"
                          : "text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      <List className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* File Display Area */}
              <div className="flex-1 overflow-y-auto p-6">
                {uploadedFiles.length === 0 ? (
                  contentStudioViewMode === "grid" ? (
                    <div className="grid grid-cols-4 gap-4">
                      {/* Placeholder for uploaded images */}
                      <div className="aspect-square bg-gray-100 border border-gray-200 rounded-lg flex items-center justify-center cursor-pointer hover:border-emerald-500 transition-colors">
                        <div className="text-center">
                          <div className="h-16 w-16 mx-auto border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-2">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                          <p className="text-xs text-gray-500">No files yet</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {/* List view placeholder */}
                      <div className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                        <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center flex-shrink-0">
                          <ImageIcon className="h-8 w-8 text-gray-400" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">
                            No files yet
                          </p>
                          <p className="text-xs text-gray-500">
                            Upload your first file
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ) : contentStudioViewMode === "grid" ? (
                  <div className="grid grid-cols-4 gap-4">
                    {uploadedFiles.map((file) => {
                      const isSelected = selectedFileInStudio?.id === file.id;
                      return (
                        <div
                          key={file.id}
                          onClick={() => {
                            setSelectedFileInStudio({
                              id: file.id,
                              url: file.url,
                              name: file.name,
                            });

                            // If an Image block is selected, update it with the selected image
                            if (selectedBlock && isImageBlockSelected) {
                              setCanvasBlocks((prev) => {
                                const sectionBlocks = [
                                  ...prev[
                                    selectedBlock.section as keyof typeof prev
                                  ],
                                ];
                                const blockIndex = sectionBlocks.findIndex(
                                  (b) => b.id === selectedBlock.id
                                );
                                if (blockIndex !== -1) {
                                  sectionBlocks[blockIndex] = {
                                    ...sectionBlocks[blockIndex],
                                    imageUrl: file.url,
                                  };
                                  return {
                                    ...prev,
                                    [selectedBlock.section]: sectionBlocks,
                                  };
                                }
                                return prev;
                              });
                              // Close Content Studio after selecting
                              setIsContentStudioOpen(false);
                            }
                          }}
                          className={`aspect-square bg-gray-100 border rounded-lg overflow-hidden cursor-pointer hover:border-emerald-500 transition-colors group relative ${
                            isSelected
                              ? "border-emerald-600 border-2"
                              : "border-gray-200"
                          }`}
                        >
                          <Image
                            src={file.url}
                            alt={file.name}
                            fill
                            className="object-cover"
                            unoptimized
                            onError={() => {
                              // Error handling is done via CSS fallback
                            }}
                          />
                          {isSelected && (
                            <div className="absolute top-2 right-2 bg-emerald-600 rounded-full p-1">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <span className="text-white text-xs font-medium bg-black/50 px-2 py-1 rounded">
                              {file.name}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {uploadedFiles.map((file) => {
                      const isSelected = selectedFileInStudio?.id === file.id;
                      return (
                        <div
                          key={file.id}
                          onClick={() => {
                            setSelectedFileInStudio({
                              id: file.id,
                              url: file.url,
                              name: file.name,
                            });

                            // If an Image block is selected, update it with the selected image
                            if (selectedBlock && isImageBlockSelected) {
                              setCanvasBlocks((prev) => {
                                const sectionBlocks = [
                                  ...prev[
                                    selectedBlock.section as keyof typeof prev
                                  ],
                                ];
                                const blockIndex = sectionBlocks.findIndex(
                                  (b) => b.id === selectedBlock.id
                                );
                                if (blockIndex !== -1) {
                                  sectionBlocks[blockIndex] = {
                                    ...sectionBlocks[blockIndex],
                                    imageUrl: file.url,
                                  };
                                  return {
                                    ...prev,
                                    [selectedBlock.section]: sectionBlocks,
                                  };
                                }
                                return prev;
                              });
                              // Close Content Studio after selecting
                              setIsContentStudioOpen(false);
                            }
                          }}
                          className={`flex items-center gap-4 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors ${
                            isSelected
                              ? "border-emerald-600 border-2 bg-emerald-50"
                              : "border-gray-200"
                          }`}
                        >
                          <div className="w-16 h-16 bg-gray-100 border border-gray-200 rounded flex items-center justify-center flex-shrink-0 overflow-hidden relative">
                            <Image
                              src={file.url}
                              alt={file.name}
                              width={64}
                              height={64}
                              className="object-cover"
                              unoptimized
                              onError={() => {
                                // Error handling is done via CSS fallback
                              }}
                            />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">{file.type}</p>
                          </div>
                          {isSelected && (
                            <div className="bg-emerald-600 rounded-full p-1">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Pagination */}
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <select className="border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none">
                    <option>25</option>
                    <option>50</option>
                    <option>100</option>
                  </select>
                  <span className="text-sm text-gray-600">
                    {uploadedFiles.length === 0
                      ? "No files"
                      : `Showing results 1 - ${uploadedFiles.length} of ${uploadedFiles.length}`}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    Page 1 of 1
                  </span>
                  <button className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderImportUrlModal = () => {
    if (!isImportUrlModalOpen) return null;

    return (
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50"
        onClick={() => {
          setIsImportUrlModalOpen(false);
          setImportUrl("");
          setImportError(null);
        }}
      >
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Import URL</h3>
            <button
              onClick={() => {
                setIsImportUrlModalOpen(false);
                setImportUrl("");
                setImportError(null);
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors"
              disabled={isImporting}
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Import a file from a URL:
              </label>
              <input
                type="url"
                value={importUrl}
                onChange={(e) => {
                  setImportUrl(e.target.value);
                  setImportError(null);
                }}
                placeholder="https://example.com/image.jpg"
                className={`w-full px-4 py-3 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent ${
                  importError ? "border-red-300" : "border-gray-300"
                }`}
                autoFocus
                disabled={isImporting}
              />
              {importError && (
                <p className="text-sm text-red-600 mt-2">{importError}</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
            <button
              onClick={() => {
                setIsImportUrlModalOpen(false);
                setImportUrl("");
                setImportError(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={isImporting}
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                const url = importUrl.trim();
                if (!url) return;

                setIsImporting(true);
                setImportError(null);

                try {
                  // Validate URL format
                  const urlObj = new URL(url);

                  // Check if it's likely an image URL
                  const imageExtensions = [
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".gif",
                    ".webp",
                    ".svg",
                    ".bmp",
                  ];
                  const pathname = urlObj.pathname.toLowerCase();
                  const isImageUrl =
                    imageExtensions.some((ext) => pathname.endsWith(ext)) ||
                    urlObj.searchParams.has("format") ||
                    url.includes("image");

                  if (!isImageUrl) {
                    // Still try to load it as it might be an image without extension
                  }

                  // Try to load the image to verify it's accessible
                  const img = document.createElement("img") as HTMLImageElement;
                  img.crossOrigin = "anonymous";

                  await new Promise((resolve, reject) => {
                    img.onload = () => resolve(img);
                    img.onerror = () =>
                      reject(new Error("Failed to load image from URL"));
                    img.src = url;
                  });

                  // Extract filename from URL
                  const filename =
                    pathname.split("/").pop() || `image-${Date.now()}`;
                  const fileExtension = filename.split(".").pop() || "jpg";
                  const fileName = filename.includes(".")
                    ? filename
                    : `${filename}.${fileExtension}`;

                  // Add to uploaded files
                  const newFile = {
                    id: `file-${Date.now()}`,
                    url: url,
                    name: fileName,
                    type: `image/${
                      fileExtension === "jpg" ? "jpeg" : fileExtension
                    }`,
                  };

                  setUploadedFiles((prev) => [newFile, ...prev]);

                  // Close modal and reset
                  setIsImportUrlModalOpen(false);
                  setImportUrl("");
                } catch (error) {
                  console.error("Error importing image:", error);
                  setImportError(
                    error instanceof Error
                      ? error.message
                      : "Failed to import image. Please check the URL and try again."
                  );
                } finally {
                  setIsImporting(false);
                }
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!importUrl.trim() || isImporting}
            >
              {isImporting ? "Importing..." : "Import"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderNavigationSidebar = () => (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      {activeNav === "Add" && (
        <>
          {/* Content Blocks */}
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                CONTENT BLOCKS
              </h3>
              <p className="text-xs text-gray-500">
                Drag to add content to your email
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {(showMoreBlocks ? contentBlocks : contentBlocks.slice(0, 9)).map(
                (block, index) => {
                  const Icon = block.icon;
                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, block.type)}
                      className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded hover:border-gray-300 hover:shadow-sm transition-all cursor-move"
                    >
                      <Icon className={`h-6 w-6 text-black mb-1`} />
                      <span className="text-xs text-gray-700 text-center">
                        {block.label}
                      </span>
                    </div>
                  );
                }
              )}
            </div>

            {contentBlocks.length > 9 && (
              <button
                onClick={() => setShowMoreBlocks(!showMoreBlocks)}
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
              >
                {showMoreBlocks ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    Show more
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Blank Layouts */}
          <div className="p-4 border-t border-gray-200">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                BLANK LAYOUTS
              </h3>
              <p className="text-xs text-gray-500">
                Drag to add layouts to your email
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {(showMoreLayouts ? blankLayouts : blankLayouts.slice(0, 3)).map(
                (layout, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(e, "Layout", layout.columns)
                    }
                    className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded hover:border-gray-300 hover:shadow-sm transition-all cursor-move"
                  >
                    <div className="flex items-center justify-center mb-2">
                      {React.createElement(layout.icon, {
                        className: "h-5 w-5 text-gray-700",
                      })}
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                      {layout.label}
                    </span>
                  </div>
                )
              )}
            </div>

            {blankLayouts.length > 3 && (
              <button
                onClick={() => setShowMoreLayouts(!showMoreLayouts)}
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
              >
                {showMoreLayouts ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    Show more
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Prebuilt Layouts */}
          <div className="p-4 border-t border-gray-200">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                PREBUILT LAYOUTS
              </h3>
              <p className="text-xs text-gray-500">
                Drag to add layouts to your email
              </p>
            </div>

            <button className="w-full p-3 bg-white border border-gray-200 rounded hover:border-gray-300 hover:shadow-sm transition-all text-left">
              <span className="text-sm text-gray-700">Image & Text</span>
            </button>

            <button className="text-xs text-emerald-600 hover:underline mt-4">
              Show more
            </button>
          </div>
        </>
      )}

      {activeNav === "Styles" && (
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Email Design
            </h3>
            <button className="text-gray-400 hover:text-gray-600">
              <Info className="h-5 w-5" />
            </button>
          </div>

          {[
            "Background",
            "Text",
            "Link",
            "Button",
            "Divider",
            "Image",
            "Logo",
          ].map((section) => (
            <div key={section} className="border-b border-gray-200 pb-3">
              <button className="w-full flex items-center justify-between text-left text-sm font-semibold text-gray-900">
                <span>{section}</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeNav === "Optimize" && (
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Optimization
          </h3>
          <p className="text-sm text-gray-600">
            Optimization settings will be added here.
          </p>
        </div>
      )}
    </div>
  );

  const rightSidebarContent = isInspectorOpen
    ? isTextBlockSelected
      ? renderTextInspector()
      : isImageBlockSelected
      ? renderImageInspector()
      : renderSectionInspector()
    : renderNavigationSidebar();

  const renderLayoutPreview = (block: CanvasBlock) => {
    const columns = block.columns || block.columnsWidths?.length || 1;
    let widths = block.columnsWidths;
    if (!widths) {
      const baseWidth = Math.floor(12 / columns);
      const remainder = 12 % columns;
      widths = Array(columns).fill(baseWidth);
      for (let i = 0; i < remainder; i++) widths[i]++;
    }

    const isMobilePreview = previewTab === "Mobile";

    return (
      <div className={isMobilePreview ? "flex flex-col gap-3" : "flex gap-3"}>
        {widths.map((width, idx) => (
          <div
            key={idx}
            style={
              isMobilePreview
                ? { width: "100%" }
                : { width: `${(width / 12) * 100}%` }
            }
            className="bg-gray-50 border border-dashed border-gray-300 rounded-lg p-6 text-sm text-gray-500 text-center"
          >
            Layout column
          </div>
        ))}
      </div>
    );
  };

  const renderPreviewBlock = (block: CanvasBlock) => {
    switch (block.type) {
      case "Image":
        return (
          <div className="w-full bg-gray-100 border border-gray-200 rounded-lg overflow-hidden flex items-center justify-center">
            {block.imageUrl ? (
              <Image
                src={block.imageUrl}
                alt="Image"
                width={800}
                height={600}
                style={{ width: "100%", height: "auto" }}
                className="block"
                unoptimized
                onError={() => {
                  // Fallback handled by CSS
                }}
              />
            ) : (
              <div className="w-full aspect-video flex items-center justify-center py-12">
                <div className="space-y-3 text-center">
                  <div className="h-16 w-16 rounded-full border-2 border-dashed border-gray-400 mx-auto"></div>
                  <p className="text-sm text-gray-500">Image</p>
                </div>
              </div>
            )}
          </div>
        );
      case "Heading":
        return (
          <h2 className="text-2xl font-bold text-gray-900 text-center">
            {block.content || "Heading text"}
          </h2>
        );
      case "Paragraph":
        return (
          <p className="text-base text-gray-700 text-center">
            {block.content || "Paragraph text"}
          </p>
        );
      case "Logo":
        return (
          <p className="text-2xl font-bold uppercase tracking-[0.3em] text-gray-900 text-center">
            {block.content || "Logo"}
          </p>
        );
      case "Button":
        return (
          <div className="flex justify-center">
            <button className="px-6 py-2 bg-gray-900 text-white rounded-lg">
              {block.content || "Button text"}
            </button>
          </div>
        );
      case "Divider":
        return <div className="h-px bg-gray-200"></div>;
      case "Spacer":
        return <div className="h-8"></div>;
      case "Layout":
        return null;
      default:
        return (
          <div className="border border-gray-200 rounded-lg p-4 text-center text-sm text-gray-600">
            {block.label}
          </div>
        );
    }
  };

  const renderSectionPreview = (blocks: CanvasBlock[]) => (
    <div className="space-y-6">
      {blocks
        .map((block) => renderPreviewBlock(block))
        .filter(Boolean)
        .map((content, idx) => (
          <div key={idx}>{content}</div>
        ))}
    </div>
  );

  const renderPreviewEmail = () => {
    const widthClass =
      previewTab === "Mobile"
        ? "max-w-sm"
        : previewTab === "Inbox"
        ? "max-w-2xl"
        : "max-w-3xl";

    return (
      <div className="flex justify-center px-6 pb-6">
        <div
          className={`w-full ${widthClass} bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden`}
        >
          <div className="bg-gray-50 text-center text-xs text-gray-500 py-3 underline">
            View this email in your browser
          </div>
          <div className="px-8 py-10 space-y-10">
            {renderSectionPreview(canvasBlocks.header)}
            {renderSectionPreview(canvasBlocks.body)}
            {renderSectionPreview(canvasBlocks.footer)}
          </div>
        </div>
      </div>
    );
  };

  const renderPreviewEmailInfo = () => (
    <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-200 bg-gray-50 px-6 py-6 space-y-6 text-sm text-gray-600">
      <div>
        <div className="flex items-center justify-between text-gray-900 font-semibold mb-4">
          <span>Email Info</span>
        </div>
        <label className="flex items-center justify-between text-sm text-gray-700">
          <span>Enable live merge tag info</span>
          <div className="w-10 h-6 bg-gray-200 rounded-full relative">
            <div className="absolute top-1 left-1 h-4 w-4 bg-white rounded-full shadow"></div>
          </div>
        </label>
        <p className="mt-3 text-xs text-gray-500">
          You haven&apos;t chosen an audience for this email yet. Learn more
          about merge tags.
        </p>
      </div>
      <div className="space-y-3 text-sm">
        <div>
          <span className="font-semibold text-gray-900">To:</span>
          <p className="text-gray-600">Recipient&apos;s email address</p>
        </div>
        <div>
          <span className="font-semibold text-gray-900">From:</span>
          <p className="text-gray-600">name</p>
          <p className="text-gray-600">email@email.com</p>
        </div>
        <div>
          <span className="font-semibold text-gray-900">Subject:</span>
          <p className="text-gray-500">(Not set)</p>
        </div>
        <div>
          <span className="font-semibold text-gray-900">Preview Text:</span>
          <p className="text-gray-500">(Not set)</p>
        </div>
      </div>
      <button className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100">
        Check email links
      </button>
    </div>
  );

  return (
    <>
      {isTextBlockSelected && (
        <div
          ref={measurementWrapperRef}
          style={{
            position: "fixed",
            top: 0,
            left: "-9999px",
            pointerEvents: "none",
          }}
          aria-hidden="true"
        >
          <div className="flex items-center gap-3 px-4 py-2">
            {toolbarGroups.map((group, index) => (
              <div
                key={`measure-${group.key}`}
                ref={(el) => {
                  measurementRefs.current[index] = el;
                }}
                className="flex items-center gap-2"
              >
                {group.element}
              </div>
            ))}
          </div>
        </div>
      )}
      <Layout>
        <div className="h-screen flex flex-col bg-white">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
            {/* Logo and Project Name */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <button onClick={() => router.push("/mailchimp")}>
                  <ChevronLeft />
                </button>
                <span className="text-2xl font-semibold text-gray-900">
                  Test
                </span>
              </div>
            </div>
            {/* save bar */}
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Changes saved</span>
              <button className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">
                Send test
              </button>
              <div className="relative">
                <button className="px-4 py-2 text-sm bg-emerald-700 text-white rounded-md flex items-center space-x-1">
                  <Save className="h-4 w-4" />
                  <span>Save and exit</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex flex-1 min-h-0 min-w-0">
            {/* Left Sidebar - Navigation + Content */}
            <div className="flex bg-white overflow-hidden min-h-0 min-w-0">
              {/* Left Navigation Column */}
              {!isInspectorOpen && (
                <div className="w-16 border-r border-gray-200 bg-gray-100 flex flex-col flex-shrink-0 py-4 space-y-2">
                  {[
                    {
                      key: "Add",
                      label: "Add",
                      icon: (cls: string) => (
                        <CirclePlus className={`h-5 w-5 ${cls}`} />
                      ),
                    },
                    {
                      key: "Styles",
                      label: "Styles",
                      icon: (cls: string) => (
                        <Paintbrush className={`h-5 w-5 ${cls}`} />
                      ),
                    },
                    {
                      key: "Optimize",
                      label: "Optimize",
                      icon: (cls: string) => (
                        <Gauge className={`h-5 w-5 ${cls}`} />
                      ),
                    },
                  ].map((item) => {
                    const isActive = activeNav === item.key;
                    return (
                      <button
                        key={item.key}
                        onClick={() => setActiveNav(item.key)}
                        className={`flex flex-col items-center gap-2 py-3 px-2 rounded-2xl transition-colors ${
                          isActive
                            ? "bg-white text-emerald-700"
                            : "text-gray-800 hover:bg-gray-200/80"
                        }`}
                      >
                        {item.icon(
                          isActive ? "text-emerald-700" : "text-gray-900"
                        )}
                        <span
                          className={`text-xs font-semibold tracking-tight ${
                            isActive ? "text-emerald-700" : "text-gray-900"
                          }`}
                        >
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Right Content Column */}
              <div
                className={`flex flex-col overflow-hidden transition-all min-h-0 flex-shrink-0 ${
                  isInspectorOpen ? "w-80" : "w-64"
                }`}
              >
                {rightSidebarContent}
              </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 flex flex-col bg-gray-50 min-h-0 min-w-0">
              {/* View Controls */}
              <div className="flex items-center space-x-4 px-6 py-3 bg-white">
                <div className="flex-1"></div>
                <div className="flex items-center border rounded-md bg-gray-100">
                  <button
                    onClick={() => setDeviceMode("desktop")}
                    className={`py-1 px-2 rounded-md ${
                      deviceMode === "desktop"
                        ? "bg-white"
                        : "hover:bg-gray-200"
                    }`}
                  >
                    <Monitor
                      className={`h-4 w-4 ${
                        deviceMode === "desktop"
                          ? "text-emerald-600"
                          : "text-gray-500"
                      }`}
                    />
                  </button>
                  <button
                    onClick={() => setDeviceMode("mobile")}
                    className={`py-1 px-2 rounded-md ${
                      deviceMode === "mobile" ? "bg-white" : "hover:bg-gray-200"
                    }`}
                  >
                    <Smartphone
                      className={`h-4 w-4 ${
                        deviceMode === "mobile"
                          ? "text-emerald-600"
                          : "text-gray-500"
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center space-x-2">
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Undo2 className="h-4 w-4 text-gray-600" />
                  </button>
                  <button className="p-2 hover:bg-gray-100 rounded">
                    <Redo2 className="h-4 w-4 text-gray-600" />
                  </button>
                  <button
                    onClick={() => setShowCommentsPanel((prev) => !prev)}
                    className={`p-2 rounded ${
                      showCommentsPanel ? "bg-emerald-50" : "hover:bg-gray-100"
                    }`}
                  >
                    <MessageSquare
                      className={`h-4 w-4 ${
                        showCommentsPanel ? "text-emerald-600" : "text-gray-600"
                      }`}
                    />
                  </button>
                </div>
                <button
                  className="px-4 py-2 text-sm text-gray bg-gray-200 rounded-md hover:bg-gray-300"
                  onClick={() => {
                    setIsPreviewOpen(true);
                    setPreviewTab("Desktop");
                  }}
                >
                  Preview
                </button>
              </div>
              {/* Email Canvas */}
              <div className="flex-1 overflow-auto bg-gray-100 rounded-tl-md border">
                <div className="relative">
                  {showCommentsPanel && (
                    <div className="absolute top-4 right-4 w-80 max-w-full bg-slate-50 border border-slate-200 rounded-2xl shadow-xl flex flex-col z-40">
                      <div className="flex items-center justify-between px-6 pt-6 pb-4">
                        <h3 className="text-lg font-semibold text-gray-900">
                          Comments
                        </h3>
                        <button
                          onClick={() => setShowCommentsPanel(false)}
                          className="text-gray-500 hover:text-gray-700"
                          aria-label="Close comments"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="flex items-center px-6 border-b border-slate-200 text-sm font-medium text-gray-600">
                        {(["Open", "Resolved"] as const).map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveCommentsTab(tab)}
                            className={`flex-1 py-2 border-b-2 text-center ${
                              activeCommentsTab === tab
                                ? "border-emerald-600 text-emerald-700"
                                : "border-transparent hover:text-gray-800"
                            }`}
                          >
                            {tab}
                          </button>
                        ))}
                      </div>
                      <div className="flex-1 px-6 py-6 text-center text-sm text-gray-500">
                        No comments yet
                      </div>
                      <div className="px-6 pb-6">
                        <button className="w-full flex items-center justify-center gap-2 border border-slate-200 rounded-xl py-3 text-sm font-medium text-emerald-600 hover:bg-emerald-50">
                          <span className="text-base leading-none">+</span>
                          Add comment
                        </button>
                      </div>
                    </div>
                  )}
                  {isTextBlockSelected && (
                    <div
                      ref={toolbarContainerRef}
                      className="sticky top-0 inset-x-0 z-30 bg-white border-b border-gray-200 shadow-sm"
                    >
                      <div className="px-4 py-2 flex items-center gap-3">
                        <div className="flex items-center gap-3 flex-1 overflow-hidden">
                          {visibleGroups.map((group, index) => (
                            <div
                              key={group.key}
                              className={`flex items-center gap-2 min-w-fit ${
                                index !== visibleGroups.length - 1
                                  ? "pr-3 border-r border-gray-200"
                                  : ""
                              }`}
                            >
                              {group.element}
                            </div>
                          ))}
                        </div>

                        {shouldShowOverflowButton && (
                          <div className="relative" ref={overflowMenuRef}>
                            <button
                              type="button"
                              onClick={() =>
                                setIsOverflowOpen((prevState) => !prevState)
                              }
                              className={`${baseToolbarButtonClasses} bg-gray-100 text-gray-700`}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>

                            {isOverflowOpen && (
                              <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-50 min-w-[480px]">
                                <div className="flex items-center gap-3">
                                  {overflowGroups.map((group) => (
                                    <div
                                      key={group.key}
                                      className="flex items-center gap-2"
                                    >
                                      {group.element}
                                    </div>
                                  ))}
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className={`${baseToolbarButtonClasses} border border-emerald-600 bg-emerald-50 text-emerald-700`}
                                    >
                                      <List className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      className={baseToolbarButtonClasses}
                                    >
                                      <ListOrdered className="h-4 w-4" />
                                    </button>
                                    <span
                                      className="h-5 w-px bg-gray-200"
                                      aria-hidden="true"
                                    />
                                    <button
                                      type="button"
                                      className={baseToolbarButtonClasses}
                                    >
                                      <Strikethrough className="h-4 w-4" />
                                    </button>
                                    <span
                                      className="h-5 w-px bg-gray-200"
                                      aria-hidden="true"
                                    />
                                    <button
                                      type="button"
                                      className="flex items-center gap-1 border border-gray-200 rounded-md px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 whitespace-nowrap"
                                    >
                                      <span>Merge Tags</span>
                                      <ChevronDown className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      className={baseToolbarButtonClasses}
                                    >
                                      <Info className="h-4 w-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Header Section */}
                  <div
                    className={`${getSectionClassName(
                      "header",
                      "min-h-[100px]"
                    )} cursor-pointer group`}
                    onClick={() => {
                      setSelectedSection("header");
                      setSelectedBlock(null);
                    }}
                  >
                    <span
                      className={`absolute left-2 top-0 text-[11px] font-semibold px-2 py-0.5 rounded-b border border-emerald-700 shadow-sm ${
                        selectedSection === "header"
                          ? "opacity-100 bg-emerald-700 text-white"
                          : "opacity-0 group-hover:opacity-100 bg-white text-emerald-700"
                      }`}
                    >
                      Header
                    </span>
                    <div
                      className={`mx-auto w-full bg-white pt-2 pb-4 flex-1 ${
                        deviceMode === "mobile" ? "max-w-xs" : "max-w-2xl"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderSectionBlocks("header", canvasBlocks.header)}
                    </div>
                  </div>

                  {/* Body Section */}
                  <div
                    className={`${getSectionClassName(
                      "body",
                      "min-h-[200px]"
                    )} cursor-pointer group`}
                    onClick={() => {
                      setSelectedSection("body");
                      setSelectedBlock(null);
                    }}
                  >
                    <span
                      className={`absolute left-2 top-0 text-[11px] font-semibold px-2 py-0.5 rounded-b border border-emerald-700 shadow-sm ${
                        selectedSection === "body"
                          ? "opacity-100 bg-emerald-700 text-white"
                          : "opacity-0 group-hover:opacity-100 bg-white text-emerald-700"
                      }`}
                    >
                      Body
                    </span>
                    <div
                      className={`mx-auto w-full bg-white pt-2 pb-4 flex-1 flex flex-col ${
                        deviceMode === "mobile" ? "max-w-xs" : "max-w-2xl"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderSectionBlocks("body", canvasBlocks.body)}
                    </div>
                  </div>

                  {/* Footer Section */}
                  <div
                    className={`${getSectionClassName(
                      "footer",
                      "min-h-[100px]"
                    )} cursor-pointer group`}
                    onClick={() => {
                      setSelectedSection("footer");
                      setSelectedBlock(null);
                    }}
                  >
                    <span
                      className={`absolute left-2 top-0 text-[11px] font-semibold px-2 py-0.5 rounded-b border border-emerald-700 shadow-sm ${
                        selectedSection === "footer"
                          ? "opacity-100 bg-emerald-700 text-white"
                          : "opacity-0 group-hover:opacity-100 bg-white text-emerald-700"
                      }`}
                    >
                      Footer
                    </span>
                    <div
                      className={`mx-auto w-full bg-white pt-2 pb-4 flex-1 ${
                        deviceMode === "mobile" ? "max-w-xs" : "max-w-2xl"
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {renderSectionBlocks("footer", canvasBlocks.footer)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {isPreviewOpen && (
          <div
            className="fixed inset-0 z-50 flex flex-col bg-black/40"
            onClick={() => setIsPreviewOpen(false)}
          >
            <div
              className="mt-auto bg-white rounded-t-3xl shadow-2xl border-t border-gray-200 h-[95vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between px-6 pt-6 pb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    Preview
                  </h2>
                  <p className="text-sm text-gray-500">
                    See how your email looks before sending
                  </p>
                </div>
                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex flex-wrap items-center gap-4 px-6 pb-4 border-b border-gray-200 text-sm font-medium text-gray-600">
                {(["Desktop", "Mobile", "Inbox"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setPreviewTab(tab)}
                    className={`pb-2 border-b-2 ${
                      previewTab === tab
                        ? "border-emerald-600 text-emerald-700"
                        : "border-transparent hover:text-gray-800"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
                <button className="ml-auto inline-flex items-center gap-2 text-emerald-700 hover:text-emerald-800">
                  <Play className="h-4 w-4" />
                  Send a Test Email
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                <div className="flex-1 overflow-auto">
                  {renderPreviewEmail()}
                </div>
                {renderPreviewEmailInfo()}
              </div>
            </div>
          </div>
        )}
        {isContentStudioOpen && renderContentStudio()}
        {renderImportUrlModal()}
      </Layout>
    </>
  );
}
