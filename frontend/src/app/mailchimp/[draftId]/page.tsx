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
import LayoutBlock from "@/components/mailchimp/email-builder/LayoutBlock";
import {
  CanvasBlock,
  TextStyles,
} from "@/components/mailchimp/email-builder/types";
import { useEmailBuilder } from "@/components/mailchimp/email-builder/hooks/useEmailBuilder";
import { useDragAndDrop } from "@/components/mailchimp/email-builder/hooks/useDragAndDrop";
import TextInspector from "@/components/mailchimp/email-builder/components/TextInspector";
import ImageInspector from "@/components/mailchimp/email-builder/components/ImageInspector";
import SectionInspector from "@/components/mailchimp/email-builder/components/SectionInspector";
import TextColorPicker from "@/components/mailchimp/email-builder/components/TextColorPicker";
import TextHighlightPicker from "@/components/mailchimp/email-builder/components/TextHighlightPicker";
import BorderColorPicker from "@/components/mailchimp/email-builder/components/BorderColorPicker";
import BlockBackgroundPicker from "@/components/mailchimp/email-builder/components/BlockBackgroundPicker";
import ContentStudio from "@/components/mailchimp/email-builder/components/ContentStudio";
import ImportUrlModal from "@/components/mailchimp/email-builder/components/ImportUrlModal";
import NavigationSidebar from "@/components/mailchimp/email-builder/components/NavigationSidebar";
import CanvasBlockRenderer from "@/components/mailchimp/email-builder/components/CanvasBlockRenderer";
import SectionBlocks from "@/components/mailchimp/email-builder/components/SectionBlocks";
import PreviewPanel from "@/components/mailchimp/email-builder/components/PreviewPanel";
import TextToolbar from "@/components/mailchimp/email-builder/components/TextToolbar";
import { getBlockLabel } from "@/components/mailchimp/email-builder/utils/helpers";

export default function EmailBuilderPage() {
  const router = useRouter();

  // Use custom hooks for state management
  const builderState = useEmailBuilder();
  const {
    activeNav,
    setActiveNav,
    deviceMode,
    setDeviceMode,
    showCommentsPanel,
    setShowCommentsPanel,
    activeCommentsTab,
    setActiveCommentsTab,
    isPreviewOpen,
    setIsPreviewOpen,
    previewTab,
    setPreviewTab,
    showMoreBlocks,
    setShowMoreBlocks,
    showMoreLayouts,
    setShowMoreLayouts,
    isContentStudioOpen,
    setIsContentStudioOpen,
    contentStudioSource,
    setContentStudioSource,
    contentStudioViewMode,
    setContentStudioViewMode,
    isUploadDropdownOpen,
    setIsUploadDropdownOpen,
    isImportUrlModalOpen,
    setIsImportUrlModalOpen,
    importUrl,
    setImportUrl,
    isImporting,
    setIsImporting,
    importError,
    setImportError,
    uploadedFiles,
    setUploadedFiles,
    selectedFileInStudio,
    setSelectedFileInStudio,
    isAddImageDropdownOpen,
    setIsAddImageDropdownOpen,
    isTextColorPickerOpen,
    setIsTextColorPickerOpen,
    isTextHighlightPickerOpen,
    setIsTextHighlightPickerOpen,
    selectedSection,
    setSelectedSection,
    selectedBlock,
    setSelectedBlock,
    hoveredBlock,
    setHoveredBlock,
    canvasBlocks,
    setCanvasBlocks,
    activeBlockTab,
    setActiveBlockTab,
    isPaddingLinked,
    setIsPaddingLinked,
    isMarginLinked,
    setIsMarginLinked,
    addImageDropdownRef,
    uploadDropdownRef,
    selectedBlockData,
    selectedBlockType,
    isTextBlockSelected,
    isImageBlockSelected,
    isSectionSelected,
    currentStyles,
    updateTextBlockStyles,
    handleStyleChange,
    removeBlock,
    updateLayoutColumns,
  } = builderState;

  const dragAndDropState = useDragAndDrop(setCanvasBlocks);
  const {
    dragOverSection,
    setDragOverSection,
    dragOverIndex,
    setDragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragOverDropZone,
    handleDragLeaveDropZone,
  } = dragAndDropState;

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

  const renderSectionBlocks = (section: string, blocks: CanvasBlock[]) => {
    const updateBlockContent = (sec: string, blockId: string, content: string) => {
      setCanvasBlocks((prev) => {
        const list = [...prev[sec as keyof typeof prev]];
        const idx = list.findIndex((b) => b.id === blockId);
        if (idx === -1) return prev;
        const updated = { ...list[idx], content };
        const nextList = [...list];
        nextList[idx] = updated;
        return { ...prev, [sec]: nextList } as typeof prev;
      });
    };
    return (
      <SectionBlocks
        section={section}
        blocks={blocks}
        selectedBlock={selectedBlock}
        setSelectedBlock={setSelectedBlock}
        setSelectedSection={setSelectedSection}
        hoveredBlock={hoveredBlock}
        setHoveredBlock={setHoveredBlock}
        dragOverIndex={dragOverIndex}
        handleDragOverDropZone={handleDragOverDropZone}
        handleDragLeaveDropZone={handleDragLeaveDropZone}
        handleDrop={handleDrop}
        removeBlock={removeBlock}
        updateLayoutColumns={updateLayoutColumns}
        deviceMode={deviceMode}
        updateBlockContent={updateBlockContent}
      />
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

  // Render functions that use extracted components
  const renderTextInspector = () => {
    return (
      <TextInspector
        selectedBlockData={selectedBlockData}
        activeBlockTab={activeBlockTab}
        setActiveBlockTab={setActiveBlockTab}
        setSelectedBlock={setSelectedBlock}
        isPaddingLinked={isPaddingLinked}
        setIsPaddingLinked={setIsPaddingLinked}
        isMarginLinked={isMarginLinked}
        setIsMarginLinked={setIsMarginLinked}
        currentStyles={currentStyles}
        handleStyleChange={handleStyleChange}
        setIsBlockBackgroundPickerOpen={setIsBlockBackgroundPickerOpen}
        setIsBorderColorPickerOpen={setIsBorderColorPickerOpen}
      />
    );
  };

  const renderImageInspector = () => {
    return (
      <ImageInspector
        selectedBlockData={selectedBlockData}
        activeBlockTab={activeBlockTab}
        setActiveBlockTab={setActiveBlockTab}
        setSelectedBlock={setSelectedBlock}
        setIsContentStudioOpen={setIsContentStudioOpen}
        setIsAddImageDropdownOpen={setIsAddImageDropdownOpen}
        isAddImageDropdownOpen={isAddImageDropdownOpen}
        addImageDropdownRef={addImageDropdownRef}
      />
    );
  };

  const renderSectionInspector = () => {
    return (
      <SectionInspector
        selectedSection={selectedSection}
        setSelectedSection={setSelectedSection}
      />
    );
  };

  const renderTextColorPicker = () => {
    return (
      <TextColorPicker
        currentStyles={currentStyles}
        handleStyleChange={handleStyleChange}
        setIsTextColorPickerOpen={setIsTextColorPickerOpen}
      />
    );
  };

  const renderTextHighlightPicker = () => {
    return (
      <TextHighlightPicker
        currentStyles={currentStyles}
        handleStyleChange={handleStyleChange}
        setIsTextHighlightPickerOpen={setIsTextHighlightPickerOpen}
      />
    );
  };
  const [isBlockBackgroundPickerOpen, setIsBlockBackgroundPickerOpen] = useState(false);
  const renderBlockBackgroundPicker = () => {
    return (
      <BlockBackgroundPicker
        currentStyles={currentStyles}
        handleStyleChange={handleStyleChange}
        setIsBlockBackgroundPickerOpen={setIsBlockBackgroundPickerOpen}
      />
    );
  };
  const [isBorderColorPickerOpen, setIsBorderColorPickerOpen] = useState(false);
  const renderBorderColorPicker = () => {
    return (
      <BorderColorPicker
        currentStyles={currentStyles}
        handleStyleChange={handleStyleChange}
        setIsBorderColorPickerOpen={setIsBorderColorPickerOpen}
      />
    );
  };

  // Render functions using extracted components
  const renderContentStudio = () => {
    return (
      <ContentStudio
        isContentStudioOpen={isContentStudioOpen}
        setIsContentStudioOpen={setIsContentStudioOpen}
        contentStudioSource={contentStudioSource}
        setContentStudioSource={setContentStudioSource}
        contentStudioViewMode={contentStudioViewMode}
        setContentStudioViewMode={setContentStudioViewMode}
        isUploadDropdownOpen={isUploadDropdownOpen}
        setIsUploadDropdownOpen={setIsUploadDropdownOpen}
        setIsImportUrlModalOpen={setIsImportUrlModalOpen}
        uploadedFiles={uploadedFiles}
        selectedFileInStudio={selectedFileInStudio}
        setSelectedFileInStudio={setSelectedFileInStudio}
        selectedBlock={selectedBlock}
        isImageBlockSelected={isImageBlockSelected}
        setCanvasBlocks={setCanvasBlocks}
        uploadDropdownRef={uploadDropdownRef}
      />
    );
  };

  const renderImportUrlModal = () => {
    return (
      <ImportUrlModal
        isImportUrlModalOpen={isImportUrlModalOpen}
        setIsImportUrlModalOpen={setIsImportUrlModalOpen}
        importUrl={importUrl}
        setImportUrl={setImportUrl}
        isImporting={isImporting}
        setIsImporting={setIsImporting}
        importError={importError}
        setImportError={setImportError}
        setUploadedFiles={setUploadedFiles}
      />
    );
  };

  const renderNavigationSidebar = () => {
    return (
      <NavigationSidebar
        activeNav={activeNav}
        contentBlocks={contentBlocks}
        blankLayouts={blankLayouts}
        showMoreBlocks={showMoreBlocks}
        setShowMoreBlocks={setShowMoreBlocks}
        showMoreLayouts={showMoreLayouts}
        setShowMoreLayouts={setShowMoreLayouts}
        handleDragStart={handleDragStart}
      />
    );
  };

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
        const previewHeadingStyles = block.styles || {};
        return (
          <h2
            className="text-2xl"
            style={{
              fontFamily:
                previewHeadingStyles.fontFamily ||
                "Helvetica, Arial, sans-serif",
              fontSize: previewHeadingStyles.fontSize
                ? `${previewHeadingStyles.fontSize}px`
                : undefined,
              fontWeight: previewHeadingStyles.fontWeight || "bold",
              fontStyle: previewHeadingStyles.fontStyle || "normal",
              textDecoration: previewHeadingStyles.textDecoration || "none",
              textAlign: previewHeadingStyles.textAlign || "center",
              color: previewHeadingStyles.color || "#111827",
              backgroundColor:
                previewHeadingStyles.blockBackgroundColor || "transparent",
              borderStyle: previewHeadingStyles.borderStyle,
              borderWidth:
                previewHeadingStyles.borderStyle &&
                previewHeadingStyles.borderStyle !== "none"
                  ? previewHeadingStyles.borderWidth || "1px"
                  : 0,
              borderColor: previewHeadingStyles.borderColor,
              borderRadius: previewHeadingStyles.borderRadius,
              padding: previewHeadingStyles.padding,
              margin: previewHeadingStyles.margin,
              paddingTop: previewHeadingStyles.paddingTop,
              paddingRight: previewHeadingStyles.paddingRight,
              paddingBottom: previewHeadingStyles.paddingBottom,
              paddingLeft: previewHeadingStyles.paddingLeft,
              marginTop: previewHeadingStyles.marginTop,
              marginRight: previewHeadingStyles.marginRight,
              marginBottom: previewHeadingStyles.marginBottom,
              marginLeft: previewHeadingStyles.marginLeft,
            }}
          >
            <span
              style={{
                backgroundColor: previewHeadingStyles.textHighlightColor,
              }}
            >
              {block.content || "Heading text"}
            </span>
          </h2>
        );
      case "Paragraph":
        const previewParagraphStyles = block.styles || {};
        return (
          <p
            className="text-base"
            style={{
              fontFamily:
                previewParagraphStyles.fontFamily ||
                "Helvetica, Arial, sans-serif",
              fontSize: previewParagraphStyles.fontSize
                ? `${previewParagraphStyles.fontSize}px`
                : undefined,
              fontWeight: previewParagraphStyles.fontWeight || "normal",
              fontStyle: previewParagraphStyles.fontStyle || "normal",
              textDecoration: previewParagraphStyles.textDecoration || "none",
              textAlign: previewParagraphStyles.textAlign || "center",
              color: previewParagraphStyles.color || "#374151",
              backgroundColor:
                previewParagraphStyles.blockBackgroundColor || "transparent",
              borderStyle: previewParagraphStyles.borderStyle,
              borderWidth:
                previewParagraphStyles.borderStyle &&
                previewParagraphStyles.borderStyle !== "none"
                  ? previewParagraphStyles.borderWidth || "1px"
                  : 0,
              borderColor: previewParagraphStyles.borderColor,
              borderRadius: previewParagraphStyles.borderRadius,
              padding: previewParagraphStyles.padding,
              margin: previewParagraphStyles.margin,
              paddingTop: previewParagraphStyles.paddingTop,
              paddingRight: previewParagraphStyles.paddingRight,
              paddingBottom: previewParagraphStyles.paddingBottom,
              paddingLeft: previewParagraphStyles.paddingLeft,
              marginTop: previewParagraphStyles.marginTop,
              marginRight: previewParagraphStyles.marginRight,
              marginBottom: previewParagraphStyles.marginBottom,
              marginLeft: previewParagraphStyles.marginLeft,
            }}
          >
            <span
              style={{
                backgroundColor: previewParagraphStyles.textHighlightColor,
              }}
            >
              {block.content || "Paragraph text"}
            </span>
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

  const rightSidebarContent = isTextColorPickerOpen
    ? renderTextColorPicker()
    : isTextHighlightPickerOpen
    ? renderTextHighlightPicker()
    : isBlockBackgroundPickerOpen
    ? renderBlockBackgroundPicker()
    : isBorderColorPickerOpen
    ? renderBorderColorPicker()
    : isInspectorOpen
    ? isTextBlockSelected
      ? renderTextInspector()
      : isImageBlockSelected
      ? renderImageInspector()
      : renderSectionInspector()
    : renderNavigationSidebar();

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
              {!isInspectorOpen &&
                !isTextColorPickerOpen &&
                !isTextHighlightPickerOpen &&
                !isBlockBackgroundPickerOpen &&
                !isBorderColorPickerOpen && (
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
                  isInspectorOpen ||
                  isTextColorPickerOpen ||
                  isTextHighlightPickerOpen ||
                  isBlockBackgroundPickerOpen ||
                  isBorderColorPickerOpen
                    ? "w-80"
                    : "w-64"
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
                  <TextToolbar
                    isTextBlockSelected={isTextBlockSelected}
                    selectedBlock={selectedBlock}
                    selectedBlockData={selectedBlockData}
                    currentStyles={currentStyles}
                    handleStyleChange={handleStyleChange}
                    setCanvasBlocks={setCanvasBlocks}
                    setIsTextColorPickerOpen={setIsTextColorPickerOpen}
                    setIsTextHighlightPickerOpen={setIsTextHighlightPickerOpen}
                  />
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
        <PreviewPanel
          isPreviewOpen={isPreviewOpen}
          setIsPreviewOpen={setIsPreviewOpen}
          previewTab={previewTab}
          setPreviewTab={setPreviewTab}
          canvasBlocks={canvasBlocks}
        />
        {isContentStudioOpen && renderContentStudio()}
        {renderImportUrlModal()}
      </Layout>
    </>
  );
}
