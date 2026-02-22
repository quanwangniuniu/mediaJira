"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { AlertTriangle } from "lucide-react";
import Layout from "@/components/layout/Layout";
import { EmailDraftsWorkspace } from "@/components/email-drafts/EmailDraftsWorkspace";
import { mailchimpApi } from "@/lib/api/mailchimpApi";
import { EmailDraft } from "@/hooks/useMailchimpData";

export default function MailchimpPage() {
  const router = useRouter();
  const [emailDrafts, setEmailDrafts] = useState<EmailDraft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadEmailDrafts = async () => {
      setLoading(true);
      setError(null);
      try {
        const drafts = await mailchimpApi.getEmailDrafts();
        setEmailDrafts(drafts);
      } catch (err: any) {
        console.error("Failed to load email drafts:", err);
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
      await mailchimpApi.deleteEmailDraft(draftId);
      setEmailDrafts((prev) => prev.filter((draft) => draft.id !== draftId));
      toast.success(`Deleted "${draftTitle}"`);
    } catch (err) {
      console.error("Failed to delete draft:", err);
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
      emailDrafts.map((draft) => ({
        id: draft.id,
        title:
          draft.settings?.subject_line || draft.subject || "Untitled Email",
        previewText:
          draft.settings?.preview_text || draft.preview_text || "",
        fromName: draft.settings?.from_name || draft.from_name || "",
        status: draft.status || "draft",
        typeLabel: draft.type || "Regular email",
        sendTime: draft.send_time || draft.updated_at,
        recipients: draft.recipients || 0,
      })),
    [emailDrafts]
  );

  return (
    <Layout>
      <EmailDraftsWorkspace
        pageTitle="All Email Drafts"
        searchPlaceholder="Search email drafts"
        drafts={drafts}
        loading={loading}
        error={error}
        initialView="list"
        loadingMessage="Loading email drafts..."
        emptyStateTitle="No email drafts found."
        emptyStateDescription='No email drafts found. Click "Create" to create a new one.'
        noSearchResultMessage="No email drafts match your search query."
        showListPreview
        onCreate={() => router.push("/mailchimp/templates")}
        onOpen={(draft) => router.push(`/mailchimp/${draft.id}`)}
        onEdit={(draft) => router.push(`/mailchimp/${draft.id}`)}
        onSend={(draft) => router.push(`/mailchimp/${draft.id}`)}
        onDelete={(draft) => confirmDeleteDraft(Number(draft.id), draft.title)}
      />
    </Layout>
  );
}
