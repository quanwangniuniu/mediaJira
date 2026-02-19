"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { klaviyoApi } from "@/lib/api/klaviyoApi";
import { KlaviyoDraft } from "@/hooks/useKlaviyoData";
import { DraftActions } from "@/components/email-drafts/DraftActions";
import { DraftCard } from "@/components/email-drafts/DraftCard";
import { EmailDraftCard } from "@/components/email-drafts/EmailDraftCard";
import { DraftSearchBar } from "@/components/email-drafts/DraftSearchBar";
import { EmailDraftListCard } from "@/components/email-drafts/EmailDraftListCard";
import {
  DraftViewToggle,
  DraftView,
} from "@/components/email-drafts/DraftViewToggle";
import Button from "@/components/button/Button";

// Klaviyo drafts page using shared list/card components.
export default function KlaviyoPage() {
  const router = useRouter();
  const [emailDrafts, setEmailDrafts] = useState<KlaviyoDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [viewMode, setViewMode] = useState<DraftView>("card");

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

  // Format short date for listing view (e.g., "Dec 30, 2025")
  const formatShortDate = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "";
    }
  };

  // Format last edited time in the format: "December 31, 2025 at 2:23 AM"
  const formatLastEditedTime = (dateString?: string) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const month = date.toLocaleDateString("en-US", { month: "long" });
      const day = date.getDate();
      const year = date.getFullYear();
      const hours = date.getHours();
      const minutes = date.getMinutes();
      const ampm = hours >= 12 ? "PM" : "AM";
      const displayHours = hours % 12 || 12;
      const displayMinutes = minutes.toString().padStart(2, "0");
      return `${month} ${day}, ${year} at ${displayHours}:${displayMinutes} ${ampm}`;
    } catch {
      return "";
    }
  };

  return (
    <Layout>
      <div className="h-full space-y-6 text-gray-800 bg-white p-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Templates</h1>
          <Button
            onClick={handleCreateDraft}
            disabled={isCreating}
          >
            {isCreating ? "Creating..." : "Create"}
          </Button>
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
          <div className="flex-1 max-w-xs">
            <DraftSearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search"
              containerClassName="w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <DraftViewToggle
              view={viewMode}
              onChange={setViewMode}
              variant="icon"
              cardLabel="Gallery view"
              listLabel="Listing view"
            />
            <select className="border border-gray-300 rounded-md px-3 py-2 text-sm text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
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
        ) : viewMode === "card" ? (
          <EmailDraftCard>
            {filteredEmailDrafts.map((draft: KlaviyoDraft) => {
              const draftName =
                draft.name || draft.subject || "Untitled email template";
              const statusLabel = draft.status
                ? draft.status.charAt(0).toUpperCase() + draft.status.slice(1)
                : "Draft";

                return (
                  <div key={draft.id} className="space-y-3">
                    <DraftCard
                      subject={draftName}
                      previewText={draft.subject || ""}
                      fromName={draft.name ?? undefined}
                      status={draft.status || "draft"}
                      statusLabel={statusLabel}
                      sendTime={draft.updated_at || draft.created_at}
                      recipients={(draft as any).email_draft || 0}
                      type="Email template"
                      menu={
                        <DraftActions
                          onEdit={() => router.push(`/klaviyo/${draft.id}`)}
                          onSend={() => router.push(`/klaviyo/${draft.id}`)}
                          onDelete={() => router.push(`/klaviyo/${draft.id}`)}
                          size="sm"
                          variant="menu"
                        />
                      }
                    />
                  </div>
                );
              })}
          </EmailDraftCard>
        ) : (
          /* Listing View - Table */
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <style>{`
              .drafts-scroll { scrollbar-width: thin; scrollbar-color: #cbd5f5 #f3f4f6; }
              .drafts-scroll::-webkit-scrollbar { width: 4px; }
              .drafts-scroll::-webkit-scrollbar-track { background: #f3f4f6; }
              .drafts-scroll::-webkit-scrollbar-thumb { background: #cbd5f5; border-radius: 999px; }
            `}</style>
            <div className="drafts-scroll max-h-[420px] overflow-y-auto">
              <table className="w-full table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-10 py-1 px-3 text-left">
                    <input type="checkbox" className="accent-emerald-600" />
                  </th>
                  <th className="text-left py-1 px-3 text-sm font-medium text-gray-700">Name</th>
                  <th className="text-left py-1 px-3 text-sm font-medium text-gray-700">Status</th>
                  <th className="text-left py-1 px-3 text-sm font-medium text-gray-700">Audience</th>
                  <th className="text-right py-1 px-3 text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEmailDrafts.map((draft: KlaviyoDraft) => {
                  const draftName =
                    draft.name || draft.subject || "Untitled email template";
                  const lastEditedTime = formatLastEditedTime(draft.updated_at);
                  const titleWithTime = lastEditedTime
                    ? `${lastEditedTime} ${draftName}`
                    : draftName;
                  const createdDate = formatShortDate(draft.created_at);
                  const editedDate = formatShortDate(draft.updated_at);
                  const statusLabel = draft.status
                    ? draft.status.charAt(0).toUpperCase() + draft.status.slice(1)
                    : "Draft";

                  return (
                    <EmailDraftListCard
                      key={draft.id}
                      title={titleWithTime}
                      status={draft.status || "draft"}
                      statusLabel={statusLabel}
                      typeLabel="Email template"
                      dateLabel={`Created ${createdDate} - Edited ${editedDate}`}
                      audienceLabel="-"
                      showActions
                      onTitleClick={() => router.push(`/klaviyo/${draft.id}`)}
                      onEdit={() => router.push(`/klaviyo/${draft.id}`)}
                      onSend={() => router.push(`/klaviyo/${draft.id}`)}
                      onDelete={() => router.push(`/klaviyo/${draft.id}`)}
                    />
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}


