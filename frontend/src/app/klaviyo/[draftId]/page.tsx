"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Layout from "@/components/layout/Layout";
import {
  Monitor,
  Smartphone,
  Undo2,
  Redo2,
  Save,
  Sparkles,
  Image as ImageIcon,
  Type,
  FileText,
  RectangleHorizontal,
  Minus,
  Square,
  Video,
  Share2,
  Hexagon,
  ListChecks,
  Code,
  Grid3x3,
  ShoppingBag,
  Heart,
  Columns2,
  Columns3,
  Columns4,
} from "lucide-react";
import {
  CanvasBlocks,
} from "@/components/mailchimp/email-builder/types";
import { useEmailBuilder } from "@/components/mailchimp/email-builder/hooks/useEmailBuilder";
import { useDragAndDrop } from "@/components/mailchimp/email-builder/hooks/useDragAndDrop";
import { useUndoRedo } from "@/components/mailchimp/email-builder/hooks/useUndoRedo";
import NavigationSidebar from "@/components/mailchimp/email-builder/components/NavigationSidebar";
import SectionBlocks from "@/components/mailchimp/email-builder/components/SectionBlocks";
import PreviewPanel from "@/components/mailchimp/email-builder/components/PreviewPanel";
import { klaviyoApi } from "@/lib/api/klaviyoApi";
import {
  contentBlocksToCanvasBlocks,
  canvasBlocksToContentBlocks,
  createDefaultCanvasBlocks,
} from "@/lib/utils/klaviyoTransform";

type EmailBuilderSnapshot = {
  canvasBlocks: CanvasBlocks;
};

export default function KlaviyoEmailBuilderPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const draftId = params?.draftId
    ? parseInt(params.draftId as string, 10)
    : null;
  const templateId = searchParams?.get("templateId");

  // Save state management
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Load state management
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draftName, setDraftName] = useState<string>("Untitled Email");
  const [draftSubject, setDraftSubject] = useState<string>("Untitled Email");
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempDraftName, setTempDraftName] = useState<string>("Untitled Email");

  // Use custom hooks for state management
  const builderState = useEmailBuilder();
  const {
    activeNav,
    setActiveNav,
    deviceMode,
    setDeviceMode,
    isPreviewOpen,
    setIsPreviewOpen,
    previewTab,
    setPreviewTab,
    showMoreBlocks,
    setShowMoreBlocks,
    showMoreLayouts,
    setShowMoreLayouts,
    canvasBlocks,
    setCanvasBlocks,
    selectedBlock,
    setSelectedBlock,
    setSelectedSection,
    hoveredBlock,
    setHoveredBlock,
    removeBlock,
    updateLayoutColumns,
  } = builderState;

  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  const getCurrentSnapshot = useCallback(
    (): EmailBuilderSnapshot => ({
      canvasBlocks,
    }),
    [canvasBlocks]
  );

  const { saveSnapshot, undo, redo, canUndo, canRedo } =
    useUndoRedo<EmailBuilderSnapshot>({
      initialState: getCurrentSnapshot(),
    });

  const isRestoringRef = useRef(false);
  const hasRecordedInitialRef = useRef(false);
  const lastRecordedSnapshotRef = useRef(JSON.stringify(getCurrentSnapshot()));

  useEffect(() => {
    const snapshot = getCurrentSnapshot();
    const serialized = JSON.stringify(snapshot);

    if (!hasRecordedInitialRef.current) {
      hasRecordedInitialRef.current = true;
      lastRecordedSnapshotRef.current = serialized;
      return;
    }

    if (isRestoringRef.current) {
      isRestoringRef.current = false;
      lastRecordedSnapshotRef.current = serialized;
      return;
    }

    if (serialized === lastRecordedSnapshotRef.current) {
      return;
    }

    lastRecordedSnapshotRef.current = serialized;
    saveSnapshot(snapshot);
  }, [canvasBlocks, saveSnapshot, getCurrentSnapshot]);

  // Define content blocks for the sidebar
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

  const blankLayouts = [
    { columns: 1, label: "1", icon: Square },
    { columns: 2, label: "2", icon: Columns2 },
    { columns: 3, label: "3", icon: Columns3 },
    { columns: 4, label: "4", icon: Columns4 },
  ];

  // Drag and drop handlers
  const {
    handleDragStart,
    handleDragOverDropZone,
    handleDragLeaveDropZone,
    handleDrop,
    dragOverIndex,
  } = useDragAndDrop(setCanvasBlocks);

  // Helper function to update block content
  const updateBlockContent = useCallback(
    (section: string, blockId: string, content: string) => {
      setCanvasBlocks((prev) => {
        const sectionBlocks = [...prev[section as keyof typeof prev]];
        const blockIndex = sectionBlocks.findIndex((b) => b.id === blockId);
        if (blockIndex === -1) return prev;
        const updated = { ...sectionBlocks[blockIndex], content };
        const newBlocks = [...sectionBlocks];
        newBlocks[blockIndex] = updated;
        return { ...prev, [section]: newBlocks } as typeof prev;
      });
    },
    [setCanvasBlocks]
  );

  // Load draft data
  useEffect(() => {
    const loadDraft = async () => {
      if (!draftId) return;

      setIsLoading(true);
      setLoadError(null);

      try {
        const draft = await klaviyoApi.getEmailDraft(draftId);
        setDraftName(draft.name || draft.subject || "Untitled Email");
        setDraftSubject(draft.subject || "Untitled Email");
        setTempDraftName(draft.name || draft.subject || "Untitled Email");

        // If draft has blocks, convert them to canvas blocks
        if (draft.blocks && draft.blocks.length > 0) {
          const convertedBlocks = contentBlocksToCanvasBlocks(draft.blocks);
          setCanvasBlocks(convertedBlocks);
        } else {
          // If no blocks, use default blocks
          const defaultBlocks = createDefaultCanvasBlocks();
          setCanvasBlocks(defaultBlocks);
        }
      } catch (err: any) {
        console.error("Failed to load draft:", err);
        setLoadError(
          err instanceof Error ? err.message : "Failed to load draft"
        );

        if (err?.status === 401) {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadDraft();
  }, [draftId, setCanvasBlocks]);

  // Handle save
  const handleSave = async () => {
    if (!draftId) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      // Convert canvas blocks to content blocks
      const contentBlocks = canvasBlocksToContentBlocks(canvasBlocks);

      // Update the draft using PATCH for partial update
      // Include blocks in the update - backend may need to support this
      await klaviyoApi.patchEmailDraft(draftId, {
        name: draftName,
        subject: draftSubject,
        blocks: contentBlocks,
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to save draft:", err);
      setSaveError(
        err instanceof Error ? err.message : "Failed to save draft"
      );

      if (err?.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Handle name edit
  const handleNameSave = async () => {
    if (!draftId || tempDraftName.trim() === draftName) {
      setIsEditingName(false);
      return;
    }

    try {
      await klaviyoApi.patchEmailDraft(draftId, {
        name: tempDraftName.trim(),
      });
      setDraftName(tempDraftName.trim());
      setIsEditingName(false);
    } catch (err) {
      console.error("Failed to update draft name:", err);
      alert("Failed to update draft name");
      setTempDraftName(draftName);
      setIsEditingName(false);
    }
  };

  // Handle undo
  const handleUndo = useCallback(() => {
    const prevSnapshot = undo();
    if (prevSnapshot) {
      isRestoringRef.current = true;
      setCanvasBlocks(prevSnapshot.canvasBlocks);
    }
  }, [undo, setCanvasBlocks]);

  // Handle redo
  const handleRedo = useCallback(() => {
    const nextSnapshot = redo();
    if (nextSnapshot) {
      isRestoringRef.current = true;
      setCanvasBlocks(nextSnapshot.canvasBlocks);
    }
  }, [redo, setCanvasBlocks]);

  // Handle exit
  const handleExit = () => {
    router.push("/klaviyo");
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      // Cmd/Ctrl + Z to undo
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) handleUndo();
      }
      // Cmd/Ctrl + Shift + Z to redo
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") {
        e.preventDefault();
        if (canRedo) handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave, handleUndo, handleRedo, canUndo, canRedo]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading email draft...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (loadError) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center max-w-md">
            <p className="text-red-600 mb-4">{loadError}</p>
            <button
              onClick={() => router.push("/klaviyo")}
              className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700"
            >
              Back to Drafts
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <div className="flex items-center space-x-4">
          <div className="text-lg font-bold">klaviyo</div>
          {isEditingName ? (
            <input
              type="text"
              value={tempDraftName}
              onChange={(e) => setTempDraftName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleNameSave();
                } else if (e.key === "Escape") {
                  setTempDraftName(draftName);
                  setIsEditingName(false);
                }
              }}
              className="px-2 py-1 border border-gray-300 rounded text-sm"
              autoFocus
            />
          ) : (
            <div
              className="text-sm cursor-pointer hover:bg-gray-100 px-2 py-1 rounded"
              onClick={() => setIsEditingName(true)}
            >
              {draftName}
            </div>
          )}
        </div>

        <button
          onClick={handleExit}
          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md"
        >
          Exit
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 border-r border-gray-200 flex flex-col bg-white">
          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveNav("Add")}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeNav === "Add"
                  ? "border-b-2 border-emerald-600 text-emerald-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Content
            </button>
            <button
              onClick={() => setActiveNav("Styles")}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeNav === "Styles"
                  ? "border-b-2 border-emerald-600 text-emerald-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Styles
            </button>
          </div>

          {/* Navigation Sidebar Content */}
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
        </div>

        {/* Center Canvas Area */}
        <div className="flex-1 flex flex-col bg-gray-50">
          {/* Canvas Header */}
          <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className={`p-2 rounded ${
                  canUndo
                    ? "hover:bg-gray-100 text-gray-700"
                    : "text-gray-300 cursor-not-allowed"
                }`}
                title="Undo (Cmd+Z)"
              >
                <Undo2 className="h-5 w-5" />
              </button>
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className={`p-2 rounded ${
                  canRedo
                    ? "hover:bg-gray-100 text-gray-700"
                    : "text-gray-300 cursor-not-allowed"
                }`}
                title="Redo (Cmd+Shift+Z)"
              >
                <Redo2 className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setDeviceMode("desktop")}
                className={`p-2 rounded ${
                  deviceMode === "desktop"
                    ? "bg-gray-100 text-emerald-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Monitor className="h-5 w-5" />
              </button>
              <button
                onClick={() => setDeviceMode("mobile")}
                className={`p-2 rounded ${
                  deviceMode === "mobile"
                    ? "bg-gray-100 text-emerald-600"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Smartphone className="h-5 w-5" />
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPreviewOpen(true)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Preview & test
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-md hover:bg-emerald-700 disabled:bg-emerald-400 flex items-center space-x-2"
              >
                <Save className="h-4 w-4" />
                <span>{isSaving ? "Saving..." : "Save"}</span>
              </button>
            </div>
          </div>

          {/* Save Status Messages */}
          {saveSuccess && (
            <div className="mx-6 mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              Draft saved successfully!
            </div>
          )}
          {saveError && (
            <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {saveError}
            </div>
          )}

          {/* Canvas */}
          <div className="flex-1 overflow-y-auto p-6">
            <div
              className={`mx-auto bg-white shadow-lg ${
                deviceMode === "desktop" ? "max-w-3xl" : "max-w-md"
              }`}
            >
              <SectionBlocks
                section="header"
                blocks={canvasBlocks.header || []}
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
              <SectionBlocks
                section="body"
                blocks={canvasBlocks.body}
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
              <SectionBlocks
                section="footer"
                blocks={canvasBlocks.footer || []}
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
            </div>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      <PreviewPanel
        isPreviewOpen={isPreviewOpen}
        setIsPreviewOpen={setIsPreviewOpen}
        previewTab={previewTab}
        setPreviewTab={setPreviewTab}
        canvasBlocks={canvasBlocks}
        previewContainerRef={previewContainerRef}
      />
    </div>
  );
}

