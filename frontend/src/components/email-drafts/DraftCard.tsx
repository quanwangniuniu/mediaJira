"use client";

import React from "react";

// Presentation-only card for draft metadata.
export type DraftCardStatus = "draft" | "scheduled" | "sent" | "error" | string;

export type DraftCardProps = {
  subject: string;
  previewText?: string;
  fromName?: string;
  status?: DraftCardStatus;
  statusLabel?: string;
  sendTime?: string;
  recipients?: number;
  type?: string;
  helperText?: string;
  readOnly?: boolean;
};

// Shared badge styles for common states.
const statusStyles: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  scheduled: "bg-blue-100 text-blue-700",
  sent: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
};

// Default labels when no custom statusLabel is provided.
const statusLabels: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  sent: "Sent",
  error: "Error",
};

// Keep date formatting consistent with the list view.
const formatDate = (dateString?: string) => {
  if (!dateString) return "No send date";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "No send date";
  return date.toLocaleDateString();
};

export function DraftCard({
  subject,
  previewText,
  fromName,
  status = "draft",
  statusLabel,
  sendTime,
  recipients,
  type,
  helperText,
  readOnly = false,
}: DraftCardProps) {
  const normalizedStatus = status.toLowerCase();
  const badgeClass =
    statusStyles[normalizedStatus] ?? "bg-gray-100 text-gray-600";
  const badgeLabel =
    statusLabel ?? statusLabels[normalizedStatus] ?? status.toString();

  return (
    <div
      className={`rounded-lg border bg-white p-4 shadow-sm ${
        readOnly ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="min-w-0 flex-1 truncate text-base font-semibold text-blue-700">
              {subject}
            </h3>
            <span className={`px-2 py-1 text-xs rounded-full ${badgeClass}`}>
              {badgeLabel}
            </span>
          </div>
          {previewText ? (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
              {previewText}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
            <span>From: {fromName || "Unknown sender"}</span>
            <span>Type: {type || "Regular email"}</span>
            <span>Recipients: {recipients ?? 0}</span>
            <span>Send date: {formatDate(sendTime)}</span>
          </div>
          {helperText ? (
            <div className="mt-2 text-xs text-red-600">{helperText}</div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
