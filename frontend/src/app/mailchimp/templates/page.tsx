"use client";
import React from "react";
import Layout from "@/components/layout/Layout";
import { TemplateCard } from "@/components/mailchimp/TemplateCard";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function TemplatePage() {
  const router = useRouter();
  return (
    <Layout>
      <div className="h-full space-y-8 text-gray-800 bg-white">
        {/* Header */}
        <div className="flex space-x-4 items-center px-8 pt-8">
          <button onClick={() => router.push("/mailchimp")}>
            <ChevronLeft />
          </button>
          <h1 className="text-2xl font-semibold">Choose your template</h1>
        </div>

        {/* Templates */}
        <div className="flex flex-wrap gap-8 px-8 pb-8">
          <TemplateCard />
          <TemplateCard />
          <TemplateCard />
          <TemplateCard />
          <TemplateCard />
          <TemplateCard />
          <TemplateCard />
        </div>
      </div>
    </Layout>
  );
}
