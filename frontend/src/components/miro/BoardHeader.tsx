"use client";

import React from "react";
import { ZoomIn, ZoomOut, Maximize2, Share2, ArrowLeft, Save, Camera, Eye } from "lucide-react";
import { Viewport } from "./hooks/useBoardViewport";
import { useRouter } from "next/navigation";

interface BoardHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  viewport: Viewport;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  shareToken: string;
  onSnapshotClick?: () => void;
  onPreviewClick?: () => void;
}

export default function BoardHeader({
  title,
  onTitleChange,
  viewport,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onSave,
  isSaving = false,
  shareToken,
  onSnapshotClick,
  onPreviewClick,
}: BoardHeaderProps) {
  const router = useRouter();

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/miro/share/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    alert("Share link copied to clipboard!");
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="h-14 border-b bg-white flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <button
          onClick={handleBack}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors p-2 hover:bg-gray-100 rounded"
          title="Back to Boards"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="text-lg font-semibold border-none outline-none bg-transparent"
          onBlur={(e) => onTitleChange(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-2">
        {onSave && (
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`p-2 rounded ml-2 ${
              isSaving ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-100"
            }`}
            title="Save"
          >
            <Save className="w-4 h-4" />
          </button>
        )}
        {onSnapshotClick && (
          <button
            onClick={onSnapshotClick}
            className="p-2 hover:bg-gray-100 rounded"
            title="Snapshots"
          >
            <Camera className="w-4 h-4" />
          </button>
        )}
        {onPreviewClick && (
          <button
            onClick={onPreviewClick}
            className="p-2 hover:bg-gray-100 rounded"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
        )}
        <button
          onClick={onZoomOut}
          className="p-2 hover:bg-gray-100 rounded"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm text-gray-600 min-w-[60px] text-center">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          onClick={onZoomIn}
          className="p-2 hover:bg-gray-100 rounded"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={onFitToScreen}
          className="p-2 hover:bg-gray-100 rounded ml-2"
          title="Fit to Screen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        {/* Share button hidden */}
        {/* <button
          onClick={handleShare}
          className="p-2 hover:bg-gray-100 rounded ml-2"
          title="Share"
        >
          <Share2 className="w-4 h-4" />
        </button> */}
      </div>
    </div>
  );
}

