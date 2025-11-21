"use client";
import React from "react";
import Image from "next/image";
import { X, Play } from "lucide-react";
import { CanvasBlock, PreviewTab } from "../types";

interface PreviewPanelProps {
  isPreviewOpen: boolean;
  setIsPreviewOpen: (open: boolean) => void;
  previewTab: PreviewTab;
  setPreviewTab: (tab: PreviewTab) => void;
  canvasBlocks: {
    header: CanvasBlock[];
    body: CanvasBlock[];
    footer: CanvasBlock[];
  };
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({
  isPreviewOpen,
  setIsPreviewOpen,
  previewTab,
  setPreviewTab,
  canvasBlocks,
}) => {
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
                previewHeadingStyles.backgroundColor || "transparent",
            }}
          >
            {block.content || "Heading text"}
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
                previewParagraphStyles.backgroundColor || "transparent",
            }}
          >
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
        return renderLayoutPreview(block);
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
    </div>
  );

  if (!isPreviewOpen) return null;

  return (
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
            <h2 className="text-xl font-semibold text-gray-900">Preview</h2>
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
          <div className="flex-1 overflow-auto">{renderPreviewEmail()}</div>
          {renderPreviewEmailInfo()}
        </div>
      </div>
    </div>
  );
};

export default PreviewPanel;

