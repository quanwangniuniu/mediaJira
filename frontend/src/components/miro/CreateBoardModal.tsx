"use client";

import React, { useState, useEffect } from "react";
import { ProjectData } from "@/lib/api/projectApi";

interface CreateBoardModalProps {
  open: boolean;
  projects: ProjectData[];
  isCreating: boolean;
  onClose: () => void;
  onCreate: (data: { projectId: number; title: string }) => void;
}

export default function CreateBoardModal({
  open,
  projects,
  isCreating,
  onClose,
  onCreate,
}: CreateBoardModalProps) {
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState<number | "">("");

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setTitle("");
      // Set first project as default if available
      if (projects.length > 0) {
        setProjectId(projects[0].id);
      } else {
        setProjectId("");
      }
    }
  }, [open, projects]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !isCreating) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [open, isCreating, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !projectId) return;
    onCreate({ projectId: projectId as number, title: title.trim() });
  };

  const isValid = title.trim().length > 0 && projectId !== "";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={isCreating ? undefined : onClose}
        />

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-semibold leading-6 text-gray-900 mb-4">
                    Create New Board
                  </h3>
                  <div className="space-y-4">
                    {/* Project Select */}
                    <div>
                      <label
                        htmlFor="project-select"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Project
                      </label>
                      <select
                        id="project-select"
                        value={projectId}
                        onChange={(e) =>
                          setProjectId(
                            e.target.value === "" ? "" : Number(e.target.value)
                          )
                        }
                        disabled={isCreating || projects.length === 0}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      >
                        {projects.length === 0 ? (
                          <option value="">No projects available</option>
                        ) : (
                          projects.map((project) => (
                            <option key={project.id} value={project.id}>
                              {project.name}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                    {/* Title Input */}
                    <div>
                      <label
                        htmlFor="board-title"
                        className="block text-sm font-medium text-gray-700 mb-1"
                      >
                        Board Title
                      </label>
                      <input
                        id="board-title"
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Enter board title"
                        disabled={isCreating}
                        autoFocus
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={!isValid || isCreating}
                className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? (
                  <span className="flex items-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Creating...
                  </span>
                ) : (
                  "Create"
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isCreating}
                className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

