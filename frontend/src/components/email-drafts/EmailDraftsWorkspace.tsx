"use client";

import React, { useState, useMemo } from "react";
import { DraftViewToggle, type DraftView } from "./DraftViewToggle";
import { DraftSearchBar } from "./DraftSearchBar";
import { EmailDraftListCard } from "./EmailDraftListCard";
import { DraftCard } from "./DraftCard";
import { DraftActions } from "./DraftActions";
import Button from "@/components/button/Button";

export type EmailDraftWorkspaceDraft = {
  id: string | number;
  title: string;
  previewText?: string;
  fromName?: string;
  status?: string;
  statusLabel?: string;
  typeLabel?: string;
  sendTime?: string;
  dateLabel?: string;
  recipients?: number;
  audienceLabel?: string;
};

export type EmailDraftsWorkspaceProps = {
  pageTitle: string;
  searchPlaceholder?: string;
  drafts: EmailDraftWorkspaceDraft[];
  loading?: boolean;
  error?: string | null;
  initialView?: DraftView;
  loadingMessage?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  noSearchResultMessage?: string;
  showListPreview?: boolean;
  onCreate: () => void;
  onOpen: (draft: EmailDraftWorkspaceDraft) => void;
  onEdit: (draft: EmailDraftWorkspaceDraft) => void;
  onSend: (draft: EmailDraftWorkspaceDraft) => void;
  onDelete: (draft: EmailDraftWorkspaceDraft) => void;
};

export function EmailDraftsWorkspace({
  pageTitle,
  searchPlaceholder = "Search email drafts",
  drafts,
  loading = false,
  error = null,
  initialView = "list",
  loadingMessage = "Loading email drafts...",
  emptyStateTitle = "No email drafts found.",
  emptyStateDescription = 'Click "Create" to create a new email draft.',
  noSearchResultMessage = "No email drafts match your search query.",
  showListPreview = false,
  onCreate,
  onOpen,
  onEdit,
  onSend,
  onDelete,
}: EmailDraftsWorkspaceProps) {
  const [view, setView] = useState<DraftView>(initialView);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDrafts = useMemo(() => {
    if (!searchQuery.trim()) return drafts;
    const query = searchQuery.toLowerCase();
    return drafts.filter(
      (draft) =>
        draft.title.toLowerCase().includes(query) ||
        draft.previewText?.toLowerCase().includes(query) ||
        draft.fromName?.toLowerCase().includes(query) ||
        draft.typeLabel?.toLowerCase().includes(query)
    );
  }, [drafts, searchQuery]);

  if (loading) {
    return (
      <div className="h-full space-y-8 text-gray-800 bg-white p-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full space-y-8 text-gray-800 bg-white p-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 font-semibold">Error</p>
            <p className="text-gray-500 mt-2">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = filteredDrafts.length === 0;
  const isSearchResult = searchQuery.trim() !== "" && isEmpty;

  return (
    <div className="h-full space-y-8 text-gray-800 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-8 pt-8">
        <h1 className="text-2xl font-semibold">{pageTitle}</h1>
        <div className="flex space-x-4">
          <Button variant="primary" size="md" onClick={onCreate}>
            Create
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="border-t border-b px-8">
        <DraftViewToggle view={view} onChange={setView} />
      </div>

      {/* Search */}
      <div className="flex w-full sm:w-1/2 px-8">
        <DraftSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={searchPlaceholder}
          containerClassName="w-full"
          inputClassName="px-8 pr-10"
          iconClassName="left-10 text-black"
        />
      </div>

      {/* Content */}
      <div className="px-8 pb-8">
        {isEmpty ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-gray-900 font-semibold text-lg">
                {isSearchResult ? noSearchResultMessage : emptyStateTitle}
              </p>
              {!isSearchResult && (
                <p className="text-gray-500 mt-2">{emptyStateDescription}</p>
              )}
            </div>
          </div>
        ) : view === "list" ? (
          <div className="max-w-5xl">
            <table className="w-full text-sm table-fixed">
              <thead className="border-b text-gray-600">
                <tr>
                  <th className="w-10 p-3 text-left">
                    <input type="checkbox" className="accent-blue-600" />
                  </th>
                  <th className="p-3 text-left font-medium">Name</th>
                  <th className="p-3 text-left font-medium">Status</th>
                  <th className="p-3 text-left font-medium">Audience</th>
                  <th className="p-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrafts.map((draft) => (
                  <EmailDraftListCard
                    key={draft.id}
                    title={draft.title}
                    status={draft.status}
                    statusLabel={draft.statusLabel}
                    typeLabel={draft.typeLabel}
                    date={draft.sendTime}
                    dateLabel={draft.dateLabel}
                    recipients={draft.recipients}
                    audienceLabel={draft.audienceLabel}
                    onTitleClick={() => onOpen(draft)}
                    onEdit={() => onEdit(draft)}
                    onDelete={() => onDelete(draft)}
                    onSend={() => onSend(draft)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDrafts.map((draft) => (
              <DraftCard
                key={draft.id}
                subject={draft.title}
                previewText={draft.previewText}
                fromName={draft.fromName}
                status={draft.status}
                statusLabel={draft.statusLabel}
                type={draft.typeLabel}
                sendTime={draft.sendTime}
                recipients={draft.recipients}
                onSubjectClick={() => onOpen(draft)}
                menu={
                  <DraftActions
                    onEdit={() => onEdit(draft)}
                    onDelete={() => onDelete(draft)}
                    onSend={() => onSend(draft)}
                    size="sm"
                    variant="icons"
                  />
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

