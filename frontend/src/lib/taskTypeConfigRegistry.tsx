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
  successMessage: string;
  api: (payload: any) => Promise<unknown>;
  formComponent: ComponentType<any>;
  requiredFields: string[];
  getPayload: (
    formData: any,
    taskData: { project_id?: number; summary?: string; current_approver_id?: number | null },
    createdTask: { id: number }
  ) => Record<string, unknown> | null;
};

export const TASK_TYPE_CONFIG_STATIC: Record<string, TaskTypeConfigStatic> = {
  budget: {
    contentType: "budgetrequest",
    successMessage: "Budget Request created successfully",
    api: BudgetAPI.createBudgetRequest,
    formComponent: NewBudgetRequestForm,
    requiredFields: [],
    getPayload: (formData, taskData, createdTask) => {
      if (!taskData.current_approver_id) return null;
      if (!formData.budget_pool) return null;
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
    successMessage: "Asset task created successfully",
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
    successMessage: "Retrospective created successfully",
    api: RetrospectiveAPI.createRetrospective,
    formComponent: NewRetrospectiveForm,
    requiredFields: [],
    getPayload: (formData, taskData, createdTask) => ({
      campaign: formData.campaign || taskData.project_id?.toString(),
      scheduled_at: formData.scheduled_at || new Date().toISOString(),
      status: formData.status || "scheduled",
      decision: formData.decision || "",
      confidence_level: formData.confidence_level || undefined,
      primary_assumption: formData.primary_assumption || "",
      key_risk_ignore: formData.key_risk_ignore?.trim() || undefined,
    }),
  },
  scaling: {
    contentType: "scalingplan",
    successMessage: "Scaling Plan created successfully",
    api: OptimizationScalingAPI.createScalingPlan,
    formComponent: ScalingPlanForm,
    requiredFields: [],
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
    successMessage: "Alert task created successfully",
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
    successMessage: "Client Communication task created successfully",
    api: ClientCommunicationAPI.create,
    formComponent: NewClientCommunicationForm,
    requiredFields: [],
    getPayload: (formData, _taskData, createdTask) => {
      if (!createdTask?.id) return null;
      if (!formData.communication_type) return null;
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
    successMessage: "Experiment task created successfully",
    api: ExperimentAPI.createExperiment,
    formComponent: ExperimentForm,
    requiredFields: [],
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
    successMessage: "Optimization task created successfully",
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
    successMessage: "Report task created successfully",
    api: ReportAPI.createReport,
    formComponent: ReportForm,
    requiredFields: [],
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
    successMessage: "Platform Policy Update created successfully",
    api: PolicyAPI.create,
    formComponent: NewPlatformPolicyUpdateForm,
    requiredFields: [],
    getPayload: (formData, _taskData, createdTask) => {
      if (!createdTask?.id) return null;
      if (!formData.platform) return null;
      const parseCommaSeparated = (val: string) =>
        (val || "")
          .split(",")
          .map((s: string) => s.trim())
          .filter(Boolean);
      return {
        task: createdTask.id,
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
