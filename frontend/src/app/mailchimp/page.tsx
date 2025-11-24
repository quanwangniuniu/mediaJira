"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { List, Calendar, Search, ArrowDown } from "lucide-react";
import { EmailDraftListCard } from "@/components/mailchimp/EmailDraftListCard";
import { useRouter } from "next/navigation";
import { mailchimpApi } from "@/lib/api/mailchimpApi";
import { EmailDraft } from "@/hooks/useMailchimpData";

export default function MailchimpPage() {
  const router = useRouter();
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renameLoadingId, setRenameLoadingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

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
  const handleRenameDraft = async (draft: EmailDraft) => {
    const currentName =
      draft.settings?.subject_line || draft.subject || "Untitled Email";
    const newName = prompt("请输入新的邮件名称", currentName);

    if (!newName || newName.trim() === "" || newName.trim() === currentName) {
      return;
    }

    try {
      setRenameLoadingId(draft.id);
      const updatedDraft = await mailchimpApi.patchEmailDraft(draft.id, {
        subject: newName.trim(),
      });

      setEmailDrafts((prev) =>
        prev.map((item) =>
          item.id === draft.id
            ? {
                ...item,
                subject: updatedDraft.settings?.subject_line || newName.trim(),
                settings: {
                  ...item.settings,
                  subject_line:
                    updatedDraft.settings?.subject_line || newName.trim(),
                },
              }
            : item
        )
      );
    } catch (err: any) {
      console.error("Failed to rename draft:", err);
      if (err?.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return;
      }
      alert(
        err instanceof Error
          ? err.message
          : "Failed to rename draft. Please try again."
      );
    } finally {
      setRenameLoadingId(null);
    }
  };

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
            <button
              className="bg-emerald-600 text-white rounded-md px-4 py-2 text-sm hover:bg-emerald-700"
              onClick={handleCreateDraft}
            >
              Create
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-b px-8 mt-0">
          <div className="flex space-x-6 text-sm font-medium">
            <div className="p-1 border-b-2 border-emerald-600">
              <button className="flex items-center rounded-md p-2 text-black hover:bg-gray-100">
                <List className="h-4" />
                List
              </button>
            </div>
            {/* <div className="p-1">
              <button className="flex items-center rounded-md p-2 text-black hover:bg-gray-100">
                <Calendar className="h-4" />
                Calendar
              </button>
            </div> */}
          </div>
        </div>

        {/* Search + Filters */}
        <div className="relative flex w-full sm:w-1/2 px-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search email drafts"
            className="w-full border border-gray-300 rounded-md px-8 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <Search className="absolute left-10 top-1/2 -translate-y-1/2 h-4 w-4 text-black pointer-events-none" />
        </div>

        {/* <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pl-8 pr-12">
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div>
              Type:
              <select className="text-emerald-600">
                <option>All</option>
                <option>Draft</option>
                <option>Sent</option>
                <option>Scheduled</option>
              </select>
            </div>
            <div>
              Status:
              <select className="text-emerald-600">
                <option>All</option>
                <option>Draft</option>
                <option>Sent</option>
                <option>Scheduled</option>
              </select>
            </div>
            <div>
              Folder:
              <select className="text-emerald-600">
                <option>All</option>
                <option>Draft</option>
                <option>Sent</option>
                <option>Scheduled</option>
              </select>
            </div>
            <div>
              Date:
              <select className="text-emerald-600">
                <option>All</option>
                <option>Draft</option>
                <option>Sent</option>
                <option>Scheduled</option>
              </select>
            </div>
            <button className="text-emerald-600 hover:underline">Clear</button>
          </div>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            <div className="relative">
              Sort by:
              <select className="text-emerald-600">
                <option>Send date</option>
                <option>Draft</option>
                <option>Sent</option>
                <option>Scheduled</option>
              </select>
              <ArrowDown className="absolute -right-5 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-600 pointer-events-none" />
            </div>
          </div>
        </div> */}

        {/* Table */}
        <div className="overflow-hidden px-8">
          <table className="w-full text-sm">
            <thead className="border-b text-gray-600">
              <tr>
                <th className="w-10 p-3 text-left">
                  <input type="checkbox" className="accent-emerald-600" />
                </th>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Status</th>
                <th className="p-3 text-left font-medium">Audience</th>
                <th className="p-3 text-left font-medium">Analytics</th>
                <th className="p-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Loading email drafts...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : emailDrafts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No email drafts found. Click &quot;Create&quot; to create a
                    new one.
                  </td>
                </tr>
              ) : filteredEmailDrafts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    No email drafts match your search query.
                  </td>
                </tr>
              ) : (
                filteredEmailDrafts.map((draft) => (
                  <EmailDraftListCard
                    key={draft.id}
                    draft={draft}
                    onDelete={async () => {
                      // Reload drafts after deletion
                      try {
                        const drafts = await mailchimpApi.getEmailDrafts();
                        setEmailDrafts(drafts);
                      } catch (err) {
                        console.error("Failed to reload drafts:", err);
                      }
                    }}
                    onRename={() => handleRenameDraft(draft)}
                    disabled={renameLoadingId === draft.id}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

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
