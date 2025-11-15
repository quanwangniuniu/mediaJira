"use client";
import React from "react";
import {
  ChevronUp,
  ChevronDown,
  Info,
  Image as ImageIcon,
  Type,
  FileText,
  RectangleHorizontal,
  Minus,
  Square,
  Video,
  Share2,
  Hexagon,
  Sparkles,
  ListChecks,
  Code,
  Grid3x3,
  ShoppingBag,
  Heart,
  Columns2,
  Columns3,
  Columns4,
  LucideIcon,
} from "lucide-react";

interface ContentBlock {
  icon: LucideIcon;
  label: string;
  color: string;
  type: string;
}

interface BlankLayout {
  columns: number;
  label: string;
  icon: LucideIcon;
}

interface NavigationSidebarProps {
  activeNav: string;
  contentBlocks: ContentBlock[];
  blankLayouts: BlankLayout[];
  showMoreBlocks: boolean;
  setShowMoreBlocks: (show: boolean) => void;
  showMoreLayouts: boolean;
  setShowMoreLayouts: (show: boolean) => void;
  handleDragStart: (e: React.DragEvent, blockType: string, columns?: number) => void;
}

const NavigationSidebar: React.FC<NavigationSidebarProps> = ({
  activeNav,
  contentBlocks,
  blankLayouts,
  showMoreBlocks,
  setShowMoreBlocks,
  showMoreLayouts,
  setShowMoreLayouts,
  handleDragStart,
}) => {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
      {activeNav === "Add" && (
        <>
          {/* Content Blocks */}
          <div className="p-4">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                CONTENT BLOCKS
              </h3>
              <p className="text-xs text-gray-500">
                Drag to add content to your email
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {(showMoreBlocks ? contentBlocks : contentBlocks.slice(0, 9)).map(
                (block, index) => {
                  const Icon = block.icon;
                  return (
                    <div
                      key={index}
                      draggable
                      onDragStart={(e) => handleDragStart(e, block.type)}
                      className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded hover:border-gray-300 hover:shadow-sm transition-all cursor-move"
                    >
                      <Icon className={`h-6 w-6 text-black mb-1`} />
                      <span className="text-xs text-gray-700 text-center">
                        {block.label}
                      </span>
                    </div>
                  );
                }
              )}
            </div>

            {contentBlocks.length > 9 && (
              <button
                onClick={() => setShowMoreBlocks(!showMoreBlocks)}
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
              >
                {showMoreBlocks ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    Show more
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Blank Layouts */}
          <div className="p-4 border-t border-gray-200">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                BLANK LAYOUTS
              </h3>
              <p className="text-xs text-gray-500">
                Drag to add layouts to your email
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {(showMoreLayouts ? blankLayouts : blankLayouts.slice(0, 3)).map(
                (layout, index) => (
                  <div
                    key={index}
                    draggable
                    onDragStart={(e) =>
                      handleDragStart(e, "Layout", layout.columns)
                    }
                    className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded hover:border-gray-300 hover:shadow-sm transition-all cursor-move"
                  >
                    <div className="flex items-center justify-center mb-2">
                      {React.createElement(layout.icon, {
                        className: "h-5 w-5 text-gray-700",
                      })}
                    </div>
                    <span className="text-sm font-bold text-gray-700">
                      {layout.label}
                    </span>
                  </div>
                )
              )}
            </div>

            {blankLayouts.length > 3 && (
              <button
                onClick={() => setShowMoreLayouts(!showMoreLayouts)}
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1"
              >
                {showMoreLayouts ? (
                  <>
                    <ChevronUp className="h-3 w-3" />
                    Show less
                  </>
                ) : (
                  <>
                    Show more
                    <ChevronDown className="h-3 w-3" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Prebuilt Layouts */}
          <div className="p-4 border-t border-gray-200">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                PREBUILT LAYOUTS
              </h3>
              <p className="text-xs text-gray-500">
                Drag to add layouts to your email
              </p>
            </div>

            <button className="w-full p-3 bg-white border border-gray-200 rounded hover:border-gray-300 hover:shadow-sm transition-all text-left">
              <span className="text-sm text-gray-700">Image & Text</span>
            </button>

            <button className="text-xs text-emerald-600 hover:underline mt-4">
              Show more
            </button>
          </div>
        </>
      )}

      {activeNav === "Styles" && (
        <div className="p-4 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">
              Email Design
            </h3>
            <button className="text-gray-400 hover:text-gray-600">
              <Info className="h-5 w-5" />
            </button>
          </div>

          {[
            "Background",
            "Text",
            "Link",
            "Button",
            "Divider",
            "Image",
            "Logo",
          ].map((section) => (
            <div key={section} className="border-b border-gray-200 pb-3">
              <button className="w-full flex items-center justify-between text-left text-sm font-semibold text-gray-900">
                <span>{section}</span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeNav === "Optimize" && (
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">
            Optimization
          </h3>
          <p className="text-sm text-gray-600">
            Optimization settings will be added here.
          </p>
        </div>
      )}
    </div>
  );
};

export default NavigationSidebar;

