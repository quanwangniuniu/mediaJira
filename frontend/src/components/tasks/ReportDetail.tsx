"use client";

import { useState, useEffect } from "react";
import { ReportAPI } from "@/lib/api/reportApi";
import type {
  ReportTask as ReportTaskType,
  ReportTaskKeyAction,
  ReportTaskUpdateRequest,
  ReportAudienceType,
} from "@/types/report";
import toast from "react-hot-toast";
import Button from "@/components/button/Button";

const AUDIENCE_LABELS: Record<ReportAudienceType, string> = {
  client: "Client",
  manager: "Manager",
  internal_team: "Internal Team",
  self: "Self",
  other: "Other",
};

interface ReportDetailProps {
  report: ReportTaskType | null;
  loading: boolean;
  onRefresh?: () => void;
}

export default function ReportDetail({
  report,
  loading,
  onRefresh,
}: ReportDetailProps) {
  const [savingField, setSavingField] = useState<string | null>(null);
  const [localContext, setLocalContext] = useState(report?.context ?? "");
  const [localOutcomeSummary, setLocalOutcomeSummary] = useState(
    report?.outcome_summary ?? ""
  );
  const [localNarrative, setLocalNarrative] = useState(
    report?.narrative_explanation ?? ""
  );
  const [localAudienceType, setLocalAudienceType] = useState<
    ReportAudienceType | ""
  >(report?.audience_type ?? "");
  const [localAudienceDetails, setLocalAudienceDetails] = useState(
    report?.audience_details ?? ""
  );

  // Key action editing
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [editActionText, setEditActionText] = useState("");
  const [addingAction, setAddingAction] = useState(false);
  const [newOrderIndex, setNewOrderIndex] = useState(1);
  const [newActionText, setNewActionText] = useState("");

  useEffect(() => {
    if (report) {
      setLocalContext(report.context ?? "");
      setLocalOutcomeSummary(report.outcome_summary ?? "");
      setLocalNarrative(report.narrative_explanation ?? "");
      setLocalAudienceType(report.audience_type ?? "");
      setLocalAudienceDetails(report.audience_details ?? "");
    }
  }, [report]);

  const keyActions = report?.key_actions ?? [];
  const usedOrders = keyActions.map((a) => a.order_index);
  const nextOrderIndex =
    [1, 2, 3, 4, 5, 6].find((i) => !usedOrders.includes(i)) ?? null;

  const handleSaveReport = async (
    fieldLabel: string,
    data: ReportTaskUpdateRequest
  ) => {
    if (!report || savingField) return;
    try {
      setSavingField(fieldLabel);
      await ReportAPI.updateReport(report.id, data);
      toast.success(`${fieldLabel} updated`);
      onRefresh?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? `Failed to update ${fieldLabel}`;
      toast.error(message);
    } finally {
      setSavingField(null);
    }
  };

  const handleSaveContext = () => {
    if (localContext === (report?.context ?? "")) return;
    handleSaveReport("Context", { context: localContext });
  };

  const handleSaveOutcomeSummary = () => {
    if (localOutcomeSummary === (report?.outcome_summary ?? "")) return;
    handleSaveReport("Outcome summary", { outcome_summary: localOutcomeSummary });
  };

  const handleSaveNarrative = () => {
    if (localNarrative === (report?.narrative_explanation ?? "")) return;
    handleSaveReport("Narrative", {
      narrative_explanation: localNarrative,
    });
  };

  const handleSaveAudience = () => {
    if (
      localAudienceType === (report?.audience_type ?? "") &&
      localAudienceDetails === (report?.audience_details ?? "")
    )
      return;
    if (!localAudienceType) return;
    handleSaveReport("Audience", {
      audience_type: localAudienceType as ReportAudienceType,
      audience_details: localAudienceDetails,
    });
  };

  const handleAddKeyAction = async () => {
    if (!report || addingAction || nextOrderIndex == null || !newActionText.trim())
      return;
    try {
      setAddingAction(true);
      await ReportAPI.createKeyAction(report.id, {
        order_index: newOrderIndex,
        action_text: newActionText.trim(),
      });
      toast.success("Key action added");
      setNewActionText("");
      setNewOrderIndex(nextOrderIndex + 1 > 6 ? 1 : nextOrderIndex + 1);
      onRefresh?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to add key action";
      toast.error(message);
    } finally {
      setAddingAction(false);
    }
  };

  const handleUpdateKeyAction = async (action: ReportTaskKeyAction) => {
    if (!report || editingActionId !== action.id || editActionText === action.action_text) {
      setEditingActionId(null);
      return;
    }
    try {
      await ReportAPI.updateKeyAction(report.id, action.id, {
        action_text: editActionText.trim(),
      });
      toast.success("Key action updated");
      setEditingActionId(null);
      setEditActionText("");
      onRefresh?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to update key action";
      toast.error(message);
    }
  };

  const handleDeleteKeyAction = async (action: ReportTaskKeyAction) => {
    if (!report) return;
    try {
      await ReportAPI.deleteKeyAction(report.id, action.id);
      toast.success("Key action removed");
      onRefresh?.();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Failed to delete key action";
      toast.error(message);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <span className="ml-2 text-gray-600">Loading report...</span>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">No report found for this task.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
      {report.is_complete && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-green-50 text-green-800 text-sm font-medium">
          Complete — narrative is ready to share.
        </div>
      )}

      {/* Audience */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Who is this report for?
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={localAudienceType}
            onChange={(e) =>
              setLocalAudienceType(e.target.value as ReportAudienceType)
            }
            onBlur={handleSaveAudience}
            disabled={savingField === "Audience"}
            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {(Object.entries(AUDIENCE_LABELS) as [ReportAudienceType, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
          {localAudienceType === "other" && (
            <input
              type="text"
              value={localAudienceDetails}
              onChange={(e) => setLocalAudienceDetails(e.target.value)}
              onBlur={handleSaveAudience}
              disabled={savingField === "Audience"}
              placeholder="Audience details"
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1 min-w-[200px]"
            />
          )}
        </div>
      </div>

      {/* Context */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Context (timeframe or situation)
        </label>
        <textarea
          value={localContext}
          onChange={(e) => setLocalContext(e.target.value)}
          onBlur={handleSaveContext}
          disabled={savingField === "Context"}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Key actions (1–6) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Key actions (1–6)
        </label>
        <ul className="space-y-2">
          {keyActions
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((action) => (
              <li
                key={action.id}
                className="flex items-center gap-2 border border-gray-200 rounded-md px-3 py-2"
              >
                <span className="text-gray-500 w-6">{action.order_index}.</span>
                {editingActionId === action.id ? (
                  <>
                    <input
                      type="text"
                      value={editActionText}
                      onChange={(e) => setEditActionText(e.target.value)}
                      maxLength={280}
                      className="flex-1 px-2 py-1 border rounded text-sm"
                      autoFocus
                    />
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => handleUpdateKeyAction(action)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setEditingActionId(null);
                        setEditActionText("");
                      }}
                    >
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-gray-900">{action.action_text}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingActionId(action.id);
                        setEditActionText(action.action_text);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => handleDeleteKeyAction(action)}
                    >
                      Delete
                    </Button>
                  </>
                )}
              </li>
            ))}
        </ul>
        {keyActions.length < 6 && nextOrderIndex != null && (
          <div className="mt-3 flex gap-2 items-center flex-wrap">
            <input
              type="text"
              value={newActionText}
              onChange={(e) => setNewActionText(e.target.value)}
              placeholder="Concise key action"
              maxLength={280}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 min-w-[200px]"
            />
            <Button
              size="sm"
              variant="primary"
              onClick={handleAddKeyAction}
              disabled={addingAction || !newActionText.trim()}
              loading={addingAction}
            >
              Add
            </Button>
          </div>
        )}
      </div>

      {/* Outcome summary */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Outcome summary
        </label>
        <textarea
          value={localOutcomeSummary}
          onChange={(e) => setLocalOutcomeSummary(e.target.value)}
          onBlur={handleSaveOutcomeSummary}
          disabled={savingField === "Outcome summary"}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Narrative explanation */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Narrative explanation (optional)
        </label>
        <textarea
          value={localNarrative}
          onChange={(e) => setLocalNarrative(e.target.value)}
          onBlur={handleSaveNarrative}
          disabled={savingField === "Narrative"}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
}
