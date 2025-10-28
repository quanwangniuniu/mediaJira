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
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function EmailBuilderPage() {
  const router = useRouter();
  const [activeNav, setActiveNav] = useState("Add");
  const [activeTab, setActiveTab] = useState("Styles");
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);

  const contentBlocks = [
    { icon: ImageIcon, label: "Image", color: "text-purple-600" },
    { icon: Type, label: "Heading", color: "text-blue-600" },
    { icon: FileText, label: "Paragraph", color: "text-green-600" },
    { icon: RectangleHorizontal, label: "Button", color: "text-orange-600" },
    { icon: Minus, label: "Divider", color: "text-gray-600" },
    { icon: Square, label: "Spacer", color: "text-pink-600" },
    { icon: Video, label: "Video", color: "text-red-600" },
    { icon: Share2, label: "Social", color: "text-indigo-600" },
    { icon: Hexagon, label: "Logo", color: "text-emerald-600" },
  ];

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
        <div className="flex flex-1">
          {/* Left Sidebar - Navigation + Content */}
          <div className="flex bg-white overflow-hidden">
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
                      {contentBlocks.map((block, index) => {
                        const Icon = block.icon;
                        return (
                          <button
                            key={index}
                            className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded hover:border-gray-300 hover:shadow-sm transition-all"
                          >
                            <Icon className={`h-6 w-6 text-black mb-1`} />
                            <span className="text-xs text-gray-700 text-center">
                              {block.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <button className="text-xs text-emerald-600 hover:underline">
                      Show more
                    </button>
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

              {activeNav === "Help" && (
                <div className="p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">
                    How to use this builder
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This is an email builder tool that allows you to create and
                    customize email templates.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-2">
                    <li>• Drag content blocks to add them to your email</li>
                    <li>• Click on elements to edit them</li>
                    <li>• Use the Styles tab to customize appearance</li>
                    <li>• Use the Optimize tab to improve performance</li>
                  </ul>
                </div>
              )}

              {/* Section Properties Panel - Shows when a section is selected */}
              {selectedSection && (
                <div className="p-4 border-t border-gray-200">
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
              )}
            </div>
          </div>

          {/* Main Canvas Area */}
          <div className="flex-1 flex flex-col bg-gray-50">
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
            <div className="flex-1 overflow-auto rounded-md border">
              <div className="max-w-2xl mx-auto bg-gray-100 shadow-lg">
                {/* Header Section */}
                <div
                  className={`relative border-2 cursor-pointer transition-all ${
                    selectedSection === "header"
                      ? "border-emerald-700"
                      : "border-transparent hover:border-dashed hover:border-emerald-700"
                  }`}
                  onClick={() => setSelectedSection("header")}
                >
                  <span className="absolute left-0 top-2 text-xs font-semibold px-2 -translate-y-1/2 text-emerald-700">
                    Header
                  </span>
                  <div className="mx-8 bg-white pt-2">
                    <div className="px-4 py-2 text-center mt-2">
                      <a href="#" className="text-sm text-blue-600 underline">
                        View this email in your browser
                      </a>
                    </div>
                    <div className="flex justify-center py-6">
                      <div className="w-32 h-32 border-4 border-gray-900 rounded-lg flex items-center justify-center">
                        <span className="text-5xl font-bold text-gray-900">
                          A
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Body Section */}
                <div
                  className={`relative border-2 cursor-pointer transition-all ${
                    selectedSection === "body"
                      ? "border-emerald-700"
                      : "border-transparent hover:border-dashed hover:border-emerald-700"
                  }`}
                  onClick={() => setSelectedSection("body")}
                >
                  <span className="absolute left-0 top-2 text-xs font-semibold px-2 -translate-y-1/2 text-emerald-700">
                    Body
                  </span>
                  <div className="mx-8 bg-white pt-2">
                    <h1 className="text-4xl font-bold text-center text-gray-900 py-6">
                      It&apos;s time to design your email
                    </h1>
                    <p className="text-base text-center text-gray-700 px-8 py-4 leading-relaxed">
                      You can define the layout of your email and give your
                      content a place to live by adding, rearranging, and
                      deleting content blocks.
                    </p>
                    <div className="flex justify-center px-8 py-6">
                      <div className="w-full h-48 bg-amber-50 border border-gray-200 rounded flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 border-2 border-dashed border-gray-400 rounded flex items-center justify-center mx-auto mb-2">
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          </div>
                          <span className="text-sm text-gray-500">Image</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-center px-8 py-4">
                      <button className="px-8 py-3 bg-gray-900 text-white rounded hover:bg-gray-800 transition-colors">
                        Add button text
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div
                  className={`relative border-2 cursor-pointer transition-all ${
                    selectedSection === "footer"
                      ? "border-emerald-700"
                      : "border-transparent hover:border-dashed hover:border-emerald-700"
                  }`}
                  onClick={() => setSelectedSection("footer")}
                >
                  <span className="absolute left-0 top-2 text-xs font-semibold px-2 -translate-y-1/2 text-emerald-700">
                    Footer
                  </span>
                  <div className="mx-8 bg-white pt-2">
                    <div className="h-px bg-gray-300 mb-6"></div>
                    <div className="flex justify-center space-x-4 pb-6">
                      <button className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-800">
                        <span className="text-white text-sm font-bold">f</span>
                      </button>
                      <button className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-800">
                        <span className="text-white text-lg">IG</span>
                      </button>
                      <button className="w-10 h-10 bg-gray-900 rounded-full flex items-center justify-center hover:bg-gray-800">
                        <span className="text-white text-sm font-bold">X</span>
                      </button>
                    </div>
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
