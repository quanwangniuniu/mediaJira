"use client";
import React, { useCallback, useState } from "react";
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
  BlockBoxStyles,
  CanvasBlock,
  TextStyles,
} from "@/components/mailchimp/email-builder/types";
import { useEmailBuilder } from "@/components/mailchimp/email-builder/hooks/useEmailBuilder";
import { useDragAndDrop } from "@/components/mailchimp/email-builder/hooks/useDragAndDrop";
import TextInspector from "@/components/mailchimp/email-builder/components/TextInspector";
import ImageInspector from "@/components/mailchimp/email-builder/components/ImageInspector";
import LogoInspector from "@/components/mailchimp/email-builder/components/LogoInspector";
import ButtonInspector from "@/components/mailchimp/email-builder/components/ButtonInspector";
import DividerInspector from "@/components/mailchimp/email-builder/components/DividerInspector";
import SpacerInspector from "@/components/mailchimp/email-builder/components/SpacerInspector";
import SocialInspector from "@/components/mailchimp/email-builder/components/SocialInspector";
import LayoutInspector from "@/components/mailchimp/email-builder/components/LayoutInspector";
import SectionInspector from "@/components/mailchimp/email-builder/components/SectionInspector";
import TextColorPicker from "@/components/mailchimp/email-builder/components/TextColorPicker";
import TextHighlightPicker from "@/components/mailchimp/email-builder/components/TextHighlightPicker";
import BorderColorPicker from "@/components/mailchimp/email-builder/components/BorderColorPicker";
import BlockBackgroundPicker from "@/components/mailchimp/email-builder/components/BlockBackgroundPicker";
import ImageBlockBackgroundPicker from "@/components/mailchimp/email-builder/components/ImageBlockBackgroundPicker";
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
    isLogoBlockSelected,
    isButtonBlockSelected,
    isDividerBlockSelected,
    isSpacerBlockSelected,
    isSocialBlockSelected,
    isLayoutBlockSelected,
    isSectionSelected,
    currentStyles,
    updateTextBlockStyles,
    handleStyleChange,
    removeBlock,
    updateLayoutColumns,
  } = builderState;

  // Email design styles state
  const [emailBackgroundColor, setEmailBackgroundColor] =
    useState("transparent");
  const [emailBodyColor, setEmailBodyColor] = useState("#ffffff");
  const [emailMobilePaddingLeft, setEmailMobilePaddingLeft] = useState(16);
  const [emailMobilePaddingRight, setEmailMobilePaddingRight] = useState(16);

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
    isTextBlockSelected ||
    isImageBlockSelected ||
    isLogoBlockSelected ||
    isButtonBlockSelected ||
    isDividerBlockSelected ||
    isSpacerBlockSelected ||
    isSocialBlockSelected ||
    isLayoutBlockSelected ||
    isSectionSelected;
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
    const updateBlockContent = (
      sec: string,
      blockId: string,
      content: string
    ) => {
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

  const getBoxStyleProps = (styles?: BlockBoxStyles) => {
    if (!styles) return {};
    return {
      backgroundColor: styles.backgroundColor,
      borderStyle: styles.borderStyle,
      borderWidth: styles.borderWidth,
      borderColor: styles.borderColor,
      borderRadius: styles.borderRadius,
      padding: styles.padding,
      margin: styles.margin,
      paddingTop: styles.paddingTop,
      paddingRight: styles.paddingRight,
      paddingBottom: styles.paddingBottom,
      paddingLeft: styles.paddingLeft,
      marginTop: styles.marginTop,
      marginRight: styles.marginRight,
      marginBottom: styles.marginBottom,
      marginLeft: styles.marginLeft,
    };
  };

  const hasCustomPadding = (styles?: BlockBoxStyles) => {
    if (!styles) return false;
    return (
      styles.padding !== undefined ||
      styles.paddingTop !== undefined ||
      styles.paddingRight !== undefined ||
      styles.paddingBottom !== undefined ||
      styles.paddingLeft !== undefined
    );
  };

  const getAlignmentWrapperStyles = (
    alignment: "left" | "center" | "right" = "center"
  ) => {
    const base: React.CSSProperties = {
      display: "flex",
      alignItems: "center",
      width: "100%",
    };
    switch (alignment) {
      case "left":
        return { ...base, justifyContent: "flex-start" };
      case "right":
        return { ...base, justifyContent: "flex-end" };
      case "center":
      default:
        return { ...base, justifyContent: "center" };
    }
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
  const updateTextBlockContent = useCallback(
    (content: string) => {
      if (!selectedBlock || !isTextBlockSelected) return;
      setCanvasBlocks((prev) => {
        const sectionKey = selectedBlock.section as keyof typeof prev;
        const sectionBlocks = [...prev[sectionKey]];
        const blockIndex = sectionBlocks.findIndex(
          (block) => block.id === selectedBlock.id
        );
        if (blockIndex === -1) {
          return prev;
        }
        const updatedBlocks = [...sectionBlocks];
        updatedBlocks[blockIndex] = {
          ...updatedBlocks[blockIndex],
          content,
        };
        return {
          ...prev,
          [selectedBlock.section]: updatedBlocks,
        };
      });
    },
    [isTextBlockSelected, selectedBlock, setCanvasBlocks]
  );

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
        updateTextContent={updateTextBlockContent}
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
        updateImageSettings={updateSelectedImageBlock}
        setIsImageBlockBackgroundPickerOpen={
          setIsImageBlockBackgroundPickerOpen
        }
      />
    );
  };

  const [isLogoBlockBackgroundPickerOpen, setIsLogoBlockBackgroundPickerOpen] =
    useState(false);
  const renderLogoBlockBackgroundPicker = () => {
    if (!selectedBlockData || !isLogoBlockSelected) return null;
    return (
      <ImageBlockBackgroundPicker
        currentStyles={selectedBlockData.imageBlockStyles || {}}
        handleStyleChange={(updates) => {
          updateSelectedLogoBlock({
            imageBlockStyles: {
              ...selectedBlockData.imageBlockStyles,
              ...updates,
            },
          });
        }}
        setIsImageBlockBackgroundPickerOpen={setIsLogoBlockBackgroundPickerOpen}
      />
    );
  };

  const renderLogoInspector = () => {
    return (
      <LogoInspector
        selectedBlockData={selectedBlockData}
        activeBlockTab={activeBlockTab}
        setActiveBlockTab={setActiveBlockTab}
        setSelectedBlock={setSelectedBlock}
        setIsContentStudioOpen={setIsContentStudioOpen}
        setIsAddImageDropdownOpen={setIsAddImageDropdownOpen}
        isAddImageDropdownOpen={isAddImageDropdownOpen}
        addImageDropdownRef={addImageDropdownRef}
        updateImageSettings={updateSelectedLogoBlock}
        setIsImageBlockBackgroundPickerOpen={setIsLogoBlockBackgroundPickerOpen}
      />
    );
  };

  const renderButtonInspector = () => {
    return (
      <ButtonInspector
        selectedBlockData={selectedBlockData}
        activeBlockTab={activeBlockTab}
        setActiveBlockTab={setActiveBlockTab}
        setSelectedBlock={setSelectedBlock}
        updateButtonSettings={updateSelectedButtonBlock}
        setIsButtonBlockBackgroundPickerOpen={
          setIsButtonBlockBackgroundPickerOpen
        }
      />
    );
  };

  const [
    isDividerBlockBackgroundPickerOpen,
    setIsDividerBlockBackgroundPickerOpen,
  ] = useState(false);
  const renderDividerBlockBackgroundPicker = () => {
    if (!selectedBlockData || !isDividerBlockSelected) return null;
    return (
      <ImageBlockBackgroundPicker
        currentStyles={selectedBlockData.dividerBlockStyles || {}}
        handleStyleChange={(updates) => {
          updateSelectedDividerBlock({
            dividerBlockStyles: {
              ...selectedBlockData.dividerBlockStyles,
              ...updates,
            },
          });
        }}
        setIsImageBlockBackgroundPickerOpen={
          setIsDividerBlockBackgroundPickerOpen
        }
      />
    );
  };

  const [isDividerLineColorPickerOpen, setIsDividerLineColorPickerOpen] =
    useState(false);
  const renderDividerLineColorPicker = () => {
    if (!selectedBlockData || !isDividerBlockSelected) return null;
    return (
      <BorderColorPicker
        currentStyles={{
          borderColor: selectedBlockData.dividerLineColor || "#000000",
        }}
        handleStyleChange={(updates) => {
          updateSelectedDividerBlock({
            dividerLineColor: updates.borderColor || "#000000",
          });
        }}
        setIsBorderColorPickerOpen={setIsDividerLineColorPickerOpen}
      />
    );
  };

  const renderDividerInspector = () => {
    return (
      <DividerInspector
        selectedBlockData={selectedBlockData}
        activeBlockTab={activeBlockTab}
        setActiveBlockTab={setActiveBlockTab}
        setSelectedBlock={setSelectedBlock}
        updateDividerSettings={updateSelectedDividerBlock}
        setIsDividerBlockBackgroundPickerOpen={
          setIsDividerBlockBackgroundPickerOpen
        }
        setIsDividerLineColorPickerOpen={setIsDividerLineColorPickerOpen}
      />
    );
  };

  const [
    isSpacerBlockBackgroundPickerOpen,
    setIsSpacerBlockBackgroundPickerOpen,
  ] = useState(false);
  const renderSpacerBlockBackgroundPicker = () => {
    if (!selectedBlockData || !isSpacerBlockSelected) return null;
    const spacerBlockStyles = selectedBlockData.spacerBlockStyles || {};
    return (
      <BlockBackgroundPicker
        currentStyles={{
          blockBackgroundColor: spacerBlockStyles.backgroundColor,
        }}
        handleStyleChange={(updates) => {
          updateSelectedSpacerBlock({
            spacerBlockStyles: {
              ...spacerBlockStyles,
              backgroundColor: updates.blockBackgroundColor,
            },
          });
        }}
        setIsBlockBackgroundPickerOpen={setIsSpacerBlockBackgroundPickerOpen}
      />
    );
  };

  const renderSpacerInspector = () => {
    return (
      <SpacerInspector
        selectedBlockData={selectedBlockData}
        activeBlockTab={activeBlockTab}
        setActiveBlockTab={setActiveBlockTab}
        setSelectedBlock={setSelectedBlock}
        updateSpacerSettings={updateSelectedSpacerBlock}
        setIsSpacerBlockBackgroundPickerOpen={
          setIsSpacerBlockBackgroundPickerOpen
        }
      />
    );
  };

  const [
    isSocialBlockBackgroundPickerOpen,
    setIsSocialBlockBackgroundPickerOpen,
  ] = useState(false);
  const [isSocialIconColorPickerOpen, setIsSocialIconColorPickerOpen] =
    useState(false);
  const renderSocialBlockBackgroundPicker = () => {
    if (!selectedBlockData || !isSocialBlockSelected) return null;
    const socialBlockStyles = selectedBlockData.socialBlockStyles || {};
    return (
      <BlockBackgroundPicker
        currentStyles={{
          blockBackgroundColor: socialBlockStyles.backgroundColor,
        }}
        handleStyleChange={(updates) => {
          updateSelectedSocialBlock({
            socialBlockStyles: {
              ...socialBlockStyles,
              backgroundColor: updates.blockBackgroundColor,
            },
          });
        }}
        setIsBlockBackgroundPickerOpen={setIsSocialBlockBackgroundPickerOpen}
      />
    );
  };
  const renderSocialIconColorPicker = () => {
    if (!selectedBlockData || !isSocialBlockSelected) return null;
    return (
      <TextColorPicker
        currentStyles={{
          color: selectedBlockData.socialIconColor || "#000000",
        }}
        handleStyleChange={(updates) => {
          updateSelectedSocialBlock({
            socialIconColor: updates.color || "#000000",
          });
        }}
        setIsTextColorPickerOpen={setIsSocialIconColorPickerOpen}
      />
    );
  };

  const renderSocialInspector = () => {
    return (
      <SocialInspector
        selectedBlockData={selectedBlockData}
        activeBlockTab={activeBlockTab}
        setActiveBlockTab={setActiveBlockTab}
        setSelectedBlock={setSelectedBlock}
        updateSocialSettings={updateSelectedSocialBlock}
        setIsSocialBlockBackgroundPickerOpen={
          setIsSocialBlockBackgroundPickerOpen
        }
        setIsSocialIconColorPickerOpen={setIsSocialIconColorPickerOpen}
      />
    );
  };

  const [
    isLayoutBlockBackgroundPickerOpen,
    setIsLayoutBlockBackgroundPickerOpen,
  ] = useState(false);
  const renderLayoutBlockBackgroundPicker = () => {
    if (!selectedBlockData || !isLayoutBlockSelected) return null;
    const layoutBlockStyles = selectedBlockData.layoutBlockStyles || {};
    return (
      <BlockBackgroundPicker
        currentStyles={{
          blockBackgroundColor: layoutBlockStyles.backgroundColor,
        }}
        handleStyleChange={(updates) => {
          updateSelectedLayoutBlock({
            layoutBlockStyles: {
              ...layoutBlockStyles,
              backgroundColor: updates.blockBackgroundColor,
            },
          });
        }}
        setIsBlockBackgroundPickerOpen={setIsLayoutBlockBackgroundPickerOpen}
      />
    );
  };

  const renderLayoutInspector = () => {
    return (
      <LayoutInspector
        selectedBlockData={selectedBlockData}
        activeBlockTab={activeBlockTab}
        setActiveBlockTab={setActiveBlockTab}
        setSelectedBlock={setSelectedBlock}
        updateLayoutSettings={updateSelectedLayoutBlock}
        setIsLayoutBlockBackgroundPickerOpen={
          setIsLayoutBlockBackgroundPickerOpen
        }
        updateLayoutColumns={handleLayoutColumnsChange}
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
  const [isBlockBackgroundPickerOpen, setIsBlockBackgroundPickerOpen] =
    useState(false);
  const renderBlockBackgroundPicker = () => {
    return (
      <BlockBackgroundPicker
        currentStyles={currentStyles}
        handleStyleChange={handleStyleChange}
        setIsBlockBackgroundPickerOpen={setIsBlockBackgroundPickerOpen}
      />
    );
  };
  const [
    isImageBlockBackgroundPickerOpen,
    setIsImageBlockBackgroundPickerOpen,
  ] = useState(false);
  const renderImageBlockBackgroundPicker = () => {
    if (!selectedBlockData || !isImageBlockSelected) return null;
    return (
      <ImageBlockBackgroundPicker
        currentStyles={selectedBlockData.imageBlockStyles || {}}
        handleStyleChange={(updates) => {
          updateSelectedImageBlock({
            imageBlockStyles: {
              ...selectedBlockData.imageBlockStyles,
              ...updates,
            },
          });
        }}
        setIsImageBlockBackgroundPickerOpen={
          setIsImageBlockBackgroundPickerOpen
        }
      />
    );
  };
  const [
    isButtonBlockBackgroundPickerOpen,
    setIsButtonBlockBackgroundPickerOpen,
  ] = useState(false);
  const renderButtonBlockBackgroundPicker = () => {
    if (!selectedBlockData || !isButtonBlockSelected) return null;
    const buttonBlockStyles = selectedBlockData.buttonBlockStyles || {};
    return (
      <BlockBackgroundPicker
        currentStyles={{
          blockBackgroundColor: buttonBlockStyles.backgroundColor,
        }}
        handleStyleChange={(updates) => {
          updateSelectedButtonBlock({
            buttonBlockStyles: {
              ...buttonBlockStyles,
              backgroundColor: updates.blockBackgroundColor,
            },
          });
        }}
        setIsBlockBackgroundPickerOpen={setIsButtonBlockBackgroundPickerOpen}
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
        isLogoBlockSelected={isLogoBlockSelected}
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
        emailBackgroundColor={emailBackgroundColor}
        setEmailBackgroundColor={setEmailBackgroundColor}
        emailBodyColor={emailBodyColor}
        setEmailBodyColor={setEmailBodyColor}
        emailMobilePaddingLeft={emailMobilePaddingLeft}
        setEmailMobilePaddingLeft={setEmailMobilePaddingLeft}
        emailMobilePaddingRight={emailMobilePaddingRight}
        setEmailMobilePaddingRight={setEmailMobilePaddingRight}
      />
    );
  };

  const updateSelectedImageBlock = useCallback(
    (updates: Partial<CanvasBlock>) => {
      if (!selectedBlock || !isImageBlockSelected) return;
      setCanvasBlocks((prev) => {
        const sectionKey = selectedBlock.section as keyof typeof prev;
        const sectionBlocks = [...prev[sectionKey]];
        const blockIndex = sectionBlocks.findIndex(
          (block) => block.id === selectedBlock.id
        );
        if (blockIndex === -1) {
          return prev;
        }
        const updatedBlocks = [...sectionBlocks];
        updatedBlocks[blockIndex] = {
          ...updatedBlocks[blockIndex],
          ...updates,
        };
        return {
          ...prev,
          [selectedBlock.section]: updatedBlocks,
        };
      });
    },
    [isImageBlockSelected, selectedBlock, setCanvasBlocks]
  );

  const updateSelectedLogoBlock = useCallback(
    (updates: Partial<CanvasBlock>) => {
      if (!selectedBlock || !isLogoBlockSelected) return;
      setCanvasBlocks((prev) => {
        const sectionKey = selectedBlock.section as keyof typeof prev;
        const sectionBlocks = [...prev[sectionKey]];
        const blockIndex = sectionBlocks.findIndex(
          (block) => block.id === selectedBlock.id
        );
        if (blockIndex === -1) {
          return prev;
        }
        const updatedBlocks = [...sectionBlocks];
        updatedBlocks[blockIndex] = {
          ...updatedBlocks[blockIndex],
          ...updates,
        };
        return {
          ...prev,
          [selectedBlock.section]: updatedBlocks,
        };
      });
    },
    [isLogoBlockSelected, selectedBlock, setCanvasBlocks]
  );

  const updateSelectedButtonBlock = useCallback(
    (updates: Partial<CanvasBlock>) => {
      if (!selectedBlock || !isButtonBlockSelected) return;
      setCanvasBlocks((prev) => {
        const sectionKey = selectedBlock.section as keyof typeof prev;
        const sectionBlocks = [...prev[sectionKey]];
        const blockIndex = sectionBlocks.findIndex(
          (block) => block.id === selectedBlock.id
        );
        if (blockIndex === -1) {
          return prev;
        }
        const updatedBlocks = [...sectionBlocks];
        updatedBlocks[blockIndex] = {
          ...updatedBlocks[blockIndex],
          ...updates,
        };
        return {
          ...prev,
          [selectedBlock.section]: updatedBlocks,
        };
      });
    },
    [isButtonBlockSelected, selectedBlock, setCanvasBlocks]
  );

  const updateSelectedDividerBlock = useCallback(
    (updates: Partial<CanvasBlock>) => {
      if (!selectedBlock || !isDividerBlockSelected) return;
      setCanvasBlocks((prev) => {
        const sectionKey = selectedBlock.section as keyof typeof prev;
        const sectionBlocks = [...prev[sectionKey]];
        const blockIndex = sectionBlocks.findIndex(
          (block) => block.id === selectedBlock.id
        );
        if (blockIndex === -1) {
          return prev;
        }
        const updatedBlocks = [...sectionBlocks];
        updatedBlocks[blockIndex] = {
          ...updatedBlocks[blockIndex],
          ...updates,
        };
        return {
          ...prev,
          [selectedBlock.section]: updatedBlocks,
        };
      });
    },
    [isDividerBlockSelected, selectedBlock, setCanvasBlocks]
  );

  const updateSelectedSpacerBlock = useCallback(
    (updates: Partial<CanvasBlock>) => {
      if (!selectedBlock || !isSpacerBlockSelected) return;
      setCanvasBlocks((prev) => {
        const sectionKey = selectedBlock.section as keyof typeof prev;
        const sectionBlocks = [...prev[sectionKey]];
        const blockIndex = sectionBlocks.findIndex(
          (block) => block.id === selectedBlock.id
        );
        if (blockIndex === -1) {
          return prev;
        }
        const updatedBlocks = [...sectionBlocks];
        updatedBlocks[blockIndex] = {
          ...updatedBlocks[blockIndex],
          ...updates,
        };
        return {
          ...prev,
          [selectedBlock.section]: updatedBlocks,
        };
      });
    },
    [isSpacerBlockSelected, selectedBlock, setCanvasBlocks]
  );

  const updateSelectedSocialBlock = useCallback(
    (updates: Partial<CanvasBlock>) => {
      if (!selectedBlock || !isSocialBlockSelected) return;
      setCanvasBlocks((prev) => {
        const sectionKey = selectedBlock.section as keyof typeof prev;
        const sectionBlocks = [...prev[sectionKey]];
        const blockIndex = sectionBlocks.findIndex(
          (block) => block.id === selectedBlock.id
        );
        if (blockIndex === -1) {
          return prev;
        }
        const updatedBlocks = [...sectionBlocks];
        updatedBlocks[blockIndex] = {
          ...updatedBlocks[blockIndex],
          ...updates,
        };
        return {
          ...prev,
          [selectedBlock.section]: updatedBlocks,
        };
      });
    },
    [isSocialBlockSelected, selectedBlock, setCanvasBlocks]
  );

  const updateSelectedLayoutBlock = useCallback(
    (updates: Partial<CanvasBlock>) => {
      if (!selectedBlock || !isLayoutBlockSelected) return;
      setCanvasBlocks((prev) => {
        const sectionKey = selectedBlock.section as keyof typeof prev;
        const sectionBlocks = [...prev[sectionKey]];
        const blockIndex = sectionBlocks.findIndex(
          (block) => block.id === selectedBlock.id
        );
        if (blockIndex === -1) {
          return prev;
        }
        const updatedBlocks = [...sectionBlocks];
        updatedBlocks[blockIndex] = {
          ...updatedBlocks[blockIndex],
          ...updates,
        };
        return {
          ...prev,
          [selectedBlock.section]: updatedBlocks,
        };
      });
    },
    [isLayoutBlockSelected, selectedBlock, setCanvasBlocks]
  );

  const handleLayoutColumnsChange = useCallback(
    (columns: number) => {
      if (!selectedBlock || !isLayoutBlockSelected) return;
      setCanvasBlocks((prev) => {
        const sectionKey = selectedBlock.section as keyof typeof prev;
        const sectionBlocks = [...prev[sectionKey]];
        const blockIndex = sectionBlocks.findIndex(
          (block) => block.id === selectedBlock.id
        );
        if (blockIndex === -1) {
          return prev;
        }
        const updatedBlocks = [...sectionBlocks];
        const baseWidth = Math.floor(12 / columns);
        const remainder = 12 % columns;
        const widths = Array(columns).fill(baseWidth);
        for (let i = 0; i < remainder; i++) widths[i]++;
        updatedBlocks[blockIndex] = {
          ...updatedBlocks[blockIndex],
          columns,
          columnsWidths: widths,
        };
        return {
          ...prev,
          [selectedBlock.section]: updatedBlocks,
        };
      });
    },
    [isLayoutBlockSelected, selectedBlock, setCanvasBlocks]
  );

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

  const normalizeWebUrl = (url: string) => {
    if (!url) return "";
    if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(url)) {
      return url;
    }
    return `https://${url}`;
  };

  const buildImageHref = (block: CanvasBlock) => {
    const rawValue = block.imageLinkValue?.trim();
    if (!rawValue) return null;
    const linkType = block.imageLinkType || "Web";
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
      default:
        return normalizeWebUrl(rawValue);
    }
  };

  const buildButtonHref = (block: CanvasBlock) => {
    const rawValue = block.buttonLinkValue?.trim();
    if (!rawValue) return null;
    const linkType = block.buttonLinkType || "Web";
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
      default:
        return normalizeWebUrl(rawValue);
    }
  };

  const renderPreviewBlock = (block: CanvasBlock) => {
    switch (block.type) {
      case "Image":
        const imageSizeClassMap = {
          Original: "w-auto max-w-full h-auto object-contain",
          Fill: "w-full h-full object-cover",
          Scale: "max-w-full object-contain",
        } as const;
        const sizeKey = (block.imageDisplayMode ??
          "Original") as keyof typeof imageSizeClassMap;
        const imageClasses = imageSizeClassMap[sizeKey];
        const previewHref = buildImageHref(block);
        const imageAlt = block.imageAltText?.trim() || "Image";
        const scalePercent = Math.min(
          100,
          Math.max(10, block.imageScalePercent ?? 85)
        );
        const imageStyle =
          sizeKey === "Scale"
            ? {
                width: `${scalePercent}%`,
                maxWidth: "100%",
                height: "auto",
              }
            : sizeKey === "Fill"
            ? { width: "100%", height: "100%" }
            : undefined;
        const wrapperStyle = {
          ...getBoxStyleProps(block.imageBlockStyles),
          ...getAlignmentWrapperStyles(block.imageAlignment || "center"),
        };
        const frameStyle = getBoxStyleProps(block.imageFrameStyles);
        const framePaddingClass = hasCustomPadding(block.imageFrameStyles)
          ? ""
          : "px-6 py-3";
        const frameClassName = `inline-flex items-center justify-center ${framePaddingClass}`;
        const imageNode = block.imageUrl ? (
          <Image
            src={block.imageUrl}
            alt={imageAlt}
            width={800}
            height={600}
            className={`block ${imageClasses}`}
            style={imageStyle}
            unoptimized
            onError={() => {
              // Fallback handled by CSS
            }}
          />
        ) : (
          <div className="w-full flex items-center justify-center py-6">
            <div className="text-center text-gray-500 space-y-2">
              <div className="h-8 w-8 mx-auto rounded-full border-2 border-dashed border-gray-400"></div>
              <p className="text-sm">Image</p>
            </div>
          </div>
        );
        return (
          <div className="w-full" style={wrapperStyle}>
            <div className={frameClassName} style={frameStyle}>
              {previewHref ? (
                <a
                  href={previewHref}
                  target={
                    block.imageOpenInNewTab ?? true ? "_blank" : undefined
                  }
                  rel={
                    block.imageOpenInNewTab ?? true
                      ? "noreferrer noopener"
                      : undefined
                  }
                  className="block w-full h-full"
                >
                  {imageNode}
                </a>
              ) : (
                imageNode
              )}
            </div>
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
        const buttonBlockStyles = getBoxStyleProps(block.buttonBlockStyles);
        const buttonHref = buildButtonHref(block);
        const buttonOpenInNewTab = block.buttonOpenInNewTab ?? true;
        const buttonTextColor = block.buttonTextColor || "#ffffff";
        const buttonBackgroundColor = block.buttonBackgroundColor || "#111827";
        const buttonShape = block.buttonShape || "Square";
        const buttonAlignment = block.buttonAlignment || "center";
        const buttonSize = block.buttonSize || "Small";

        // Size-based width only
        const sizeWidths: Record<string, string> = {
          Small: "150px",
          Medium: "200px",
          Large: "300px",
        };
        const buttonWidth = sizeWidths[buttonSize] || sizeWidths.Small;

        // Calculate border radius based on shape
        const getShapeBorderRadius = (shape: string): string => {
          switch (shape) {
            case "Round":
              return "8px";
            case "Pill":
              return "9999px";
            case "Square":
            default:
              return "0px";
          }
        };

        const buttonStyle: React.CSSProperties = {
          backgroundColor: buttonBackgroundColor,
          color: buttonTextColor,
          borderRadius:
            buttonBlockStyles.borderRadius || getShapeBorderRadius(buttonShape),
          borderStyle: buttonBlockStyles.borderStyle,
          borderWidth: buttonBlockStyles.borderWidth,
          borderColor: buttonBlockStyles.borderColor,
          width: buttonWidth,
        };

        const alignmentStyles: Record<
          "left" | "center" | "right",
          React.CSSProperties
        > = {
          left: { display: "flex", justifyContent: "flex-start" },
          center: { display: "flex", justifyContent: "center" },
          right: { display: "flex", justifyContent: "flex-end" },
        };

        const buttonWrapperStyle: React.CSSProperties = {
          ...alignmentStyles[buttonAlignment],
          // Padding is the space between button and external block
          ...(buttonBlockStyles.padding && {
            padding: buttonBlockStyles.padding,
          }),
          ...(buttonBlockStyles.paddingTop && {
            paddingTop: buttonBlockStyles.paddingTop,
          }),
          ...(buttonBlockStyles.paddingRight && {
            paddingRight: buttonBlockStyles.paddingRight,
          }),
          ...(buttonBlockStyles.paddingBottom && {
            paddingBottom: buttonBlockStyles.paddingBottom,
          }),
          ...(buttonBlockStyles.paddingLeft && {
            paddingLeft: buttonBlockStyles.paddingLeft,
          }),
          ...(buttonBlockStyles.margin && { margin: buttonBlockStyles.margin }),
          ...(buttonBlockStyles.marginTop && {
            marginTop: buttonBlockStyles.marginTop,
          }),
          ...(buttonBlockStyles.marginRight && {
            marginRight: buttonBlockStyles.marginRight,
          }),
          ...(buttonBlockStyles.marginBottom && {
            marginBottom: buttonBlockStyles.marginBottom,
          }),
          ...(buttonBlockStyles.marginLeft && {
            marginLeft: buttonBlockStyles.marginLeft,
          }),
          ...(buttonBlockStyles.backgroundColor && {
            backgroundColor: buttonBlockStyles.backgroundColor,
          }),
          width: "100%",
        };

        const buttonElement = (
          <button
            style={buttonStyle}
            className="px-6 py-2 font-medium transition-colors"
          >
            {block.content || "Button text"}
          </button>
        );

        return (
          <div style={buttonWrapperStyle}>
            {buttonHref ? (
              <a
                href={buttonHref}
                target={buttonOpenInNewTab ? "_blank" : undefined}
                rel={buttonOpenInNewTab ? "noreferrer noopener" : undefined}
                style={{ textDecoration: "none", display: "inline-block" }}
              >
                {buttonElement}
              </a>
            ) : (
              buttonElement
            )}
          </div>
        );
      case "Divider": {
        const dividerStyle = block.dividerStyle || "solid";
        const dividerLineColor = block.dividerLineColor || "#000000";
        const dividerThickness = block.dividerThickness
          ? typeof block.dividerThickness === "number"
            ? `${block.dividerThickness}px`
            : block.dividerThickness
          : "2px";
        const blockStyles = block.dividerBlockStyles || {};
        const blockBackgroundColor =
          blockStyles.backgroundColor || "transparent";
        const paddingTop =
          blockStyles.paddingTop || blockStyles.padding || "20px";
        const paddingBottom =
          blockStyles.paddingBottom || blockStyles.padding || "20px";
        const paddingLeft =
          blockStyles.paddingLeft || blockStyles.padding || "24px";
        const paddingRight =
          blockStyles.paddingRight || blockStyles.padding || "24px";

        return (
          <div
            style={{
              backgroundColor: blockBackgroundColor,
              paddingTop,
              paddingBottom,
              paddingLeft,
              paddingRight,
            }}
          >
            <div
              style={{
                borderTopStyle: dividerStyle,
                borderTopWidth: dividerThickness,
                borderTopColor: dividerLineColor,
                width: "100%",
              }}
            />
          </div>
        );
      }
      case "Spacer": {
        const spacerHeight = block.spacerHeight
          ? typeof block.spacerHeight === "number"
            ? `${block.spacerHeight}px`
            : block.spacerHeight
          : "20px";
        const blockStyles = block.spacerBlockStyles || {};
        const blockBackgroundColor =
          blockStyles.backgroundColor || "transparent";

        return (
          <div
            style={{
              height: spacerHeight,
              backgroundColor: blockBackgroundColor,
            }}
          />
        );
      }
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
    : isImageBlockBackgroundPickerOpen
    ? renderImageBlockBackgroundPicker()
    : isLogoBlockBackgroundPickerOpen
    ? renderLogoBlockBackgroundPicker()
    : isButtonBlockBackgroundPickerOpen
    ? renderButtonBlockBackgroundPicker()
    : isDividerBlockBackgroundPickerOpen
    ? renderDividerBlockBackgroundPicker()
    : isDividerLineColorPickerOpen
    ? renderDividerLineColorPicker()
    : isSpacerBlockBackgroundPickerOpen
    ? renderSpacerBlockBackgroundPicker()
    : isSocialBlockBackgroundPickerOpen
    ? renderSocialBlockBackgroundPicker()
    : isSocialIconColorPickerOpen
    ? renderSocialIconColorPicker()
    : isLayoutBlockBackgroundPickerOpen
    ? renderLayoutBlockBackgroundPicker()
    : isBorderColorPickerOpen
    ? renderBorderColorPicker()
    : isInspectorOpen
    ? isTextBlockSelected
      ? renderTextInspector()
      : isImageBlockSelected
      ? renderImageInspector()
      : isLogoBlockSelected
      ? renderLogoInspector()
      : isButtonBlockSelected
      ? renderButtonInspector()
      : isDividerBlockSelected
      ? renderDividerInspector()
      : isSpacerBlockSelected
      ? renderSpacerInspector()
      : isSocialBlockSelected
      ? renderSocialInspector()
      : isLayoutBlockSelected
      ? renderLayoutInspector()
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
                !isImageBlockBackgroundPickerOpen &&
                !isButtonBlockBackgroundPickerOpen &&
                !isDividerBlockBackgroundPickerOpen &&
                !isDividerLineColorPickerOpen &&
                !isSpacerBlockBackgroundPickerOpen &&
                !isSocialBlockBackgroundPickerOpen &&
                !isSocialIconColorPickerOpen &&
                !isLayoutBlockBackgroundPickerOpen &&
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
                      // {
                      //   key: "Optimize",
                      //   label: "Optimize",
                      //   icon: (cls: string) => (
                      //     <Gauge className={`h-5 w-5 ${cls}`} />
                      //   ),
                      // },
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
                  isImageBlockBackgroundPickerOpen ||
                  isButtonBlockBackgroundPickerOpen ||
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
                <div
                  className="relative"
                  style={{ backgroundColor: emailBackgroundColor }}
                >
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
                      className={`mx-auto w-full flex-1 ${
                        deviceMode === "mobile" ? "max-w-xs" : "max-w-2xl"
                      }`}
                      style={{ backgroundColor: emailBodyColor }}
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
                      className={`mx-auto w-full pt-2 pb-4 flex-1 flex flex-col ${
                        deviceMode === "mobile" ? "max-w-xs" : "max-w-2xl"
                      }`}
                      style={{ backgroundColor: emailBodyColor }}
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
                      className={`mx-auto w-full pt-2 pb-4 flex-1 ${
                        deviceMode === "mobile" ? "max-w-xs" : "max-w-2xl"
                      }`}
                      style={{ backgroundColor: emailBodyColor }}
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
