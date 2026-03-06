/**
 * Single source of truth for task-type-specific config: contentType, api, form component,
 * requiredFields, and getPayload. Pages (tasks, timeline) wire in their local state
 * (formData, setFormData, validation) when building their taskTypeConfig.
 */

import type { ComponentType } from "react";
import { BudgetAPI } from "@/lib/api/budgetApi";
import { AssetAPI } from "@/lib/api/assetApi";
import { RetrospectiveAPI } from "@/lib/api/retrospectiveApi";
import { OptimizationScalingAPI } from "@/lib/api/optimizationScalingApi";
import { AlertingAPI } from "@/lib/api/alertingApi";
import { ClientCommunicationAPI } from "@/lib/api/clientCommunicationApi";
import { ExperimentAPI } from "@/lib/api/experimentApi";
import { OptimizationAPI } from "@/lib/api/optimizationApi";
import { ReportAPI } from "@/lib/api/reportApi";
import { PolicyAPI } from "@/lib/api/policyApi";
import NewBudgetRequestForm from "@/components/tasks/NewBudgetRequestForm";
import NewAssetForm from "@/components/tasks/NewAssetForm";
import NewRetrospectiveForm from "@/components/tasks/NewRetrospectiveForm";
import { ScalingPlanForm } from "@/components/tasks/ScalingPlanForm";
import AlertTaskForm from "@/components/tasks/AlertTaskForm";
import NewClientCommunicationForm from "@/components/tasks/NewClientCommunicationForm";
import { ExperimentForm } from "@/components/tasks/ExperimentForm";
import { OptimizationForm } from "@/components/tasks/OptimizationForm";
import { ReportForm } from "@/components/tasks/ReportForm";
import NewPlatformPolicyUpdateForm from "@/components/tasks/NewPlatformPolicyUpdateForm";

const defaultReportContext = {
  reporting_period: null,
  situation: "",
  what_changed: "",
};

export type TaskTypeConfigStatic = {
  contentType: string;
  api: (payload: any) => Promise<unknown>;
  formComponent: ComponentType<any>;
  requiredFields: string[];
  getPayload: (
    formData: any,
    taskData: { project_id?: number; summary?: string; current_approver_id?: number | null },
    createdTask: { id: number }
  ) => Record<string, unknown>;
};

export const TASK_TYPE_CONFIG_STATIC: Record<string, TaskTypeConfigStatic> = {
  budget: {
    contentType: "budgetrequest",
    api: BudgetAPI.createBudgetRequest,
    formComponent: NewBudgetRequestForm,
    requiredFields: ["amount", "currency", "ad_channel", "budget_pool"],
    getPayload: (formData, taskData, createdTask) => {
      if (!taskData.current_approver_id) {
        throw new Error("Approver is required for budget request");
      }
      if (!formData.budget_pool) {
        throw new Error("Budget pool is required for budget request");
      }
      return {
        task: createdTask.id,
        amount: formData.amount,
        currency: formData.currency,
        ad_channel: formData.ad_channel,
        budget_pool_id: formData.budget_pool,
        notes: formData.notes || "",
        current_approver: taskData.current_approver_id,
      };
    },
  },
  asset: {
    contentType: "asset",
    api: AssetAPI.createAsset,
    formComponent: NewAssetForm,
    requiredFields: ["tags"],
    getPayload: (formData, _taskData, createdTask) => {
      const tagsArray = (formData.tags || "")
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean);
      const payload: Record<string, unknown> = {
        task: createdTask.id,
        tags: tagsArray,
      };
      if (formData.team) {
        const teamNum = Number(formData.team);
        if (!Number.isNaN(teamNum)) payload.team = teamNum;
      }
      return payload;
    },
  },
  retrospective: {
    contentType: "retrospectivetask",
    api: RetrospectiveAPI.createRetrospective,
    formComponent: NewRetrospectiveForm,
    requiredFields: ["campaign"],
    getPayload: (formData, taskData, createdTask) => ({
      campaign: formData.campaign || taskData.project_id?.toString(),
      scheduled_at: formData.scheduled_at || new Date().toISOString(),
      status: formData.status || "scheduled",
    }),
  },
  scaling: {
    contentType: "scalingplan",
    api: OptimizationScalingAPI.createScalingPlan,
    formComponent: ScalingPlanForm,
    requiredFields: ["strategy"],
    getPayload: (formData, _taskData, createdTask) => {
      if (!createdTask?.id) {
        throw new Error("Task ID is required to create scaling plan");
      }
      return {
        task: createdTask.id,
        strategy: formData.strategy || "horizontal",
        scaling_target: formData.scaling_target || "",
        risk_considerations: formData.risk_considerations || "",
        max_scaling_limit: formData.max_scaling_limit || "",
        stop_conditions: formData.stop_conditions || "",
        expected_outcomes: formData.expected_outcomes || "",
        affected_entities: formData.affected_entities || null,
      };
    },
  },
  alert: {
    contentType: "alerttask",
    api: AlertingAPI.createAlertTask,
    formComponent: AlertTaskForm,
    requiredFields: ["alert_type", "severity"],
    getPayload: (formData, _taskData, createdTask) => {
      if (!createdTask?.id) {
        throw new Error("Task ID is required to create alert details");
      }
      const rawMetricValue = formData.change_value ? Number(formData.change_value) : null;
      const rawCurrentValue = formData.current_value ? Number(formData.current_value) : null;
      const rawPreviousValue = formData.previous_value ? Number(formData.previous_value) : null;
      const metricValue = Number.isNaN(rawMetricValue as number) ? null : rawMetricValue;
      const currentValue = Number.isNaN(rawCurrentValue as number) ? null : rawCurrentValue;
      const previousValue = Number.isNaN(rawPreviousValue as number) ? null : rawPreviousValue;
      const investigationNotes =
        formData.investigation_notes ||
        [formData.investigation_assumption ? `Assumption: ${formData.investigation_assumption}` : null]
          .filter(Boolean)
          .join(" | ");
      const resolutionSteps =
        formData.resolution_steps ||
        [...(formData.resolution_actions || []), formData.resolution_notes || null]
          .filter(Boolean)
          .join(" | ");
      return {
        task: createdTask.id,
        alert_type: formData.alert_type || "spend_spike",
        severity: formData.severity || "medium",
        status: formData.status || "open",
        affected_entities: formData.affected_entities || [],
        initial_metrics: {
          metric_key: formData.metric_key || "spend",
          change_type: formData.change_type || "percent",
          change_value: metricValue,
          change_window: formData.change_window || "daily",
          current_value: currentValue,
          previous_value: previousValue,
        },
        assigned_to: formData.assigned_to ? Number(formData.assigned_to) : null,
        acknowledged_by: formData.acknowledged_by ? Number(formData.acknowledged_by) : null,
        investigation_notes: investigationNotes,
        resolution_steps: resolutionSteps,
        related_references: formData.related_references || [],
        postmortem_root_cause: formData.postmortem_root_cause || "",
        postmortem_prevention: formData.postmortem_prevention || "",
      };
    },
  },
  communication: {
    contentType: "clientcommunication",
    api: ClientCommunicationAPI.create,
    formComponent: NewClientCommunicationForm,
    requiredFields: ["communication_type", "required_actions", "impacted_areas"],
    getPayload: (formData, _taskData, createdTask) => {
      if (!createdTask?.id) {
        throw new Error("Task ID is required to create client communication");
      }
      if (!formData.impacted_areas || formData.impacted_areas.length === 0) {
        throw new Error("At least one impacted area is required");
      }
      if (!formData.communication_type) {
        throw new Error("Communication type is required");
      }
      if (!formData.required_actions || formData.required_actions.trim() === "") {
        throw new Error("Required actions is required");
      }
      return {
        task: createdTask.id,
        communication_type: formData.communication_type,
        stakeholders: formData.stakeholders || "",
        impacted_areas: formData.impacted_areas,
        required_actions: formData.required_actions,
        client_deadline:
          formData.client_deadline && formData.client_deadline.trim() !== ""
            ? formData.client_deadline
            : null,
        notes: formData.notes || "",
      };
    },
  },
  experiment: {
    contentType: "experiment",
    api: ExperimentAPI.createExperiment,
    formComponent: ExperimentForm,
    requiredFields: ["hypothesis"],
    getPayload: (formData, taskData, createdTask) => ({
      task: createdTask.id,
      name: taskData.summary || "Experiment task",
      hypothesis: formData.hypothesis || "",
      expected_outcome: formData.expected_outcome,
      description: formData.description,
      control_group: formData.control_group,
      variant_group: formData.variant_group,
      success_metric: formData.success_metric,
      constraints: formData.constraints,
      status: formData.status,
    }),
  },
  optimization: {
    contentType: "optimization",
    api: OptimizationAPI.createOptimization,
    formComponent: OptimizationForm,
    requiredFields: [],
    getPayload: (formData, _taskData, createdTask) => ({
      task: createdTask.id,
      ...formData,
    }),
  },
  report: {
    contentType: "reporttask",
    api: ReportAPI.createReport,
    formComponent: ReportForm,
    requiredFields: ["outcome_summary"],
    getPayload: (formData, _taskData, createdTask) => ({
      task: createdTask.id,
      audience_type: formData.audience_type,
      audience_details: formData.audience_details || "",
      context: formData.context || defaultReportContext,
      outcome_summary: formData.outcome_summary || "",
      narrative_explanation: formData.narrative_explanation || "",
      key_actions: formData.key_actions || [],
    }),
  },
  platform_policy_update: {
    contentType: "platformpolicyupdate",
    api: PolicyAPI.create,
    formComponent: NewPlatformPolicyUpdateForm,
    requiredFields: ["platform", "policy_change_type", "policy_description", "immediate_actions_required"],
    getPayload: (formData, _taskData, createdTask) => {
      const parseCommaSeparated = (val: string) =>
        (val || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      return {
        task_id: createdTask.id,
        platform: formData.platform,
        policy_change_type: formData.policy_change_type,
        policy_description: formData.policy_description,
        policy_reference_url: formData.policy_reference_url || undefined,
        effective_date: formData.effective_date || undefined,
        affected_campaigns: parseCommaSeparated(formData.affected_campaigns || ""),
        affected_ad_sets: parseCommaSeparated(formData.affected_ad_sets || ""),
        affected_assets: parseCommaSeparated(formData.affected_assets || ""),
        performance_impact: formData.performance_impact || "",
        budget_impact: formData.budget_impact || "",
        compliance_risk: formData.compliance_risk || "",
        immediate_actions_required: formData.immediate_actions_required,
        action_deadline: formData.action_deadline || undefined,
      };
    },
  },
};

export { defaultReportContext };
