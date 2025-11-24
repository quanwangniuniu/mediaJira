"use client";
import React, { useCallback, useEffect, useState } from "react";
import Layout from "@/components/layout/Layout";
import { TemplateCard } from "@/components/mailchimp/TemplateCard";
import { useRouter } from "next/navigation";
import { ChevronLeft, Loader2, RefreshCcw } from "lucide-react";
import { mailchimpApi, MailchimpTemplate } from "@/lib/api/mailchimpApi";

export default function TemplatePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MailchimpTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingTemplateId, setCreatingTemplateId] = useState<number | null>(
    null
  );

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mailchimpApi.getTemplates();
      setTemplates(data);
    } catch (err: any) {
      console.error("Failed to load templates:", err);
      setError(
        err instanceof Error ? err.message : "Failed to load templates."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleApplyTemplate = async (templateId: number) => {
    setCreatingTemplateId(templateId);
    setError(null);
    try {
      const newDraft = await mailchimpApi.createEmailDraft({
        subject: "Untitled Email",
        from_name: "",
        reply_to: "",
        preview_text: "",
        templateId,
      });
      router.push(`/mailchimp/${newDraft.id}`);
    } catch (err: any) {
      console.error("Failed to create draft from template:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create draft.。"
      );
    } finally {
      setCreatingTemplateId(null);
    }
  };

  const handlePreviewTemplate = (templateId: number) => {
    alert("Template preview is coming soon.");
  };

  return (
    <Layout>
      <div className="h-full space-y-8 text-gray-800 bg-white">
        {/* Header */}
        <div className="flex space-x-4 items-center px-8 pt-8">
          <button
            onClick={() => router.push("/mailchimp")}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="Back to drafts"
          >
            <ChevronLeft />
          </button>
          <div>
          <h1 className="text-2xl font-semibold">Choose your template</h1>
            <p className="text-sm text-gray-500">
              Please choose a base template, we will create a new email draft based on it.
            </p>
          </div>
          <div className="flex-1" />
          <button
            onClick={loadTemplates}
            className="inline-flex items-center space-x-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
          >
            <RefreshCcw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Content */}
        <div className="px-8 pb-8">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500 space-x-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Loading templates...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">
              {error}
            </div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
              No available templates. Please contact the administrator or try again later.
            </div>
          ) : (
            <div className="flex flex-wrap gap-8">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onApply={handleApplyTemplate}
                  onPreview={handlePreviewTemplate}
                  disabled={creatingTemplateId === template.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
