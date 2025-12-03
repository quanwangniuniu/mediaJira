"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Layout from "@/components/layout/Layout";
import useAuth from "@/hooks/useAuth";
import { useTaskData } from "@/hooks/useTaskData";
import { useFormValidation } from "@/hooks/useFormValidation";
import { useBudgetPoolData } from "@/hooks/useBudgetPoolData";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AssetAPI } from "@/lib/api/assetApi";
import toast from "react-hot-toast";
import { TaskAPI } from "@/lib/api/taskApi";
import { BudgetAPI } from "@/lib/api/budgetApi";
import { ReportAPI } from "@/lib/api/reportApi";
import { RetrospectiveAPI } from "@/lib/api/retrospectiveApi";
import Modal from "@/components/ui/Modal";
import NewTaskForm from "@/components/tasks/NewTaskForm";
import NewBudgetRequestForm from "@/components/tasks/NewBudgetRequestForm";
import NewAssetForm from "@/components/tasks/NewAssetForm";
import NewRetrospectiveForm from "@/components/tasks/NewRetrospectiveForm";
import NewReportForm from "@/components/tasks/NewReportForm";
import TaskCard from "@/components/tasks/TaskCard";
import NewBudgetPool from "@/components/budget/NewBudgetPool";
import { mockTasks } from "@/mock/mockTasks";

function TasksPageContent() {
  const { user, loading: userLoading, logout } = useAuth();
  const router = useRouter();
  // Get project_id from search params
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("project_id");
  const DEFAULT_PROJECT_ID = 4; // Default project ID
  const projectId = projectIdParam ? Number(projectIdParam) : null;

  // Task data management
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    fetchTasks,
    createTask,
    updateTask,
    reloadTasks,
  } = useTaskData();

  // Budget pool data management
  const {
    createBudgetPool,
    loading: budgetPoolLoading,
    error: budgetPoolError,
  } = useBudgetPoolData();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createBudgetPoolModalOpen, setCreateBudgetPoolModalOpen] =
    useState(false);

  const [taskData, setTaskData] = useState({
    project_id: null,
    type: "",
    summary: "",
    description: "",
    current_approver_id: null,
    due_date: "",
  });
  const [budgetData, setBudgetData] = useState({
    amount: "",
    currency: "",
    ad_channel: null,
    notes: "",
  });
  const [budgetPoolData, setBudgetPoolData] = useState({
    project: null,
    ad_channel: null,
    total_amount: "",
    currency: "",
  });
  const [assetData, setAssetData] = useState({
    tags: "",
    team: "",
    notes: "",
    file: null,
  });
  const [retrospectiveData, setRetrospectiveData] = useState({});

  const [reportData, setReportData] = useState({
    title: "",
    owner_id: "",
    report_template_id: "",
    slice_config: {
      csv_file_path: "",
    },
  });

  // 🎯 Toggle this to switch between mock and real backend
  const USE_MOCK_FALLBACK = false; // false = no fallback for testing

  // ✅ Smart fallback logic - use mock data for demo if enabled
  const tasksWithFallback = USE_MOCK_FALLBACK
    ? Array.isArray(tasks) && tasks.length > 0
      ? tasks
      : mockTasks
    : Array.isArray(tasks)
    ? tasks
    : [];

  console.log(`[TasksPage] Rendering ${tasks?.length || 0} tasks`);
  console.log(`✅ Backend tasks:`, tasks);
  console.log(`✅ Tasks with fallback:`, tasksWithFallback);
  console.log(`✅ Tasks loading:`, tasksLoading);
  console.log(`✅ Tasks error:`, tasksError);

  const [taskType, setTaskType] = useState("");
  const [contentType, setContentType] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  // Fetch tasks when project_id changes

  // If there is no project_id in the URL, automatically redirect to the default project, like /tasks?project_id=4
  useEffect(() => {
    if (!projectIdParam) {
      console.log("[TasksPage] No project_id in URL, redirecting to default");
      router.replace(`/tasks?project_id=${DEFAULT_PROJECT_ID}`);
    }
  }, [projectIdParam, router, DEFAULT_PROJECT_ID]);

  // When the project_id in the URL changes, fetch the tasks list according to it
  useEffect(() => {
    if (!projectId) {
      console.log("[TasksPage] No valid project_id (NaN or null), skip fetch");
      return;
    }

    console.log("[TasksPage] Fetching tasks for project:", projectId);
    fetchTasks({ project_id: projectId });
  }, [projectId, fetchTasks]);

  // Ensure that the project_id in the form defaults to the project_id in the URL when creating a new task
  useEffect(() => {
    if (!projectId) return;

    setTaskData((prev) => ({
      ...prev,
      // If the user has already manually selected the project_id, don't overwrite it; otherwise use the project_id in the URL
      project_id: prev.project_id || projectId,
    }));
  }, [projectId]);

  // Task type configuration - defines how each task type should be handled
  const taskTypeConfig = {
    budget: {
      contentType: "budgetrequest",
      formData: budgetData,
      setFormData: setBudgetData,
      validation: null, // Will be set below
      api: BudgetAPI.createBudgetRequest,
      formComponent: NewBudgetRequestForm,
      requiredFields: ["amount", "currency", "ad_channel"],
      getPayload: (createdTask) => {
        // Ensure current_approver is provided
        if (!taskData.current_approver_id) {
          throw new Error("Approver is required for budget request");
        }
        return {
          task: createdTask.id,
          amount: budgetData.amount,
          currency: budgetData.currency,
          ad_channel: budgetData.ad_channel,
          notes: budgetData.notes || "",
          current_approver: taskData.current_approver_id,
        };
      },
    },
    asset: {
      contentType: "asset",
      formData: assetData,
      setFormData: setAssetData,
      validation: null, // Will be set below
      api: AssetAPI.createAsset,
      formComponent: NewAssetForm,
      requiredFields: ["tags"], // Tags are required
      getPayload: (createdTask) => {
        const tagsArray = (assetData.tags || "")
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
        const payload = {
          task: createdTask.id,
          tags: tagsArray,
        };
        if (assetData.team) {
          const teamNum = Number(assetData.team);
          if (!Number.isNaN(teamNum)) {
            payload.team = teamNum;
          }
        }
        return payload;
      },
    },
    retrospective: {
      contentType: "retrospectivetask",
      formData: retrospectiveData,
      setFormData: setRetrospectiveData,
      validation: null, // Will be set below
      api: RetrospectiveAPI.createRetrospective,
      formComponent: NewRetrospectiveForm,
      requiredFields: ["campaign"],
      getPayload: (createdTask) => ({
        campaign: retrospectiveData.campaign || taskData.project_id?.toString(),
        scheduled_at:
          retrospectiveData.scheduled_at || new Date().toISOString(),
        status: retrospectiveData.status || "scheduled",
      }),
    },
    report: {
      contentType: "report",
      formData: reportData,
      setFormData: setReportData,
      validation: null, // will be set below
      api: ReportAPI.createReport,
      formComponent: NewReportForm,
      requiredFields: [
        "title",
        "owner_id",
        "report_template_id",
        "slice_config.csv_file_path",
      ],
      getPayload: (createdTask) => {
        return {
          task: createdTask.id,
          title: reportData.title,
          owner_id: reportData.owner_id,
          report_template_id: reportData.report_template_id,
          slice_config: {
            csv_file_path: reportData.slice_config?.csv_file_path || "",
          },
        };
      },
    },
  };

  // Form validation rules
  const taskValidationRules = {
    project_id: (value) => (!value || value == 0 ? "Project is required" : ""),
    type: (value) => (!value ? "Task type is required" : ""),
    summary: (value) => (!value ? "Task summary is required" : ""),
    // Only require approver when type is 'budget'
    current_approver_id: (value) =>
      taskData.type === "budget" && !value
        ? "Approver is required for budget"
        : "",
  };

  const budgetValidationRules = {
    amount: (value) => {
      if (!value || value.trim() === "") return "Amount is required";
      return "";
    },
    currency: (value) => {
      if (!value || value.trim() === "") return "Currency is required";
      return "";
    },
    ad_channel: (value) =>
      !value || value === 0 ? "Ad channel is required" : "",
  };

  const budgetPoolValidationRules = {
    project: (value) => (!value || value === 0 ? "Project is required" : ""),
    ad_channel: (value) =>
      !value || value === 0 ? "Advertising channel is required" : "",
    total_amount: (value) => {
      if (!value || value.trim() === "") return "Total amount is required";
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0)
        return "Total amount must be a positive number";
      return "";
    },
    currency: (value) => {
      if (!value || value.trim() === "") return "Currency is required";
      if (value.length !== 3)
        return "Currency must be 3 characters (e.g., AUD, USD)";
      return "";
    },
  };

  // TODO: Add validation rules for asset
  const assetValidationRules = {};
  const retrospectiveValidationRules = {
    campaign: (value) => {
      if (!value || value.toString().trim() === "")
        return "Campaign (Project) is required";
      return "";
    },
  };

  const reportValidationRules = {
    title: (value) => {
      if (!value || value.trim() === "") return "Title is required";
      return "";
    },
    owner_id: (value) => {
      if (!value || value.trim() === "") return "Owner ID is required";
      return "";
    },
    report_template_id: (value) => {
      if (!value || value.trim() === "") return "Template ID is required";
      return "";
    },
    "slice_config.csv_file_path": (value) => {
      // Temporarily make CSV file optional until upload endpoint is fixed
      // if (!value || value.trim() === '') return 'CSV file must be uploaded';
      return "";
    },
  };

  // Initialize validation hooks
  const taskValidation = useFormValidation(taskValidationRules);
  const budgetValidation = useFormValidation(budgetValidationRules);
  const budgetPoolValidation = useFormValidation(budgetPoolValidationRules);
  const assetValidation = useFormValidation(assetValidationRules);
  const retrospectiveValidation = useFormValidation(
    retrospectiveValidationRules
  );
  const reportValidation = useFormValidation(reportValidationRules);

  // Assign validation hooks to config
  taskTypeConfig.budget.validation = budgetValidation;
  taskTypeConfig.asset.validation = assetValidation;
  taskTypeConfig.retrospective.validation = retrospectiveValidation;
  taskTypeConfig.report.validation = reportValidation;

  const tasksByType = useMemo(() => {
    const grouped = {
      budget: [],
      asset: [],
      retrospective: [],
      report: [],
    };

    if (!tasksWithFallback) return grouped;

    const enrichedReportTasks = tasksWithFallback.filter(
      (task) => task.type === "report"
    );

    enrichedReportTasks.forEach((task) => grouped.report.push(task));

    tasksWithFallback.forEach((task) => {
      if (task.type !== "report" && grouped[task.type]) {
        grouped[task.type].push(task);
      }
    });

    return grouped;
  }, [tasksWithFallback]);

  const handleTaskDataChange = (newTaskData) => {
    setTaskData((prev) => ({ ...prev, ...newTaskData }));

    // If task type is changed, update the task type
    if (newTaskData.type && newTaskData.type !== taskData.type) {
      setTaskType(newTaskData.type);
    }
  };

  const handleBudgetDataChange = (newBudgetData) => {
    setBudgetData((prev) => ({ ...prev, ...newBudgetData }));
  };

  const handleAssetDataChange = (newAssetData) => {
    setAssetData((prev) => ({ ...prev, ...newAssetData }));
  };

  const handleRetrospectiveDataChange = (newRetrospectiveData) => {
    setRetrospectiveData((prev) => ({ ...prev, ...newRetrospectiveData }));
  };

  const handleBudgetPoolDataChange = (newBudgetPoolData) => {
    setBudgetPoolData((prev) => ({ ...prev, ...newBudgetPoolData }));
  };

  const handleReportDataChange = (newReportData) => {
    setReportData((prev) => ({ ...prev, ...newReportData }));
  };

  // Handle task card click
  const handleTaskClick = (task) => {
    // Navigate to task detail page
    router.push(`/tasks/${task.id}`);
  };

  // Generic function to create task type specific object
  const createTaskTypeObject = async (taskType, createdTask) => {
    const config = taskTypeConfig[taskType];
    if (!config || !config.api) {
      console.warn(`No API configured for task type: ${taskType}`);
      return null;
    }

    const payload = config.getPayload(createdTask);
    console.log(`Creating ${taskType} with payload:`, payload);

    try {
      const response = await config.api(payload);
      // Handle different response formats:
      // - Some APIs return {data: object}
      // - Some APIs (like AssetAPI.createAsset) return the object directly
      const createdObject = response?.data || response;
      console.log(`${taskType} created:`, createdObject);
      return createdObject;
    } catch (error) {
      // Handle case where retrospective already exists
      if (taskType === "retrospective" && error.response?.status === 400) {
        const errorData = error.response.data;
        // Check if error is about retrospective already existing
        if (
          (errorData.campaign &&
            Array.isArray(errorData.campaign) &&
            errorData.campaign[0]?.includes("already exists")) ||
          (typeof errorData.campaign === "string" &&
            errorData.campaign.includes("already exists"))
        ) {
          console.warn(
            "Retrospective already exists, attempting to find existing one..."
          );

          // Try to find existing retrospective for this campaign
          try {
            const campaignId = payload.campaign;
            const retrospectivesResponse =
              await RetrospectiveAPI.getRetrospectives({
                campaign: campaignId,
              });
            if (
              retrospectivesResponse.data &&
              retrospectivesResponse.data.length > 0
            ) {
              console.log(
                "Found existing retrospective:",
                retrospectivesResponse.data[0]
              );
              return retrospectivesResponse.data[0];
            }
          } catch (findError) {
            console.error("Failed to find existing retrospective:", findError);
          }
        }
      }
      // Re-throw the error if we couldn't handle it
      throw error;
    }
  };

  // Generic function to reset form data
  const resetFormData = () => {
    setTaskData({
      project_id: null,
      type: "",
      summary: "",
      description: "",
      current_approver_id: null,
      due_date: "",
    });
    setBudgetData({
      amount: "",
      currency: "",
      ad_channel: null,
      notes: "",
    });
    setBudgetPoolData({
      project: null,
      ad_channel: null,
      total_amount: "",
      currency: "",
    });
    setAssetData({
      tags: "",
      team: "",
      notes: "",
      file: null,
    });
    setRetrospectiveData({});
    setReportData({
      title: "",
      owner_id: "",
      report_template_id: "",
      slice_config: {
        csv_file_path: "",
      },
    });
    setTaskType("");
    setContentType("");
  };

  // Generic function to clear validation errors
  const clearAllValidationErrors = () => {
    taskValidation.clearErrors();
    budgetValidation.clearErrors();
    budgetPoolValidation.clearErrors();
    assetValidation.clearErrors();
    retrospectiveValidation.clearErrors();
  };

  // Submit method to create task and related objects
  const handleSubmit = async () => {
    if (isSubmitting) return;

    // Original logic for other task types
    // Validate task form first
    // Only require approver when type is 'budget'
    const requiredTaskFields =
      taskData.type === "budget"
        ? ["project_id", "type", "summary", "current_approver_id"]
        : ["project_id", "type", "summary"];
    if (!taskValidation.validateForm(taskData, requiredTaskFields)) {
      return;
    }

    // Validate task type specific form if config exists
    const config = taskTypeConfig[taskData.type];
    if (config && config.validation && config.requiredFields.length > 0) {
      if (
        !config.validation.validateForm(config.formData, config.requiredFields)
      ) {
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Step 1: Create the task
      const taskPayload = {
        project_id: taskData.project_id,
        type: taskData.type,
        summary: taskData.summary,
        description: taskData.description || "",
        // For report tasks, set the current user as the approver
        current_approver_id:
          taskData.type === "report" ? user?.id : taskData.current_approver_id,
        due_date: taskData.due_date || null,
      };

      console.log("Creating task with payload:", taskPayload);
      console.log(
        "taskData.current_approver_id:",
        taskData.current_approver_id
      );
      console.log(
        "taskData.current_approver_id type:",
        typeof taskData.current_approver_id
      );
      const createdTask = await createTask(taskPayload);
      console.log("Task created:", createdTask);

      // Step 2: Create the specific type object
      setContentType(config?.contentType || "");
      const createdObject = await createTaskTypeObject(
        taskData.type,
        createdTask
      );

      // Step 3: Link the task to the specific type object
      if (createdObject && config?.contentType) {
        console.log(`Linking task to ${taskData.type}`, {
          taskId: createdTask.id,
          contentType: config.contentType,
          objectId: createdObject.id,
          createdObject: createdObject,
        });

        try {
          // Link the task to the specific type object
          // Use the API for all types including report
          const linkResponse = await TaskAPI.linkTask(
            createdTask.id,
            config.contentType,
            createdObject.id.toString()
          );

          console.log("Link task response:", linkResponse);

          // Update the task with linked object info
          const updatedTask = {
            ...createdTask,
            content_type: config.contentType,
            object_id: createdObject.id.toString(),
            linked_object: createdObject,
          };

          // Update the task in the store
          updateTask(createdTask.id, updatedTask);

          console.log("Task linked to task type object successfully");
        } catch (linkError) {
          console.error("Error linking task to object:", linkError);
          console.error("Link error details:", {
            response: linkError.response,
            data: linkError.response?.data,
            status: linkError.response?.status,
            message: linkError.message,
          });
          // Don't fail the entire creation if linking fails
          // The asset is already created with task reference (asset.task field)
          const errorMsg =
            linkError.response?.data?.error ||
            linkError.response?.data?.message ||
            linkError.message ||
            "Unknown error";
          toast.error(`Asset created, but failed to link to task: ${errorMsg}`);
        }
      } else {
        console.warn("Cannot link task: missing createdObject or contentType", {
          createdObject: !!createdObject,
          contentType: config?.contentType,
        });
      }

      // Step 4: For asset tasks, upload initial version file if provided
      if (taskData.type === "asset" && createdObject && assetData.file) {
        try {
          console.log(
            "Uploading initial version file for asset:",
            createdObject.id
          );
          await AssetAPI.createAssetVersion(String(createdObject.id), {
            file: assetData.file,
          });
          console.log("Initial version file uploaded successfully");
        } catch (error) {
          console.error("Error uploading initial version file:", error);
          // Don't fail the entire task creation if file upload fails
          // User can upload the file later
          toast.error(
            "Asset created, but failed to upload initial version file. You can upload it later."
          );
        }
      }

      // Reset form and close modal
      resetFormData();
      setCreateModalOpen(false);

      // Clear validation errors
      clearAllValidationErrors();

      // Refresh tasks list
      await reloadTasks();

      console.log("Task creation completed successfully");
    } catch (error) {
      console.error("Error creating task:", error);
      console.error("Error details:", {
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
        message: error.message,
      });

      // Show more detailed error message
      let errorMessage = "Failed to create task";
      if (error.response?.data) {
        // Handle validation errors
        if (error.response.data.campaign) {
          errorMessage = `Campaign error: ${
            Array.isArray(error.response.data.campaign)
              ? error.response.data.campaign[0]
              : error.response.data.campaign
          }`;
        } else if (error.response.data.scheduled_at) {
          errorMessage = `Scheduled at error: ${
            Array.isArray(error.response.data.scheduled_at)
              ? error.response.data.scheduled_at[0]
              : error.response.data.scheduled_at
          }`;
        } else if (error.response.data.status) {
          errorMessage = `Status error: ${
            Array.isArray(error.response.data.status)
              ? error.response.data.status[0]
              : error.response.data.status
          }`;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (typeof error.response.data === "object") {
          // Try to extract first error message
          const firstError = Object.values(error.response.data)[0];
          errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      alert(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit method to create budget pool
  const handleSubmitBudgetPool = async () => {
    // Validate budget pool form
    if (
      !budgetPoolValidation.validateForm(budgetPoolData, [
        "project",
        "ad_channel",
        "total_amount",
        "currency",
      ])
    ) {
      return;
    }

    try {
      // Create budget pool
      console.log("Creating budget pool:", budgetPoolData);
      const createdBudgetPool = await createBudgetPool(budgetPoolData);
      console.log("Budget pool created successfully:", createdBudgetPool);

      // Show success message
      alert("Budget pool created successfully!");

      // Close budget pool modal and return to task creation modal
      setCreateBudgetPoolModalOpen(false);
      setCreateModalOpen(true);

      // Reset budget pool form data
      setBudgetPoolData({
        project: null,
        ad_channel: null,
        total_amount: "",
        currency: "",
      });

      // Clear validation errors
      budgetPoolValidation.clearErrors();
    } catch (error) {
      console.error("Error creating budget pool:", error);
      alert(
        "Failed to create budget pool: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  const handleUserAction = async (action) => {
    if (action === "settings") {
      // Handle settings
    } else if (action === "logout") {
      await logout();
    }
  };

  const handleCreateBudgetPool = () => {
    setCreateBudgetPoolModalOpen(true);
    setCreateModalOpen(false);
  };

  const layoutUser = user
    ? {
        name: user.username || user.email,
        email: user.email,
        role: user.roles && user.roles.length > 0 ? user.roles[0] : undefined,
      }
    : undefined;

  return (
    <Layout user={layoutUser} onUserAction={handleUserAction}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="flex flex-row gap-4 mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-3 py-1.5 rounded text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create Task
            </button>
          </div>

          {/* Loading State */}
          {tasksLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading tasks...</p>
            </div>
          )}

          {/* Error State */}
          {tasksError && (
            <div className="text-center py-8">
              <p className="text-red-600">
                Error loading tasks: {tasksError.message}
              </p>
              <button
                onClick={() => {
                  if (projectId) {
                    fetchTasks({ project_id: projectId });
                  }
                }}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Tasks Display */}
          {!tasksLoading && !tasksError && (
            <div className="flex flex-col gap-6">
              {/* Row 1: Budget / Asset / Retrospective */}
              <div className="flex flex-row gap-6">
                {/* Budget Tasks */}
                <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Budget Tasks
                    </h2>
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                      {tasksByType.budget.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tasksByType.budget.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        No budget tasks found
                      </p>
                    ) : (
                      tasksByType.budget.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={handleTaskClick}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Asset Tasks */}
                <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Asset Tasks
                    </h2>
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs font-medium rounded-full">
                      {tasksByType.asset.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tasksByType.asset.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        No asset tasks found
                      </p>
                    ) : (
                      tasksByType.asset.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={handleTaskClick}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Retrospective Tasks */}
                <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Retrospective Tasks
                    </h2>
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs font-medium rounded-full">
                      {tasksByType.retrospective.length}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {tasksByType.retrospective.length === 0 ? (
                      <p className="text-gray-500 text-sm">
                        No retrospective tasks found
                      </p>
                    ) : (
                      tasksByType.retrospective.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={handleTaskClick}
                          onDelete={async (taskId) => {
                            // After deletion, refresh the tasks list for the current project
                            if (projectId) {
                              await fetchTasks({ project_id: projectId });
                            } else {
                              await reloadTasks();
                            }
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Report Tasks */}
              <div className="flex flex-row gap-6">
                {/* Report Tasks */}
                <div className="w-1/3 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">
                      Report Tasks
                    </h2>
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                      {tasksByType.report?.length || 0}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {(tasksByType.report?.length || 0) === 0 ? (
                      <p className="text-gray-500 text-sm">
                        No report tasks found
                      </p>
                    ) : (
                      tasksByType.report.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          onClick={handleTaskClick}
                        />
                      ))
                    )}
                  </div>
                </div>

                {/* Placeholder for Campaign Tasks (future use) */}
                <div className="w-1/3"></div>

                {/* Placeholder */}
                <div className="w-1/3"></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      <Modal isOpen={createModalOpen} onClose={() => {}}>
        <div className="flex flex-col justify-center items-center p-8 gap-10 bg-white rounded-md">
          {/* Header */}
          <div className="flex flex-col gap-2 w-full">
            <h2 className="text-lg font-bold">New Task Form</h2>
            <p className="text-sm text-gray-500">
              Required fields are marked with an asterisk *
            </p>
          </div>

          {/* Task info */}
          <NewTaskForm
            onTaskDataChange={handleTaskDataChange}
            taskData={taskData}
            validation={taskValidation}
          />

          {/* Task Type specific forms - conditionally render based on chosen task type */}
          {taskType === "budget" && (
            <NewBudgetRequestForm
              onBudgetDataChange={handleBudgetDataChange}
              budgetData={budgetData}
              taskData={taskData}
              validation={budgetValidation}
              onCreateBudgetPool={handleCreateBudgetPool}
            />
          )}
          {taskType === "asset" && (
            <NewAssetForm
              onAssetDataChange={handleAssetDataChange}
              assetData={assetData}
              taskData={taskData}
              validation={assetValidation}
            />
          )}
          {taskType === "retrospective" && (
            <NewRetrospectiveForm
              onRetrospectiveDataChange={handleRetrospectiveDataChange}
              retrospectiveData={retrospectiveData}
              taskData={taskData}
              validation={retrospectiveValidation}
            />
          )}

          {taskType === "report" && (
            <NewReportForm
              onReportDataChange={handleReportDataChange}
              reportData={reportData}
              taskData={taskData}
              validation={reportValidation}
            />
          )}

          {/* Buttons */}
          <div className="flex flex-row flex-between gap-4">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="px-3 py-1.5 rounded text-white bg-gray-500 hover:bg-gray-600"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-3 py-1.5 rounded text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating..." : "Submit"}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Budget Pool Modal */}
      <Modal
        isOpen={createBudgetPoolModalOpen}
        onClose={() => setCreateBudgetPoolModalOpen(false)}
      >
        <div className="flex flex-col justify-center items-center p-8 gap-10 bg-white rounded-md">
          {/* Header */}
          <div className="flex flex-col gap-2 w-full">
            <h2 className="text-lg font-bold">Create Budget Pool</h2>
          </div>

          {/* Budget Pool Form */}
          <NewBudgetPool
            onBudgetPoolDataChange={handleBudgetPoolDataChange}
            budgetPoolData={budgetPoolData}
            validation={budgetPoolValidation}
            loading={budgetPoolLoading}
          />

          {/* Error Display */}
          {budgetPoolError && (
            <div className="w-full p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <p className="text-sm">
                Error:{" "}
                {budgetPoolError.response?.data?.message ||
                  budgetPoolError.message}
              </p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-row flex-between gap-4">
            <button
              onClick={() => setCreateBudgetPoolModalOpen(false)}
              className="px-3 py-1.5 rounded text-white bg-gray-500 hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitBudgetPool}
              className="px-3 py-1.5 rounded text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
              disabled={budgetPoolLoading}
            >
              {budgetPoolLoading ? "Creating..." : "Submit"}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <TasksPageContent />
    </ProtectedRoute>
  );
}
