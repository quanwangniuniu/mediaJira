"use client";

import React from "react";
import { ZoomIn, ZoomOut, Maximize2, Share2, ArrowLeft } from "lucide-react";
import { Viewport } from "./hooks/useBoardViewport";
import { useRouter } from "next/navigation";

interface BoardHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  viewport: Viewport;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  shareToken: string;
}

export default function BoardHeader({
  title,
  onTitleChange,
  viewport,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  shareToken,
}: BoardHeaderProps) {
  const router = useRouter();

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/miro/share/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    alert("Share link copied to clipboard!");
  };

  const handleBack = () => {
    router.push("/miro");
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
        <button
          onClick={handleShare}
          className="p-2 hover:bg-gray-100 rounded ml-2"
          title="Share"
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

