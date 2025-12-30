"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Search, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { klaviyoApi } from "@/lib/api/klaviyoApi";
import { KlaviyoDraft } from "@/hooks/useKlaviyoData";

export default function KlaviyoPage() {
  const router = useRouter();
  const [emailDrafts, setEmailDrafts] = useState<KlaviyoDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  // Load email drafts from backend
  useEffect(() => {
    const loadEmailDrafts = async () => {
      setLoading(true);
      setError(null);
      try {
        const drafts = await klaviyoApi.getEmailDrafts();
        setEmailDrafts(drafts);
      } catch (err: any) {
        console.error("Failed to load Klaviyo email drafts:", err);

        // Handle 401 Unauthorized - redirect to login
        if (err?.status === 401) {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to load email drafts"
        );
      } finally {
        setLoading(false);
      }
    };

    loadEmailDrafts();
  }, []);

  // Handle creating new draft - directly create and open editor
  const handleCreateDraft = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const newDraft = await klaviyoApi.createEmailDraft({
        subject: "Untitled Email",
        status: "draft",
      });
      router.push(`/klaviyo/${newDraft.id}`);
    } catch (err: any) {
      console.error("Failed to create draft:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create draft"
      );
      setIsCreating(false);
    }
  };

  // Filter email drafts based on search query
  const filteredEmailDrafts = emailDrafts.filter((draft: KlaviyoDraft) => {
    if (!searchQuery.trim()) {
      return true;
    }

    const query = searchQuery.toLowerCase().trim();
    const name = (draft.name || "").toLowerCase();
    const subject = (draft.subject || "").toLowerCase();
    const status = (draft.status || "").toLowerCase();

    return (
      name.includes(query) ||
      subject.includes(query) ||
      status.includes(query)
    );
  });

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "No date";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "No date";
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-gray-100 text-gray-600";
      case "sent":
        return "bg-green-100 text-green-700";
      case "scheduled":
        return "bg-blue-100 text-blue-700";
      case "archived":
        return "bg-purple-100 text-purple-700";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <Layout>
      <div className="h-full space-y-6 text-gray-800 bg-white p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Templates</h1>
          <button
            className="bg-black text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-gray-800 disabled:bg-gray-400"
            onClick={handleCreateDraft}
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create"}
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 text-sm">
            <button className="pb-3 border-b-2 border-black font-medium text-black">
              Email: saved
            </button>
            <button className="pb-3 text-gray-500 hover:text-gray-700">
              Email library
            </button>
            <button className="pb-3 text-gray-500 hover:text-gray-700">
              WhatsApp: saved
            </button>
          </div>
        </div>

        {/* Search and View Options */}
        <div className="flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
              placeholder="Search"
              className="w-full border border-gray-300 rounded-md pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 border border-gray-300 rounded-md hover:bg-gray-50">
              <div className="grid grid-cols-2 gap-0.5 w-4 h-4">
                <div className="bg-gray-700 rounded-sm"></div>
                <div className="bg-gray-700 rounded-sm"></div>
                <div className="bg-gray-700 rounded-sm"></div>
                <div className="bg-gray-700 rounded-sm"></div>
              </div>
            </button>
            <button className="p-2 border border-gray-300 rounded-md hover:bg-gray-50">
              <div className="space-y-1 w-4 h-4 flex flex-col justify-center">
                <div className="bg-gray-700 h-0.5 rounded"></div>
                <div className="bg-gray-700 h-0.5 rounded"></div>
                <div className="bg-gray-700 h-0.5 rounded"></div>
              </div>
            </button>
            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <option>Edited most recently</option>
              <option>Created most recently</option>
              <option>Name (A-Z)</option>
              <option>Name (Z-A)</option>
            </select>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-600">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span>Loading email drafts...</span>
          </div>
        ) : filteredEmailDrafts.length === 0 && !searchQuery ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="max-w-md">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No email templates yet
              </h3>
              <p className="text-gray-500 mb-6">
                Click &quot;Create&quot; to start building your first email
                template.
              </p>
              <button
                onClick={handleCreateDraft}
                disabled={isCreating}
                className="bg-emerald-600 text-white rounded-md px-6 py-2 text-sm font-medium hover:bg-emerald-700 disabled:bg-emerald-400"
              >
                {isCreating ? "Creating..." : "Create Your First Email"}
              </button>
            </div>
          </div>
        ) : filteredEmailDrafts.length === 0 && searchQuery ? (
          <div className="text-center py-20 text-gray-500">
            No email drafts match your search query.
          </div>
        ) : (
          /* Cards Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEmailDrafts.map((draft: KlaviyoDraft) => {
              const draftName = draft.name || draft.subject || "Untitled email template";
              const createdDate = formatDate(draft.created_at);
              
              return (
                <div
                  key={draft.id}
                  className="group relative bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                  onClick={() => router.push(`/klaviyo/${draft.id}`)}
                >
                  {/* Card Image/Preview */}
                  <div className="aspect-[4/3] bg-gray-50 flex items-center justify-center border-b border-gray-200">
                    <div className="text-center p-6">
                      <div className="w-16 h-16 mx-auto mb-3 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-xs text-gray-500">Email Template</p>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-4">
                    <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2">
                      {draftName}
                    </h3>
                    <p className="text-xs text-gray-500 mb-2">{createdDate}</p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(draft.status)}`}>
                      {draft.status.charAt(0).toUpperCase() + draft.status.slice(1)}
                    </span>
                  </div>

                  {/* Card Menu */}
                  <button
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-white border border-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-50"
                    onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                      e.stopPropagation();
                      // TODO: Add menu functionality
                    }}
                  >
                    <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="2"/>
                      <circle cx="12" cy="12" r="2"/>
                      <circle cx="12" cy="19" r="2"/>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
