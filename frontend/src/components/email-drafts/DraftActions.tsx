"use client";

import React from "react";

// Action button group used by list rows and cards.
// Action buttons kept decoupled from any draft card layout.
export type DraftActionsProps = {
  onEdit?: () => void;
  onSend?: () => void;
  onDelete?: () => void;
  editDisabled?: boolean;
  sendDisabled?: boolean;
  deleteDisabled?: boolean;
  deleteLoading?: boolean;
  size?: "sm" | "md";
};

export function DraftActions({
  onEdit,
  onSend,
  onDelete,
  editDisabled = false,
  sendDisabled = false,
  deleteDisabled = false,
  deleteLoading = false,
  size = "md",
}: DraftActionsProps) {
  // Size variants are shared across button group.
  const base =
    size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  const buttonClass = `rounded-md font-medium ${base}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className={`${buttonClass} bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`}
        onClick={onEdit}
        disabled={editDisabled}
      >
        Edit
      </button>
      <button
        type="button"
        className={`${buttonClass} bg-white border border-red-200 text-red-600 hover:bg-red-50 ${
          deleteLoading || deleteDisabled ? "opacity-70 cursor-not-allowed" : ""
        }`}
        onClick={onDelete}
        disabled={deleteLoading || deleteDisabled}
        aria-busy={deleteLoading}
      >
        {deleteLoading ? "Deleting..." : "Delete"}
      </button>
      <button
        type="button"
        className={`${buttonClass} bg-blue-600 text-white hover:bg-blue-700 ${
          sendDisabled ? "opacity-60 cursor-not-allowed" : ""
        }`}
        onClick={onSend}
        disabled={sendDisabled}
      >
        Send
      </button>
    </div>
  );
}
