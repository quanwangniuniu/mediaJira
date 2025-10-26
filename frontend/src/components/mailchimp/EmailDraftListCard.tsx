"use client";

import { Mail, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";

export function EmailDraftListCard({ draft }: { draft: any }) {
  const router = useRouter();
  const statusColor =
    draft.status === "Draft"
      ? "bg-gray-100 text-gray-600"
      : draft.status === "Sent"
      ? "bg-green-100 text-green-700"
      : "bg-blue-100 text-blue-700";

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
          onClick={() => router.push("../../mailchimp/[draftId]")}
        >
          {draft.name}
        </div>
        <div className="text-gray-500 text-xs flex items-center space-x-1">
          <Mail className="h-4" />
          <span>{draft.type}</span>
        </div>
        <div className="text-gray-400 text-xs">{draft.sendDate}</div>
      </td>

      {/* Status */}
      <td className="p-3">
        <span className={`px-2 py-1 text-xs rounded-full ${statusColor}`}>
          {draft.status}
        </span>
      </td>

      {/* Audience */}
      <td className="p-3 text-gray-500"></td>

      {/* Analytics */}
      <td className="p-3 text-gray-500"></td>

      {/* Actions */}
      <td className="p-3 text-right">
        <button className="hover:bg-gray-100 p-1 rounded transition-colors">
          <select className="border border-gray-300 rounded-md p-2 text-sm">
            <option>Edit</option>
            <option>View email</option>
            <option>Rename</option>
            <option>Replicate</option>
            <option>Delete</option>
          </select>
        </button>
      </td>
    </tr>
  );
}
