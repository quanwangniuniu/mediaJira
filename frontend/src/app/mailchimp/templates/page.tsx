"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  Loader2,
  RefreshCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import Layout from "@/components/layout/Layout";
import { TemplateCard } from "@/components/mailchimp/TemplateCard";
import { mailchimpApi, MailchimpTemplate } from "@/lib/api/mailchimpApi";

const normalizeCategory = (template: MailchimpTemplate) => {
  const category = template.category?.trim();
  return category && category.length > 0 ? category : "Uncategorized";
};

export default function MailchimpTemplatePage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<MailchimpTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingTemplateId, setCreatingTemplateId] = useState<number | null>(
    null
  );

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [onlyWithThumbnail, setOnlyWithThumbnail] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await mailchimpApi.getTemplates();
      setTemplates(data);
    } catch (err: any) {
      console.error("Failed to load templates:", err);
      setError(err instanceof Error ? err.message : "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const sharedTemplates = useMemo(
    () => templates.filter((template) => template.user == null),
    [templates]
  );

  const categories = useMemo(() => {
    const categoryMap = new Map<string, number>();
    sharedTemplates.forEach((template) => {
      const category = normalizeCategory(template);
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + 1);
    });
    return Array.from(categoryMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, count]) => ({ label, count }));
  }, [sharedTemplates]);

  const filteredTemplates = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return sharedTemplates.filter((template) => {
      const category = normalizeCategory(template);
      const categoryMatched =
        selectedCategories.length === 0 || selectedCategories.includes(category);
      if (!categoryMatched) return false;
      if (onlyWithThumbnail && !template.thumbnail) return false;
      if (!query) return true;
      const searchable = `${template.name} ${category} ${
        template.description ?? ""
      }`.toLowerCase();
      return searchable.includes(query);
    });
  }, [onlyWithThumbnail, searchQuery, selectedCategories, sharedTemplates]);

  const recommendedTemplateId = filteredTemplates[0]?.id ?? null;

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setOnlyWithThumbnail(false);
  };

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
      setError(err instanceof Error ? err.message : "Failed to create draft.");
    } finally {
      setCreatingTemplateId(null);
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearchQuery("");
  };

  return (
    <Layout>
      <div className="min-h-screen bg-white text-gray-800">
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-4 px-6 py-6 lg:px-8">
            <button
              onClick={() => router.push("/mailchimp")}
              className="rounded-full border border-gray-200 p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Back to drafts"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="min-w-[220px]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-blue-600">
                Create Email
              </p>
              <h1 className="text-2xl font-semibold">Choose a template</h1>
              <p className="text-sm text-gray-500">
                Search, filter, preview, and start from a template.
              </p>
            </div>
            <div className="flex-1" />
            <button
              onClick={loadTemplates}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              <RefreshCcw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div className="mx-auto max-w-[1440px] space-y-5 px-6 py-8 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              {loading
                ? "Loading templates..."
                : `Showing ${filteredTemplates.length} of ${sharedTemplates.length} templates`}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleSearch();
                  }}
                  className="w-full rounded-md border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  placeholder="Search templates"
                />
              </div>
              <button
                type="button"
                onClick={handleSearch}
                className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Search
              </button>
              <button
                type="button"
                onClick={() => setIsFilterOpen((prev) => !prev)}
                className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
              </button>
              {(searchQuery || selectedCategories.length > 0 || onlyWithThumbnail) && (
                <button
                  type="button"
                  onClick={() => {
                    clearSearch();
                    clearFilters();
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2.5 py-2 text-sm text-gray-600 hover:bg-gray-50"
                >
                  <X className="h-4 w-4" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {isFilterOpen ? (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="mb-3 text-sm font-semibold text-gray-700">
                Filter templates
              </div>
              <div className="flex flex-wrap gap-3">
                {categories.map((category) => {
                  const selected = selectedCategories.includes(category.label);
                  return (
                    <button
                      key={category.label}
                      type="button"
                      onClick={() => toggleCategory(category.label)}
                      className={`rounded-full border px-3 py-1 text-xs ${
                        selected
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {category.label} ({category.count})
                    </button>
                  );
                })}
              </div>
              <label className="mt-4 flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={onlyWithThumbnail}
                  onChange={(event) => setOnlyWithThumbnail(event.target.checked)}
                  className="accent-blue-600"
                />
                Only show templates with thumbnail
              </label>
            </div>
          ) : null}

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
              <Sparkles className="h-4 w-4" />
              Flow
            </div>
            <p className="mt-2 text-xs text-blue-700">
              Click <b>Preview</b> to open the template preview page. Click{" "}
              <b>Start</b> to create a draft and enter editor.
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="ml-3">Loading templates...</span>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-600">
              {error}
            </div>
          ) : sharedTemplates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
              No available templates. Please contact the administrator or try again
              later.
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
              No templates match current search/filter conditions.
            </div>
          ) : (
            <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(248px,1fr))]">
              {filteredTemplates.map((template) => (
                <div key={template.id} className="w-[248px] justify-self-center space-y-2">
                  <div className="h-6">
                    {template.id === recommendedTemplateId ? (
                      <span className="inline-flex w-fit items-center rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                        Best match
                      </span>
                    ) : null}
                  </div>
                  <TemplateCard
                    template={template}
                    onApply={handleApplyTemplate}
                    onPreview={() =>
                      router.push(`/mailchimp/templates/preview/${template.id}`)
                    }
                    disabled={creatingTemplateId === template.id}
                  />
                  <p className="text-xs text-gray-500">
                    {template.description || "No description provided."}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}



