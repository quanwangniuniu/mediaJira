"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ProjectAPI } from "@/lib/api/projectApi";

interface AlertTaskFormProps {
  initialData?: Record<string, any>;
  onChange?: (data: Record<string, any>) => void;
  projectId?: number | null;
}

const alertTypeOptions = [
  { value: "spend_spike", label: "Spend Spike" },
  { value: "policy_violation", label: "Policy Violation" },
  { value: "performance_drop", label: "Performance Drop" },
  { value: "delivery_issue", label: "Delivery Issue" },
  { value: "other", label: "Other" },
];

const severityOptions = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "in_progress", label: "In Progress" },
  { value: "mitigated", label: "Mitigated" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const metricOptions = [
  { value: "spend", label: "Spend" },
  { value: "roas", label: "ROAS" },
  { value: "cpa", label: "CPA" },
  { value: "ctr", label: "CTR" },
  { value: "cpc", label: "CPC" },
];

const changeTypeOptions = [
  { value: "percent", label: "Percent" },
  { value: "amount", label: "Amount" },
];

const windowOptions = [
  { value: "daily", label: "Daily" },
  { value: "hourly", label: "Hourly" },
];

const platformOptions = [
  { value: "facebook", label: "Facebook" },
  { value: "google", label: "Google" },
  { value: "tiktok", label: "TikTok" },
  { value: "other", label: "Other" },
];

const entityTypeOptions = [
  { value: "campaign", label: "Campaign" },
  { value: "ad_set", label: "Ad Set" },
  { value: "ad", label: "Ad" },
];

const assumptionOptions = [
  { value: "budget_misconfig", label: "Budget Misconfiguration" },
  { value: "policy_rejection", label: "Policy Rejection" },
  { value: "creative_fatigue", label: "Creative Fatigue" },
  { value: "tracking_issue", label: "Tracking Issue" },
  { value: "seasonality", label: "Seasonality" },
  { value: "other", label: "Other" },
];

const resolutionActionOptions = [
  { value: "pause_campaign", label: "Pause Campaign" },
  { value: "reduce_budget", label: "Reduce Budget" },
  { value: "appeal_policy", label: "Appeal Policy" },
  { value: "replace_creative", label: "Replace Creative" },
  { value: "adjust_targeting", label: "Adjust Targeting" },
  { value: "fix_tracking", label: "Fix Tracking" },
];

export default function AlertTaskForm({
  initialData = {},
  onChange,
  projectId,
}: AlertTaskFormProps) {
  const [localData, setLocalData] = useState<Record<string, any>>({
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
    ...initialData,
  });

  const [members, setMembers] = useState<
    { id: number; username: string; email: string }[]
  >([]);

  const [affectedDraft, setAffectedDraft] = useState({
    platform: "facebook",
    entity_type: "campaign",
    entity_id: "",
  });

  const [referenceDraft, setReferenceDraft] = useState("");
  const lastInitialDataRef = useRef<string | null>(null);

  useEffect(() => {
    if (!projectId) {
      setMembers([]);
      return;
    }

    const loadMembers = async () => {
      try {
        const resp = await ProjectAPI.getProjectMembers(projectId);
        const mapped =
          resp?.map((member) => ({
            id: member.user.id,
            username: member.user.username || "",
            email: member.user.email || "",
          })) || [];
        setMembers(mapped);
      } catch (error) {
        console.error("Failed to load project members:", error);
        setMembers([]);
      }
    };

    loadMembers();
  }, [projectId]);

  useEffect(() => {
    if (!initialData) return;
    setLocalData(prev => ({
      ...prev,
      ...initialData
      }));
    }, [initialData]);

  const assigneeOptions = useMemo(() => {
    return members.map((member) => ({
      value: member.id,
      label: member.username || member.email || `User #${member.id}`,
    }));
  }, [members]);

  const updateField = (field: string, value: any) => {
    setLocalData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleResolutionAction = (actionValue: string) => {
    setLocalData((prev) => {
      const existing = new Set(prev.resolution_actions || []);
      if (existing.has(actionValue)) {
        existing.delete(actionValue);
      } else {
        existing.add(actionValue);
      }
      return { ...prev, resolution_actions: Array.from(existing) };
    });
  };

  const addAffectedEntity = () => {
    if (!affectedDraft.entity_id.trim()) return;
    setLocalData((prev) => ({
      ...prev,
      affected_entities: [
        ...(prev.affected_entities || []),
        {
          platform: affectedDraft.platform,
          entity_type: affectedDraft.entity_type,
          entity_id: affectedDraft.entity_id.trim(),
        },
      ],
    }));
    setAffectedDraft((prev) => ({ ...prev, entity_id: "" }));
  };

  const removeAffectedEntity = (index: number) => {
    setLocalData((prev) => ({
      ...prev,
      affected_entities: (prev.affected_entities || []).filter(
        (_: any, idx: number) => idx !== index
      ),
    }));
  };

  const addReference = () => {
    if (!referenceDraft.trim()) return;
    setLocalData((prev) => ({
      ...prev,
      related_references: [
        ...(prev.related_references || []),
        referenceDraft.trim(),
      ],
    }));
    setReferenceDraft("");
  };

  const removeReference = (index: number) => {
    setLocalData((prev) => ({
      ...prev,
      related_references: (prev.related_references || []).filter(
        (_: any, idx: number) => idx !== index
      ),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Alert Type *
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={localData.alert_type}
            onChange={(e) => updateField("alert_type", e.target.value)}
          >
            {alertTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Severity *
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={localData.severity}
            onChange={(e) => updateField("severity", e.target.value)}
          >
            {severityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={localData.status}
            onChange={(e) => updateField("status", e.target.value)}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-gray-200 rounded-md p-4 space-y-4">
        <h3 className="text-sm font-semibold text-gray-800">Initial Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Metric
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={localData.metric_key}
              onChange={(e) => updateField("metric_key", e.target.value)}
            >
              {metricOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Change Type
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={localData.change_type}
              onChange={(e) => updateField("change_type", e.target.value)}
            >
              {changeTypeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Change Value
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={localData.change_value}
              onChange={(e) => updateField("change_value", e.target.value)}
              placeholder="e.g. 200"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Window
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={localData.change_window}
              onChange={(e) => updateField("change_window", e.target.value)}
            >
              {windowOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Current Value
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={localData.current_value}
              onChange={(e) => updateField("current_value", e.target.value)}
              placeholder="e.g. 1200"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Previous Value
            </label>
            <input
              type="number"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              value={localData.previous_value}
              onChange={(e) => updateField("previous_value", e.target.value)}
              placeholder="e.g. 400"
            />
          </div>
        </div>
      </div>

      <div className="border border-gray-200 rounded-md p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Affected Campaigns / Ad Sets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={affectedDraft.platform}
            onChange={(e) =>
              setAffectedDraft((prev) => ({ ...prev, platform: e.target.value }))
            }
          >
            {platformOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={affectedDraft.entity_type}
            onChange={(e) =>
              setAffectedDraft((prev) => ({
                ...prev,
                entity_type: e.target.value,
              }))
            }
          >
            {entityTypeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={affectedDraft.entity_id}
            onChange={(e) =>
              setAffectedDraft((prev) => ({ ...prev, entity_id: e.target.value }))
            }
            placeholder="ID"
          />
          <button
            type="button"
            className="px-3 py-2 bg-indigo-600 text-white rounded-md"
            onClick={addAffectedEntity}
          >
            Add
          </button>
        </div>

        {(localData.affected_entities || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {localData.affected_entities.map((entity: any, idx: number) => (
              <span
                key={`${entity.entity_id}-${idx}`}
                className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
              >
                {entity.platform} - {entity.entity_type} - {entity.entity_id}
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => removeAffectedEntity(idx)}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assigned To
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={localData.assigned_to || ""}
            onChange={(e) => updateField("assigned_to", e.target.value)}
          >
            <option value="">Unassigned</option>
            {assigneeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Acknowledged By
          </label>
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={localData.acknowledged_by || ""}
            onChange={(e) => updateField("acknowledged_by", e.target.value)}
          >
            <option value="">Not acknowledged</option>
            {assigneeOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="border border-gray-200 rounded-md p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Investigation Notes
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            value={localData.investigation_assumption || ""}
            onChange={(e) =>
              updateField("investigation_assumption", e.target.value)
            }
          >
            <option value="">Select assumption</option>
            {assumptionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <textarea
            className="md:col-span-2 w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={2}
            value={localData.investigation_notes}
            onChange={(e) => updateField("investigation_notes", e.target.value)}
            placeholder="Short notes or context"
          />
        </div>
      </div>

      <div className="border border-gray-200 rounded-md p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">Resolution</h3>
        <div className="flex flex-wrap gap-2">
          {resolutionActionOptions.map((opt) => {
            const isActive = (localData.resolution_actions || []).includes(
              opt.value
            );
            return (
              <button
                key={opt.value}
                type="button"
                className={`px-3 py-1 rounded-full text-xs border ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-gray-600 border-gray-300"
                }`}
                onClick={() => toggleResolutionAction(opt.value)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        <textarea
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
          rows={2}
          value={localData.resolution_notes}
          onChange={(e) => updateField("resolution_notes", e.target.value)}
          placeholder="Additional resolution notes"
        />
      </div>

      <div className="border border-gray-200 rounded-md p-4 space-y-3">
        <h3 className="text-sm font-semibold text-gray-800">References</h3>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            value={referenceDraft}
            onChange={(e) => setReferenceDraft(e.target.value)}
            placeholder="Paste a link or asset ID"
          />
          <button
            type="button"
            className="px-3 py-2 bg-indigo-600 text-white rounded-md"
            onClick={addReference}
          >
            Add
          </button>
        </div>
        {(localData.related_references || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {localData.related_references.map((ref: string, idx: number) => (
              <span
                key={`${ref}-${idx}`}
                className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
              >
                {ref}
                <button
                  type="button"
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => removeReference(idx)}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Root Cause
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={2}
            value={localData.postmortem_root_cause}
            onChange={(e) => updateField("postmortem_root_cause", e.target.value)}
            placeholder="Short summary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Preventive Measures
          </label>
          <textarea
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={2}
            value={localData.postmortem_prevention}
            onChange={(e) =>
              updateField("postmortem_prevention", e.target.value)
            }
            placeholder="Short summary"
          />
        </div>
      </div>
    </div>
  );
}
