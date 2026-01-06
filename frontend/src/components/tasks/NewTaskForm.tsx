"use client";

import { useEffect, useMemo, useState } from "react";
import { CreateTaskData } from "@/types/task";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useProjects } from "@/hooks/useProjects";
import { ProjectAPI } from "@/lib/api/projectApi";

interface NewTaskFormProps {
  onTaskDataChange: (taskData: Partial<CreateTaskData>) => void;
  taskData: Partial<CreateTaskData>;
  validation: ReturnType<typeof useFormValidation<CreateTaskData>>;
}

export default function NewTaskForm({
  onTaskDataChange,
  taskData,
  validation,
}: NewTaskFormProps) {
  const { errors, validateField, clearFieldError, setErrors } = validation;
  const [loadingApprovers, setLoadingApprovers] = useState(false);
  const [approvers, setApprovers] = useState<
    { id: number; username: string; email: string }[]
  >([]);
  const {
    projects,
    loading: loadingProjects,
    error: projectsError,
    fetchProjects,
  } = useProjects();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const activeProjects = useMemo(
    () =>
      projects.filter(
        (project) =>
          project.isActiveResolved ||
          project.is_active ||
          project.derivedStatus === "active"
      ),
    [projects]
  );

  useEffect(() => {
    if (
      taskData.project_id &&
      !activeProjects.some((project) => project.id === taskData.project_id)
    ) {
      onTaskDataChange({ project_id: null });
    }
  }, [activeProjects, onTaskDataChange, taskData.project_id]);

  // Get approvers list
  useEffect(() => {
    const fetchApprovers = async () => {
      // Require a project to be selected before loading approvers
      if (!taskData.project_id) {
        setApprovers([]);
        return;
      }

      try {
        setLoadingApprovers(true);
        console.log(
          "Fetching approvers for project:",
          taskData.project_id
        );

        // Load approvers only from the selected project's members
        const members = await ProjectAPI.getProjectMembers(
          taskData.project_id
        );
        const approverList =
          members?.map((member) => ({
            id: member.user.id,
            username: member.user.username || "",
            email: member.user.email || "",
          })) || [];

        console.log("Fetched approvers for task form:", approverList);
        setApprovers(approverList);
      } catch (error) {
        console.error("Error fetching approvers:", error);
        setApprovers([]);
      } finally {
        setLoadingApprovers(false);
      }
    };

    fetchApprovers();
  }, [taskData.project_id]);

  const handleInputChange = (field: keyof CreateTaskData, value: any) => {
    // Clear error when user starts typing
    if (errors[field as string]) {
      clearFieldError(field);
    }

    // Update taskData in parent component
    onTaskDataChange({ ...taskData, [field]: value });

    // Real-time validation of the field - display error message when user input is invalid
    const error = validateField(field, value);
    if (error && error !== "") {
      // Set error for this field
      setErrors({ ...errors, [field as string]: error });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form validation is handled by parent component
    console.log("Task form submitted");
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {/* Project */}
      <div>
        <label
          htmlFor="task-project"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Project *
        </label>
        <select
          id="task-project"
          name="project_id"
          value={taskData.project_id || ""}
          onChange={(e) =>
            handleInputChange("project_id", Number(e.target.value))
          }
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.project_id ? "border-red-500" : "border-gray-300"
          }`}
          required
          disabled={loadingProjects}
        >
          <option value="" disabled>
            {loadingProjects ? "Loading projects..." : "Select project"}
          </option>
          {activeProjects.map((project) => (
            <option key={project.id} value={project.id}>
              #{project.id} {project.name || "Untitled Project"}
            </option>
          ))}
          {!loadingProjects && activeProjects.length === 0 && (
            <option value="" disabled>
              {projectsError
                ? "Failed to load projects"
                : "No projects available"}
            </option>
          )}
        </select>
        {errors.project_id && (
          <p className="text-red-500 text-sm mt-1">{errors.project_id}</p>
        )}
        {projectsError && (
          <p className="text-red-500 text-sm mt-1">
            Failed to load projects: {projectsError}
          </p>
        )}
      </div>

      {/* Task Type */}
      <div>
        <label
          htmlFor="task-type"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Task Type *
        </label>
        <select
          id="task-type"
          name="type"
          value={taskData.type || ""}
          onChange={(e) =>
            handleInputChange(
              "type",
              e.target.value as "budget" | "asset" | "retrospective"
            )
          }
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.type ? "border-red-500" : "border-gray-300"
          }`}
          required
        >
          <option value="" disabled>
            Select a task type
          </option>
          <option value="budget">Budget Request</option>
          <option value="asset">Asset</option>
          <option value="retrospective">Retrospective</option>
          <option value="report">Report</option>
        </select>
        {errors.type && (
          <p className="text-red-500 text-sm mt-1">{errors.type}</p>
        )}
      </div>

      {/* Summary */}
      <div>
        <label
          htmlFor="task-summary"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Task Summary *
        </label>
        <input
          id="task-summary"
          name="summary"
          type="text"
          value={taskData.summary || ""}
          onChange={(e) => handleInputChange("summary", e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.summary ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Enter a brief task summary"
          required
        />
        {errors.summary && (
          <p className="text-red-500 text-sm mt-1">{errors.summary}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="task-description"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Description
        </label>
        <textarea
          id="task-description"
          name="description"
          value={taskData.description || ""}
          onChange={(e) => handleInputChange("description", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={3}
          placeholder="Enter task description"
        />
      </div>

      {/* Approver */}
      <div>
        <label
          htmlFor="task-approver"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {taskData.type === "budget"
            ? "Assign an approver *"
            : "Assign an approver"}
        </label>
        <select
          id="task-approver"
          name="current_approver_id"
          value={taskData.current_approver_id || ""}
          onChange={(e) =>
            handleInputChange("current_approver_id", Number(e.target.value))
          }
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.current_approver_id ? "border-red-500" : "border-gray-300"
          }`}
          // Only required when task type is 'budget'
          required={taskData.type === "budget"}
        >
          <option value="" disabled>
            {loadingApprovers ? "Loading approvers..." : "Select an approver"}
          </option>
          {approvers &&
            approvers.map((approver) => (
              <option key={approver.id} value={approver.id}>
                {approver.username || approver.email || `User #${approver.id}`}
              </option>
            ))}
          {approvers.length === 0 && (
            <option value="" disabled>
              No approvers found
            </option>
          )}
        </select>
        {errors.current_approver_id && (
          <p className="text-red-500 text-sm mt-1">
            {errors.current_approver_id}
          </p>
        )}
      </div>

      {/* Start Date */}
      <div>
        <label
          htmlFor="task-start-date"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Start Date
        </label>
        <input
          id="task-start-date"
          name="start_date"
          type="date"
          value={taskData.start_date || ""}
          onChange={(e) => handleInputChange("start_date", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Due Date */}
      <div>
        <label
          htmlFor="task-due-date"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Due Date
        </label>
        <input
          id="task-due-date"
          name="due_date"
          type="date"
          value={taskData.due_date || ""}
          onChange={(e) => handleInputChange("due_date", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Hidden submit button for form validation and enter key support */}
      <button type="submit" className="hidden">
        Submit Task Form
      </button>
    </form>
  );
}
