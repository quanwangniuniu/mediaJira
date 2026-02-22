"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { EmailDraftsWorkspace } from "@/components/email-drafts/EmailDraftsWorkspace";
import { klaviyoApi } from "@/lib/api/klaviyoApi";
import { KlaviyoDraft } from "@/hooks/useKlaviyoData";

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

export default function KlaviyoPage() {
  const router = useRouter();
  const [emailDrafts, setEmailDrafts] = useState<KlaviyoDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEmailDrafts = async () => {
      setLoading(true);
      setError(null);
      try {
        const drafts = await klaviyoApi.getEmailDrafts();
        setEmailDrafts(drafts);
      } catch (err: any) {
        console.error("Failed to load Klaviyo email drafts:", err);
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

  const handleDeleteDraft = async (draftId: number, draftTitle: string) => {
    try {
      await klaviyoApi.deleteEmailDraft(draftId);
      setEmailDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
      toast.success(`Deleted "${draftTitle}"`);
    } catch (err) {
      console.error("Failed to delete Klaviyo draft:", err);
      toast.error("Failed to delete email draft. Please try again.");
    }
  };

  const confirmDeleteDraft = (draftId: number, draftTitle: string) => {
    toast(
      (t) => (
        <div className="w-[340px] rounded-xl border border-red-100 bg-white p-4 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-full bg-red-50 p-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-gray-900">
                Delete draft?
              </p>
              <p className="text-sm text-gray-600">
                This will permanently delete{" "}
                <span className="font-semibold">{`"${draftTitle}"`}</span>.
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                void handleDeleteDraft(draftId, draftTitle);
              }}
              className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      ),
      {
        duration: 10000,
        style: {
          padding: 0,
          background: "transparent",
          boxShadow: "none",
          border: "none",
        },
      }
    );
  };

  const drafts = useMemo(
    () =>
      emailDrafts.map((draft) => {
        const createdDate = formatShortDate(draft.created_at);
        const editedDate = formatShortDate(draft.updated_at);
        const statusLabel = draft.status
          ? draft.status.charAt(0).toUpperCase() + draft.status.slice(1)
          : "Draft";

        return {
          id: draft.id,
          title: draft.name || draft.subject || "Untitled email template",
          previewText: draft.subject || "",
          fromName: draft.name || "",
          status: draft.status || "draft",
          statusLabel,
          typeLabel: "Email template",
          sendTime: draft.updated_at || draft.created_at,
          dateLabel: `Created ${createdDate} - Edited ${editedDate}`,
          audienceLabel: "-",
        };
      }),
    [emailDrafts]
  );

  return (
    <Layout>
      <EmailDraftsWorkspace
        pageTitle="Templates"
        searchPlaceholder="Search templates"
        drafts={drafts}
        loading={loading}
        error={error}
        initialView="list"
        loadingMessage="Loading email drafts..."
        emptyStateTitle="No email templates yet."
        emptyStateDescription='Click "Create" to start building your first email template.'
        noSearchResultMessage="No email drafts match your search query."
        onCreate={() => router.push("/klaviyo/templates")}
        onOpen={(draft) => router.push(`/klaviyo/${draft.id}`)}
        onEdit={(draft) => router.push(`/klaviyo/${draft.id}`)}
        onSend={(draft) => router.push(`/klaviyo/${draft.id}`)}
        onDelete={(draft) => confirmDeleteDraft(Number(draft.id), draft.title)}
      />
    </Layout>
  );
}
