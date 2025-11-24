"use client";

import { Mail, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { EmailDraft } from "@/hooks/useMailchimpData";
import { useState } from "react";
import { mailchimpApi } from "@/lib/api/mailchimpApi";

type EmailDraftListCardProps = {
  draft: EmailDraft;
  onDelete?: () => void;
  onRename?: (draft: EmailDraft) => void;
  disabled?: boolean;
};

export function EmailDraftListCard({
  draft,
  onDelete,
  onRename,
  disabled = false,
}: EmailDraftListCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  // Format status for display
  const getStatusDisplay = (status: string) => {
    const statusMap: { [key: string]: string } = {
      draft: "Draft",
      scheduled: "Scheduled",
      sent: "Sent",
    };
    return statusMap[status.toLowerCase()] || status;
  };

  const statusDisplay = getStatusDisplay(draft.status || "draft");
  const statusColor =
    statusDisplay === "Draft"
      ? "bg-gray-100 text-gray-600"
      : statusDisplay === "Sent"
      ? "bg-green-100 text-green-700"
      : "bg-blue-100 text-blue-700";

  // Get draft name from subject or settings
  const draftName =
    draft.settings?.subject_line || draft.subject || "Untitled Email";

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "No send date";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString();
    } catch {
      return "No send date";
    }
  };

  const sendDate = formatDate(draft.send_time || draft.updated_at);

  // Handle actions
  const handleAction = async (action: string) => {
    switch (action) {
      case "Edit":
        router.push(`/mailchimp/${draft.id}`);
        break;
      case "Rename":
        if (onRename) {
          onRename(draft);
        }
        break;
      case "Delete":
        if (confirm("Are you sure you want to delete this email draft?")) {
          setIsDeleting(true);
          try {
            await mailchimpApi.deleteEmailDraft(draft.id);
            if (onDelete) {
              onDelete();
            }
          } catch (error) {
            console.error("Failed to delete draft:", error);
            alert("Failed to delete email draft. Please try again.");
          } finally {
            setIsDeleting(false);
          }
        }
        break;
      case "Replicate":
        // TODO: Implement replicate functionality
        alert("Replicate functionality coming soon");
        break;
      default:
        break;
    }
  };

  return (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      {/* Checkbox */}
      <td className="p-3">
        <input type="checkbox" className="accent-emerald-600" />
      </td>

      {/* Name + Type + Date */}
      <td className="p-3">
        <div
          className="font-medium text-emerald-700 hover:underline cursor-pointer"
          onClick={() => router.push(`/mailchimp/${draft.id}`)}
        >
          {draftName}
        </div>
        <div className="text-gray-500 text-xs flex items-center space-x-1">
          <Mail className="h-4" />
          <span>{draft.type || "Regular email"}</span>
        </div>
        <div className="text-gray-400 text-xs">{sendDate}</div>
      </td>

      {/* Status */}
      <td className="p-3">
        <span className={`px-2 py-1 text-xs rounded-full ${statusColor}`}>
          {statusDisplay}
        </span>
      </td>

      {/* Audience */}
      <td className="p-3 text-gray-500">{draft.recipients || 0} recipients</td>

      {/* Analytics */}
      <td className="p-3 text-gray-500">
        {/* TODO: Add analytics data when available */}
      </td>

      {/* Actions */}
      <td className="p-3 text-right">
        <select
          className="border border-gray-300 rounded-md p-2 text-sm hover:bg-gray-50 cursor-pointer"
          onChange={(e) => {
            if (e.target.value) {
              handleAction(e.target.value);
              e.target.value = ""; // Reset select
            }
          }}
          disabled={isDeleting || disabled}
        >
          <option value="">Actions...</option>
          <option value="Edit">Edit</option>
          <option value="View email">View email</option>
          <option value="Rename">Rename</option>
          <option value="Replicate">Replicate</option>
          <option value="Delete">Delete</option>
        </select>
      </td>
    </tr>
  );
}
