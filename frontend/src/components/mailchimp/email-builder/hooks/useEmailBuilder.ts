import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  CanvasBlock,
  CanvasBlocks,
  TextStyles,
  SelectedBlock,
  HoveredBlock,
  SelectedFileInStudio,
  UploadedFile,
} from "../types";

export const useEmailBuilder = () => {
  // Navigation and UI state
  const [activeNav, setActiveNav] = useState("Add");
  const [activeTab, setActiveTab] = useState("Styles");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [deviceMode, setDeviceMode] = useState<"desktop" | "mobile">("desktop");
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [activeCommentsTab, setActiveCommentsTab] = useState<
    "Open" | "Resolved"
  >("Open");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<
    "Desktop" | "Mobile" | "Inbox"
  >("Desktop");

  // Content blocks state
  const [showMoreBlocks, setShowMoreBlocks] = useState(false);
  const [showMoreLayouts, setShowMoreLayouts] = useState(false);

  // Content Studio state
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
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFileInStudio, setSelectedFileInStudio] =
    useState<SelectedFileInStudio | null>(null);
  const [isAddImageDropdownOpen, setIsAddImageDropdownOpen] = useState(false);

  // Color pickers state
  const [isTextColorPickerOpen, setIsTextColorPickerOpen] = useState(false);
  const [isTextHighlightPickerOpen, setIsTextHighlightPickerOpen] =
    useState(false);

  // Selection state
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<SelectedBlock | null>(
    null
  );
  const [hoveredBlock, setHoveredBlock] = useState<HoveredBlock | null>(null);

  // Canvas blocks state
  const [canvasBlocks, setCanvasBlocks] = useState<CanvasBlocks>({
    header: [],
    body: [],
    footer: [],
  });

  // Inspector state
  const [activeBlockTab, setActiveBlockTab] = useState<
    "Content" | "Styles" | "Visibility"
  >("Styles");
  const [isPaddingLinked, setIsPaddingLinked] = useState(true);
  const [isMarginLinked, setIsMarginLinked] = useState(true);

  // Refs
  const addImageDropdownRef = useRef<HTMLDivElement | null>(null);
  const uploadDropdownRef = useRef<HTMLDivElement | null>(null);

  // Computed values
  const selectedBlockData = useMemo(() => {
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
    !!selectedBlockType && selectedBlockType === "Image";
  const isLogoBlockSelected =
    !!selectedBlockType && selectedBlockType === "Logo";
  const isButtonBlockSelected =
    !!selectedBlockType && selectedBlockType === "Button";
  const isDividerBlockSelected =
    !!selectedBlockType && selectedBlockType === "Divider";
  const isSpacerBlockSelected =
    !!selectedBlockType && selectedBlockType === "Spacer";
  const isSocialBlockSelected =
    !!selectedBlockType && selectedBlockType === "Social";
  const isLayoutBlockSelected =
    !!selectedBlockType && selectedBlockType === "Layout";
  const isSectionSelected = !!selectedSection && !selectedBlock;

  const currentStyles = useMemo(
    () => selectedBlockData?.styles || {},
    [selectedBlockData?.styles]
  );

  // Update functions
  const updateTextBlockStyles = useCallback(
    (section: string, blockId: string, styleUpdates: Partial<TextStyles>) => {
      setCanvasBlocks((prev) => {
        const sectionBlocks = [...prev[section as keyof typeof prev]];
        const blockIndex = sectionBlocks.findIndex((b) => b.id === blockId);
        if (blockIndex === -1) return prev;

        const currentBlock = sectionBlocks[blockIndex];
        const updatedStyles = {
          ...currentBlock.styles,
          ...styleUpdates,
        };

        const updatedBlocks = [...sectionBlocks];
        updatedBlocks[blockIndex] = {
          ...currentBlock,
          styles: updatedStyles,
        };

        return {
          ...prev,
          [section]: updatedBlocks,
        };
      });
    },
    []
  );

  const handleStyleChange = useCallback(
    (styleUpdates: Partial<TextStyles>) => {
      if (!selectedBlock) return;
      let finalUpdates = { ...styleUpdates };
      // Preserve default padding for Heading when changing alignment
      if (
        "textAlign" in styleUpdates &&
        selectedBlockData?.type === "Heading"
      ) {
        const hasAnyPaddingExplicit =
          currentStyles.padding !== undefined ||
          currentStyles.paddingTop !== undefined ||
          currentStyles.paddingRight !== undefined ||
          currentStyles.paddingBottom !== undefined ||
          currentStyles.paddingLeft !== undefined;
        if (!hasAnyPaddingExplicit) {
          finalUpdates.padding = "12px";
        }
      }
      updateTextBlockStyles(
        selectedBlock.section,
        selectedBlock.id,
        finalUpdates
      );
    },
    [selectedBlock, updateTextBlockStyles, selectedBlockData?.type, currentStyles]
  );

  const removeBlock = useCallback((section: string, blockId: string) => {
    setCanvasBlocks((prev) => ({
      ...prev,
      [section]: prev[section as keyof typeof prev].filter(
        (b) => b.id !== blockId
      ),
    }));
  }, []);

  const updateLayoutColumns = useCallback(
    (
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
    },
    []
  );

  // Effects
  useEffect(() => {
    if (!isTextBlockSelected) {
      setActiveBlockTab("Content");
    }
  }, [isTextBlockSelected]);



  useEffect(() => {
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

  useEffect(() => {
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

  return {
    // Navigation and UI state
    activeNav,
    setActiveNav,
    activeTab,
    setActiveTab,
    isPreviewMode,
    setIsPreviewMode,
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

    // Content blocks state
    showMoreBlocks,
    setShowMoreBlocks,
    showMoreLayouts,
    setShowMoreLayouts,

    // Content Studio state
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

    // Color pickers state
    isTextColorPickerOpen,
    setIsTextColorPickerOpen,
    isTextHighlightPickerOpen,
    setIsTextHighlightPickerOpen,

    // Selection state
    selectedSection,
    setSelectedSection,
    selectedBlock,
    setSelectedBlock,
    hoveredBlock,
    setHoveredBlock,

    // Canvas blocks state
    canvasBlocks,
    setCanvasBlocks,

    // Inspector state
    activeBlockTab,
    setActiveBlockTab,
    isPaddingLinked,
    setIsPaddingLinked,
    isMarginLinked,
    setIsMarginLinked,

    // Refs
    addImageDropdownRef,
    uploadDropdownRef,

    // Computed values
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

    // Update functions
    updateTextBlockStyles,
    handleStyleChange,
    removeBlock,
    updateLayoutColumns,
  };
};

