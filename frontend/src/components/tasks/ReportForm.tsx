"use client";

import { useState, useMemo, useEffect } from "react";
import type { ReportAudienceType, ReportContext } from "@/types/report";
import { getTemplateForAudience } from "@/lib/reportTemplateRegistry";
import Button from "@/components/button/Button";

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
      return `${startMonth} ${startDay}–${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
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
    return `${month} ${start.getDate()}–${end.getDate()}, ${year}`;
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
    return `${startMonth} ${startDay}–${endDay}, ${year}`;
  } else if (start.getFullYear() === end.getFullYear()) {
    return `${startMonth} ${startDay} – ${endMonth} ${endDay}, ${year}`;
  } else {
    return `${startMonth} ${startDay}, ${start.getFullYear()} – ${endMonth} ${endDay}, ${end.getFullYear()}`;
  }
};

const AUDIENCE_OPTIONS: { value: ReportAudienceType; label: string }[] = [
  { value: "client", label: "Client" },
  { value: "manager", label: "Manager" },
  { value: "internal_team", label: "Internal Team" },
  { value: "self", label: "Self" },
  { value: "other", label: "Other" },
];

export interface ReportFormData {
  audience_type: ReportAudienceType;
  audience_details: string;
  context: ReportContext;
  outcome_summary: string;
  narrative_explanation: string;
  key_actions: string[];
}

interface ReportFormProps {
  mode: "create" | "edit";
  initialData?: Partial<ReportFormData>;
  onChange?: (data: Partial<ReportFormData>) => void;
}

export function ReportForm({
  mode,
  initialData,
  onChange,
}: ReportFormProps) {
  // Initialize context from initialData or default empty structure
  const initialContext: ReportContext = initialData?.context || {
    reporting_period: null,
    situation: "",
    what_changed: "",
  };

  const [localData, setLocalData] = useState<Partial<ReportFormData>>({
    audience_type: "client",
    audience_details: "",
    context: initialContext,
    outcome_summary: "",
    narrative_explanation: "",
    key_actions: [],
    ...initialData,
  });

  const [outcomeSummary, setOutcomeSummary] = useState<string>(
    initialData?.outcome_summary ?? ""
  );
  const [narrativeExplanation, setNarrativeExplanation] = useState<string>(
    initialData?.narrative_explanation ?? ""
  );
  const [keyActions, setKeyActions] = useState<string[]>(
    initialData?.key_actions ?? []
  );
  const [newActionText, setNewActionText] = useState("");

  // Structured context state
  const [reportingPeriod, setReportingPeriod] = useState<string>(
    initialContext.reporting_period?.text || ""
  );
  const [reportingPeriodType, setReportingPeriodType] = useState<"last_week" | "this_month" | "custom" | null>(
    initialContext.reporting_period?.type || null
  );
  const [customStartDate, setCustomStartDate] = useState<string>(
    initialContext.reporting_period?.start_date || ""
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    initialContext.reporting_period?.end_date || ""
  );
  const [situation, setSituation] = useState<string>(
    initialContext.situation || ""
  );
  const [whatChanged, setWhatChanged] = useState<string>(
    initialContext.what_changed || ""
  );

  const updateField = (
    field: keyof ReportFormData,
    value: string | ReportContext | ReportAudienceType | string[]
  ) => {
    const next = { ...localData, [field]: value };
    setLocalData(next);
    onChange?.(next);
  };

  const isOther = localData.audience_type === "other";

  // Get template for current audience type
  const currentTemplate = useMemo(() => {
    const audienceType = localData.audience_type || "client";
    try {
      return getTemplateForAudience(audienceType);
    } catch {
      return null;
    }
  }, [localData.audience_type]);

  // Handle reporting period type change
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
    updateContextData();
  };

  // Update custom date range when dates change
  useEffect(() => {
    if (reportingPeriodType === "custom" && customStartDate && customEndDate) {
      const formatted = formatCustomDateRange(customStartDate, customEndDate);
      setReportingPeriod(formatted);
    } else if (reportingPeriodType === "custom" && (!customStartDate || !customEndDate)) {
      setReportingPeriod("");
    }
  }, [customStartDate, customEndDate, reportingPeriodType]);
  
  // Update context when reporting period or its type changes
  useEffect(() => {
    updateContextData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportingPeriod, reportingPeriodType]);

  // Update context data and notify parent
  const updateContextData = () => {
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
        contextData.reporting_period.start_date = customStartDate;
        contextData.reporting_period.end_date = customEndDate;
      } else if (reportingPeriodType === "last_week") {
        const range = getLastWeekRange();
        contextData.reporting_period.start_date = range.start.toISOString().split('T')[0];
        contextData.reporting_period.end_date = range.end.toISOString().split('T')[0];
      } else if (reportingPeriodType === "this_month") {
        const range = getThisMonthRange();
        contextData.reporting_period.start_date = range.start.toISOString().split('T')[0];
        contextData.reporting_period.end_date = range.end.toISOString().split('T')[0];
      }
    } else {
      contextData.reporting_period = null;
    }
    
    updateField("context", contextData);
  };

  // Update context when situation or whatChanged changes
  useEffect(() => {
    updateContextData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [situation, whatChanged]);

  // Sync outcome summary, narrative, key_actions to parent
  useEffect(() => {
    updateField("outcome_summary", outcomeSummary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcomeSummary]);
  useEffect(() => {
    updateField("narrative_explanation", narrativeExplanation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [narrativeExplanation]);
  useEffect(() => {
    updateField("key_actions", keyActions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyActions]);

  const handleAddKeyAction = () => {
    const t = newActionText.trim();
    if (!t || keyActions.length >= 6) return;
    const next = [...keyActions, t];
    setKeyActions(next);
    setNewActionText("");
  };

  const handleRemoveKeyAction = (index: number) => {
    setKeyActions((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* 1. Who is this report for? */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          1. Who is this report for?
        </h2>
        <p className="text-xs text-gray-500 mb-2">
          This helps tailor the tone and focus of your explanation.
        </p>
        <select
          value={localData.audience_type || "client"}
          onChange={(e) =>
            updateField(
              "audience_type",
              e.target.value as ReportAudienceType
            )
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
        >
          {AUDIENCE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {isOther && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Audience details *
          </label>
          <input
            type="text"
            value={localData.audience_details || ""}
            onChange={(e) => updateField("audience_details", e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            placeholder="e.g. External partner, Board member, Stakeholder"
          />
        </div>
      )}

      {/* 2. Context */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          2. Context
        </h2>

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
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Start date"
              />
              <span className="text-gray-500 text-sm">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                min={customStartDate}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            rows={3}
            placeholder="e.g. Performance became unstable after scaling. Budget was reduced mid-cycle. Early results showed volatility."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <textarea
            value={whatChanged}
            onChange={(e) => setWhatChanged(e.target.value)}
            rows={2}
            placeholder="e.g. Conversion rates declined. Volume increased but efficiency dropped. Audience behavior shifted."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* 3. Key actions */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          3. Key actions
        </h2>
        <p className="text-xs text-gray-500 mb-1">
          List the most important decisions or actions you took (not operational details).
        </p>
        <p className="text-xs text-gray-500 mb-2">
          Recommended: 2–3 actions. Maximum: 6.
        </p>
        <div className="space-y-3">
          {keyActions.map((text, index) => (
            <div
              key={index}
              className="flex items-center gap-3 bg-gray-50 rounded-lg border border-gray-200 p-4"
            >
              <p className="text-gray-900 text-sm flex-1">{text}</p>
              <Button
                size="sm"
                variant="danger"
                onClick={() => handleRemoveKeyAction(index)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        {keyActions.length < 6 && (
          <div className="mt-3 space-y-2">
            {currentTemplate?.suggested_key_actions &&
              currentTemplate.suggested_key_actions.length > 0 && (
                <div className="flex gap-2 items-center flex-wrap">
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) setNewActionText(e.target.value);
                    }}
                    className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                placeholder={
                  currentTemplate?.section_prompts.key_actions ||
                  "e.g. Reallocated budget, Paused underperforming segments"
                }
                maxLength={280}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm flex-1 min-w-[200px] focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <Button
                size="sm"
                variant="primary"
                onClick={handleAddKeyAction}
                disabled={!newActionText.trim() || keyActions.length >= 6}
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Outcome summary */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          4. Outcome summary
        </h2>
        <p className="text-xs text-gray-500 mb-2">
          Summarize the high-level impact and results in plain language.
        </p>
        <textarea
          value={outcomeSummary}
          onChange={(e) => setOutcomeSummary(e.target.value)}
          rows={3}
          placeholder={
            currentTemplate?.section_prompts.outcome_summary ||
            "e.g. Campaign stabilized with improved efficiency. Budget reallocation led to better performance in priority channels."
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Focus on qualitative impact, not raw metrics.
        </p>
      </div>

      {/* 5. Narrative explanation (optional) */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-3">
          5. Narrative explanation (optional)
        </h2>
        <p className="text-xs text-gray-500 mb-2">
          Add any additional reasoning, constraints, or context that helps explain your decisions.
        </p>
        <textarea
          value={narrativeExplanation}
          onChange={(e) => setNarrativeExplanation(e.target.value)}
          rows={4}
          placeholder={
            currentTemplate?.section_prompts.narrative_explanation ||
            "e.g. Market conditions required a conservative approach. Technical constraints limited our options."
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Optional: Only include if it adds clarity to your explanation.
        </p>
      </div>
    </div>
  );
}
