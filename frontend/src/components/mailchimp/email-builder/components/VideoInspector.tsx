"use client";
import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronDown,
  Video as VideoIcon,
  Info,
  ChevronRight,
  Trash2,
  Sparkles,
  Scan,
} from "lucide-react";
import { BlockBoxStyles, CanvasBlock } from "../types";

interface VideoInspectorProps {
  selectedBlockData: CanvasBlock | null;
  setSelectedBlock: (block: { section: string; id: string } | null) => void;
  setIsContentStudioOpen: (open: boolean) => void;
  setIsAddVideoDropdownOpen: (open: boolean) => void;
  isAddVideoDropdownOpen: boolean;
  addVideoDropdownRef: React.RefObject<HTMLDivElement>;
  updateVideoSettings: (updates: Partial<CanvasBlock>) => void;
  setIsVideoBlockBackgroundPickerOpen?: (open: boolean) => void;
}

const VideoInspector: React.FC<VideoInspectorProps> = ({
  selectedBlockData,
  setSelectedBlock,
  setIsContentStudioOpen,
  setIsAddVideoDropdownOpen,
  isAddVideoDropdownOpen,
  addVideoDropdownRef,
  updateVideoSettings,
  setIsVideoBlockBackgroundPickerOpen,
}) => {
  const [activeBlockTab, setActiveBlockTab] = useState<"Design" | "Visibility">(
    "Design"
  );
  const videoUrl = selectedBlockData?.videoUrl || "";
  const altText = selectedBlockData?.videoAltText || "";
  const alignment = selectedBlockData?.videoAlignment || "center";

  const [isRoundedLinked, setIsRoundedLinked] = useState(true);
  const [isPaddingLinked, setIsPaddingLinked] = useState(false);
  const [paddingValues, setPaddingValues] = useState({
    top: 12,
    bottom: 12,
    left: 24,
    right: 24,
  });

  const paddingInitializedRef = useRef<Set<string>>(new Set());

  const handleUpdate = (updates: Partial<CanvasBlock>) => {
    if (!selectedBlockData) return;
    updateVideoSettings(updates);
  };

  const getPxValue = (value?: string | number) => {
    if (value === undefined || value === null) return "";
    if (typeof value === "number") return value.toString();
    return value.replace(/px$/, "");
  };

  const cleanStyles = (styles: BlockBoxStyles) => {
    const cleaned = { ...styles };
    (Object.keys(cleaned) as (keyof BlockBoxStyles)[]).forEach((key) => {
      if (
        cleaned[key] === undefined ||
        cleaned[key] === null ||
        cleaned[key] === ""
      ) {
        delete cleaned[key];
      }
    });
    return cleaned;
  };

  const updateBlockStyles = (updates: Partial<BlockBoxStyles>) => {
    if (!selectedBlockData) return;
    const current = selectedBlockData.videoBlockStyles || {};
    const merged = { ...current, ...updates };

    if (updates.padding !== undefined) {
      delete merged.paddingTop;
      delete merged.paddingRight;
      delete merged.paddingBottom;
      delete merged.paddingLeft;
    }

    if (
      updates.padding === undefined &&
      (updates.paddingTop !== undefined ||
        updates.paddingRight !== undefined ||
        updates.paddingBottom !== undefined ||
        updates.paddingLeft !== undefined)
    ) {
      delete merged.padding;
    }

    handleUpdate({
      videoBlockStyles: cleanStyles(merged),
    });
  };

  const updateFrameStyles = (updates: Partial<BlockBoxStyles>) => {
    if (!selectedBlockData) return;
    const current = selectedBlockData.videoFrameStyles || {};
    handleUpdate({
      videoFrameStyles: cleanStyles({
        ...current,
        ...updates,
      }),
    });
  };

  useEffect(() => {
    if (!selectedBlockData) return;
    const blockId = selectedBlockData.id || "";
    const blockStyles = selectedBlockData.videoBlockStyles || {};
    const hasPadding =
      blockStyles.padding !== undefined ||
      blockStyles.paddingTop !== undefined ||
      blockStyles.paddingRight !== undefined ||
      blockStyles.paddingBottom !== undefined ||
      blockStyles.paddingLeft !== undefined;

    if (!hasPadding && !paddingInitializedRef.current.has(blockId)) {
      paddingInitializedRef.current.add(blockId);
      const current = selectedBlockData.videoBlockStyles || {};
      const merged = {
        ...current,
        padding: undefined,
        paddingTop: "12px",
        paddingBottom: "12px",
        paddingLeft: "24px",
        paddingRight: "24px",
      };
      handleUpdate({
        videoBlockStyles: cleanStyles(merged),
      });
      setIsPaddingLinked(false);
      setPaddingValues({
        top: 12,
        bottom: 12,
        left: 24,
        right: 24,
      });
    } else {
      const linkable =
        blockStyles.padding !== undefined &&
        blockStyles.paddingTop === undefined &&
        blockStyles.paddingRight === undefined &&
        blockStyles.paddingBottom === undefined &&
        blockStyles.paddingLeft === undefined;
      setIsPaddingLinked(linkable);
      const basePadding = linkable
        ? parseFloat(getPxValue(blockStyles.padding) || "12") || 12
        : undefined;
      setPaddingValues({
        top:
          parseFloat(getPxValue(blockStyles.paddingTop) || "") ||
          basePadding ||
          12,
        bottom:
          parseFloat(getPxValue(blockStyles.paddingBottom) || "") ||
          basePadding ||
          12,
        left:
          parseFloat(getPxValue(blockStyles.paddingLeft) || "") ||
          basePadding ||
          24,
        right:
          parseFloat(getPxValue(blockStyles.paddingRight) || "") ||
          basePadding ||
          24,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBlockData]);

  const handlePaddingChange = (
    side: keyof typeof paddingValues,
    value: number
  ) => {
    const next = Math.max(0, value);
    setPaddingValues((prev) => ({ ...prev, [side]: next }));
    if (isPaddingLinked) {
      updateBlockStyles({
        padding: `${next}px`,
        paddingTop: undefined,
        paddingRight: undefined,
        paddingBottom: undefined,
        paddingLeft: undefined,
      });
    } else {
      const keyMap: Record<keyof typeof paddingValues, keyof BlockBoxStyles> = {
        top: "paddingTop",
        bottom: "paddingBottom",
        left: "paddingLeft",
        right: "paddingRight",
      };
      updateBlockStyles({
        padding: undefined,
        [keyMap[side]]: `${next}px`,
      });
    }
  };

  const handleTogglePaddingLink = (linked: boolean) => {
    setIsPaddingLinked(linked);
    if (linked) {
      const average = paddingValues.top;
      updateBlockStyles({
        padding: `${average}px`,
        paddingTop: undefined,
        paddingRight: undefined,
        paddingBottom: undefined,
        paddingLeft: undefined,
      });
      setPaddingValues({
        top: average,
        bottom: average,
        left: average,
        right: average,
      });
    } else {
      updateBlockStyles({
        padding: undefined,
        paddingTop: `${paddingValues.top}px`,
        paddingRight: `${paddingValues.right}px`,
        paddingBottom: `${paddingValues.bottom}px`,
        paddingLeft: `${paddingValues.left}px`,
      });
    }
  };

  const [isReplaceDropdownOpen, setIsReplaceDropdownOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const replaceDropdownRef = useRef<HTMLDivElement>(null);
  const portalDropdownRef = useRef<HTMLDivElement | null>(null);

  // Callback ref to ensure portal dropdown ref is set
  const setPortalDropdownRef = (element: HTMLDivElement | null) => {
    portalDropdownRef.current = element;
  };

  // Calculate dropdown position
  const calculateDropdownPosition = (buttonElement: HTMLElement | null) => {
    if (!buttonElement) return null;
    const rect = buttonElement.getBoundingClientRect();
    return {
      top: rect.bottom + 8,
      left: rect.left,
      width: Math.max(rect.width, 240),
    };
  };

  // Handle click outside to close dropdowns
  useEffect(() => {
    if (!isReplaceDropdownOpen && !isAddVideoDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      const isInsidePortal =
        portalDropdownRef.current && portalDropdownRef.current.contains(target);
      const isInsideReplaceButton =
        replaceDropdownRef.current &&
        replaceDropdownRef.current.contains(target);
      const isInsideAddButton =
        addVideoDropdownRef.current &&
        addVideoDropdownRef.current.contains(target);

      if (isInsidePortal || isInsideReplaceButton || isInsideAddButton) {
        return;
      }

      if (isReplaceDropdownOpen) {
        setIsReplaceDropdownOpen(false);
      }
      if (isAddVideoDropdownOpen) {
        setIsAddVideoDropdownOpen(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [isReplaceDropdownOpen, isAddVideoDropdownOpen]);

  // Update dropdown position when opened
  useEffect(() => {
    if (isReplaceDropdownOpen && replaceDropdownRef.current) {
      const position = calculateDropdownPosition(replaceDropdownRef.current);
      setDropdownPosition(position);
    } else if (isAddVideoDropdownOpen && addVideoDropdownRef.current) {
      const position = calculateDropdownPosition(addVideoDropdownRef.current);
      setDropdownPosition(position);
    } else {
      setDropdownPosition(null);
    }
  }, [isReplaceDropdownOpen, isAddVideoDropdownOpen]);

  // Helper function to get video thumbnail URL (for YouTube/Vimeo)
  const getVideoThumbnail = (url: string): string | null => {
    if (!url) return null;

    // YouTube
    const youtubeRegex =
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const youtubeMatch = url.match(youtubeRegex);
    if (youtubeMatch) {
      return `https://img.youtube.com/vi/${youtubeMatch[1]}/maxresdefault.jpg`;
    }

    // Vimeo
    const vimeoRegex = /(?:vimeo\.com\/)(\d+)/;
    const vimeoMatch = url.match(vimeoRegex);
    if (vimeoMatch) {
      // Vimeo requires API call for thumbnail, but we can use a placeholder
      return null;
    }

    return null;
  };

  // Priority: custom thumbnail > auto-generated thumbnail
  const customThumbnail = selectedBlockData?.videoThumbnailUrl;
  const autoThumbnail = getVideoThumbnail(videoUrl);
  const videoThumbnail = customThumbnail || autoThumbnail;
  const blockBackgroundColor =
    selectedBlockData?.videoBlockStyles?.backgroundColor || "";
  const blockBackgroundInputRef = useRef<HTMLInputElement>(null);
  const borderColorInputRef = useRef<HTMLInputElement>(null);
  const borderRadiusValue = getPxValue(
    selectedBlockData?.videoFrameStyles?.borderRadius
  );
  const borderStyle =
    selectedBlockData?.videoFrameStyles?.borderStyle || "none";
  const borderWidthValue = getPxValue(
    selectedBlockData?.videoFrameStyles?.borderWidth
  );
  const borderColor =
    selectedBlockData?.videoFrameStyles?.borderColor || "#111827";

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
        <span className="text-base font-semibold text-gray-900">Video</span>
        <button className="text-emerald-600 hover:text-emerald-700 text-xs flex items-center gap-1">
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">How to use video blocks</span>
        </button>
      </div>

      <div className="flex border-b border-gray-200">
        {(["Design", "Visibility"] as const).map((tab) => (
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
        {activeBlockTab === "Design" && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="block text-xs font-medium text-gray-600">
                  Video URL
                </span>
                <Info className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Please enter a URL"
                value={videoUrl}
                onChange={(e) =>
                  handleUpdate({
                    videoUrl: e.target.value,
                  })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
              <p className="text-xs text-gray-500">
                Youtube and Vimeo links will generate a thumbnail automatically.
                Thumbnail will link to this URL.
              </p>

              {/* Video Preview/Thumbnail */}
              <div className="border border-gray-200 rounded-xl bg-gray-50 h-48 flex items-center justify-center w-full overflow-hidden relative">
                {videoThumbnail ? (
                  <Image
                    src={videoThumbnail}
                    alt="Video thumbnail"
                    fill
                    className="object-cover w-full"
                    unoptimized
                    onError={() => {
                      // Fallback handled by CSS
                    }}
                  />
                ) : videoUrl ? (
                  <div className="text-center text-sm text-gray-500">
                    <div className="h-16 w-16 mx-auto border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-2">
                      <VideoIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <p>Video URL entered</p>
                  </div>
                ) : (
                  <div className="text-center text-sm text-gray-500">
                    <div className="h-16 w-16 mx-auto border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-2">
                      <VideoIcon className="h-8 w-8 text-gray-400" />
                    </div>
                    <p>No video URL</p>
                  </div>
                )}
              </div>

              {videoUrl || customThumbnail ? (
                <div className="flex items-center gap-2 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      handleUpdate({
                        videoUrl: undefined,
                        videoThumbnailUrl: undefined,
                      });
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove
                  </button>
                  <div className="relative flex-1" ref={replaceDropdownRef}>
                    <button
                      type="button"
                      onClick={() =>
                        setIsReplaceDropdownOpen(!isReplaceDropdownOpen)
                      }
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-emerald-600 text-sm font-medium hover:bg-emerald-50 transition-colors justify-center"
                    >
                      Replace
                      <ChevronDown className="h-4 w-4" />
                    </button>

                    {/* Replace Dropdown Menu - rendered via portal */}
                    {isReplaceDropdownOpen &&
                      dropdownPosition &&
                      createPortal(
                        <div
                          ref={setPortalDropdownRef}
                          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-[9999]"
                          style={{
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            width: `${dropdownPosition.width}px`,
                          }}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsContentStudioOpen(true);
                              setIsReplaceDropdownOpen(false);
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
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setIsContentStudioOpen(true);
                              setIsReplaceDropdownOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-t border-gray-200"
                          >
                            <div className="text-sm font-medium text-gray-900">
                              Browse Images
                            </div>
                          </button>
                        </div>,
                        document.body
                      )}
                  </div>
                </div>
              ) : (
                <div className="relative" ref={addVideoDropdownRef}>
                  <button
                    onClick={() =>
                      setIsAddVideoDropdownOpen(!isAddVideoDropdownOpen)
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                  >
                    Add
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  {/* Dropdown Menu - rendered via portal */}
                  {isAddVideoDropdownOpen &&
                    dropdownPosition &&
                    createPortal(
                      <div
                        ref={setPortalDropdownRef}
                        className="fixed bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-[9999]"
                        style={{
                          top: `${dropdownPosition.top}px`,
                          left: `${dropdownPosition.left}px`,
                          width: `${dropdownPosition.width}px`,
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsContentStudioOpen(true);
                            setIsAddVideoDropdownOpen(false);
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
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setIsContentStudioOpen(true);
                            setIsAddVideoDropdownOpen(false);
                          }}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-t border-gray-200"
                        >
                          <div className="text-sm font-medium text-gray-900">
                            Browse Images
                          </div>
                        </button>
                      </div>,
                      document.body
                    )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-semibold text-gray-900">
                Alignment
              </span>
              <div className="grid grid-cols-3 border border-gray-200 rounded-lg overflow-hidden">
                {(["left", "center", "right"] as const).map((option) => (
                  <button
                    key={option}
                    onClick={() =>
                      handleUpdate({
                        videoAlignment: option,
                      })
                    }
                    className={`py-2 text-sm font-medium ${
                      alignment === option
                        ? "bg-emerald-600 shadow text-white"
                        : "hover:bg-gray-50 text-gray-600"
                    }`}
                  >
                    {option.charAt(0).toUpperCase() + option.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                Alt Text
              </label>
              <input
                type="text"
                placeholder="Describe the video's preview image"
                value={altText}
                onChange={(e) =>
                  handleUpdate({
                    videoAltText: e.target.value,
                  })
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>

            <div className="space-y-2">
              <span className="block text-sm font-semibold text-gray-900">
                Color
              </span>
              <div>
                <div className="mt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => setIsVideoBlockBackgroundPickerOpen?.(true)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-3 flex items-center justify-between text-sm text-gray-800 hover:border-gray-300"
                  >
                    <span>Block Background</span>
                    <span className="flex items-center gap-2">
                      <span
                        className="w-6 h-6 rounded-full border border-gray-200"
                        style={{
                          backgroundColor:
                            blockBackgroundColor || "transparent",
                          backgroundImage: !blockBackgroundColor
                            ? "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)"
                            : undefined,
                          backgroundSize: !blockBackgroundColor
                            ? "8px 8px"
                            : undefined,
                          backgroundPosition: !blockBackgroundColor
                            ? "0 0, 0 4px, 4px -4px, -4px 0px"
                            : undefined,
                        }}
                      />
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    </span>
                  </button>
                  <input
                    ref={blockBackgroundInputRef}
                    type="color"
                    value={blockBackgroundColor || "#ffffff"}
                    onChange={(e) =>
                      handleUpdate({
                        videoBlockStyles: {
                          ...selectedBlockData?.videoBlockStyles,
                          backgroundColor:
                            e.target.value === "#ffffff"
                              ? "#ffffff"
                              : e.target.value,
                        },
                      })
                    }
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  Padding
                </span>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                    checked={isPaddingLinked}
                    onChange={(e) => handleTogglePaddingLink(e.target.checked)}
                  />
                  Apply to all sides
                </label>
              </div>
              {isPaddingLinked ? (
                <input
                  type="number"
                  min={0}
                  value={paddingValues.top}
                  onChange={(e) =>
                    handlePaddingChange("top", Number(e.target.value || 0))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {(["top", "bottom", "left", "right"] as const).map((side) => (
                    <div key={side} className="space-y-1">
                      <span className="text-xs text-gray-500 capitalize">
                        {side}
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={paddingValues[side]}
                        onChange={(e) =>
                          handlePaddingChange(side, Number(e.target.value || 0))
                        }
                        className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-600"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">
                  Rounded Corners
                </span>
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={isRoundedLinked}
                    onChange={(e) => setIsRoundedLinked(e.target.checked)}
                    className="h-4 w-4 text-emerald-600 border-gray-300 rounded"
                  />
                  Apply to all sides
                </label>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 w-full">
                  <span className="text-xs text-gray-500">
                    <Scan className="h-4 w-4 text-gray-500" />
                  </span>
                  <input
                    type="number"
                    min={0}
                    value={borderRadiusValue}
                    onChange={(e) =>
                      updateFrameStyles({
                        borderRadius: e.target.value
                          ? `${e.target.value}px`
                          : undefined,
                      })
                    }
                    className="flex-1 text-sm outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-sm font-semibold text-gray-900">
                Border
              </span>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                value={borderStyle}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "none") {
                    updateFrameStyles({
                      borderStyle: "none",
                      borderWidth: undefined,
                      borderColor: undefined,
                    });
                  } else {
                    updateFrameStyles({
                      borderStyle: value as BlockBoxStyles["borderStyle"],
                      borderWidth: borderWidthValue
                        ? `${borderWidthValue}px`
                        : "1px",
                    });
                  }
                }}
              >
                <option value="none">None</option>
                <option value="solid">Solid</option>
                <option value="dashed">Dashed</option>
                <option value="dotted">Dotted</option>
              </select>
              {borderStyle !== "none" && (
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <input
                      type="number"
                      min={0}
                      value={borderWidthValue || "1"}
                      onChange={(e) =>
                        updateFrameStyles({
                          borderWidth: e.target.value
                            ? `${e.target.value}px`
                            : undefined,
                        })
                      }
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                    />
                  </div>
                  <div className="space-y-1 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => borderColorInputRef.current?.click()}
                      className="w-10 h-10 rounded-full border border-gray-100"
                      style={{ backgroundColor: borderColor }}
                      aria-label="Change border color"
                    ></button>
                    <input
                      ref={borderColorInputRef}
                      type="color"
                      value={borderColor}
                      onChange={(e) =>
                        updateFrameStyles({
                          borderColor: e.target.value,
                        })
                      }
                      className="hidden"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeBlockTab === "Visibility" && (
          <div className="space-y-6">
            <p className="text-sm text-gray-600">
              Visibility settings will be implemented here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoInspector;
