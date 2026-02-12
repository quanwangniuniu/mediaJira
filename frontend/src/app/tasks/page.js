"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { ClientCommunicationAPI } from "@/lib/api/clientCommunicationApi";
import { DashboardAPI } from "@/lib/api/dashboardApi";
import Modal from "@/components/ui/Modal";
import NewTaskForm from "@/components/tasks/NewTaskForm";
import NewBudgetRequestForm from "@/components/tasks/NewBudgetRequestForm";
import NewAssetForm from "@/components/tasks/NewAssetForm";
import NewRetrospectiveForm from "@/components/tasks/NewRetrospectiveForm";
import { ReportForm } from "@/components/tasks/ReportForm";
import { ScalingPlanForm } from "@/components/tasks/ScalingPlanForm";
import NewClientCommunicationForm from "@/components/tasks/NewClientCommunicationForm";
import AlertTaskForm from "@/components/tasks/AlertTaskForm";
import { OptimizationScalingAPI } from "@/lib/api/optimizationScalingApi";
import { ExperimentForm } from "@/components/tasks/ExperimentForm";
import { ExperimentAPI } from "@/lib/api/experimentApi";
import { AlertingAPI } from "@/lib/api/alertingApi";
import { OptimizationAPI } from "@/lib/api/optimizationApi";
import { OptimizationForm } from "@/components/tasks/OptimizationForm";
import TaskCard from "@/components/tasks/TaskCard";
import TaskListView from "@/components/tasks/TaskListView";
import TimelineView from "@/components/tasks/timeline/TimelineView";
import NewBudgetPool from "@/components/budget/NewBudgetPool";
import BudgetPoolList from "@/components/budget/BudgetPoolList";
import { ProjectAPI } from "@/lib/api/projectApi";
import ProjectSummaryPanel from "@/components/dashboard/ProjectSummaryPanel";
import StatusOverviewChart from "@/components/dashboard/StatusOverviewChart";
import PriorityBreakdownChart from "@/components/dashboard/PriorityBreakdownChart";
import TypesOfWorkChart from "@/components/dashboard/TypesOfWorkChart";
import RecentActivityFeed from "@/components/dashboard/RecentActivityFeed";
import TimeMetricsCards from "@/components/dashboard/TimeMetricsCards";
import JiraBoardView from "@/components/jira-ticket/JiraBoardView";

function TasksPageContent() {
  const { user, loading: userLoading, logout } = useAuth();
  const router = useRouter();
  // Get project_id from search params
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get("project_id");
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
    fetchBudgetPools,
  } = useBudgetPoolData();

  // Trigger to refresh budget pools list in NewBudgetRequestForm
  const [budgetPoolRefreshTrigger, setBudgetPoolRefreshTrigger] = useState(0);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createBudgetPoolModalOpen, setCreateBudgetPoolModalOpen] =
    useState(false);
  const [manageBudgetPoolsModalOpen, setManageBudgetPoolsModalOpen] =
    useState(false);
  const [projectOptions, setProjectOptions] = useState([]);
  const [projectOptionsLoading, setProjectOptionsLoading] = useState(false);
  const [projectOptionsError, setProjectOptionsError] = useState(null);
  const [projectSearchQuery, setProjectSearchQuery] = useState("");
  const [recentProjectIds, setRecentProjectIds] = useState([]);
  const [pinnedProjectIds, setPinnedProjectIds] = useState([]);

  const getDefaultTaskDates = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return {
      start_date: today.toISOString().slice(0, 10),
      due_date: tomorrow.toISOString().slice(0, 10),
    };
  };

  const [taskData, setTaskData] = useState({
    project_id: null,
    type: "",
    summary: "",
    description: "",
    current_approver_id: null,
    ...getDefaultTaskDates(),
  });
  const [budgetData, setBudgetData] = useState({
    amount: "",
    currency: "",
    ad_channel: null,
    notes: "",
    budget_pool: null,
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
  const [scalingPlanData, setScalingPlanData] = useState({});
  const [alertData, setAlertData] = useState({
    alert_type: "spend_spike",
    severity: "medium",
    status: "open",
    metric_key: "spend",
    change_type: "percent",
    change_value: "",
    change_window: "daily",
    current_value: "",
    previous_value: "",
    affected_entities: [],
    assigned_to: "",
    acknowledged_by: "",
    investigation_assumption: "",
    investigation_notes: "",
    resolution_actions: [],
    resolution_notes: "",
    related_references: [],
    postmortem_root_cause: "",
    postmortem_prevention: "",
  });
  const [experimentData, setExperimentData] = useState({});
  const [optimizationData, setOptimizationData] = useState({});

  const [reportData, setReportData] = useState({
    audience_type: "client",
    audience_details: "",
    context: {
      reporting_period: null,
      situation: "",
      what_changed: "",
    },
    outcome_summary: "",
    narrative_explanation: "",
    key_actions: [],
  });

  const [communicationData, setCommunicationData] = useState({
    communication_type: "",
    stakeholders: "",
    impacted_areas: [],
    required_actions: "",
    client_deadline: null,
    notes: "",
  });

  const loadProjectOptions = useCallback(async () => {
    try {
      setProjectOptionsLoading(true);
      setProjectOptionsError(null);
      const projects = await ProjectAPI.getProjects();
      setProjectOptions(projects || []);
    } catch (error) {
      console.error("Failed to load projects:", error);
      setProjectOptionsError("Failed to load projects.");
    } finally {
      setProjectOptionsLoading(false);
    }
  }, []);

  const handlePickProject = (selectedProjectId) => {
    if (!selectedProjectId) return;
    setRecentProjectIds((prev) => {
      const next = [
        selectedProjectId,
        ...prev.filter((id) => id !== selectedProjectId),
      ].slice(0, 5);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("recentProjectIds", JSON.stringify(next));
      }
      return next;
    });
    router.push(`/tasks?project_id=${selectedProjectId}`);
  };

  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projectOptions;
    const query = projectSearchQuery.trim().toLowerCase();
    return projectOptions.filter((project) => {
      const name = (project.name || "").toLowerCase();
      const idText = project.id ? String(project.id) : "";
      return name.includes(query) || idText.includes(query);
    });
  }, [projectOptions, projectSearchQuery]);

  const pinnedProjects = useMemo(() => {
    if (!pinnedProjectIds.length) return [];
    const byId = new Map(
      filteredProjects
        .filter((project) => project?.id)
        .map((project) => [project.id, project])
    );
    return pinnedProjectIds
      .map((id) => byId.get(id))
      .filter(Boolean);
  }, [filteredProjects, pinnedProjectIds]);

  const recentProjects = useMemo(() => {
    if (!recentProjectIds.length) return [];
    const byId = new Map(
      filteredProjects
        .filter((project) => project?.id)
        .map((project) => [project.id, project])
    );
    return recentProjectIds
      .map((id) => byId.get(id))
      .filter((project) => project && !pinnedProjectIds.includes(project.id));
  }, [filteredProjects, recentProjectIds, pinnedProjectIds]);

  const otherProjects = useMemo(() => {
    const recentSet = new Set(recentProjectIds);
    const pinnedSet = new Set(pinnedProjectIds);
    return filteredProjects.filter(
      (project) =>
        !recentSet.has(project?.id) && !pinnedSet.has(project?.id)
    );
  }, [filteredProjects, recentProjectIds, pinnedProjectIds]);

  // Use tasks from backend
  const tasksWithFallback = projectId
    ? Array.isArray(tasks)
      ? tasks
      : []
    : [];

  // Filter out subtasks - only show parent tasks in the listing
  // This is a double-check in case backend filtering doesn't work
  const parentTasksOnly = useMemo(() => {
    return tasksWithFallback.filter((task) => {
      // Exclude tasks that are subtasks (check is_subtask field)
      // is_subtask is a persistent field that remains True even after parent deletion
      return !task.is_subtask;
    });
  }, [tasksWithFallback]);

  const [taskType, setTaskType] = useState("");
  const [contentType, setContentType] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("tasks");
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingSummary, setEditingSummary] = useState("");
  const [boardData, setBoardData] = useState(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [boardError, setBoardError] = useState(null);
  const [isBoardRecentExpanded, setIsBoardRecentExpanded] = useState(false);

  // View mode: 'broad' | 'list'
  const [viewMode, setViewMode] = useState("broad");
  const hasInitializedViewMode = useRef(false);

  // Search query
  const [searchQuery, setSearchQuery] = useState("");
  // Fetch tasks when project_id changes

  useEffect(() => {
    if (hasInitializedViewMode.current) return;
    const fromQuery = searchParams.get("view");
    const stored =
      typeof window !== "undefined"
        ? window.localStorage.getItem("tasksViewMode")
        : null;
    const validModes = ["broad", "list", "timeline"];
    const initialMode = validModes.includes(fromQuery)
      ? fromQuery
      : validModes.includes(stored)
      ? stored
      : "broad";
    setViewMode(initialMode);
    hasInitializedViewMode.current = true;
  }, [searchParams]);

  useEffect(() => {
    if (!hasInitializedViewMode.current) return;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("tasksViewMode", viewMode);
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", viewMode);
    router.replace(`?${params.toString()}`);
  }, [viewMode, router, searchParams]);

  // When the project_id in the URL changes, fetch the tasks list according to it
  useEffect(() => {
    if (projectOptions.length === 0 && !projectOptionsLoading) {
      loadProjectOptions();
    }
  }, [projectOptions.length, projectOptionsLoading, loadProjectOptions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("recentProjectIds");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentProjectIds(parsed.filter((id) => Number.isFinite(id)));
      }
    } catch (error) {
      console.warn("Failed to parse recent projects:", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("pinnedProjectIds");
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setPinnedProjectIds(parsed.filter((id) => Number.isFinite(id)));
      }
    } catch (error) {
      console.warn("Failed to parse pinned projects:", error);
    }
  }, []);

  const togglePinProject = (projectIdValue) => {
    if (!projectIdValue) return;
    setPinnedProjectIds((prev) => {
      const next = prev.includes(projectIdValue)
        ? prev.filter((id) => id !== projectIdValue)
        : [projectIdValue, ...prev].slice(0, 8);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("pinnedProjectIds", JSON.stringify(next));
      }
      return next;
    });
  };

  useEffect(() => {
    if (!projectId) return;
    const loadTasks = async () => {
      try {
        console.log("[TasksPage] Fetching tasks for project:", projectId);
        await fetchTasks({ project_id: projectId });
      } catch (error) {
        console.error("[TasksPage] Failed to fetch tasks:", error);
      }
    };

    loadTasks();
  }, [projectId, fetchTasks]);

  const selectedProject = useMemo(() => {
    if (!projectId) return null;
    return projectOptions.find((project) => project.id === projectId) || null;
  }, [projectId, projectOptions]);

  const fetchBoardData = useCallback(async () => {
    if (!projectId) {
      setBoardData(null);
      setBoardError("Project summary requires a project.");
      return;
    }

    try {
      setBoardLoading(true);
      setBoardError(null);
      const response = await DashboardAPI.getSummary({ project_id: projectId });
      if (!response.data) {
        throw new Error("No data received from server");
      }
      setBoardData(response.data);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to load board data";
      setBoardError(message);
      toast.error(message);
    } finally {
      setBoardLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (activeTab !== "summary") return;
    fetchBoardData();
  }, [activeTab, fetchBoardData]);

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
      requiredFields: ["amount", "currency", "ad_channel", "budget_pool"],
      getPayload: (createdTask) => {
        // Ensure current_approver is provided
        if (!taskData.current_approver_id) {
          throw new Error("Approver is required for budget request");
        }
        // Ensure budget_pool is provided
        if (!budgetData.budget_pool) {
          throw new Error("Budget pool is required for budget request");
        }
        return {
          task: createdTask.id,
          amount: budgetData.amount,
          currency: budgetData.currency,
          ad_channel: budgetData.ad_channel,
          budget_pool_id: budgetData.budget_pool,
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
      contentType: "reporttask",
      formData: reportData,
      setFormData: setReportData,
      validation: null, // will be set below
      api: ReportAPI.createReport,
      formComponent: ReportForm,
      requiredFields: ["audience_type", "context", "outcome_summary", "key_actions"],
      getPayload: (createdTask) => {
        const contextData = reportData.context || {
          reporting_period: null,
          situation: "",
          what_changed: "",
        };
        return {
          task: createdTask.id,
          audience_type: reportData.audience_type || "client",
          audience_details:
            reportData.audience_type === "other"
              ? reportData.audience_details || ""
              : "",
          context: contextData,
          outcome_summary: reportData.outcome_summary ?? "",
          narrative_explanation: reportData.narrative_explanation ?? "",
        };
      },
    },
    scaling: {
      contentType: "scalingplan",
      formData: scalingPlanData,
      setFormData: setScalingPlanData,
      validation: null,
      api: OptimizationScalingAPI.createScalingPlan,
      formComponent: ScalingPlanForm,
      requiredFields: ["strategy"],
      getPayload: (createdTask) => {
        if (!createdTask?.id) {
          throw new Error("Task ID is required to create scaling plan");
        }
        return {
          task: createdTask.id,
          strategy: scalingPlanData.strategy || "horizontal",
          scaling_target: scalingPlanData.scaling_target || "",
          risk_considerations: scalingPlanData.risk_considerations || "",
          max_scaling_limit: scalingPlanData.max_scaling_limit || "",
          stop_conditions: scalingPlanData.stop_conditions || "",
          expected_outcomes: scalingPlanData.expected_outcomes || "",
          affected_entities: scalingPlanData.affected_entities || null,
        };
      },
    },
    alert: {
      contentType: "alerttask",
      formData: alertData,
      setFormData: setAlertData,
      validation: null,
      api: AlertingAPI.createAlertTask,
      formComponent: AlertTaskForm,
      requiredFields: ["alert_type", "severity"],
      getPayload: (createdTask) => {
        if (!createdTask?.id) {
          throw new Error("Task ID is required to create alert details");
        }
        const rawMetricValue = alertData.change_value
          ? Number(alertData.change_value)
          : null;
        const rawCurrentValue = alertData.current_value
          ? Number(alertData.current_value)
          : null;
        const rawPreviousValue = alertData.previous_value
          ? Number(alertData.previous_value)
          : null;
        const metricValue = Number.isNaN(rawMetricValue) ? null : rawMetricValue;
        const currentValue = Number.isNaN(rawCurrentValue)
          ? null
          : rawCurrentValue;
        const previousValue = Number.isNaN(rawPreviousValue)
          ? null
          : rawPreviousValue;
        const investigationNotes = [
          alertData.investigation_assumption
            ? `Assumption: ${alertData.investigation_assumption}`
            : null,
          alertData.investigation_notes || null,
        ]
          .filter(Boolean)
          .join(" | ");
        const resolutionSteps = [
          ...(alertData.resolution_actions || []),
          alertData.resolution_notes || null,
        ]
          .filter(Boolean)
          .join(" | ");
        return {
          task: createdTask.id,
          alert_type: alertData.alert_type || "spend_spike",
          severity: alertData.severity || "medium",
          status: alertData.status || "open",
          affected_entities: alertData.affected_entities || [],
          initial_metrics: {
            metric_key: alertData.metric_key || "spend",
            change_type: alertData.change_type || "percent",
            change_value: metricValue,
            change_window: alertData.change_window || "daily",
            current_value: currentValue,
            previous_value: previousValue,
          },
          assigned_to: alertData.assigned_to
            ? Number(alertData.assigned_to)
            : null,
          acknowledged_by: alertData.acknowledged_by
            ? Number(alertData.acknowledged_by)
            : null,
          investigation_notes: investigationNotes,
          resolution_steps: resolutionSteps,
          related_references: alertData.related_references || [],
          postmortem_root_cause: alertData.postmortem_root_cause || "",
          postmortem_prevention: alertData.postmortem_prevention || "",
        };
      },
    },
    communication: {
      contentType: "clientcommunication",
      formData: communicationData,
      setFormData: setCommunicationData,
      validation: null, // will be set below
      api: ClientCommunicationAPI.create,
      formComponent: NewClientCommunicationForm,
      requiredFields: ["communication_type", "required_actions", "impacted_areas"],
      getPayload: (createdTask) => {
        if (!createdTask?.id) {
          throw new Error("Task ID is required to create client communication");
        }
        // Validate impacted_areas is not empty
        if (!communicationData.impacted_areas || communicationData.impacted_areas.length === 0) {
          throw new Error("At least one impacted area is required");
        }
        // Validate required fields
        if (!communicationData.communication_type) {
          throw new Error("Communication type is required");
        }
        if (!communicationData.required_actions || communicationData.required_actions.trim() === "") {
          throw new Error("Required actions is required");
        }
        return {
          task: createdTask.id,
          communication_type: communicationData.communication_type,
          stakeholders: communicationData.stakeholders || "",
          impacted_areas: communicationData.impacted_areas,
          required_actions: communicationData.required_actions,
          client_deadline: communicationData.client_deadline && communicationData.client_deadline.trim() !== "" 
            ? communicationData.client_deadline 
            : null,
          notes: communicationData.notes || "",
        };
      },
    },
    optimization: {
      contentType: "optimization",
      formData: optimizationData,
      setFormData: setOptimizationData,
      validation: null,
      api: OptimizationAPI.createOptimization,
      formComponent: OptimizationForm,
      requiredFields: [],
      getPayload: (createdTask) => ({
        task: createdTask.id,
        ...optimizationData,
      }),
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
    // Require dates when type is 'experiment'
    start_date: (value) =>
      taskData.type === "experiment" && !value
        ? "Start date is required for experiment tasks"
        : "",
    due_date: (value) =>
      taskData.type === "experiment" && !value
        ? "Due date is required for experiment tasks"
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
    budget_pool: (value) =>
      !value || value === 0 ? "Budget pool is required" : "",
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

  const alertValidationRules = {
    alert_type: (value) => (!value ? "Alert type is required" : ""),
    severity: (value) => (!value ? "Severity is required" : ""),
  };

  const reportValidationRules = {
    audience_type: (value) => (!value ? "Audience is required" : ""),
    context: (value) => {
      if (!value || typeof value !== "object") {
        return "Context is required";
      }
      if (!value.situation || value.situation.trim() === "") {
        return "Situation is required";
      }
      return "";
    },
    outcome_summary: (value) =>
      !value || (typeof value === "string" && value.trim() === "")
        ? "Outcome summary is required"
        : "",
    narrative_explanation: () => "",
    key_actions: (value) => {
      if (!Array.isArray(value)) return "";
      if (value.length > 6) return "Maximum 6 key actions allowed.";
      const empty = value.some((t) => !t || (typeof t === "string" && !t.trim()));
      return empty ? "Each key action must have text." : "";
    },
  };

  const communicationValidationRules = {
    communication_type: (value) => {
      if (!value || value.trim() === "") {
        return "Communication type is required";
      }
      return "";
    },
    impacted_areas: (value) => {
      if (!Array.isArray(value) || value.length === 0) {
        return "Select at least one impacted area";
      }
      return "";
    },
    required_actions: (value) => {
      if (!value || value.trim() === "") {
        return "Required actions are required";
      }
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
  const alertValidation = useFormValidation(alertValidationRules);
  const reportValidation = useFormValidation(reportValidationRules);
  const communicationValidation = useFormValidation(
    communicationValidationRules
  );

  // Assign validation hooks to config
  taskTypeConfig.budget.validation = budgetValidation;
  taskTypeConfig.asset.validation = assetValidation;
  taskTypeConfig.retrospective.validation = retrospectiveValidation;
  taskTypeConfig.alert.validation = alertValidation;
  taskTypeConfig.report.validation = reportValidation;
  taskTypeConfig.communication.validation = communicationValidation;

  // Filter tasks by search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return parentTasksOnly;

    const query = searchQuery.toLowerCase();
    return parentTasksOnly.filter(
      (task) =>
        task.summary?.toLowerCase().includes(query) ||
        task.description?.toLowerCase().includes(query) ||
        task.id?.toString().includes(query) ||
        task.owner?.username?.toLowerCase().includes(query) ||
        task.project?.name?.toLowerCase().includes(query) ||
        task.status?.toLowerCase().includes(query) ||
        task.type?.toLowerCase().includes(query)
    );
  }, [parentTasksOnly, searchQuery]);

  const tasksByType = useMemo(() => {
    const grouped = {
      budget: [],
      asset: [],
      retrospective: [],
      report: [],
      scaling: [],
      alert: [],
      experiment: [],
      optimization: [],
      communication: [],
    };

    if (!filteredTasks) return grouped;

    filteredTasks.forEach((task) => {
      if (grouped[task.type]) {
        grouped[task.type].push(task);
      }
    });

    return grouped;
  }, [filteredTasks]);

  const boardColumns = useMemo(
    () => [
      { key: "budget", title: "To Do", empty: "No budget tasks found" },
      { key: "asset", title: "In Progress", empty: "No asset tasks found" },
      {
        key: "retrospective",
        title: "In Review",
        empty: "No retrospective tasks found",
      },
      { key: "report", title: "Done", empty: "No report tasks found" },
      { key: "scaling", title: "Scaling", empty: "No scaling tasks found" },
      {
        key: "communication",
        title: "Communication",
        empty: "No communication tasks found",
      },
      {
        key: "experiment",
        title: "Experiment",
        empty: "No experiment tasks found",
      },
      {
        key: "optimization",
        title: "Optimization",
        empty: "No optimization tasks found",
      },
      { key: "alert", title: "Alert", empty: "No alert tasks found" },
    ],
    []
  );

  const getTicketKey = (task) => {
    if (!task?.id) return "TASK-NEW";
    const prefix = (task.type || "TASK").toUpperCase().slice(0, 4);
    return `${prefix}-${task.id}`;
  };

  const getBoardTypeIcon = (type) => {
    switch (type) {
      case "alert":
        return "bug";
      case "experiment":
      case "optimization":
        return "story";
      default:
        return "task";
    }
  };

  const formatBoardDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDueTone = (dateString) => {
    if (!dateString) return "default";
    const due = new Date(dateString);
    if (Number.isNaN(due.getTime())) return "default";
    const today = new Date();
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const todayDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    if (dueDay < todayDay) return "danger";
    return "warning";
  };

  const startBoardEdit = (task) => {
    if (!task?.id) return;
    setEditingTaskId(task.id);
    setEditingSummary(task.summary || "");
  };

  const cancelBoardEdit = () => {
    setEditingTaskId(null);
    setEditingSummary("");
  };

  const saveBoardEdit = (task) => {
    if (!task?.id) return;
    updateTask(task.id, { ...task, summary: editingSummary });
    setEditingTaskId(null);
  };

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

  const handleAlertDataChange = (newAlertData) => {
    setAlertData((prev) => ({ ...prev, ...newAlertData }));
  };

  const handleBudgetPoolDataChange = (newBudgetPoolData) => {
    setBudgetPoolData((prev) => ({ ...prev, ...newBudgetPoolData }));
  };

  const handleReportDataChange = (newReportData) => {
    setReportData((prev) => ({ ...prev, ...newReportData }));
  };

  const handleCommunicationDataChange = (newCommunicationData) => {
    setCommunicationData((prev) => ({
      ...prev,
      ...newCommunicationData,
    }));
  };

  // Handle task card click
  const handleTaskClick = (task) => {
    // Navigate to task detail page without preserving list view query params
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
    const defaultDates = getDefaultTaskDates();
    setTaskData({
      project_id: projectId ?? null,
      type: "",
      summary: "",
      description: "",
      current_approver_id: null,
      start_date: defaultDates.start_date,
      due_date: defaultDates.due_date,
    });
    setBudgetData({
      amount: "",
      currency: "",
      ad_channel: null,
      notes: "",
      budget_pool: null,
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
    setScalingPlanData({});
    setAlertData({
      alert_type: "spend_spike",
      severity: "medium",
      status: "open",
      metric_key: "spend",
      change_type: "percent",
      change_value: "",
      change_window: "daily",
      current_value: "",
      previous_value: "",
      affected_entities: [],
      assigned_to: "",
      acknowledged_by: "",
      investigation_assumption: "",
      investigation_notes: "",
      resolution_actions: [],
      resolution_notes: "",
      related_references: [],
      postmortem_root_cause: "",
      postmortem_prevention: "",
    });
    setExperimentData({});
    setOptimizationData({});
    setReportData({
      audience_type: "client",
      audience_details: "",
      context: {
        reporting_period: null,
        situation: "",
        what_changed: "",
      },
      outcome_summary: "",
      narrative_explanation: "",
      key_actions: [],
    });
    setCommunicationData({
      communication_type: "",
      stakeholders: "",
      impacted_areas: [],
      required_actions: "",
      client_deadline: null,
      notes: "",
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
    alertValidation.clearErrors();
    reportValidation.clearErrors();
  };

  // Open create task modal with fresh form state
  const handleOpenCreateTaskModal = () => {
    resetFormData();
    clearAllValidationErrors();
    setCreateModalOpen(true);
  };

  // Submit method to create task and related objects
  const handleSubmit = async () => {
    console.log(
      "Submitting task creation form with data11:",
      isSubmitting,
      taskData
    );
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

    // Report: require audience_details when audience is "other"
    if (
      taskData.type === "report" &&
      reportData.audience_type === "other" &&
      !(reportData.audience_details || "").trim()
    ) {
      reportValidation.setErrors({
        audience_details:
          "Audience details are required when audience is Other.",
      });
      toast.error("Audience details are required when audience is Other.");
      return;
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
        start_date: taskData.start_date || null,
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

      // Step 3: Link the task to the specific type object (or update store for report — backend already links)
        if (createdObject && config?.contentType) {
          if (taskData.type === "report") {
            // Create key actions after report (backend does not accept key_actions on report create)
            const keyActions = reportData.key_actions || [];
            if (keyActions.length > 0) {
              try {
                for (let i = 0; i < keyActions.length; i++) {
                  const text =
                    typeof keyActions[i] === "string"
                      ? keyActions[i].trim()
                      : "";
                  if (text) {
                    await ReportAPI.createKeyAction(createdObject.id, {
                      order_index: i + 1,
                      action_text: text,
                    });
                  }
                }
              } catch (keyActionError) {
                console.error("Failed to create some key actions:", keyActionError);
                toast.error("Report created but some key actions could not be saved.");
              }
            }
            updateTask(createdTask.id, {
              ...createdTask,
              content_type: "reporttask",
              object_id: createdObject.id.toString(),
              linked_object: createdObject,
            });
          } else {
          console.log(`Linking task to ${taskData.type}`, {
            taskId: createdTask.id,
            contentType: config.contentType,
            objectId: createdObject.id,
            createdObject: createdObject,
          });

          try {
            const linkResponse = await TaskAPI.linkTask(
              createdTask.id,
              config.contentType,
              createdObject.id.toString()
            );

            console.log("Link task response:", linkResponse);

            updateTask(createdTask.id, {
              ...createdTask,
              content_type: config.contentType,
              object_id: createdObject.id.toString(),
              linked_object: createdObject,
            });

            console.log("Task linked to task type object successfully");
          } catch (linkError) {
            console.error("Error linking task to object:", linkError);
            console.error("Link error details:", {
              response: linkError.response,
              data: linkError.response?.data,
              status: linkError.response?.status,
              message: linkError.message,
            });
            const errorMsg =
              linkError.response?.data?.error ||
              linkError.response?.data?.message ||
              linkError.message ||
              "Unknown error";
            toast.error(`Asset created, but failed to link to task: ${errorMsg}`);
          }
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
        // Handle validation errors - check for common fields first
        const errorData = error.response.data;
        
        // Collect all error messages
        const errorMessages = [];
        
        // Check for specific field errors
        const fieldMappings = {
          campaign: "Campaign",
          scheduled_at: "Scheduled at",
          status: "Status",
          project_id: "Project",
          current_approver_id: "Approver",
          type: "Task type",
          summary: "Summary",
          impacted_areas: "Impacted areas",
          communication_type: "Communication type",
          required_actions: "Required actions",
        };
        
        for (const [field, label] of Object.entries(fieldMappings)) {
          if (errorData[field]) {
            const fieldError = Array.isArray(errorData[field])
              ? errorData[field][0]
              : errorData[field];
            errorMessages.push(`${label}: ${fieldError}`);
          }
        }
        
        // Handle non_field_errors if present
        if (errorData.non_field_errors) {
          const nonFieldErrors = Array.isArray(errorData.non_field_errors)
            ? errorData.non_field_errors
            : [errorData.non_field_errors];
          errorMessages.push(...nonFieldErrors);
        }
        
        // Handle generic error/message fields
        if (errorData.error) {
          errorMessages.push(errorData.error);
        } else if (errorData.message) {
          errorMessages.push(errorData.message);
        }
        
        // If no specific errors found, try to extract from object
        if (errorMessages.length === 0 && typeof errorData === "object") {
          const firstError = Object.values(errorData)[0];
          if (Array.isArray(firstError)) {
            errorMessages.push(firstError[0] || "Validation error");
          } else if (typeof firstError === "string") {
            errorMessages.push(firstError);
          } else if (typeof firstError === "object") {
            errorMessages.push("Validation error: " + JSON.stringify(firstError));
          } else {
            errorMessages.push(String(firstError) || "Validation error");
          }
        }
        
        errorMessage = errorMessages.length > 0 
          ? errorMessages.join(". ") 
          : "Validation error occurred";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit method to create budget pool
  const handleSubmitBudgetPool = async () => {
    console.log("Submitting budget pool form with data:", budgetPoolData);
    // Validate budget pool form
    const isValid = budgetPoolValidation.validateForm(budgetPoolData, [
      "project",
      "ad_channel",
      "total_amount",
      "currency",
    ]);

    if (!isValid) {
      console.log("Validation failed, returning early");
      return;
    }

    try {
      // Create budget pool
      console.log("Creating budget pool with data:", budgetPoolData);
      const createdBudgetPool = await createBudgetPool(budgetPoolData);
      console.log("Budget pool created successfully:", createdBudgetPool);

      // Show success message
      toast.success("Budget pool created successfully!");

      // Refresh budget pools list by incrementing trigger
      setBudgetPoolRefreshTrigger((prev) => prev + 1);

      // Automatically select the newly created budget pool if it matches current filters
      if (
        createdBudgetPool.project === taskData.project_id &&
        createdBudgetPool.ad_channel === budgetData.ad_channel &&
        createdBudgetPool.currency === budgetData.currency
      ) {
        handleBudgetDataChange({
          ...budgetData,
          budget_pool: createdBudgetPool.id,
        });
      }

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
      toast.error("Failed to create budget pool. Please try again.");
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
    // Pre-fill the budget pool form with the current project and selected currency/ad_channel
    setBudgetPoolData({
      project: taskData.project_id,
      ad_channel: budgetData.ad_channel,
      total_amount: "",
      currency: budgetData.currency || "",
    });
    setCreateBudgetPoolModalOpen(true);
    setCreateModalOpen(false);
    setManageBudgetPoolsModalOpen(false);
  };

  const handleManageBudgetPools = () => {
    setManageBudgetPoolsModalOpen(true);
    setCreateModalOpen(false);
    setCreateBudgetPoolModalOpen(false);
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
          <div className="mb-8">
            <div className="flex flex-row gap-4 items-center mb-4">
              <h1 className="text-3xl font-bold text-gray-900">
                {projectId
                  ? `${selectedProject?.name || "Project"} - Tasks`
                  : "Select a project to enter tasks"}
              </h1>
              {projectId && (
                <button
                  onClick={handleOpenCreateTaskModal}
                  className="px-3 py-1.5 rounded text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Create Task
                </button>
              )}
            </div>

            {projectId && (
              <div className="mb-4 border-b border-gray-200">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab("summary")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "summary"
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Summary
                  </button>
                  <button
                    onClick={() => setActiveTab("tasks")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "tasks"
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Tasks
                  </button>
                  <button
                    onClick={() => setActiveTab("board")}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === "board"
                        ? "border-indigo-600 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    Board
                  </button>
                </nav>
              </div>
            )}

            {projectId && (
              <div className="mb-6 rounded-xl border border-gray-200 bg-gradient-to-r from-white via-white to-indigo-50/60 p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-gray-900">
                      Project selected
                    </div>
                    <p className="text-sm text-gray-600">
                      Switch projects to see a different task workspace.
                    </p>
                    <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
                      {`Current project: #${projectId} ${
                        projectOptions.find((project) => project.id === projectId)
                          ?.name || "Unknown"
                      }`}
                    </div>
                  </div>
                  <div className="w-full sm:max-w-xs">
                    <button
                      type="button"
                      onClick={() => router.push("/tasks")}
                      className="flex w-full items-center justify-center rounded-lg border border-indigo-200 bg-white px-3 py-2 text-sm font-medium text-indigo-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/40"
                    >
                      Switch project
                    </button>
                    {projectOptionsError && (
                      <p className="mt-2 text-sm text-red-600">{projectOptionsError}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {projectId ? (
              activeTab === "tasks" ? (
                <>
                  {/* Search Bar and View Toggle */}
                  <div className="flex flex-row gap-4 items-center">
                  {/* Search Bar */}
                  <div className="flex-1 max-w-md">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Search tasks..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  {/* View Toggle */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setViewMode("broad")}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        viewMode === "broad"
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Broad View
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        viewMode === "list"
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      List View
                    </button>
                    <button
                      onClick={() => setViewMode("timeline")}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        viewMode === "timeline"
                          ? "bg-indigo-600 text-white"
                          : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      Timeline View
                    </button>
                  </div>
                </div>
                </>
              ) : null
            ) : (
              <div className="relative overflow-hidden rounded-[28px] border border-slate-100 bg-white shadow-[0_25px_80px_rgba(15,23,42,0.12)]">
                <div className="pointer-events-none absolute inset-0">
                  <div className="absolute -right-24 -top-20 h-64 w-64 rounded-full bg-sky-100/70 blur-[90px]" />
                  <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-indigo-100/70 blur-[90px]" />
                </div>
                <div className="relative border-b border-slate-100 px-6 py-6">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-sky-50" />
                  <div className="absolute -left-10 -top-14 h-32 w-32 rounded-full bg-indigo-100/70 blur-2xl" />
                  <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-indigo-100 bg-white text-indigo-600 shadow-sm">
                        <svg
                          className="h-5 w-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h7"
                          />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          Select project
                        </h2>
                        <p className="text-sm text-gray-500">
                          Choose a project to load its tasks.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2" />
                  </div>
                </div>

                <div className="border-b border-slate-100 px-6 py-4">
                  <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-300">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                    </div>
                    <input
                      type="text"
                      value={projectSearchQuery}
                      onChange={(event) =>
                        setProjectSearchQuery(event.target.value)
                      }
                      placeholder="Search by project name or ID..."
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 py-3 pl-9 pr-3 text-sm text-gray-900 shadow-sm transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                </div>

                <div className="max-h-[65vh] overflow-y-auto px-6 py-4">
                  {projectOptionsLoading && (
                    <div className="py-8 text-center text-sm text-gray-500">
                      Loading projects...
                    </div>
                  )}
                  {!projectOptionsLoading && projectOptionsError && (
                    <div className="py-8 text-center text-sm text-red-600">
                      {projectOptionsError}
                    </div>
                  )}
                  {!projectOptionsLoading &&
                    !projectOptionsError &&
                    filteredProjects.length === 0 && (
                      <div className="py-8 text-center text-sm text-gray-500">
                        No projects found.
                      </div>
                    )}
                  {!projectOptionsLoading &&
                    !projectOptionsError &&
                    filteredProjects.length > 0 && (
                      <div className="mb-3 hidden grid-cols-[24px,minmax(0,2fr),minmax(0,1fr),minmax(0,1fr),minmax(0,0.9fr)] items-center gap-3 border-b border-slate-200 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400 sm:grid">
                        <span />
                        <span>Name</span>
                        <span>Key</span>
                        <span>Lead</span>
                        <span>Status</span>
                      </div>
                    )}
                  {!projectOptionsLoading &&
                    !projectOptionsError &&
                    pinnedProjects.length > 0 && (
                      <div className="mb-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
                          Pinned
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                            top
                          </span>
                        </div>
                        {pinnedProjects.map((project) => (
                          <button
                            key={`pinned-${project.id}`}
                            onClick={() => handlePickProject(project.id)}
                            className="group mb-3 w-full rounded-2xl border border-amber-200 bg-amber-50/40 px-4 py-3 text-left transition hover:-translate-y-[1px] hover:border-amber-300 hover:bg-amber-50/60 hover:shadow-md"
                          >
                            <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[24px,minmax(0,2fr),minmax(0,1fr),minmax(0,1fr),minmax(0,0.9fr)] sm:items-center sm:gap-3">
                              <div
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-amber-200 bg-amber-50 text-amber-600"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  togglePinProject(project.id);
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label="Unpin project"
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    togglePinProject(project.id);
                                  }
                                }}
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.2 3.69a1 1 0 00.95.69h3.882c.969 0 1.371 1.24.588 1.81l-3.141 2.282a1 1 0 00-.364 1.118l1.2 3.69c.3.921-.755 1.688-1.54 1.118l-3.14-2.282a1 1 0 00-1.176 0l-3.14 2.282c-.785.57-1.84-.197-1.54-1.118l1.2-3.69a1 1 0 00-.364-1.118L2.43 9.117c-.783-.57-.38-1.81.588-1.81H6.9a1 1 0 00.95-.69l1.2-3.69z" />
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-semibold text-slate-900">
                                    {project.name || "Untitled Project"}
                                  </span>
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                    Pinned
                                  </span>
                                </div>
                                <div className="mt-1 truncate text-xs text-slate-500">
                                  {project.description || "No description"}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500">
                                <span className="sm:hidden">Key: </span>
                                <span className="font-medium text-slate-700">
                                  P-{project.id}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                <span className="sm:hidden">Lead: </span>
                                {project.owner?.name ||
                                  project.owner?.username ||
                                  project.owner?.email ||
                                  "Unassigned"}
                              </div>
                              <div className="text-xs">
                                <span className="sm:hidden">Status: </span>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    project.is_active
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {project.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  {!projectOptionsLoading &&
                    !projectOptionsError &&
                    recentProjects.length > 0 && (
                      <div className="mb-4">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Recent
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            last opened
                          </span>
                        </div>
                        {recentProjects.map((project) => (
                          <button
                            key={`recent-${project.id}`}
                            onClick={() => handlePickProject(project.id)}
                            className="group mb-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:-translate-y-[1px] hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-md"
                          >
                            <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[24px,minmax(0,2fr),minmax(0,1fr),minmax(0,1fr),minmax(0,0.9fr)] sm:items-center sm:gap-3">
                              <div
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  togglePinProject(project.id);
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label="Pin project"
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    togglePinProject(project.id);
                                  }
                                }}
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 5l7 7M4 4l8 0 0 8"
                                  />
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-semibold text-slate-900">
                                    {project.name || "Untitled Project"}
                                  </span>
                                </div>
                                <div className="mt-1 truncate text-xs text-slate-500">
                                  {project.description || "No description"}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500">
                                <span className="sm:hidden">Key: </span>
                                <span className="font-medium text-slate-700">
                                  P-{project.id}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                <span className="sm:hidden">Lead: </span>
                                {project.owner?.name ||
                                  project.owner?.username ||
                                  project.owner?.email ||
                                  "Unassigned"}
                              </div>
                              <div className="text-xs">
                                <span className="sm:hidden">Status: </span>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    project.is_active
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {project.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  {!projectOptionsLoading &&
                    !projectOptionsError &&
                    otherProjects.length > 0 && (
                      <div>
                        {recentProjects.length > 0 && (
                          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                            All projects
                          </div>
                        )}
                        {otherProjects.map((project) => (
                          <button
                            key={project.id}
                            onClick={() => handlePickProject(project.id)}
                            className="group mb-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:-translate-y-[1px] hover:border-indigo-200 hover:bg-indigo-50/40 hover:shadow-md"
                          >
                            <div className="flex flex-col gap-2 sm:grid sm:grid-cols-[24px,minmax(0,2fr),minmax(0,1fr),minmax(0,1fr),minmax(0,0.9fr)] sm:items-center sm:gap-3">
                              <div
                                className="flex h-6 w-6 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  togglePinProject(project.id);
                                }}
                                role="button"
                                tabIndex={0}
                                aria-label="Pin project"
                                onKeyDown={(event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault();
                                    togglePinProject(project.id);
                                  }
                                }}
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 5l7 7M4 4l8 0 0 8"
                                  />
                                </svg>
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="truncate text-sm font-semibold text-slate-900">
                                    {project.name || "Untitled Project"}
                                  </span>
                                </div>
                                <div className="mt-1 truncate text-xs text-slate-500">
                                  {project.description || "No description"}
                                </div>
                              </div>
                              <div className="text-xs text-slate-500">
                                <span className="sm:hidden">Key: </span>
                                <span className="font-medium text-slate-700">
                                  P-{project.id}
                                </span>
                              </div>
                              <div className="text-xs text-slate-500">
                                <span className="sm:hidden">Lead: </span>
                          {project.owner?.name ||
                            project.owner?.username ||
                            project.owner?.email ||
                            "Unassigned"}
                              </div>
                              <div className="text-xs">
                                <span className="sm:hidden">Status: </span>
                                <span
                                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                    project.is_active
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-slate-100 text-slate-600"
                                  }`}
                                >
                                  {project.is_active ? "Active" : "Inactive"}
                                </span>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>

          {projectId && activeTab === "summary" && (
            <div className="mt-6 space-y-6">
              <ProjectSummaryPanel
                projectId={projectId}
                projectName={selectedProject?.name}
                showViewAllLink={false}
              />

              {boardLoading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading board...</p>
                </div>
              )}

              {!boardLoading && boardError && (
                <div className="text-center py-8">
                  <p className="text-red-600">{boardError}</p>
                  <button
                    onClick={fetchBoardData}
                    className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!boardLoading && !boardError && boardData && (
                <>
                  <TimeMetricsCards metrics={boardData.time_metrics} />

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-[320px] flex flex-col">
                      <div className="mb-3">
                        <h3 className="text-base font-semibold text-gray-900">
                          Status overview
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          Get a snapshot of the status of your work items.
                        </p>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <StatusOverviewChart data={boardData.status_overview} />
                      </div>
                    </div>

                    <div
                      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col ${
                        isBoardRecentExpanded ? "h-[480px]" : "h-[320px]"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">
                            Recent activity
                          </h3>
                          <p className="text-xs text-gray-600 mt-1">
                            Stay up to date with what&apos;s happening.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setIsBoardRecentExpanded((prev) => !prev)
                          }
                          className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                        >
                          {isBoardRecentExpanded ? "Show less" : "Show more"}
                        </button>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <RecentActivityFeed
                          activities={boardData.recent_activity}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-[320px] flex flex-col">
                      <div className="mb-3">
                        <h3 className="text-base font-semibold text-gray-900">
                          Priority breakdown
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          See how priorities stack up for this project.
                        </p>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <PriorityBreakdownChart
                          data={boardData.priority_breakdown}
                        />
                      </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 h-[320px] flex flex-col">
                      <div className="mb-3">
                        <h3 className="text-base font-semibold text-gray-900">
                          Types of work
                        </h3>
                        <p className="text-xs text-gray-600 mt-1">
                          Track how work types are distributed.
                        </p>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <TypesOfWorkChart data={boardData.types_of_work} />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {projectId && activeTab === "board" && (
            <div className="mt-6 space-y-6">
              <JiraBoardView
                boardColumns={boardColumns}
                tasksByType={tasksByType}
                onCreateTask={handleOpenCreateTaskModal}
                onTaskClick={handleTaskClick}
                getTicketKey={getTicketKey}
                getBoardTypeIcon={getBoardTypeIcon}
                formatBoardDate={formatBoardDate}
                getDueTone={getDueTone}
                editingTaskId={editingTaskId}
                editingSummary={editingSummary}
                setEditingSummary={setEditingSummary}
                startBoardEdit={startBoardEdit}
                cancelBoardEdit={cancelBoardEdit}
                saveBoardEdit={saveBoardEdit}
              />
            </div>
          )}

          {/* Loading State */}
          {projectId && activeTab === "tasks" && tasksLoading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading tasks...</p>
            </div>
          )}

          {/* Error State */}
          {projectId && activeTab === "tasks" && tasksError && (
            <div className="text-center py-8">
              <p className="text-red-600">
                Error loading tasks: {tasksError.message}
              </p>
              <button
                onClick={() => {
                  if (projectId) {
                    fetchTasks({ project_id: projectId });
                  } else {
                    fetchTasks();
                  }
                }}
                className="mt-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Tasks Display */}
          {!tasksLoading &&
            !tasksError &&
            projectId &&
            activeTab === "tasks" && (
            <>
              {viewMode === "list" ? (
                /* List View */
                <TaskListView
                  tasks={parentTasksOnly}
                  onTaskClick={handleTaskClick}
                  onTaskUpdate={async () => {
                    if (projectId) {
                      await fetchTasks({ project_id: projectId });
                    } else {
                      await reloadTasks();
                    }
                  }}
                  searchQuery={searchQuery}
                />
              ) : viewMode === "timeline" ? (
                <TimelineView
                  tasks={parentTasksOnly}
                  onTaskClick={handleTaskClick}
                  reloadTasks={async () => {
                    if (projectId) {
                      await fetchTasks({ project_id: projectId });
                    } else {
                      await reloadTasks();
                    }
                  }}
                  onCreateTask={(projectIdOverride) => {
                    if (projectIdOverride) {
                      setTaskData((prev) => ({
                        ...prev,
                        project_id: projectIdOverride,
                      }));
                    }
                    handleOpenCreateTaskModal();
                  }}
                />
              ) : (
                /* Broad View */
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
                              onDelete={async (taskId) => {
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

                  {/* Row 2: Report / Scaling / Communication Tasks */}
                  <div className="flex flex-row gap-6">
                    {/* Report Tasks */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

                    {/* Scaling Tasks */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Scaling Tasks
                        </h2>
                        <span className="px-2 py-1 bg-teal-100 text-teal-800 text-xs font-medium rounded-full">
                          {tasksByType.scaling?.length || 0}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {(tasksByType.scaling?.length || 0) === 0 ? (
                          <p className="text-gray-500 text-sm">
                            No scaling tasks found
                          </p>
                        ) : (
                          tasksByType.scaling.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onClick={handleTaskClick}
                            />
                          ))
                        )}
                      </div>
                    </div>

                    {/* Communication Tasks */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Communication Tasks
                        </h2>
                        <span className="px-2 py-1 bg-pink-100 text-pink-800 text-xs font-medium rounded-full">
                          {tasksByType.communication?.length || 0}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {(tasksByType.communication?.length || 0) === 0 ? (
                          <p className="text-gray-500 text-sm">
                            No communication tasks found
                          </p>
                        ) : (
                          tasksByType.communication.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onClick={handleTaskClick}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Row 3: Experiment / Optimization / Alert Tasks */}
                  <div className="flex flex-row gap-6">
                    {/* Experiment Tasks */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Experiment Tasks
                        </h2>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                          {tasksByType.experiment?.length || 0}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {(tasksByType.experiment?.length || 0) === 0 ? (
                          <p className="text-gray-500 text-sm">
                            No experiment tasks found
                          </p>
                        ) : (
                          tasksByType.experiment.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onClick={handleTaskClick}
                            />
                          ))
                        )}
                      </div>
                    </div>

                    {/* Optimization Tasks */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Optimization Tasks
                        </h2>
                        <span className="px-2 py-1 bg-cyan-100 text-cyan-800 text-xs font-medium rounded-full">
                          {tasksByType.optimization?.length || 0}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {(tasksByType.optimization?.length || 0) === 0 ? (
                          <p className="text-gray-500 text-sm">
                            No optimization tasks found
                          </p>
                        ) : (
                          tasksByType.optimization.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onClick={handleTaskClick}
                            />
                          ))
                        )}
                      </div>
                    </div>

                    {/* Alert Tasks */}
                    <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Alert Tasks
                        </h2>
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
                          {tasksByType.alert?.length || 0}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {(tasksByType.alert?.length || 0) === 0 ? (
                          <p className="text-gray-500 text-sm">
                            No alert tasks found
                          </p>
                        ) : (
                          tasksByType.alert.map((task) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onClick={handleTaskClick}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Project picker now renders as full page when no project is selected */}

      {/* Create Task Modal */}
      <Modal isOpen={createModalOpen} onClose={() => {}}>
        <div className="flex flex-col bg-white rounded-md max-h-[90vh] overflow-hidden">
          {/* Header - Fixed */}
          <div className="flex flex-col gap-2 px-8 pt-8 pb-4 border-b border-gray-200">
            <h2 className="text-lg font-bold">New Task Form</h2>
            <p className="text-sm text-gray-500">
              Required fields are marked with an asterisk *
            </p>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-10">
            {/* Task info */}
            <NewTaskForm
              onTaskDataChange={handleTaskDataChange}
              taskData={taskData}
              validation={taskValidation}
              lockProject={Boolean(projectId)}
              projectName={selectedProject?.name}
            />

            {/* Task Type specific forms - conditionally render based on chosen task type */}
            {taskType === "budget" && (
              <NewBudgetRequestForm
                onBudgetDataChange={handleBudgetDataChange}
                budgetData={budgetData}
                taskData={taskData}
                validation={budgetValidation}
                onCreateBudgetPool={handleCreateBudgetPool}
                onManageBudgetPools={handleManageBudgetPools}
                refreshTrigger={budgetPoolRefreshTrigger}
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
              <ReportForm
                mode="create"
                initialData={reportData}
                onChange={handleReportDataChange}
              />
            )}

            {taskType === "alert" && (
              <AlertTaskForm
                initialData={alertData}
                onChange={handleAlertDataChange}
                projectId={taskData.project_id}
              />
            )}

            {taskType === "communication" && (
              <NewClientCommunicationForm
                communicationData={communicationData}
                onCommunicationDataChange={handleCommunicationDataChange}
                validation={communicationValidation}
              />
            )}

            {taskType === "scaling" && (
              <ScalingPlanForm
                mode="create"
                initialPlan={scalingPlanData}
                onChange={setScalingPlanData}
              />
            )}

            {taskType === "experiment" && (
              <ExperimentForm
                mode="create"
                initialData={experimentData}
                onChange={setExperimentData}
              />
            )}

            {taskType === "optimization" && (
              <OptimizationForm
                mode="create"
                initialData={optimizationData}
                onChange={setOptimizationData}
              />
            )}
          </div>

          {/* Footer - Fixed */}
          <div className="flex flex-row justify-center gap-4 px-8 py-6 border-t border-gray-200">
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

      {/* Manage Budget Pools Modal */}
      <Modal
        isOpen={manageBudgetPoolsModalOpen}
        onClose={() => {
          setManageBudgetPoolsModalOpen(false);
          setCreateModalOpen(true);
        }}
      >
        <div className="flex flex-col justify-center items-center p-8 gap-6 bg-white rounded-md min-w-[600px]">
          {/* Header */}
          <div className="flex flex-col gap-2 w-full">
            <h2 className="text-lg font-bold">Manage Budget Pools</h2>
            <p className="text-sm text-gray-500">
              View, select, and manage all budget pools
            </p>
          </div>

          {/* Budget Pool List */}
          <div className="w-full">
            <BudgetPoolList
              projectId={taskData.project_id}
              onCreatePool={handleCreateBudgetPool}
              refreshTrigger={budgetPoolRefreshTrigger}
            />
          </div>

          {/* Close Button */}
          <div className="flex flex-row justify-end gap-4 w-full">
            <button
              onClick={() => {
                setManageBudgetPoolsModalOpen(false);
                setCreateModalOpen(true);
              }}
              className="px-3 py-1.5 rounded text-white bg-gray-500 hover:bg-gray-600"
            >
              Back to Task Creation
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Budget Pool Modal */}
      <Modal
        isOpen={createBudgetPoolModalOpen}
        onClose={() => {
          setCreateBudgetPoolModalOpen(false);
          setManageBudgetPoolsModalOpen(true);
        }}
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
            onSubmit={(formData) => {
              // Update budgetPoolData with latest form data before submission
              console.log("onSubmit called with formData:", formData);
              setBudgetPoolData(formData);
              // Use setTimeout to ensure state is updated before validation
              setTimeout(() => {
                handleSubmitBudgetPool();
              }, 0);
            }}
          />

          {/* Validation Errors Display */}
          {Object.keys(budgetPoolValidation.errors).length > 0 && (
            <div className="w-full p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              <p className="text-sm font-semibold mb-2">Validation Errors:</p>
              <ul className="list-disc list-inside text-sm">
                {Object.entries(budgetPoolValidation.errors).map(
                  ([field, error]) =>
                    error ? (
                      <li key={field}>
                        {field}: {error}
                      </li>
                    ) : null
                )}
              </ul>
            </div>
          )}

          {/* API Error Display */}
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
              onClick={() => {
                setCreateBudgetPoolModalOpen(false);
                setManageBudgetPoolsModalOpen(true);
              }}
              className="px-3 py-1.5 rounded text-white bg-gray-500 hover:bg-gray-600"
            >
              Back
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                console.log("Submit button clicked");
                // Get the latest form data from the form element
                const form = e.target
                  .closest(".flex.flex-col")
                  ?.querySelector("form");
                if (form) {
                  const formData = new FormData(form);
                  const latestData = {
                    project:
                      budgetPoolData.project ||
                      Number(form.querySelector('[name="project"]')?.value) ||
                      null,
                    ad_channel:
                      budgetPoolData.ad_channel ||
                      Number(
                        form.querySelector('[name="ad_channel"]')?.value
                      ) ||
                      null,
                    total_amount:
                      budgetPoolData.total_amount ||
                      form.querySelector('[name="total_amount"]')?.value ||
                      "",
                    currency:
                      budgetPoolData.currency ||
                      form.querySelector('[name="currency"]')?.value ||
                      "",
                  };
                  console.log("Latest form data:", latestData);
                  setBudgetPoolData(latestData);
                  // Use setTimeout to ensure state is updated
                  setTimeout(() => {
                    handleSubmitBudgetPool();
                  }, 100);
                } else {
                  handleSubmitBudgetPool();
                }
              }}
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
