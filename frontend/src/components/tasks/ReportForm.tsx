"use client";

import { useState, useMemo } from "react";
import type { ReportAudienceType, ReportContext } from "@/types/report";
import { getTemplateForAudience } from "@/lib/reportTemplateRegistry";

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
  context: string; // Keep as string for form input, will be converted to ReportContext on submit
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
  const [localData, setLocalData] = useState<Partial<ReportFormData>>({
    audience_type: "client",
    audience_details: "",
    context: "",
    ...initialData,
  });

  const updateField = (field: keyof ReportFormData, value: string) => {
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

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Who is this report for? *
        </label>
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Context *
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Briefly describe the timeframe or situation that frames your decisions.
        </p>
        <textarea
          value={localData.context || ""}
          onChange={(e) => updateField("context", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          placeholder={currentTemplate?.section_prompts.context || "e.g. Q4 campaign review, post-launch situation"}
        />
        <p className="text-xs text-gray-500 mt-1">
          Keep it brief: 1–3 sentences.
        </p>
      </div>
    </div>
  );
}
