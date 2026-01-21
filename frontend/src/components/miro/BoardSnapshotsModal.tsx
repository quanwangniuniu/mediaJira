"use client";

import React, { useState, useEffect } from "react";
import { X, Camera, RotateCcw } from "lucide-react";
import { miroApi, BoardRevision } from "@/lib/api/miroApi";
import { BoardItem } from "@/lib/api/miroApi";
import { Viewport } from "./hooks/useBoardViewport";

interface BoardSnapshotsModalProps {
  open: boolean;
  boardId: string;
  currentViewport: Viewport;
  currentItems: BoardItem[];
  onClose: () => void;
  onRestore: () => void; // Called after successful restore to reload board/items
}

export default function BoardSnapshotsModal({
  open,
  boardId,
  currentViewport,
  currentItems,
  onClose,
  onRestore,
}: BoardSnapshotsModalProps) {
  const [revisions, setRevisions] = useState<BoardRevision[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Load revisions when modal opens
  useEffect(() => {
    if (open) {
      loadRevisions();
    }
  }, [open, boardId]);

  const loadRevisions = async () => {
    setLoading(true);
    setError(null);
    try {
      const revs = await miroApi.listBoardRevisions(boardId, 50);
      setRevisions(revs);
    } catch (err: any) {
      console.error("Failed to load revisions:", err);
      setError(err instanceof Error ? err.message : "Failed to load snapshots");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    setCreating(true);
    setError(null);
    try {
      const snapshot = {
        viewport: {
          x: currentViewport.x,
          y: currentViewport.y,
          zoom: currentViewport.zoom,
        },
        items: currentItems
          .filter((item) => !item.is_deleted)
          .map((item) => ({
            id: item.id,
            type: item.type,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            rotation: item.rotation ?? null,
            style: item.style,
            content: item.content,
            z_index: item.z_index,
            parent_item_id: item.parent_item_id ?? null,
          })),
      };

      await miroApi.createBoardRevision(boardId, {
        snapshot,
        note: note.trim() || undefined,
      });

      setNote("");
      await loadRevisions();
    } catch (err: any) {
      console.error("Failed to create snapshot:", err);
      setError(err instanceof Error ? err.message : "Failed to create snapshot");
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (version: number) => {
    if (
      !confirm(
        `Are you sure you want to restore snapshot version ${version}? This will replace the current board state.`
      )
    ) {
      return;
    }

    setRestoring(version);
    setError(null);
    try {
      await miroApi.restoreBoardRevision(boardId, version);
      onRestore(); // Reload board and items
      onClose();
    } catch (err: any) {
      console.error("Failed to restore snapshot:", err);
      setError(err instanceof Error ? err.message : "Failed to restore snapshot");
    } finally {
      setRestoring(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          {/* Header */}
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-gray-600" />
                <h3 className="text-lg font-semibold leading-6 text-gray-900">
                  Board Snapshots
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-4 py-5 sm:p-6">
            {/* Create Snapshot Section */}
            <div className="mb-6 pb-6 border-b">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Create Snapshot
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional note..."
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !creating) {
                      handleCreateSnapshot();
                    }
                  }}
                />
                <button
                  onClick={handleCreateSnapshot}
                  disabled={creating}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Revisions List */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Snapshots ({revisions.length})
              </label>
              {loading ? (
                <div className="text-center py-8 text-gray-500">Loading snapshots...</div>
              ) : revisions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No snapshots yet. Create one to get started.
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {revisions.map((revision) => (
                    <div
                      key={revision.id}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-gray-900">
                            Version {revision.version}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDate(revision.created_at)}
                          </span>
                        </div>
                        {revision.note && (
                          <div className="text-xs text-gray-600 mt-1">{revision.note}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-1">
                          {revision.snapshot?.items?.length || 0} items
                        </div>
                      </div>
                      <button
                        onClick={() => handleRestore(revision.version)}
                        disabled={restoring === revision.version}
                        className="ml-4 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        {restoring === revision.version ? "Restoring..." : "Restore"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              onClick={onClose}
              className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

