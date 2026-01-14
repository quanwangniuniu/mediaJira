"use client";

import { useEffect, useState, useMemo } from "react";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "../ui/accordion";
import { ScrollArea } from "../ui/scroll-area";
import { TaskData, TaskComment } from "@/types/task";
import { RemovablePicker } from "../ui/RemovablePicker";
import { ProjectAPI } from "@/lib/api/projectApi";
import { TaskAPI } from "@/lib/api/taskApi";
import { BudgetRequestData, BudgetPoolData } from "@/lib/api/budgetApi";
import { BudgetAPI } from "@/lib/api/budgetApi";
import { useBudgetData } from "@/hooks/useBudgetData";
import { useTaskStore } from "@/lib/taskStore";
import AssetDetail from "./AssetDetail";
import RetrospectiveDetail from "./RetrospectiveDetail";
import BudgetRequestDetail from "./BudgetRequestDetail";
import LinkedWorkItems from "./LinkedWorkItems";
import Subtasks from "./Subtasks";
import Attachments from "./Attachments";
import { toast } from "react-hot-toast";
import ScalingDetail from "./ScalingDetail";
import ExperimentDetail from "./ExperimentDetail";
import AlertDetail from "./AlertDetail";
import {
  OptimizationScalingAPI,
  ScalingPlan,
} from "@/lib/api/optimizationScalingApi";
import {
  ExperimentAPI,
  Experiment,
} from "@/lib/api/experimentApi";
import { ClientCommunicationAPI } from "@/lib/api/clientCommunicationApi";
import type {
  ClientCommunicationPayload,
} from "@/lib/api/clientCommunicationApi";
import { AlertingAPI, AlertTask } from "@/lib/api/alertingApi";

interface TaskDetailProps {
  task: TaskData;
  currentUser?: {
    id?: string | number;
    username: string;
    email: string;
  };
}

interface ApprovalRecord {
  id: number;
  task: number;
  approved_by: {
    id: number;
    username: string;
  };
  is_approved: boolean;
  comment: string;
  step_number: number;
  decided_time: string;
}

interface ClientCommunicationData
  extends Omit<ClientCommunicationPayload, "task"> {
  id: number;
  task: number;
  created_at?: string;
  updated_at?: string;
}

export default function TaskDetail({ task, currentUser }: TaskDetailProps) {
  const { updateTask } = useTaskStore();
  const { startReview: startBudgetReview, makeDecision: makeBudgetDecision } =
    useBudgetData();

  const [summaryDraft, setSummaryDraft] = useState(task.summary || "");
  const [descriptionDraft, setDescriptionDraft] = useState(
    task.description || ""
  );
  const [editingSummary, setEditingSummary] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);

  const [isReviewing, setIsReviewing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [showRevise, setShowRevise] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [loadingApprovers, setLoadingApprovers] = useState(false);
  const [approvers, setApprovers] = useState<
    { id: number; username: string; email: string }[]
  >([]);
  const [nextApprover, setNextApprover] = useState<string | null>(null);
  const [currentApproverId, setCurrentApproverId] = useState<string>(
    task.current_approver?.id?.toString() || ""
  );
  const [approvalHistory, setApprovalHistory] = useState<ApprovalRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reviewComment, setReviewComment] = useState("");
  // start_date and due_date
  const [startDateInput, setStartDateInput] = useState(task.start_date ?? "");
  const [dueDateInput, setDueDateInput] = useState(task.due_date ?? "");
  const [savingDates, setSavingDates] = useState(false);

  // Budget request and budget pool data
  const [budgetRequest, setBudgetRequest] = useState<BudgetRequestData | null>(
    null
  );
  const [budgetPool, setBudgetPool] = useState<BudgetPoolData | null>(null);
  const [loadingBudgetData, setLoadingBudgetData] = useState(false);

  const [taskComments, setTaskComments] = useState<TaskComment[]>([]);
  const [taskCommentsLoading, setTaskCommentsLoading] = useState(false);
  const [taskCommentsError, setTaskCommentsError] = useState<string | null>(
    null
  );
  const [taskCommentInput, setTaskCommentInput] = useState("");
  const [taskCommentSubmitting, setTaskCommentSubmitting] = useState(false);

  // Scaling plan data (for scaling tasks)
  const [scalingPlan, setScalingPlan] = useState<ScalingPlan | null>(null);
  const [scalingPlanLoading, setScalingPlanLoading] = useState(false);

  // Alert data (for alert tasks)
  const [alertTask, setAlertTask] = useState<AlertTask | null>(null);
  const [alertLoading, setAlertLoading] = useState(false);

  // Experiment data (for experiment tasks)
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [experimentLoading, setExperimentLoading] = useState(false);

  // Client communication data (for communication tasks)
  const [communication, setCommunication] =
    useState<ClientCommunicationData | null>(null);
  const [communicationLoading, setCommunicationLoading] = useState(false);
  const [communicationError, setCommunicationError] = useState<string | null>(
    null
  );

  useEffect(() => {
    setSummaryDraft(task.summary || "");
    setDescriptionDraft(task.description || "");
  }, [task.summary, task.description]);

  const handleSaveSummary = async () => {
    if (!task.id) return;
    try {
      setSavingSummary(true);
      const response = await TaskAPI.updateTask(task.id, {
        summary: summaryDraft,
      });
      updateTask(response.data);
      setEditingSummary(false);
    } catch (error) {
      console.error("Error updating task name:", error);
      toast.error("Failed to update task name.");
    } finally {
      setSavingSummary(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!task.id) return;
    try {
      setSavingDescription(true);
      const response = await TaskAPI.updateTask(task.id, {
        description: descriptionDraft,
      });
      updateTask(response.data);
      setEditingDescription(false);
    } catch (error) {
      console.error("Error updating task description:", error);
      toast.error("Failed to update task description.");
    } finally {
      setSavingDescription(false);
    }
  };

  const loadScalingPlan = async () => {
    if (!task.id || task.type !== "scaling") {
      setScalingPlan(null);
      return;
    }
    setScalingPlanLoading(true);
    try {
      let plan: ScalingPlan | null = null;
      if (task.content_type === "scalingplan" && task.object_id) {
        const planId = Number(task.object_id);
        if (!Number.isNaN(planId)) {
          const resp = await OptimizationScalingAPI.getScalingPlan(planId);
          plan = resp.data as any;
        }
      }
      if (!plan) {
        const resp = await OptimizationScalingAPI.listScalingPlans({
          task_id: task.id,
        });
        const plans = resp.data || [];
        plan = (plans[0] as any) || null;
      }
      setScalingPlan(plan);
    } catch (e) {
      console.error("Error loading scaling plan in TaskDetail:", e);
      setScalingPlan(null);
    } finally {
      setScalingPlanLoading(false);
    }
  };

  const loadAlertTask = async () => {
    if (!task.id || task.type !== "alert") {
      setAlertTask(null);
      return;
    }
    setAlertLoading(true);
    try {
      let detail = null;
      if (task.content_type === "alerttask" && task.object_id) {
        const alertId = Number(task.object_id);
        if (!Number.isNaN(alertId)) {
          const resp = await AlertingAPI.getAlertTask(alertId);
          detail = resp.data as any;
        }
      }
      if (!detail) {
        const resp = await AlertingAPI.listAlertTasks({ task_id: task.id });
        const items = resp.data || [];
        const score = (item: AlertTask) => {
          let value = 0;
          if (item.affected_entities && item.affected_entities.length > 0) value += 3;
          if (item.related_references && item.related_references.length > 0) value += 2;
          if (item.investigation_notes) value += 2;
          if (item.resolution_steps) value += 2;
          if (item.postmortem_root_cause) value += 1;
          if (item.postmortem_prevention) value += 1;
          return value;
        };
        const sorted = [...items].sort((a, b) => {
          const scoreDiff = score(b) - score(a);
          if (scoreDiff !== 0) return scoreDiff;
          const aTime = Date.parse(a.updated_at || a.created_at || "");
          const bTime = Date.parse(b.updated_at || b.created_at || "");
          return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
        });
        detail = sorted[0] || null;
      }
      if (!detail) {
        try {
          const created = await AlertingAPI.createAlertTask({
            task: task.id,
            alert_type: "spend_spike",
            severity: "medium",
            status: "open",
          } as any);
          detail = created.data as any;
        } catch (createError) {
          const fallback = await AlertingAPI.listAlertTasks({ task_id: task.id });
          const items = fallback.data || [];
          const score = (item: AlertTask) => {
            let value = 0;
            if (item.affected_entities && item.affected_entities.length > 0) value += 3;
            if (item.related_references && item.related_references.length > 0) value += 2;
            if (item.investigation_notes) value += 2;
            if (item.resolution_steps) value += 2;
            if (item.postmortem_root_cause) value += 1;
            if (item.postmortem_prevention) value += 1;
            return value;
          };
          const sorted = [...items].sort((a, b) => {
            const scoreDiff = score(b) - score(a);
            if (scoreDiff !== 0) return scoreDiff;
            const aTime = Date.parse(a.updated_at || a.created_at || "");
            const bTime = Date.parse(b.updated_at || b.created_at || "");
            return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
          });
          detail = sorted[0] || null;
        }
      }
      setAlertTask(detail);
    } catch (e) {
      console.error("Error loading alert task in TaskDetail:", e);
      setAlertTask(null);
    } finally {
      setAlertLoading(false);
    }
  };

  const loadExperiment = async () => {
    if (!task.id || task.type !== "experiment") {
      setExperiment(null);
      return;
    }
    setExperimentLoading(true);
    try {
      let exp: Experiment | null = null;
      if (task.object_id) {
        const experimentId = Number(task.object_id);
        if (!Number.isNaN(experimentId)) {
          const resp = await ExperimentAPI.getExperiment(experimentId);
          exp = resp.data as any;
        }
      }
      if (!exp) {
        const resp = await ExperimentAPI.listExperiments({});
        const experiments = Array.isArray(resp.data) ? resp.data : (resp.data?.results || []);
        exp = experiments.find((e: Experiment) => e.task === task.id) || null;
      }
      setExperiment(exp);
    } catch (e) {
      console.error("Error loading experiment in TaskDetail:", e);
      setExperiment(null);
    } finally {
      setExperimentLoading(false);
    }
  };

  // Sync start_date and due_date with task data when task data changes
  useEffect(() => {
    setStartDateInput(task.start_date ?? "");
    setDueDateInput(task.due_date ?? "");
  }, [task.start_date, task.due_date]);

  // Sync current approver select with task data when current_approver changes
  useEffect(() => {
    setCurrentApproverId(task.current_approver?.id?.toString() || "");
  }, [task.current_approver?.id]);

  useEffect(() => {
    const loadTaskComments = async () => {
      if (!task.id) return;
      try {
        setTaskCommentsLoading(true);
        setTaskCommentsError(null);
        const list = await TaskAPI.getComments(task.id);
        setTaskComments(list);
      } catch (error: any) {
        console.error("Error loading task comments:", error);
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load comments. Please try again.";
        setTaskCommentsError(message);
      } finally {
        setTaskCommentsLoading(false);
      }
    };

    loadTaskComments();
  }, [task.id]);

  // Load scaling plan for scaling tasks
  useEffect(() => {
    if (task.type === "scaling") {
      loadScalingPlan();
    } else {
      setScalingPlan(null);
    }
  }, [task.id, task.type, task.content_type, task.object_id]);

  // Load alert details for alert tasks
  useEffect(() => {
    if (task.type === "alert") {
      loadAlertTask();
    } else {
      setAlertTask(null);
    }
  }, [task.id, task.type]);

  // Load experiment for experiment tasks
  useEffect(() => {
    if (task.type === "experiment") {
      loadExperiment();
    } else {
      setExperiment(null);
    }
  }, [task.id, task.type, task.object_id]);

  // Load client communication for communication tasks
  useEffect(() => {
    const loadCommunication = async () => {
      if (!task.id || task.type !== "communication") {
        setCommunication(null);
        return;
      }

      try {
        setCommunicationLoading(true);
        setCommunicationError(null);

        const resp = await ClientCommunicationAPI.listByTask(task.id);
        const data = (resp.data as any) || [];
        const list: ClientCommunicationData[] = Array.isArray(data)
          ? data
          : data.results || [];

        setCommunication(list[0] || null);
      } catch (error: any) {
        console.error("Error loading client communication:", error);
        const message =
          error?.response?.data?.detail ||
          error?.response?.data?.message ||
          error?.message ||
          "Failed to load client communication details.";
        setCommunicationError(message);
        setCommunication(null);
      } finally {
        setCommunicationLoading(false);
      }
    };

    loadCommunication();
  }, [task.id, task.type, task.content_type, task.object_id]);

  const handleSaveDates = async () => {
    try {
      setSavingDates(true);

      const response = await TaskAPI.updateTask(task.id!, {
        start_date: startDateInput || undefined,
        due_date: dueDateInput || undefined,
      });

      const updatedTask: TaskData = response.data;

      // Sync task object and global store
      Object.assign(task, updatedTask);
      updateTask(task.id!, updatedTask);

      // Sync input boxes again to prevent backend returning slightly different formats
      setStartDateInput(updatedTask.start_date ?? "");
      setDueDateInput(updatedTask.due_date ?? "");

      // Success toast
      toast.success("Dates saved successfully.");
    } catch (error: any) {
      console.error("Error updating task dates:", error);

      // Try to get a more friendly message from backend error
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update task dates. Please try again.";

      // Failure toast
      toast.error(message);
    } finally {
      setSavingDates(false);
    }
  };

  // Conditional rendering based on task status
  useEffect(() => {
    if (task.type === "asset") {
      setIsReviewing(false);
      setIsLocked(false);
      setShowRevise(false);
      return;
    }

    const canReview = canReviewTask();
    const canRevise = canReviseTask();

    if (task.status === "UNDER_REVIEW") {
      if (canReview) {
        setIsReviewing(true);
      } else {
        setIsReviewing(false);
      }
    } else if (task.status === "LOCKED") {
      setIsReviewing(false);
      setIsLocked(true);
    } else if (task.status === "REJECTED") {
      if (canRevise) {
        setShowRevise(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task.status, task.type, task.current_approver?.id, currentUser?.id]);

  // Get approvers list - project-based (same project as the task)
  useEffect(() => {
    const fetchApprovers = async () => {
      // If the task has no project yet, clear approver list
      if (!task.project?.id) {
        setApprovers([]);
        return;
      }

      try {
        setLoadingApprovers(true);
        const members = await ProjectAPI.getProjectMembers(task.project.id);
        const approverList =
          members?.map((member) => ({
            id: member.user.id,
            username: member.user.username || member.user.email || "",
            email: member.user.email || "",
          })) || [];
        setApprovers(approverList);
      } catch (error) {
        console.error("Error fetching approvers:", error);
        setApprovers([]);
      } finally {
        setLoadingApprovers(false);
      }
    };
    fetchApprovers();
  }, [task.project?.id]);

  // Update current approver of the task
  const handleCurrentApproverChange = async (value: string) => {
    setCurrentApproverId(value);

    try {
      const payload: any = {
        current_approver_id: value ? Number(value) : null,
      };

      const response = await TaskAPI.updateTask(task.id!, payload);
      const updatedTask: TaskData = response.data;

      // Sync task object and global store
      Object.assign(task, updatedTask);
      updateTask(task.id!, updatedTask);

      toast.success("Current approver updated.");
    } catch (error: any) {
      console.error("Error updating current approver:", error);

      const message =
        error?.response?.data?.current_approver_id?.[0] ||
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to update current approver. Please try again.";

      toast.error(message);

      // Revert select value to previous state on failure
      setCurrentApproverId(task.current_approver?.id?.toString() || "");
    }
  };

  // Get approval history
  useEffect(() => {
    const fetchApprovalHistory = async () => {
      try {
        setLoadingHistory(true);
        const response = await TaskAPI.getApprovalHistory(task.id!);
        setApprovalHistory(response.data.history || []);
      } catch (error) {
        console.error("Error fetching approval history:", error);
        setApprovalHistory([]);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchApprovalHistory();
  }, [task.id]);

  // Get budget request and budget pool data if task type is budget
  useEffect(() => {
    const fetchBudgetData = async () => {
      if (task.type !== "budget" || !task.object_id) return;

      try {
        setLoadingBudgetData(true);

        // Get budget request
        const budgetResponse = await BudgetAPI.getBudgetRequest(
          Number(task.object_id)
        );
        const budgetData = budgetResponse.data;
        setBudgetRequest(budgetData);

        // Get budget pool if budget request has budget_pool
        if (budgetData.budget_pool) {
          const poolResponse = await BudgetAPI.getBudgetPool(
            budgetData.budget_pool
          );
          const poolData = poolResponse.data;
          setBudgetPool(poolData);
        }
      } catch (error) {
        console.error("Error fetching budget data:", error);
      } finally {
        setLoadingBudgetData(false);
      }
    };

    fetchBudgetData();
  }, [task.type, task.object_id, budgetRequest?.status]);

  // Helper function to get status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "UNDER_REVIEW":
        return "bg-blue-100 text-blue-800";
      case "SUBMITTED":
        return "bg-yellow-100 text-yellow-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "LOCKED":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Helper function to get priority color
  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "HIGH":
        return "bg-red-100 text-red-800";
      case "MEDIUM":
        return "bg-orange-100 text-orange-800";
      case "LOW":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const communicationTypeLabel = useMemo(() => {
    const mapping: Record<string, string> = {
      budget_change: "Budget Change",
      creative_approval: "Creative Approval",
      kpi_update: "KPI Update",
      targeting_change: "Targeting Change",
      other: "Other",
    };
    if (!communication?.communication_type) return "Not set";
    return (
      mapping[communication.communication_type] ||
      communication.communication_type
    );
  }, [communication?.communication_type]);

  const formatImpactedAreas = () => {
    if (!communication?.impacted_areas || communication.impacted_areas.length === 0) {
      return "None selected";
    }
    const mapping: Record<string, string> = {
      budget: "Budget",
      creative: "Creative",
      kpi: "KPIs",
      targeting: "Targeting",
    };
    return communication.impacted_areas
      .map((area) => mapping[area] || area)
      .join(", ");
  };

  // Helper function to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return "date not set";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Check if current user can review this task
  const canReviewTask = () => {
    if (task.type === "asset") return false;
    if (!currentUser?.id || !task?.current_approver?.id) return false;

    return currentUser.id.toString() === task.current_approver.id.toString();
  };

  // Check if current user can revise this task
  const canReviseTask = () => {
    if (!currentUser?.id || !task?.owner?.id) return false;

    return currentUser.id.toString() === task.owner.id.toString();
  };

  // Handle start review button click
  const handleStartReview = async () => {
    if (task.type === "asset") {
      alert("Asset tasks must be reviewed via the asset panel.");
      return;
    }

    if (!canReviewTask()) {
      alert("You don't have permission to review this task");
      return;
    }

    try {
      // Call task start_review API
      const taskResponse = await TaskAPI.startReview(task.id!);
      console.log("Review started for task:", task?.id);

      // TODO: Probably need to remove this after future task backend implementation
      // If task type is budget and has object_id, also call budget_approval start_review API
      if (task.type === "budget" && task.object_id) {
        try {
          await startBudgetReview(Number(task.object_id));
          console.log("Review started for budget request:", task.object_id);

          // Refresh budget request data to update UI
          const budgetResponse = await BudgetAPI.getBudgetRequest(
            Number(task.object_id)
          );
          setBudgetRequest(budgetResponse.data);
        } catch (budgetError) {
          console.error("Error starting budget review:", budgetError);
          // Don't fail the entire operation if budget review fails
          // The task review has already succeeded
        }
      }

      setIsReviewing(true);

      if (taskResponse.data.task) {
        Object.assign(task, taskResponse.data.task);
        updateTask(task.id!, taskResponse.data.task);
      }
    } catch (error) {
      console.error("Error starting review:", error);
      alert("Failed to start review. Please try again.");
    }
  };

  // Handle start revise button click
  const handleStartRevise = async () => {
    if (!canReviseTask()) {
      alert("You don't have permission to revise this task");
      return;
    }

    try {
      // Call revise API
      const response = await TaskAPI.revise(task.id!);
      setIsRevising(true);
      setShowRevise(false);
      console.log("Revise started for task:", task?.id);

      if (response.data.task) {
        Object.assign(task, response.data.task);
        updateTask(task.id!, response.data.task);
      }
    } catch (error) {
      console.error("Error starting revise:", error);
      alert("Failed to start revise. Please try again.");
    }
  };

  // Handle approve button click: approve --> lock or forward to next approver
  const handleApprove = async () => {
    try {
      // Call task make_approval API
      const taskResponse = await TaskAPI.makeApproval(task.id!, {
        action: "approve",
        comment: reviewComment,
      });

      // TODO: Probably need to remove this after future task backend implementation
      // If task type is budget and has object_id, also call budget_approval makeDecision API
      if (task.type === "budget" && task.object_id) {
        try {
          const budgetDecisionData = {
            decision: "approve" as const,
            comment: reviewComment,
            ...(nextApprover && { next_approver: parseInt(nextApprover) }),
          };

          await makeBudgetDecision(Number(task.object_id), budgetDecisionData);
          console.log("Budget request approved:", task.object_id);

          // Refresh budget request data to update UI
          const budgetResponse = await BudgetAPI.getBudgetRequest(
            Number(task.object_id)
          );
          setBudgetRequest(budgetResponse.data);
        } catch (budgetError) {
          console.error("Error approving budget request:", budgetError);
          // Don't fail the entire operation if budget approval fails
          // The task approval has already succeeded
        }
      }

      // Update task data with the response
      if (taskResponse.data.task) {
        // Update the task object with new data
        Object.assign(task, taskResponse.data.task);
        // Force re-render by updating a state variable
        setApprovalHistory((prev) => [...prev]);
        // Update global store
        updateTask(task.id!, taskResponse.data.task);
      }

      // If no next approver selected, lock the task
      if (!nextApprover) {
        const lockResponse = await TaskAPI.lock(task.id!);
        // Update task data with lock response
        if (lockResponse.data.task) {
          Object.assign(task, lockResponse.data.task);
          updateTask(task.id!, lockResponse.data.task);
        }
        alert("Task approved and locked (no next approver selected)");
      } else {
        // Forward to next approver
        const forwardResponse = await TaskAPI.forward(task.id!, {
          next_approver_id: parseInt(nextApprover),
          comment: reviewComment,
        });
        // Update task data with forward response
        if (forwardResponse.data.task) {
          Object.assign(task, forwardResponse.data.task);
          updateTask(task.id!, forwardResponse.data.task);
        }
        alert("Task approved and forwarded to next approver");
      }

      // Reset form and close review section
      setIsReviewing(false);
      setReviewComment("");
      setNextApprover(null);

      // Refresh approval history
      const historyResponse = await TaskAPI.getApprovalHistory(task.id!);
      setApprovalHistory(historyResponse.data.history || []);

      console.log(
        "Task approved successfully. Status updated to:",
        taskResponse.data.task?.status
      );
    } catch (error) {
      console.error("Error approving task:", error);
      alert("Failed to approve task. Please try again.");
    }
  };

  // Handle reject button click
  const handleReject = async () => {
    try {
      // Call task make_approval API
      const taskResponse = await TaskAPI.makeApproval(task.id!, {
        action: "reject",
        comment: reviewComment,
      });

      // TODO: Probably need to remove this after future task backend implementation
      // If task type is budget and has object_id, also call budget_approval makeDecision API
      if (task.type === "budget" && task.object_id) {
        try {
          const budgetDecisionData = {
            decision: "reject" as const,
            comment: reviewComment,
          };

          await makeBudgetDecision(Number(task.object_id), budgetDecisionData);
          console.log("Budget request rejected:", task.object_id);

          // Refresh budget request data to update UI
          const budgetResponse = await BudgetAPI.getBudgetRequest(
            Number(task.object_id)
          );
          setBudgetRequest(budgetResponse.data);
        } catch (budgetError) {
          console.error("Error rejecting budget request:", budgetError);
          // Don't fail the entire operation if budget rejection fails
          // The task rejection has already succeeded
        }
      }

      // Update task data with the response
      if (taskResponse.data.task) {
        Object.assign(task, taskResponse.data.task);
        updateTask(task.id!, taskResponse.data.task);
      }

      alert("Task rejected");

      // Reset form and close review section
      setIsReviewing(false);
      setReviewComment("");
      setNextApprover(null);

      // Refresh approval history
      const historyResponse = await TaskAPI.getApprovalHistory(task.id!);
      setApprovalHistory(historyResponse.data.history || []);
    } catch (error) {
      console.error("Error rejecting task:", error);
      alert("Failed to reject task. Please try again.");
    }
  };

  const formatTaskCommentAuthor = (comment: TaskComment) => {
    const author = comment.user;
    if (!author) {
      return `User #${comment.id}`;
    }

    // Prefer the currentUser label when IDs match
    if (
      currentUser?.id !== undefined &&
      Number(currentUser.id) === Number(author.id)
    ) {
      return (
        currentUser.username ||
        currentUser.email ||
        author.username ||
        author.email ||
        `User #${author.id}`
      );
    }

    return author.username || author.email || `User #${author.id}`;
  };

  const handleAddTaskComment = async () => {
    const body = taskCommentInput.trim();
    if (!body || taskCommentSubmitting || !task.id) return;

    try {
      setTaskCommentSubmitting(true);
      const created = await TaskAPI.createComment(task.id, { body });
      setTaskCommentInput("");
      setTaskComments((prev) => [created, ...prev]);
      setTaskCommentsError(null);
    } catch (error: any) {
      console.error("Error adding task comment:", error);
      const message =
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to add comment. Please try again.";
      setTaskCommentsError(message);
    } finally {
      setTaskCommentSubmitting(false);
    }
  };

  return (
    <div className="grid md:grid-cols-3 grid-cols-2 gap-6 h-full min-h-0">
      {/* Left section - 2/3 of the modal, scrollable */}
      <ScrollArea className="col-span-2 h-full min-h-0">
        <div className="space-y-6 h-full flex flex-col px-1">
          {/* Task Summary & Description */}
          <section>
            {!editingSummary ? (
              <div className="flex items-start justify-between gap-4 mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  {task?.summary || "Task Summary"}
                </h1>
                <button
                  type="button"
                  onClick={() => setEditingSummary(true)}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Edit Name
                </button>
              </div>
            ) : (
              <div className="space-y-3 mb-6 w-full">
                <input
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  value={summaryDraft}
                  onChange={(e) => setSummaryDraft(e.target.value)}
                  placeholder="Optional if not mentioned above."
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleSaveSummary}
                    disabled={savingSummary}
                    className={`px-3 py-1.5 text-sm rounded-md text-white ${
                      savingSummary ? "bg-indigo-300" : "bg-indigo-600 hover:bg-indigo-700"
                    }`}
                  >
                    {savingSummary ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSummary(false);
                      setSummaryDraft(task.summary || "");
                    }}
                    className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            <Accordion type="multiple" defaultValue={["item-1"]}>
              <AccordionItem value="item-1" className="border-none">
                <AccordionTrigger>
                  <h2 className="font-semibold text-gray-900 text-lg">
                    Task Description
                  </h2>
                </AccordionTrigger>
                <AccordionContent className="min-h-0 overflow-y-auto">
                  {!editingDescription ? (
                    <div className="space-y-3">
                      <p className="text-gray-700">
                        {task?.description || "Empty description"}
                      </p>
                      <button
                        type="button"
                        onClick={() => setEditingDescription(true)}
                        className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                      >
                        Edit Description
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                        rows={4}
                        value={descriptionDraft}
                        onChange={(e) => setDescriptionDraft(e.target.value)}
                        placeholder="Optional if not mentioned above."
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleSaveDescription}
                          disabled={savingDescription}
                          className={`px-3 py-1.5 text-sm rounded-md text-white ${
                            savingDescription
                              ? "bg-indigo-300"
                              : "bg-indigo-600 hover:bg-indigo-700"
                          }`}
                        >
                          {savingDescription ? "Saving..." : "Save"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDescription(false);
                            setDescriptionDraft(task.description || "");
                          }}
                          className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </section>

          {task?.type === "alert" && (
            <>
              {alertLoading && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Loading alert details...</p>
                </div>
              )}
              {!alertLoading && alertTask && (
                <AlertDetail
                  alert={alertTask}
                  projectId={task.project?.id ?? task.project_id}
                  onRefresh={loadAlertTask}
                />
              )}
              {!alertLoading && !alertTask && (
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">No alert details found.</p>
                </div>
              )}
            </>
          )}

          {/* Scaling Plan & Steps for scaling tasks */}
          {task?.type === "scaling" && scalingPlan && (
            <ScalingDetail
              plan={scalingPlan}
              loading={scalingPlanLoading}
              onRefresh={loadScalingPlan}
            />
          )}

          {/* Experiment detail for experiment tasks */}
          {task?.type === "experiment" && experiment && (
            <ExperimentDetail
              experiment={experiment}
              loading={experimentLoading}
              onRefresh={loadExperiment}
            />
          )}

          {/* Client Communication details for communication tasks */}
          {task?.type === "communication" && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Client Communication
              </h2>

              {communicationLoading && (
                <p className="text-sm text-gray-500">Loading details...</p>
              )}

              {communicationError && !communicationLoading && (
                <p className="text-sm text-red-600">{communicationError}</p>
              )}

              {communication && !communicationLoading && !communicationError && (
                <div className="space-y-3 bg-white rounded-lg border border-gray-200 p-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Communication Type
                    </p>
                    <p className="text-sm text-gray-900">
                      {communicationTypeLabel}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Stakeholders
                    </p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {communication.stakeholders?.trim() ||
                        "No stakeholders recorded"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Impacted Areas
                    </p>
                    <p className="text-sm text-gray-900">
                      {formatImpactedAreas()}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Required Actions
                    </p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {communication.required_actions || "No actions recorded"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Client Deadline
                    </p>
                    <p className="text-sm text-gray-900">
                      {communication.client_deadline
                        ? formatDate(communication.client_deadline)
                        : "No deadline set"}
                    </p>
                  </div>

                  {communication.notes && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Notes
                      </p>
                      <p className="text-sm text-gray-900 whitespace-pre-wrap">
                        {communication.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Dynamic Content based on task type */}
          {task?.type === "budget" && (
            <BudgetRequestDetail
              budgetRequest={budgetRequest || undefined}
              budgetPool={budgetPool || undefined}
              loading={loadingBudgetData}
            />
          )}
          {task?.type === "asset" && (
            <AssetDetail
              taskId={task.id}
              assetId={task.object_id || null}
              hideComments={true}
            />
          )}
          {task?.type === "retrospective" && <RetrospectiveDetail />}

          {/* Attachments */}
          {task?.id && <Attachments taskId={task.id} />}

          {/* Subtasks - Only show if task is not a subtask */}
          {task?.id && !task.is_subtask && <Subtasks taskId={task.id} taskProjectId={task.project_id || task.project?.id} parentTaskIsSubtask={task.is_subtask} />}

          {/* Linked Work Items */}
          {task?.id && <LinkedWorkItems taskId={task.id} />}

          {/* Task-level Comments (all task types) */}
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Comments</h2>

            {/* Input box */}
            <div>
              <textarea
                value={taskCommentInput}
                onChange={(e) => setTaskCommentInput(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                placeholder="Add a comment about this task..."
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddTaskComment}
                  disabled={!taskCommentInput.trim() || taskCommentSubmitting}
                  className={`px-4 py-2 text-sm font-medium rounded-md text-white ${
                    taskCommentSubmitting || !taskCommentInput.trim()
                      ? "bg-indigo-300 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700"
                  }`}
                >
                  {taskCommentSubmitting ? "Adding..." : "Add Comment"}
                </button>
              </div>
            </div>

            {/* Comments list */}
            {taskCommentsLoading && (
              <p className="text-sm text-gray-500">Loading comments...</p>
            )}
            {taskCommentsError && !taskCommentsLoading && (
              <p className="text-sm text-red-600">{taskCommentsError}</p>
            )}
            {!taskCommentsLoading &&
              !taskCommentsError &&
              taskComments.length === 0 && (
                <p className="text-sm text-gray-500">No comments yet.</p>
              )}
            {!taskCommentsLoading &&
              !taskCommentsError &&
              taskComments.length > 0 && (
                <div className="space-y-3">
                  {taskComments.map((comment) => (
                    <div
                      key={comment.id}
                      className="border border-gray-200 rounded-md p-3 text-sm text-gray-900"
                    >
                      <div className="font-medium">
                        {formatTaskCommentAuthor(comment)}
                      </div>
                      <div className="mt-1 text-gray-800 whitespace-pre-wrap break-words">
                        {comment.body}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {comment.created_at
                          ? new Date(comment.created_at).toLocaleString()
                          : ""}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </section>

          {/* Operation Section */}
          {isReviewing && (
            <section className="flex flex-col gap-4 ">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Add your review opinions
              </h2>

              <div>
                <label
                  htmlFor="review-comment"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Comment
                </label>
                <textarea
                  id="review-comment"
                  name="review-comment"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                />
              </div>

              <div>
                <p className="block text-sm font-medium text-gray-700 mb-1">
                  Next Approver
                </p>
                <RemovablePicker
                  options={approvers.map((approver) => ({
                    value: approver.id.toString(),
                    label: approver.username,
                  }))}
                  placeholder="Select next approver"
                  value={nextApprover}
                  onChange={(val) => setNextApprover(val)}
                  loading={loadingApprovers}
                />
              </div>

              <div className="flex flex-row gap-4 justify-center mt-4">
                <button
                  onClick={handleApprove}
                  className="px-3 py-1.5 rounded text-white bg-green-600 hover:bg-green-700"
                >
                  Approve
                </button>
                <button
                  onClick={handleReject}
                  className="px-3 py-1.5 rounded text-white bg-red-600 hover:bg-red-700"
                >
                  Reject
                </button>
                {/* <button 
                  onClick={() => setIsReviewing(false)}
                  className="px-3 py-1.5 rounded text-white bg-gray-500 hover:bg-gray-600">Cancel</button> */}
              </div>
            </section>
          )}
        </div>
      </ScrollArea>

      {/* Right section - 1/3 of the modal, fixed height with scroll */}
      <ScrollArea className="md:col-span-1 col-span-2 flex flex-col h-full min-h-0 px-1">
        {/* Task Basic Info */}
        <Accordion
          type="multiple"
          className="mb-4 w-full max-h-full overflow-y-auto shrink-0 px-4 border-gray-300 border rounded-md"
          defaultValue={["item-1"]}
        >
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger>
              <span className="font-semibold text-gray-900">Task Details</span>
            </AccordionTrigger>
            <AccordionContent className="min-h-0 overflow-y-auto">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 tracking-wide">
                    Status
                  </label>
                  <span
                    className={`inline-block px-2 py-1 text-sm font-medium rounded-full ${getStatusColor(
                      task?.status
                    )}`}
                  >
                    {task?.status?.replace("_", " ") || "Unknown"}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 tracking-wide">
                    Type
                  </label>
                  <span className="inline-block px-2 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                    {task?.type || "Unknown"}
                  </span>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 tracking-wide">
                    Owner
                  </label>
                  <p className="text-sm text-gray-900">
                    {task?.owner?.username || "Unassigned"}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 tracking-wide">
                    Current Approver
                  </label>
                  <select
                    className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    value={currentApproverId}
                    onChange={(e) => handleCurrentApproverChange(e.target.value)}
                    disabled={loadingApprovers}
                  >
                    <option value="">
                      {approvers.length === 0
                        ? "No approver assigned"
                        : "Unassigned"}
                    </option>
                    {approvers.map((approver) => (
                      <option key={approver.id} value={approver.id.toString()}>
                        {approver.username ||
                          approver.email ||
                          `User #${approver.id}`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 tracking-wide">
                    Project
                  </label>
                  <p className="text-sm text-gray-900">
                    {task?.project?.name || "Unknown Project"}
                  </p>
                </div>
                {/* New: Start Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 tracking-wide">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDateInput}
                    onChange={(e) => setStartDateInput(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* New: Due Date is also editable */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 tracking-wide">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={dueDateInput}
                    onChange={(e) => setDueDateInput(e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {/* New: Save button */}
                <div>
                  <button
                    type="button"
                    onClick={handleSaveDates}
                    disabled={savingDates}
                    className={`mt-2 inline-flex items-center px-3 py-1.5 rounded-md text-sm font-medium ${
                      savingDates
                        ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                        : "bg-indigo-600 text-white hover:bg-indigo-700"
                    }`}
                  >
                    {savingDates ? "Saving..." : "Save Dates"}
                  </button>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Approval Timeline */}
        <Accordion
          type="multiple"
          className="mb-4 w-full max-h-full min-h-0 overflow-y-auto px-4 border-gray-300 border rounded-md"
          defaultValue={["item-1"]}
        >
          <AccordionItem value="item-1" className="border-none">
            <AccordionTrigger>
              <span className="font-semibold text-gray-900">
                Approval Timeline
              </span>
            </AccordionTrigger>
            <AccordionContent className="min-h-0 overflow-y-auto">
              <div className="space-y-3">
                {loadingHistory ? (
                  <p>Loading approval history...</p>
                ) : approvalHistory.length === 0 ? (
                  <p>No approval history yet for this task.</p>
                ) : (
                  approvalHistory.map((record, index) => (
                    <div key={record.id} className="flex flew-row">
                      <div
                        className={`w-3 h-3 rounded-full mr-3 mt-1 ${
                          index === approvalHistory.length - 1
                            ? "bg-blue-500"
                            : "bg-gray-300"
                        }`}
                      ></div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {record.approved_by.username}
                          <span className="text-xs font-normal text-gray-900">
                            {" "}
                            {record.is_approved ? "approved" : "rejected"}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDate(record.decided_time)}
                        </p>
                        <p className="text-xs text-gray-900">
                          {record.comment}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Operations */}
        {task.status === "SUBMITTED" &&
          (task.type === "asset" ? (
            <div className="max-h-full overflow-y-auto">
              <p className="text-xs text-gray-500 px-4 py-2 bg-gray-50 border border-gray-200 rounded-md">
                Review for asset tasks is handled in the asset panel. Assigned
                reviewers can start the review from the “Asset Review Overview”
                section.
              </p>
            </div>
          ) : (
            <div className="max-h-full overflow-y-auto">
              <button
                disabled={isReviewing}
                onClick={handleStartReview}
                className={`w-full px-4 py-2 text-sm font-medium rounded-md transition-colors
                  ${
                    isReviewing
                      ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }
                  `}
              >
                {canReviewTask()
                  ? "Start Review"
                  : "Start Review (No Permission)"}
              </button>
            </div>
          ))}
        {showRevise && (
          <div className="max-h-full overflow-y-auto ">
            <button
              disabled={isRevising}
              onClick={handleStartRevise}
              className="w-full px-4 py-2 text-sm font-medium rounded-md transition-colors bg-yellow-600 text-white hover:bg-yellow-700"
            >
              Revise
            </button>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
