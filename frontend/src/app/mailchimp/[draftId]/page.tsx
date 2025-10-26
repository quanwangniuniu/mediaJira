"use client";
import React, { useState } from "react";
import Layout from "@/components/layout/Layout";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function EditPage() {
  const router = useRouter();
  const tabs = ["Dashboard", "Campaigns", "Templates", "Settings"];
  const [activeTab, setActiveTab] = useState(tabs[0]);

  const handleClick = (tab: string) => {
    setActiveTab(tab);
    // onSelect(tab);
  };
  return (
    <Layout>
      <div className="h-full space-y-8 text-gray-800 bg-white">
        {/* Header */}
        <div className="flex space-x-4 items-center px-8 pt-8">
          <button onClick={() => router.push("/mailchimp")}>
            <ChevronLeft />
          </button>
          <h1 className="text-2xl font-semibold">Edit your Email</h1>
        </div>
        <div className="flex">
          {/* Editor nav */}
          <div className="flex-1 w-48 border-r border-gray-300 h-screen p-4 flex flex-col space-y-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => handleClick(tab)}
                className={`text-left px-4 py-2 rounded-lg hover:bg-gray-200 ${
                  activeTab === tab ? "bg-blue-500 text-white" : "text-gray-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          {/* changed part */}
          <div className="flex-2 h-full bg-red-100"></div>
          {/* preview part */}
          <div className="flex-3 h-full"></div>
        </div>
      </div>
    </Layout>
  );
}
