"use client";
import React, { useState } from "react";
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
} from "lucide-react";
import { useRouter } from "next/navigation";

interface CanvasBlock {
  id: string;
  type: string;
  label: string;
  content?: string;
}

export default function EmailBuilderPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("Add");
  const [activeTab, setActiveTab] = useState("Styles");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showMoreBlocks, setShowMoreBlocks] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [dragOverSection, setDragOverSection] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<{
    section: string;
    index: number;
  } | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<{
    section: string;
    id: string;
  } | null>(null);
  const [hoveredBlock, setHoveredBlock] = useState<{
    section: string;
    id: string;
  } | null>(null);
  const [canvasBlocks, setCanvasBlocks] = useState<{
    header: CanvasBlock[];
    body: CanvasBlock[];
    footer: CanvasBlock[];
  }>({
    header: [],
    body: [],
    footer: [],
  });

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

  const handleDragStart = (e: React.DragEvent, blockType: string) => {
    e.dataTransfer.setData("blockType", blockType);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, section: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSection(section);
  };

  const handleDragLeave = () => {
    setDragOverSection(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, section: string, index?: number) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverSection(null);
    setDragOverIndex(null);
    const blockType = e.dataTransfer.getData("blockType");

    if (blockType) {
      const newBlock: CanvasBlock = {
        id: `${blockType}-${Date.now()}`,
        type: blockType,
        label: blockType,
        content: "",
      };

      setCanvasBlocks((prev) => {
        const sectionBlocks = [...prev[section as keyof typeof prev]];
        if (index !== undefined) {
          sectionBlocks.splice(index, 0, newBlock);
        } else {
          sectionBlocks.push(newBlock);
        }
        return {
          ...prev,
          [section]: sectionBlocks,
        };
      });
    }
  };

  const handleDragOverDropZone = (
    e: React.DragEvent,
    section: string,
    index: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    setDragOverIndex({ section, index });
    setDragOverSection(null);
  };

  const handleDragLeaveDropZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Check if we're moving to another element that's not a drop zone
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && !relatedTarget.closest(".drop-zone")) {
      setDragOverIndex(null);
    }
  };

  const renderCanvasBlock = (block: CanvasBlock) => {
    switch (block.type) {
      case "Image":
        return (
          <div className="w-full h-48 bg-amber-50 border border-gray-200 rounded flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-2 border-dashed border-gray-400 rounded flex items-center justify-center mx-auto mb-2">
                <ImageIcon className="h-8 w-8 text-gray-400" />
              </div>
              <span className="text-sm text-gray-500">Image</span>
            </div>
          </div>
        );
      case "Heading":
        return (
          <h2 className="text-2xl font-bold text-gray-900 py-4 text-center">
            {block.content || "Heading"}
          </h2>
        );
      case "Paragraph":
        return (
          <p className="text-base text-gray-700 py-4 text-center">
            {block.content || "Paragraph text"}
          </p>
        );
      case "Button":
        return (
          <div className="flex justify-center py-4">
            <button className="px-6 py-2 bg-gray-900 text-white rounded hover:bg-gray-800">
              {block.content || "Button text"}
            </button>
          </div>
        );
      case "Divider":
        return <div className="h-px bg-gray-300"></div>;
      case "Spacer":
        return <div className="h-8"></div>;
      case "Social":
        return (
          <div className="flex justify-center space-x-4 py-4">
            <button className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">f</span>
            </button>
            <button className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <span className="text-white text-lg">IG</span>
            </button>
            <button className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">X</span>
            </button>
          </div>
        );
      case "CreativeAssistant":
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            <Sparkles className="h-8 w-8 mx-auto mb-2 text-yellow-600" />
            <p className="text-sm font-medium">{block.label}</p>
          </div>
        );
      case "Survey":
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            <ListChecks className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="text-sm font-medium">{block.label}</p>
          </div>
        );
      case "Code":
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            <Code className="h-8 w-8 mx-auto mb-2 text-gray-800" />
            <p className="text-sm font-medium">{block.label}</p>
          </div>
        );
      case "Apps":
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            <Grid3x3 className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <p className="text-sm font-medium">{block.label}</p>
          </div>
        );
      case "Product":
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            <ShoppingBag className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <p className="text-sm font-medium">{block.label}</p>
          </div>
        );
      case "ProductRec":
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            <Heart className="h-8 w-8 mx-auto mb-2 text-pink-600" />
            <p className="text-sm font-medium">{block.label}</p>
          </div>
        );
      default:
        return (
          <div className="py-4 border border-gray-200 rounded p-4 text-center text-gray-600">
            {block.label}
          </div>
        );
    }
  };

  const removeBlock = (section: string, blockId: string) => {
    setCanvasBlocks((prev) => ({
      ...prev,
      [section]: prev[section as keyof typeof prev].filter(
        (b) => b.id !== blockId
      ),
    }));
  };

  const renderDropZone = (section: string, index: number) => {
    const isActive =
      dragOverIndex?.section === section && dragOverIndex?.index === index;
    return (
      <div
        key={`dropzone-${section}-${index}`}
        className={`drop-zone transition-all ${
          isActive
            ? "h-8 bg-emerald-500 border-2 border-emerald-600"
            : "h-0 bg-transparent hover:h-4 hover:bg-emerald-100 border-2 border-transparent"
        } -mx-4`}
        onDragOver={(e) => handleDragOverDropZone(e, section, index)}
        onDragLeave={handleDragLeaveDropZone}
        onDrop={(e) => handleDrop(e, section, index)}
      />
    );
  };

  const renderSectionBlocks = (section: string, blocks: CanvasBlock[]) => {
    if (blocks.length === 0) {
      return (
        <div
          className={`drop-zone py-8 text-center text-sm transition-all ${
            dragOverIndex?.section === section && dragOverIndex?.index === 0
              ? "bg-emerald-100 text-emerald-700 border-2 border-dashed border-emerald-500 rounded"
              : "text-gray-400"
          }`}
          onDragOver={(e) => handleDragOverDropZone(e, section, 0)}
          onDragLeave={handleDragLeaveDropZone}
          onDrop={(e) => handleDrop(e, section, 0)}
        >
          Drag content blocks here
        </div>
      );
    }

    return (
      <div className="space-y-0">
        {/* Drop zone before first block */}
        {renderDropZone(section, 0)}

        {blocks.map((block, index) => (
          <div key={block.id}>
            <div
              className={`relative border transition-all ${
                selectedBlock?.section === section &&
                selectedBlock?.id === block.id
                  ? "border-emerald-700"
                  : "border-transparent hover:border-emerald-700"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedBlock({ section, id: block.id });
                setSelectedSection(null);
              }}
              onMouseEnter={() => {
                setHoveredBlock({ section, id: block.id });
              }}
              onMouseLeave={() => {
                setHoveredBlock(null);
              }}
            >
              {/* label badge */}
              <div
                className={`absolute left-0 top-0 text-[10px] px-2 py-0.5 rounded-br bg-emerald-700 text-white transition-opacity pointer-events-none ${
                  (selectedBlock?.section === section &&
                    selectedBlock?.id === block.id) ||
                  (hoveredBlock?.section === section &&
                    hoveredBlock?.id === block.id)
                    ? "opacity-100"
                    : "opacity-0"
                }`}
              >
                {block.label}
              </div>
              {/* actions */}
              <div
                className={`absolute top-1 right-1 flex items-center gap-1 transition-opacity ${
                  (selectedBlock?.section === section &&
                    selectedBlock?.id === block.id) ||
                  (hoveredBlock?.section === section &&
                    hoveredBlock?.id === block.id)
                    ? "opacity-100"
                    : "opacity-0"
                }`}
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeBlock(section, block.id);
                  }}
                  className="bg-red-500 text-white rounded p-1"
                  aria-label="Remove block"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>

              {renderCanvasBlock(block)}
            </div>
            {/* Drop zone after each block */}
            {renderDropZone(section, index + 1)}
          </div>
        ))}
      </div>
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
    { columns: 1, label: "1" },
    { columns: 2, label: "2" },
    { columns: 3, label: "3" },
  ];

  return (
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
              <span className="text-2xl font-semibold text-gray-900">Test</span>
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
        <div className="flex flex-1 min-h-0">
          {/* Left Sidebar - Navigation + Content */}
          <div className="flex bg-white overflow-hidden min-h-0">
            {/* Left Navigation Column */}
            <div className="w-16 border-r border-gray-200 bg-gray-50 flex flex-col">
              <button
                onClick={() => setActiveNav("Add")}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg ${
                  activeNav === "Add"
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                    activeNav === "Add" ? "bg-white" : "bg-gray-900"
                  }`}
                >
                  <span
                    className={`text-sm font-bold ${
                      activeNav === "Add" ? "text-gray-900" : "text-white"
                    }`}
                  >
                    +
                  </span>
                </div>
                <span className="text-xs font-medium">Add</span>
              </button>

              <button
                onClick={() => setActiveNav("Styles")}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg ${
                  activeNav === "Styles"
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Paintbrush className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Styles</span>
              </button>

              <button
                onClick={() => setActiveNav("Optimize")}
                className={`flex flex-col items-center justify-center py-3 px-2 rounded-lg ${
                  activeNav === "Optimize"
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-200"
                }`}
              >
                <Gauge className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">Optimize</span>
              </button>
            </div>

            {/* Right Content Column */}
            <div className="w-64 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto overflow-x-hidden">
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
                        {(showMoreBlocks
                          ? contentBlocks
                          : contentBlocks.slice(0, 9)
                        ).map((block, index) => {
                          const Icon = block.icon;
                          return (
                            <div
                              key={index}
                              draggable
                              onDragStart={(e) =>
                                handleDragStart(e, block.type)
                              }
                              className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded hover:border-gray-300 hover:shadow-sm transition-all cursor-move"
                            >
                              <Icon className={`h-6 w-6 text-black mb-1`} />
                              <span className="text-xs text-gray-700 text-center">
                                {block.label}
                              </span>
                            </div>
                          );
                        })}
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
                        {blankLayouts.map((layout, index) => (
                          <button
                            key={index}
                            className="flex items-center justify-center p-3 bg-white border border-gray-200 rounded hover:border-gray-300 hover:shadow-sm transition-all"
                          >
                            <span className="text-sm font-bold text-gray-700">
                              {layout.label}
                            </span>
                          </button>
                        ))}
                      </div>

                      <button className="text-xs text-emerald-600 hover:underline">
                        Show more
                      </button>
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
                        <span className="text-sm text-gray-700">
                          Image & Text
                        </span>
                      </button>

                      <button className="text-xs text-emerald-600 hover:underline mt-4">
                        Show more
                      </button>
                    </div>
                  </>
                )}

                {activeNav === "Styles" && (
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900 mb-4">
                      Style Settings
                    </h3>
                    <p className="text-sm text-gray-600">
                      Style settings will be added here.
                    </p>
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

              {/* Section Properties Panel - Shows when a section is selected */}
              {selectedSection && (
                <div
                  className="border-t border-gray-200 overflow-y-auto overflow-x-hidden flex-shrink-0"
                  style={{ maxHeight: "300px" }}
                >
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-semibold text-gray-900 capitalize">
                        {selectedSection} Section
                      </h3>
                      <button
                        onClick={() => setSelectedSection(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Property options */}
                    <div className="space-y-2">
                      <div className="border border-gray-200 rounded">
                        <button className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50">
                          <span>Section Backgrounds</span>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="border border-gray-200 rounded">
                        <button className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50">
                          <span>Text</span>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="border border-gray-200 rounded">
                        <button className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50">
                          <span>Link</span>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="border border-gray-200 rounded">
                        <button className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50">
                          <span>Padding</span>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="border border-gray-200 rounded">
                        <button className="w-full px-3 py-2 text-left text-sm flex items-center justify-between hover:bg-gray-50">
                          <span>Border</span>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <button className="w-full mt-4 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 border border-gray-200 rounded">
                      Clear section styles
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
            {/* View Controls */}
            <div className="flex items-center space-x-4 px-6 py-3 bg-white">
              <div className="flex-1"></div>
              <div className="flex items-center border rounded-md bg-gray-100">
                <button className="py-1 px-2 border rounded-md bg-white">
                  <Monitor className="h-4 w-4 text-emerald-600" />
                </button>
                <button className="py-1 px-2 hover:bg-gray-300 rounded-md">
                  <Smartphone className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <div className="flex items-center space-x-2">
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Undo2 className="h-4 w-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <Redo2 className="h-4 w-4 text-gray-600" />
                </button>
                <button className="p-2 hover:bg-gray-100 rounded">
                  <MessageSquare className="h-4 w-4 text-gray-600" />
                </button>
              </div>
              <button className="px-4 py-2 text-sm text-gray bg-gray-200 rounded-md hover:bg-gray-300">
                Preview
              </button>
            </div>
            {/* Email Canvas */}
            <div className="flex-1 overflow-auto bg-gray-100 rounded-tl-md border">
              <div className="relative">
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
                    className="max-w-2xl mx-auto w-full bg-white pt-2 pb-4 flex-1"
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
                    className="max-w-2xl mx-auto w-full bg-white pt-2 pb-4 flex-1"
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
                    className="max-w-2xl mx-auto w-full bg-white pt-2 pb-4 flex-1"
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
    </Layout>
  );
}
