"use client";
import React from "react";
import Image from "next/image";
import { ChevronLeft, HelpCircle, ChevronDown, Image as ImageIcon, Info } from "lucide-react";
import { CanvasBlock } from "../types";

interface ImageInspectorProps {
  selectedBlockData: CanvasBlock | null;
  activeBlockTab: "Content" | "Styles" | "Visibility";
  setActiveBlockTab: (tab: "Content" | "Styles" | "Visibility") => void;
  setSelectedBlock: (block: { section: string; id: string } | null) => void;
  setIsContentStudioOpen: (open: boolean) => void;
  setIsAddImageDropdownOpen: (open: boolean) => void;
  isAddImageDropdownOpen: boolean;
  addImageDropdownRef: React.RefObject<HTMLDivElement>;
}

const ImageInspector: React.FC<ImageInspectorProps> = ({
  selectedBlockData,
  activeBlockTab,
  setActiveBlockTab,
  setSelectedBlock,
  setIsContentStudioOpen,
  setIsAddImageDropdownOpen,
  isAddImageDropdownOpen,
  addImageDropdownRef,
}) => {
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
};

export default ImageInspector;

