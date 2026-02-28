"use client";

import { useState, useEffect, useMemo } from "react";
import { ReportAPI } from "@/lib/api/reportApi";
import type {
  ReportTask as ReportTaskType,
  ReportTaskKeyAction,
  ReportTaskUpdateRequest,
  ReportAudienceType,
  PromptTemplateDefinition,
  ReportContext,
} from "@/types/report";
import { getTemplateForAudience } from "@/lib/reportTemplateRegistry";
import toast from "react-hot-toast";
import Button from "@/components/button/Button";
import AutoResizeTextarea from "@/components/ui/AutoResizeTextarea";

const AUDIENCE_LABELS: Record<ReportAudienceType, string> = {
  client: "Client",
  manager: "Manager",
  internal_team: "Internal Team",
  self: "Self",
  other: "Other",
};

const IMPLICIT_FIELD_CLASS =
  "rounded-md border border-transparent bg-transparent px-3 py-2 text-sm text-gray-900 shadow-none transition-colors hover:border-slate-200 hover:bg-white/60 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-0";

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

// Date helper functions for reporting period
const getLastWeekRange = (): { start: Date; end: Date; text: string } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const lastMonday = new Date(today);
  lastMonday.setDate(today.getDate() - daysToMonday - 7);
  const lastSunday = new Date(lastMonday);
  lastSunday.setDate(lastMonday.getDate() + 6);
  
  const formatDateRange = (start: Date, end: Date): string => {
    const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
    const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
    const startDay = start.getDate();
    const endDay = end.getDate();
    const year = start.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  };
  
  return {
    start: lastMonday,
    end: lastSunday,
    text: formatDateRange(lastMonday, lastSunday)
  };
};

const getThisMonthRange = (): { start: Date; end: Date; text: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  const formatDateRange = (start: Date, end: Date): string => {
    const month = start.toLocaleDateString('en-US', { month: 'long' });
    const year = start.getFullYear();
    return `${month} ${start.getDate()}-${end.getDate()}, ${year}`;
  };
  
  return {
    start,
    end,
    text: formatDateRange(start, end)
  };
};

const formatCustomDateRange = (startDate: string, endDate: string): string => {
  if (!startDate || !endDate) return "";
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startMonth = start.toLocaleDateString('en-US', { month: 'long' });
  const endMonth = end.toLocaleDateString('en-US', { month: 'long' });
  const startDay = start.getDate();
  const endDay = end.getDate();
  const year = start.getFullYear();
  
  if (startMonth === endMonth && start.getFullYear() === end.getFullYear()) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`;
  } else if (start.getFullYear() === end.getFullYear()) {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
  } else {
    return `${startMonth} ${startDay}, ${start.getFullYear()} - ${endMonth} ${endDay}, ${end.getFullYear()}`;
  }
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

  // Structured context state - directly from report.context object
  const [reportingPeriod, setReportingPeriod] = useState<string>("");
  const [reportingPeriodType, setReportingPeriodType] = useState<"last_week" | "this_month" | "custom" | null>(null);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [situation, setSituation] = useState<string>("");
  const [whatChanged, setWhatChanged] = useState<string>("");

  // Key action editing
  const [editingActionId, setEditingActionId] = useState<number | null>(null);
  const [editActionText, setEditActionText] = useState("");
  const [addingAction, setAddingAction] = useState(false);
  const [newActionText, setNewActionText] = useState("");

  useEffect(() => {
    if (report) {
      setLocalOutcomeSummary(report.outcome_summary ?? "");
      setLocalNarrative(report.narrative_explanation ?? "");
      setLocalAudienceType(report.audience_type ?? "");
      setLocalAudienceDetails(report.audience_details ?? "");
      
      // Load context from structured object
      const context: ReportContext = report.context || {
        reporting_period: null,
        situation: "",
        what_changed: "",
      };
      const rp = context.reporting_period;
      
      if (rp) {
        setReportingPeriodType(rp.type || null);
        
        // Handle different period types
        if (rp.type === "custom") {
          // Custom type: use dates and generate text
          setCustomStartDate(rp.start_date || "");
          setCustomEndDate(rp.end_date || "");
          if (rp.start_date && rp.end_date) {
            setReportingPeriod(formatCustomDateRange(rp.start_date, rp.end_date));
          } else {
            setReportingPeriod(rp.text || "");
          }
        } else if (rp.type === "last_week" || rp.type === "this_month") {
          // Predefined types: use text if available, otherwise generate from dates
          if (rp.text) {
            setReportingPeriod(rp.text);
          } else if (rp.start_date && rp.end_date) {
            setReportingPeriod(formatCustomDateRange(rp.start_date, rp.end_date));
          } else {
            setReportingPeriod("");
          }
          // Don't set custom dates for predefined types
          setCustomStartDate("");
          setCustomEndDate("");
        } else {
          // No type or null: clear everything
          setReportingPeriod("");
          setCustomStartDate("");
          setCustomEndDate("");
        }
      } else {
        // No reporting period: clear all
        setReportingPeriod("");
        setReportingPeriodType(null);
        setCustomStartDate("");
        setCustomEndDate("");
      }
      
      setSituation(context.situation || "");
      setWhatChanged(context.what_changed || "");
    }
  }, [report]);

  const keyActions = report?.key_actions ?? [];
  const usedOrders = keyActions.map((a) => a.order_index);
  const nextOrderIndex =
    [1, 2, 3, 4, 5, 6].find((i) => !usedOrders.includes(i)) ?? null;

  // Get current template: use localAudienceType if changed but not saved, otherwise use report.prompt_template
  const currentTemplate = useMemo((): PromptTemplateDefinition | null => {
    const effectiveAudienceType = localAudienceType || report?.audience_type;
    if (!effectiveAudienceType) return null;
    
    // If audience_type has changed but not saved, use frontend registry
    if (localAudienceType && localAudienceType !== report?.audience_type) {
      try {
        return getTemplateForAudience(localAudienceType as ReportAudienceType);
      } catch {
        return null;
      }
    }
    
    // Use backend-provided template if available and has suggested_key_actions
    if (report?.prompt_template && report.prompt_template.suggested_key_actions) {
      return report.prompt_template;
    }
    
    // Fallback to frontend registry (always has suggested_key_actions)
    try {
      return getTemplateForAudience(effectiveAudienceType as ReportAudienceType);
    } catch {
      return null;
    }
  }, [localAudienceType, report?.audience_type, report?.prompt_template]);

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
    // Build structured context object
    const contextData: ReportContext = {
      situation: situation || "",
      what_changed: whatChanged || "",
    };
    
    // Add reporting period if exists
    if (reportingPeriod && reportingPeriodType) {
      contextData.reporting_period = {
        type: reportingPeriodType,
        text: reportingPeriod,
      };
      
      // Add dates based on type
      if (reportingPeriodType === "custom" && customStartDate && customEndDate) {
        // Custom range: use user-selected dates
        contextData.reporting_period.start_date = customStartDate;
        contextData.reporting_period.end_date = customEndDate;
      } else if (reportingPeriodType === "last_week") {
        // Last week: calculate and save dates
        const range = getLastWeekRange();
        contextData.reporting_period.start_date = range.start.toISOString().split('T')[0];
        contextData.reporting_period.end_date = range.end.toISOString().split('T')[0];
      } else if (reportingPeriodType === "this_month") {
        // This month: calculate and save dates
        const range = getThisMonthRange();
        contextData.reporting_period.start_date = range.start.toISOString().split('T')[0];
        contextData.reporting_period.end_date = range.end.toISOString().split('T')[0];
      }
    } else {
      contextData.reporting_period = null;
    }
    
    // Check if context has changed
    const currentContext: ReportContext = (report?.context as ReportContext) || {
      reporting_period: null,
      situation: "",
      what_changed: "",
    };
    const hasChanged = 
      currentContext.situation !== contextData.situation ||
      currentContext.what_changed !== contextData.what_changed ||
      JSON.stringify(currentContext.reporting_period) !== JSON.stringify(contextData.reporting_period);
    
    if (!hasChanged) return;
    
    handleSaveReport("Context", { context: contextData });
  };

  const handleReportingPeriodTypeChange = (type: "last_week" | "this_month" | "custom" | null) => {
    setReportingPeriodType(type);
    if (type === "last_week") {
      const range = getLastWeekRange();
      setReportingPeriod(range.text);
      setCustomStartDate("");
      setCustomEndDate("");
    } else if (type === "this_month") {
      const range = getThisMonthRange();
      setReportingPeriod(range.text);
      setCustomStartDate("");
      setCustomEndDate("");
    } else if (type === "custom") {
      setReportingPeriod("");
    } else {
      setReportingPeriod("");
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };

  useEffect(() => {
    if (reportingPeriodType === "custom" && customStartDate && customEndDate) {
      const formatted = formatCustomDateRange(customStartDate, customEndDate);
      setReportingPeriod(formatted);
    } else if (reportingPeriodType === "custom" && (!customStartDate || !customEndDate)) {
      setReportingPeriod("");
    }
  }, [customStartDate, customEndDate, reportingPeriodType]);

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
        order_index: nextOrderIndex,
        action_text: newActionText.trim(),
      });
      toast.success("Key action added");
      setNewActionText("");
      // Refresh to get updated key actions, then recalculate nextOrderIndex
      onRefresh?.();
      // Note: nextOrderIndex will be recalculated automatically when report updates
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
      <div className="border-t border-slate-200 pt-5">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          <span className="ml-2 text-gray-600">Loading report...</span>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="border-t border-slate-200 pt-5">
        <div className="text-center py-8">
          <p className="text-gray-500">No report found for this task.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-200 pt-5 space-y-6">
      {/* Audience */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          1. Who is this report for?
        </h2>
        <p className="text-xs text-gray-500 mb-2">
          This helps tailor the tone and focus of your explanation.
        </p>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            value={localAudienceType}
            onChange={(e) =>
              setLocalAudienceType(e.target.value as ReportAudienceType)
            }
            onBlur={handleSaveAudience}
            disabled={savingField === "Audience"}
            className={`w-full max-w-sm ${IMPLICIT_FIELD_CLASS}`}
          >
            {(Object.entries(AUDIENCE_LABELS) as [ReportAudienceType, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </div>
        {localAudienceType === "other" && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Audience details *
            </label>
            <input
              type="text"
              value={localAudienceDetails}
              onChange={(e) => setLocalAudienceDetails(e.target.value)}
              onBlur={handleSaveAudience}
              disabled={savingField === "Audience"}
              placeholder="e.g. External partner, Board member, Stakeholder"
              className={`w-full ${IMPLICIT_FIELD_CLASS}`}
            />
          </div>
        )}
      </div>

      {/* Context */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            2. Context
          </h2>
        </div>

        {/* Reporting Period */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reporting period
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              type="button"
              onClick={() => handleReportingPeriodTypeChange("last_week")}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                reportingPeriodType === "last_week"
                  ? "bg-indigo-100 border-indigo-500 text-indigo-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Last week
            </button>
            <button
              type="button"
              onClick={() => handleReportingPeriodTypeChange("this_month")}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                reportingPeriodType === "this_month"
                  ? "bg-indigo-100 border-indigo-500 text-indigo-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              This month
            </button>
            <button
              type="button"
              onClick={() => handleReportingPeriodTypeChange("custom")}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                reportingPeriodType === "custom"
                  ? "bg-indigo-100 border-indigo-500 text-indigo-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
            >
              Custom range
            </button>
          </div>
          {reportingPeriodType === "custom" && (
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className={IMPLICIT_FIELD_CLASS}
                placeholder="Start date"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
                className={IMPLICIT_FIELD_CLASS}
                placeholder="End date"
              />
            </div>
          )}
        </div>

        {/* Situation */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What situation required action? *
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Describe the situation that led to your decisions.
          </p>
          <AutoResizeTextarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            onBlur={handleSaveContext}
            disabled={savingField === "Context"}
            rows={3}
            placeholder="e.g. Performance became unstable after scaling. Budget was reduced mid-cycle. Early results showed volatility."
            className={`w-full ${IMPLICIT_FIELD_CLASS}`}
          />
        </div>

        {/* What Changed */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            What changed compared to before?
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Briefly describe what shifted, declined, or became uncertain.
          </p>
          <AutoResizeTextarea
            value={whatChanged}
            onChange={(e) => setWhatChanged(e.target.value)}
            onBlur={handleSaveContext}
            disabled={savingField === "Context"}
            rows={2}
            placeholder="e.g. Conversion rates declined. Volume increased but efficiency dropped. Audience behavior shifted."
            className={`w-full ${IMPLICIT_FIELD_CLASS}`}
          />
        </div>
      </div>

      {/* Key actions (1-6) */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          3. Key actions
        </h2>
        <p className="text-xs text-gray-500 mb-1">
          List the most important decisions or actions you took (not operational details).
        </p>
        <p className="text-xs text-gray-500 mb-2">
          Recommended: 2-3 actions. Maximum: 6.
        </p>
        <div className="space-y-3">
          {keyActions
            .slice()
            .sort((a, b) => a.order_index - b.order_index)
            .map((action, index) => (
              <div key={action.id}>
                <div className="flex items-start gap-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 p-4 transition-colors">
                  <div className="flex-1 min-w-0">
                    {editingActionId === action.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editActionText}
                          onChange={(e) => setEditActionText(e.target.value)}
                          maxLength={280}
                          className={`w-full ${IMPLICIT_FIELD_CLASS}`}
                          autoFocus
                        />
                        <div className="flex gap-2">
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
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-3">
                          <p className="text-gray-900 text-sm flex-1">{action.action_text}</p>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-gray-500">
                              {formatTimestamp(action.created_at)}
                            </span>
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
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
        </div>
        {keyActions.length < 6 && nextOrderIndex != null && (
          <div className="mt-3 space-y-2">
            {currentTemplate?.suggested_key_actions && currentTemplate.suggested_key_actions.length > 0 && (
              <div className="flex gap-2 items-center flex-wrap">
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) {
                      setNewActionText(e.target.value);
                    }
                  }}
                  className={IMPLICIT_FIELD_CLASS}
                >
                  <option value="">Select a suggested action...</option>
                  {currentTemplate.suggested_key_actions.map((action, idx) => (
                    <option key={idx} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex gap-2 items-center flex-wrap">
              <input
                type="text"
                value={newActionText}
                onChange={(e) => setNewActionText(e.target.value)}
                placeholder={currentTemplate?.section_prompts.key_actions || "e.g. Reallocated budget, Paused underperforming segments"}
                maxLength={280}
                className={`flex-1 min-w-[200px] ${IMPLICIT_FIELD_CLASS}`}
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
          </div>
        )}
      </div>

      {/* Outcome summary */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          4. Outcome summary
        </h2>
        <p className="text-xs text-gray-500 mb-2">
          Summarize the high-level impact and results in plain language.
        </p>
        <AutoResizeTextarea
          value={localOutcomeSummary}
          onChange={(e) => setLocalOutcomeSummary(e.target.value)}
          onBlur={handleSaveOutcomeSummary}
          disabled={savingField === "Outcome summary"}
          rows={3}
          placeholder={currentTemplate?.section_prompts.outcome_summary || "e.g. Campaign stabilized with improved efficiency. Budget reallocation led to better performance in priority channels."}
          className={`w-full ${IMPLICIT_FIELD_CLASS}`}
        />
        <p className="text-xs text-gray-500 mt-1">
          Focus on qualitative impact, not raw metrics.
        </p>
      </div>

      {/* Narrative explanation */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          5. Narrative explanation (optional)
        </h2>
        <p className="text-xs text-gray-500 mb-2">
          Add any additional reasoning, constraints, or context that helps explain your decisions.
        </p>
        <AutoResizeTextarea
          value={localNarrative}
          onChange={(e) => setLocalNarrative(e.target.value)}
          onBlur={handleSaveNarrative}
          disabled={savingField === "Narrative"}
          rows={4}
          placeholder={currentTemplate?.section_prompts.narrative_explanation || "e.g. Market conditions required a conservative approach. Technical constraints limited our options."}
          className={`w-full ${IMPLICIT_FIELD_CLASS}`}
        />
        <p className="text-xs text-gray-500 mt-1">
          Optional: Only include if it adds clarity to your explanation.
        </p>
      </div>
    </div>
  );
}
