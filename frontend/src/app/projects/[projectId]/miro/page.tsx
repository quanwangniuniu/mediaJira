"use client";

import React, { useState, useEffect } from "react";
import Layout from "@/components/layout/Layout";
import { ArrowLeft, Search, Square } from "lucide-react";
import { useRouter, useParams } from "next/navigation";
import { miroApi, MiroBoard } from "@/lib/api/miroApi";
import { ProjectAPI, ProjectData } from "@/lib/api/projectApi";
import CreateBoardModal from "@/components/miro/CreateBoardModal";

export default function ProjectMiroPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.projectId ? Number(params.projectId) : null;

  const [boards, setBoards] = useState<MiroBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renameLoadingId, setRenameLoadingId] = useState<string | null>(null);
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "archived">("active");

  // Load project info
  useEffect(() => {
    const loadProject = async () => {
      if (!projectId) return;
      try {
        const projects = await ProjectAPI.getProjects();
        const foundProject = projects.find((p) => p.id === projectId);
        setProject(foundProject || null);
      } catch (err) {
        console.error("Failed to load project:", err);
      }
    };
    loadProject();
  }, [projectId]);

  // Load boards from backend
  useEffect(() => {
    const loadBoards = async () => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        const boardList = await miroApi.getBoards();
        // Filter boards to only show those for this project
        const projectBoards = boardList.filter(
          (board) => board.project_id === projectId
        );
        setBoards(projectBoards);
      } catch (err: any) {
        console.error("Failed to load boards:", err);

        // Handle 401 Unauthorized - redirect to login
        if (err?.status === 401) {
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          return;
        }

        setError(
          err instanceof Error ? err.message : "Failed to load boards"
        );
      } finally {
        setLoading(false);
      }
    };

    loadBoards();
  }, [projectId]);

  // Handle opening create board modal
  const handleCreateBoard = () => {
    if (!projectId) {
      alert("Project ID is missing.");
      return;
    }
    setIsCreateModalOpen(true);
  };

  // Handle create board submit from modal
  const handleCreateBoardSubmit = async (data: { title: string }) => {
    if (!projectId) {
      alert("Project ID is missing.");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      await miroApi.createBoard({
        project_id: projectId,
        title: data.title,
        viewport: { x: 0, y: 0, zoom: 1.0 },
      });
      // Refresh boards list
      const boardList = await miroApi.getBoards();
      const projectBoards = boardList.filter(
        (board) => board.project_id === projectId
      );
      setBoards(projectBoards);
      // Close modal on success
      setIsCreateModalOpen(false);
    } catch (err: any) {
      console.error("Failed to create board:", err);
      setError(
        err instanceof Error ? err.message : "Failed to create board"
      );
    } finally {
      setIsCreating(false);
    }
  };

  // Split boards by archive status
  const activeBoards = boards.filter((board) => !board.is_archived);
  const archivedBoards = boards.filter((board) => board.is_archived);

  // Filter boards based on active tab and search query
  const boardsToShow = activeTab === "active" ? activeBoards : archivedBoards;
  const filteredBoards = boardsToShow.filter((board) => {
    if (!searchQuery.trim()) {
      return true;
    }

    const query = searchQuery.toLowerCase().trim();
    const title = (board.title || "").toLowerCase();

    return title.includes(query);
  });

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "No date";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return "No date";
    }
  };

  // Handle rename board
  const handleRenameBoard = async (board: MiroBoard) => {
    // Prevent renaming archived boards
    if (board.is_archived) {
      alert("Cannot rename archived boards.");
      return;
    }

    const currentName = board.title || "Untitled Board";
    const newName = prompt("Enter new board name:", currentName);

    if (!newName || newName.trim() === "" || newName.trim() === currentName) {
      return;
    }

    try {
      setRenameLoadingId(board.id);
      await miroApi.updateBoard(board.id, {
        title: newName.trim(),
      });

      setBoards((prev) =>
        prev.map((item) =>
          item.id === board.id ? { ...item, title: newName.trim() } : item
        )
      );
    } catch (err: any) {
      console.error("Failed to rename board:", err);
      if (err?.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return;
      }
      alert(
        err instanceof Error
          ? err.message
          : "Failed to rename board. Please try again."
      );
    } finally {
      setRenameLoadingId(null);
    }
  };

  // Handle delete board
  const handleDeleteBoard = async (board: MiroBoard) => {
    // Prevent deleting archived boards
    if (board.is_archived) {
      alert("Cannot delete archived boards.");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to delete "${board.title}"? This will archive the board.`
      )
    ) {
      return;
    }

    try {
      setDeleteLoadingId(board.id);
      await miroApi.deleteBoard(board.id);
      // Reload boards after deletion
      const boardList = await miroApi.getBoards();
      const projectBoards = boardList.filter(
        (board) => board.project_id === projectId
      );
      setBoards(projectBoards);
    } catch (err: any) {
      console.error("Failed to delete board:", err);
      if (err?.status === 401) {
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return;
      }
      alert(
        err instanceof Error
          ? err.message
          : "Failed to delete board. Please try again."
      );
    } finally {
      setDeleteLoadingId(null);
    }
  };

  // Handle action menu
  const handleAction = async (action: string, board: MiroBoard) => {
    switch (action) {
      case "Open":
        router.push(`/miro/${board.id}`);
        break;
      case "Rename":
        await handleRenameBoard(board);
        break;
      case "Delete":
        await handleDeleteBoard(board);
        break;
      default:
        break;
    }
  };

  if (!projectId) {
    return (
      <Layout>
        <div className="h-full space-y-8 text-gray-800 bg-white">
          <div className="px-8 pt-8">
            <p className="text-red-500">Invalid project ID</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full space-y-8 text-gray-800 bg-white">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/projects")}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              title="Back to Projects"
            >
              <ArrowLeft className="h-4 w-4" />
              Projects
            </button>
            <h1 className="text-2xl font-semibold">
              {project ? `${project.name} - Boards` : "Boards"}
            </h1>
          </div>
          <div className="flex space-x-4">
            <button
              className="bg-blue-600 text-white rounded-md px-4 py-2 text-sm hover:bg-blue-700 disabled:bg-blue-400"
              onClick={handleCreateBoard}
            >
              Create
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-b px-8 mt-0">
          <div className="flex space-x-6 text-sm font-medium">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === "active"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setActiveTab("archived")}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === "archived"
                  ? "border-blue-600 text-blue-600 font-semibold"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative flex w-full sm:w-1/2 px-8">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search boards"
            className="w-full border border-gray-300 rounded-md px-8 pr-10 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="absolute left-10 top-1/2 -translate-y-1/2 h-4 w-4 text-black pointer-events-none" />
        </div>

        {/* Table */}
        <div className="overflow-hidden px-8">
          <table className="w-full text-sm">
            <thead className="border-b text-gray-600">
              <tr>
                <th className="w-10 p-3 text-left">
                  <input type="checkbox" className="accent-blue-600" />
                </th>
                <th className="p-3 text-left font-medium">Name</th>
                <th className="p-3 text-left font-medium">Created</th>
                <th className="p-3 text-left font-medium">Updated</th>
                <th className="p-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    Loading boards...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-red-500">
                    {error}
                  </td>
                </tr>
              ) : boardsToShow.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    {activeTab === "active"
                      ? 'No active boards found. Click "Create" to create a new one.'
                      : "No archived boards found."}
                  </td>
                </tr>
              ) : filteredBoards.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No boards match your search query.
                  </td>
                </tr>
              ) : (
                filteredBoards.map((board) => (
                  <tr
                    key={board.id}
                    className="border-b hover:bg-gray-50 transition-colors"
                  >
                    {/* Checkbox */}
                    <td className="p-3">
                      <input type="checkbox" className="accent-blue-600" />
                    </td>

                    {/* Name */}
                    <td className="p-3">
                      <div
                        className="font-medium text-blue-700 hover:underline cursor-pointer flex items-center gap-2"
                        onClick={() => router.push(`/miro/${board.id}`)}
                      >
                        <Square className="h-4 w-4" />
                        {board.title || "Untitled Board"}
                      </div>
                    </td>

                    {/* Created */}
                    <td className="p-3 text-gray-500">
                      {formatDate(board.created_at)}
                    </td>

                    {/* Updated */}
                    <td className="p-3 text-gray-500">
                      {formatDate(board.updated_at)}
                    </td>

                    {/* Actions */}
                    <td className="p-3 text-right">
                      <select
                        className="bg-blue-600 text-white rounded-md p-2 text-sm hover:bg-blue-700 cursor-pointer disabled:bg-gray-400 disabled:cursor-not-allowed"
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAction(e.target.value, board);
                            e.target.value = ""; // Reset select
                          }
                        }}
                        disabled={
                          renameLoadingId === board.id ||
                          deleteLoadingId === board.id
                        }
                      >
                        <option value="">Actions</option>
                        <option value="Open">Open</option>
                        {!board.is_archived && (
                          <>
                            <option value="Rename">Rename</option>
                            <option value="Delete">Delete</option>
                          </>
                        )}
                      </select>
                    </td>
                  </tr>
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
                Showing results <b>1 - {filteredBoards.length}</b> of{" "}
                <b>{boardsToShow.length}</b>
                {searchQuery && (
                  <span className="ml-2 text-gray-500">
                    (filtered from {boardsToShow.length} total)
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

        {/* Create Board Modal */}
        <CreateBoardModal
          open={isCreateModalOpen}
          projectId={projectId}
          projectName={project?.name}
          isCreating={isCreating}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateBoardSubmit}
        />
      </div>
    </Layout>
  );
}

