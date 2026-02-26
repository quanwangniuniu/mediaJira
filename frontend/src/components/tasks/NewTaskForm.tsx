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
  lockProject?: boolean;
  projectName?: string | null;
}

export default function NewTaskForm({
  onTaskDataChange,
  taskData,
  validation,
  lockProject = false,
  projectName = null,
}: NewTaskFormProps) {
  const { errors, validateField, clearFieldError, setErrors } = validation;
  const [loadingApprovers, setLoadingApprovers] = useState(false);
  const [approvers, setApprovers] = useState<
    { id: number; username: string; email: string }[]
  >([]);
  const [autoSummary, setAutoSummary] = useState<string | null>(null);
  const {
    projects,
    loading: loadingProjects,
    error: projectsError,
    fetchProjects,
  } = useProjects();

  const taskTypeLabels: Record<CreateTaskData["type"], string> = {
    budget: "Budget Request",
    asset: "Asset",
    retrospective: "Retrospective",
    report: "Report",
    scaling: "Scaling",
    alert: "Alert",
    experiment: "Experiment",
    optimization: "Optimization",
    communication: "Client Communication",
    platform_policy_update: "Platform Policy Update",
  };

  useEffect(() => {
    if (lockProject) return;
    fetchProjects();
  }, [fetchProjects, lockProject]);

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
    if (lockProject) return;
    if (
      taskData.project_id &&
      !activeProjects.some((project) => project.id === taskData.project_id)
    ) {
      onTaskDataChange({ project_id: undefined });
    }
  }, [activeProjects, lockProject, onTaskDataChange, taskData.project_id]);

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

    const nextTaskData = { ...taskData, [field]: value };
    if (field === "type") {
      const label = taskTypeLabels[value as CreateTaskData["type"]] || "Task";
      const nextSummary = `${label} task`;
      if (!taskData.summary || taskData.summary === autoSummary) {
        nextTaskData.summary = nextSummary;
        setAutoSummary(nextSummary);
      }
    }
    if (field === "summary") {
      setAutoSummary(null);
    }

    // Update taskData in parent component
    onTaskDataChange(nextTaskData);

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
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      {/* Project */}
      <div>
        <label
          htmlFor="task-project"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Project *
        </label>
        {lockProject ? (
          <div className="flex items-center justify-between rounded-md border border-blue-200 bg-blue-50/60 px-3 py-2 text-sm text-gray-900">
            <span className="truncate">
              {projectName ||
                (taskData.project_id ? String(taskData.project_id) : "Project")}
            </span>
            <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
              Locked
            </span>
          </div>
        ) : (
          <select
            id="task-project"
            name="project_id"
            value={taskData.project_id || ""}
            onChange={(e) =>
              handleInputChange("project_id", Number(e.target.value))
            }
            className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
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
        )}
        {!lockProject && errors.project_id && (
          <p className="text-red-500 text-sm mt-1">{errors.project_id}</p>
        )}
        {!lockProject && projectsError && (
          <p className="text-red-500 text-sm mt-1">
            Failed to load projects: {projectsError}
          </p>
        )}
      </div>

      {/* Task Type */}
      <div>
        <label
          htmlFor="task-type"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Work type *
        </label>
        <select
          id="task-type"
          name="type"
          value={taskData.type || ""}
          onChange={(e) =>
            handleInputChange(
              "type",
              e.target.value as
                | "budget"
                | "asset"
                | "retrospective"
                | "report"
                | "scaling"
                | "alert"
                | "experiment"
                | "optimization"
                | "communication"
            )
          }
          className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            errors.type ? "border-red-500" : "border-gray-300"
          }`}
          required
        >
          <option value="" disabled>
            Select a work type
          </option>
          <option value="budget">Budget Request</option>
          <option value="asset">Asset</option>
          <option value="retrospective">Retrospective</option>
          <option value="report">Report</option>
          <option value="scaling">Scaling</option>
          <option value="alert">Alert</option>
          <option value="experiment">Experiment</option>
          <option value="optimization">Optimization</option>
          <option value="communication">Client Communication</option>
          <option value="platform_policy_update">Platform Policy Update</option>
        </select>
        {errors.type && (
          <p className="text-red-500 text-sm mt-1">{errors.type}</p>
        )}
      </div>

      {/* Summary */}
      <div>
        <label
          htmlFor="task-summary"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Summary *
        </label>
        <input
          id="task-summary"
          name="summary"
          value={taskData.summary || ""}
          onChange={(e) => handleInputChange("summary", e.target.value)}
          className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            errors.summary ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Enter a short summary"
          required
        />
        {errors.summary && (
          <p className="mt-1 text-sm text-red-500">{errors.summary}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="task-description"
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          Description
        </label>
        <textarea
          id="task-description"
          name="description"
          value={taskData.description || ""}
          onChange={(e) => handleInputChange("description", e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          rows={4}
          placeholder="Enter task description"
        />
      </div>

      {/* Approver */}
      <div>
        <label
          htmlFor="task-approver"
          className="mb-1 block text-sm font-medium text-gray-700"
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
          className={`w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Start Date */}
        <div>
          <label
            htmlFor="task-start-date"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Start Date
          </label>
          <input
            id="task-start-date"
            name="start_date"
            type="date"
            value={taskData.start_date || ""}
            onChange={(e) => handleInputChange("start_date", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* Due Date */}
        <div>
          <label
            htmlFor="task-due-date"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Due Date
          </label>
          <input
            id="task-due-date"
            name="due_date"
            type="date"
            value={taskData.due_date || ""}
            onChange={(e) => handleInputChange("due_date", e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Hidden submit button for form validation and enter key support */}
      <button type="submit" className="hidden">
        Submit Task Form
      </button>
    </form>
  );
}
