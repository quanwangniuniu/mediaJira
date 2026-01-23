"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { EmailDraftListCard } from "@/components/email-drafts/EmailDraftListCard";
import { DraftActions } from "@/components/email-drafts/DraftActions";
import { DraftCard } from "@/components/email-drafts/DraftCard";
import { EmailDraftCard } from "@/components/email-drafts/EmailDraftCard";
import { DraftSearchBar } from "@/components/email-drafts/DraftSearchBar";
import {
  DraftViewToggle,
  DraftView,
} from "@/components/email-drafts/DraftViewToggle";
import Button from "@/components/button/Button";
import { useRouter } from "next/navigation";
import { mailchimpApi } from "@/lib/api/mailchimpApi";
import { EmailDraft } from "@/hooks/useMailchimpData";

// Mailchimp drafts page composed from shared UI blocks.
export default function MailchimpPage() {
  const router = useRouter();
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [viewMode, setViewMode] = useState<DraftView>("list");

  // Load email drafts from backend
  useEffect(() => {
    const loadEmailDrafts = async () => {
      setLoading(true);
      setError(null);
      try {
        const drafts = await mailchimpApi.getEmailDrafts();
        setEmailDrafts(drafts);
      } catch (err: any) {
        console.error("Failed to load email drafts:", err);

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

  // Handle creating new draft
  const handleCreateDraft = () => {
    router.push("/mailchimp/templates");
  };
  const formatDate = (dateString?: string) => {
    if (!dateString) return "No send date";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return "No send date";
    }
  };

  // Filter email drafts based on search query
  const filteredEmailDrafts = emailDrafts.filter((draft) => {
    if (!searchQuery.trim()) {
      return true;
    }

    const query = searchQuery.toLowerCase().trim();
    const subject = (
      draft.settings?.subject_line ||
      draft.subject ||
      ""
    ).toLowerCase();
    const previewText = (
      draft.settings?.preview_text ||
      draft.preview_text ||
      ""
    ).toLowerCase();
    const fromName = (
      draft.settings?.from_name ||
      draft.from_name ||
      ""
    ).toLowerCase();
    const status = (draft.status || "").toLowerCase();

    return (
      subject.includes(query) ||
      previewText.includes(query) ||
      fromName.includes(query) ||
      status.includes(query)
    );
  });
  const handleDeleteDraft = async (draft: EmailDraft) => {
    if (!confirm("Are you sure you want to delete this email draft?")) {
      return;
    }

    try {
      await mailchimpApi.deleteEmailDraft(draft.id);
      const drafts = await mailchimpApi.getEmailDrafts();
      setEmailDrafts(drafts);
    } catch (err) {
      console.error("Failed to delete draft:", err);
      alert("Failed to delete email draft. Please try again.");
    }
  };

  const previewDraft = filteredEmailDrafts[0];

  return (
    <Layout>
      <div className="h-full space-y-8 text-gray-800 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8">
          <h1 className="text-2xl font-semibold">All Email Drafts</h1>
          <div className="flex space-x-4">
            {/* <button className="border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-100">
              View analytics
            </button> */}
            <Button variant="primary" onClick={handleCreateDraft}>
              Create
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-b px-8 mt-0">
          <DraftViewToggle view={viewMode} onChange={setViewMode} />
        </div>

        {/* Search + Filters */}
        <div className="flex w-full sm:w-1/2 px-8">
          <DraftSearchBar
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search email drafts"
            containerClassName="w-full"
            inputClassName="px-8 pr-10"
            iconClassName="left-10 text-black"
          />
        </div>

        {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pl-8 pr-12">
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div>
              Type:
              <select className="text-blue-600">
                <option>All</option>
                <option>Draft</option>
                <option>Sent</option>
                <option>Scheduled</option>
              </select>
            </div>
            <div>
              Status:
              <select className="text-blue-600">
                <option>All</option>
                <option>Draft</option>
                <option>Sent</option>
                <option>Scheduled</option>
              </select>
            </div>
            <div>
              Folder:
              <select className="text-blue-600">
                <option>All</option>
                <option>Draft</option>
                <option>Sent</option>
                <option>Scheduled</option>
              </select>
            </div>
            <div>
              Date:
              <select className="text-blue-600">
                <option>All</option>
                <option>Draft</option>
                <option>Sent</option>
                <option>Scheduled</option>
              </select>
            </div>
            <button className="text-blue-600 hover:underline">Clear</button>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="relative">
              Sort by:
              <select className="text-blue-600">
                <option>Send date</option>
                <option>Draft</option>
                <option>Sent</option>
                <option>Scheduled</option>
              </select>
              <ArrowDown className="absolute -right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-600 pointer-events-none" />
            </div>
          </div>
        </div> */}

        {viewMode === "list" ? (
          <div className="px-8">
            <style>{`
              .drafts-scroll { scrollbar-width: thin; scrollbar-color: #cbd5f5 #f3f4f6; }
              .drafts-scroll::-webkit-scrollbar { width: 4px; }
              .drafts-scroll::-webkit-scrollbar-track { background: #f3f4f6; }
              .drafts-scroll::-webkit-scrollbar-thumb { background: #cbd5f5; border-radius: 999px; }
            `}</style>
            <div className="drafts-scroll max-h-[420px] overflow-y-auto">
              <table className="w-full text-sm table-fixed">
              <thead className="border-b text-gray-600">
                <tr>
                <th className="w-10 py-1 px-3 text-left">
                  <input type="checkbox" className="accent-emerald-600" />
                </th>
                <th className="py-1 px-3 text-left font-medium">Name</th>
                <th className="py-1 px-3 text-left font-medium">Status</th>
                <th className="py-1 px-3 text-left font-medium">Audience</th>
                <th className="py-1 px-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      Loading email drafts...
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : emailDrafts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      No email drafts found. Click &quot;Create&quot; to create
                      a new one.
                    </td>
                  </tr>
                ) : filteredEmailDrafts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">
                      No email drafts match your search query.
                    </td>
                  </tr>
                ) : (
                  filteredEmailDrafts.map((draft) => {
                    const draftName =
                      draft.settings?.subject_line ||
                      draft.subject ||
                      "Untitled Email";
                    const sendDate = formatDate(
                      draft.send_time || draft.updated_at
                    );

                    return (
                      <EmailDraftListCard
                        key={draft.id}
                        title={draftName}
                        status={draft.status || "draft"}
                        typeLabel={draft.type || "Regular email"}
                        dateLabel={sendDate}
                        recipients={draft.recipients || 0}
                        onTitleClick={() =>
                          router.push(`/mailchimp/${draft.id}`)
                        }
                        onEdit={() => router.push(`/mailchimp/${draft.id}`)}
                        onDelete={() => handleDeleteDraft(draft)}
                        onSend={() => router.push(`/mailchimp/${draft.id}`)}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>
        ) : (
          <div className="px-8">
            {loading ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
                Loading email drafts...
              </div>
            ) : error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center text-red-500">
                {error}
              </div>
            ) : emailDrafts.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
                No email drafts found. Click &quot;Create&quot; to create a new
                one.
              </div>
            ) : filteredEmailDrafts.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center text-gray-500">
                No email drafts match your search query.
              </div>
            ) : (
              <EmailDraftCard>
                {filteredEmailDrafts.map((draft) => {
                  const draftName =
                    draft.settings?.subject_line ||
                    draft.subject ||
                    "Untitled Email";

                  return (
                    <div key={draft.id} className="space-y-3">
                      <DraftCard
                        subject={draftName}
                        previewText={
                          draft.settings?.preview_text ||
                          draft.preview_text ||
                          ""
                        }
                        fromName={draft.settings?.from_name || draft.from_name}
                        status={draft.status || "draft"}
                        sendTime={draft.send_time || draft.updated_at}
                        recipients={draft.recipients}
                        type={draft.type}
                        menu={
                          <DraftActions
                            onEdit={() => router.push(`/mailchimp/${draft.id}`)}
                            onDelete={() => handleDeleteDraft(draft)}
                            onSend={() => router.push(`/mailchimp/${draft.id}`)}
                            size="sm"
                            variant="menu"
                          />
                        }
                      />
                    </div>
                  );
                })}
              </EmailDraftCard>
            )}
          </div>
        )}

        {/* Draft preview */}
        {previewDraft && viewMode === "list" ? (
          <div className="px-8">
            <div className="mb-3 text-sm font-medium text-gray-600">
              Draft preview
            </div>
            <div className="space-y-3">
              <DraftCard
                subject={
                  previewDraft.settings?.subject_line ||
                  previewDraft.subject ||
                  "Untitled Email"
                }
                previewText={
                  previewDraft.settings?.preview_text ||
                  previewDraft.preview_text
                }
                fromName={
                  previewDraft.settings?.from_name || previewDraft.from_name
                }
                status={previewDraft.status || "draft"}
                sendTime={previewDraft.send_time || previewDraft.updated_at}
                recipients={previewDraft.recipients}
                type={previewDraft.type}
                menu={
                  <DraftActions
                    onEdit={() => router.push(`/mailchimp/${previewDraft.id}`)}
                    onDelete={() => handleDeleteDraft(previewDraft)}
                    onSend={() => router.push(`/mailchimp/${previewDraft.id}`)}
                    size="sm"
                    variant="menu"
                  />
                }
              />
            </div>
          </div>
        ) : null}

        {/* Pagination */}
        <div className="flex items-center text-sm text-gray-600 px-8">
          <div className="flex-1"></div>
          <div className="mr-8">
            {loading ? (
              <span>Loading...</span>
            ) : (
              <span>
                Showing results <b>1 - {filteredEmailDrafts.length}</b> of{" "}
                <b>{emailDrafts.length}</b>
                {searchQuery && (
                  <span className="ml-2 text-gray-500">
                    (filtered from {emailDrafts.length} total)
                  </span>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <span>Page</span>
            <div className="rounded-md border px-3 py-1 bg-gray-100">1</div>
            <span>of 1</span>
          </div>
        </div>
      </div>
    </Layout>
  );
}
