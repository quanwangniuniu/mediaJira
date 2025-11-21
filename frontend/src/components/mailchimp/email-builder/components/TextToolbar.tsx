"use client";
import React from "react";
import {
  Link,
  Anchor,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  MoreHorizontal,
  List,
  ListOrdered,
  Strikethrough,
  Info,
  ChevronDown,
} from "lucide-react";
import { CanvasBlock, SelectedBlock, TextStyles } from "../types";

interface TextToolbarProps {
  isTextBlockSelected: boolean;
  selectedBlock: SelectedBlock | null;
  selectedBlockData: CanvasBlock | null;
  currentStyles: TextStyles;
  handleStyleChange: (styles: Partial<TextStyles>) => void;
  setCanvasBlocks: React.Dispatch<
    React.SetStateAction<{
      header: CanvasBlock[];
      body: CanvasBlock[];
      footer: CanvasBlock[];
    }>
  >;
  setIsTextColorPickerOpen: (open: boolean) => void;
  setIsTextHighlightPickerOpen: (open: boolean) => void;
}

const TextToolbar: React.FC<TextToolbarProps> = ({
  isTextBlockSelected,
  selectedBlock,
  selectedBlockData,
  currentStyles,
  handleStyleChange,
  setCanvasBlocks,
  setIsTextColorPickerOpen,
  setIsTextHighlightPickerOpen,
}) => {
  const baseToolbarButtonClasses =
    "rounded-md px-2 py-1 text-gray-600 hover:bg-gray-100 flex items-center justify-center";

  const toolbarGroups = React.useMemo(
    () => [
      {
        key: "block-settings",
        element: (
          <div className="flex items-center gap-2">
            <select
              value={
                selectedBlockData?.type === "Heading"
                  ? "Heading 1"
                  : "Paragraph"
              }
              onChange={(e) => {
                if (!selectedBlock) return;
                const newType =
                  e.target.value === "Paragraph" ? "Paragraph" : "Heading";
                setCanvasBlocks((prev) => {
                  const sectionBlocks = [
                    ...prev[selectedBlock.section as keyof typeof prev],
                  ];
                  const blockIndex = sectionBlocks.findIndex(
                    (b) => b.id === selectedBlock.id
                  );
                  if (blockIndex === -1) return prev;
                  const updatedBlocks = [...sectionBlocks];
                  updatedBlocks[blockIndex] = {
                    ...updatedBlocks[blockIndex],
                    type: newType,
                    label: newType === "Heading" ? "Heading" : "Text",
                  };
                  return {
                    ...prev,
                    [selectedBlock.section]: updatedBlocks,
                  };
                });
              }}
              className="bg-white border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option>Paragraph</option>
              <option>Heading 1</option>
              <option>Heading 2</option>
              <option>Heading 3</option>
              <option>Heading 4</option>
            </select>
            <select
              value={currentStyles.fontFamily || "Helvetica"}
              onChange={(e) =>
                handleStyleChange({ fontFamily: e.target.value })
              }
              className="bg-white border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600"
            >
              <option>Helvetica</option>
              <option>Arial</option>
              <option>Georgia</option>
            </select>
            <input
              type="number"
              value={currentStyles.fontSize || 16}
              onChange={(e) =>
                handleStyleChange({ fontSize: parseInt(e.target.value) || 16 })
              }
              className="w-16 bg-white border border-gray-200 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600"
            />
          </div>
        ),
      },
      {
        key: "text-style",
        element: (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsTextColorPickerOpen(true)}
              className={`${baseToolbarButtonClasses} ${
                currentStyles.color ? "bg-gray-200" : ""
              }`}
            >
              <span className="underline">A</span>
            </button>
            <button
              type="button"
              onClick={() => setIsTextHighlightPickerOpen(true)}
              className={`rounded-md px-2 py-1 flex items-center justify-center ${
                currentStyles.backgroundColor
                  ? "text-white bg-gray-900 hover:bg-gray-800"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              A
            </button>
            <button
              type="button"
              onClick={() => {
                const newWeight =
                  currentStyles.fontWeight === "bold" ? "normal" : "bold";
                handleStyleChange({ fontWeight: newWeight });
              }}
              className={`${baseToolbarButtonClasses} ${
                currentStyles.fontWeight === "bold"
                  ? "bg-gray-200 font-semibold"
                  : ""
              }`}
            >
              B
            </button>
            <button
              type="button"
              onClick={() => {
                const newStyle =
                  currentStyles.fontStyle === "italic" ? "normal" : "italic";
                handleStyleChange({ fontStyle: newStyle });
              }}
              className={`${baseToolbarButtonClasses} ${
                currentStyles.fontStyle === "italic" ? "bg-gray-200 italic" : ""
              }`}
            >
              I
            </button>
            <button
              type="button"
              onClick={() => {
                const newDecoration =
                  currentStyles.textDecoration === "underline"
                    ? "none"
                    : "underline";
                handleStyleChange({ textDecoration: newDecoration });
              }}
              className={`${baseToolbarButtonClasses} ${
                currentStyles.textDecoration === "underline"
                  ? "bg-gray-200 underline"
                  : ""
              }`}
            >
              U
            </button>
            <button
              type="button"
              onClick={() => {
                const newDecoration =
                  currentStyles.textDecoration === "line-through"
                    ? "none"
                    : "line-through";
                handleStyleChange({ textDecoration: newDecoration });
              }}
              className={`${baseToolbarButtonClasses} ${
                currentStyles.textDecoration === "line-through"
                  ? "bg-gray-200 line-through"
                  : ""
              }`}
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
            <button
              type="button"
              onClick={() => handleStyleChange({ textAlign: "left" })}
              className={`${baseToolbarButtonClasses} ${
                currentStyles.textAlign === "left" ? "bg-gray-200" : ""
              }`}
            >
              <AlignLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleStyleChange({ textAlign: "center" })}
              className={`${baseToolbarButtonClasses} ${
                currentStyles.textAlign === "center" ? "bg-gray-200" : ""
              }`}
            >
              <AlignCenter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleStyleChange({ textAlign: "right" })}
              className={`${baseToolbarButtonClasses} ${
                currentStyles.textAlign === "right" ? "bg-gray-200" : ""
              }`}
            >
              <AlignRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleStyleChange({ textAlign: "justify" })}
              className={`${baseToolbarButtonClasses} ${
                currentStyles.textAlign === "justify" ? "bg-gray-200" : ""
              }`}
            >
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
    [
      baseToolbarButtonClasses,
      currentStyles,
      selectedBlockData,
      selectedBlock,
      handleStyleChange,
      setCanvasBlocks,
      setIsTextColorPickerOpen,
      setIsTextHighlightPickerOpen,
    ]
  );

  const [toolbarWidth, setToolbarWidth] = React.useState<number>(0);
  const [groupWidths, setGroupWidths] = React.useState<number[]>([]);
  const [isOverflowOpen, setIsOverflowOpen] = React.useState(false);
  const toolbarContainerRef = React.useRef<HTMLDivElement>(null);
  const overflowMenuRef = React.useRef<HTMLDivElement>(null);
  const measurementWrapperRef = React.useRef<HTMLDivElement>(null);
  const measurementRefs = React.useRef<(HTMLDivElement | null)[]>([]);

  // Update toolbar width
  React.useLayoutEffect(() => {
    if (!isTextBlockSelected) return;

    const updateWidth = () => {
      const element = toolbarContainerRef.current;
      if (!element) return;
      setToolbarWidth(element.offsetWidth);
    };

    updateWidth();

    if (typeof ResizeObserver !== "undefined" && toolbarContainerRef.current) {
      const observer = new ResizeObserver(updateWidth);
      observer.observe(toolbarContainerRef.current);
      return () => observer.disconnect();
    }

    window.addEventListener("resize", updateWidth);
    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, [isTextBlockSelected]);

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

  // Update measurement refs array length
  React.useEffect(() => {
    measurementRefs.current = measurementRefs.current.slice(
      0,
      toolbarGroups.length
    );
  }, [toolbarGroups.length]);

  // Close overflow menu when clicking outside
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

  if (!isTextBlockSelected) return null;

  return (
    <>
      {/* Hidden measurement wrapper */}
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

      {/* Actual toolbar */}
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
                onClick={() => setIsOverflowOpen((prevState) => !prevState)}
                className={`${baseToolbarButtonClasses} bg-gray-100 text-gray-700`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {isOverflowOpen && (
                <div className="absolute right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg p-3 z-50 min-w-[480px]">
                  <div className="flex items-center gap-3">
                    {overflowGroups.map((group) => (
                      <div key={group.key} className="flex items-center gap-2">
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
                      <button type="button" className={baseToolbarButtonClasses}>
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
    </>
  );
};

export default TextToolbar;

