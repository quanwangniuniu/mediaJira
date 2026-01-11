"use client";

import { useMemo } from "react";
import { useFormValidation } from "@/hooks/useFormValidation";

type CommunicationType =
  | "budget_change"
  | "creative_approval"
  | "kpi_update"
  | "targeting_change"
  | "other";

type ImpactedArea = "budget" | "creative" | "kpi" | "targeting";

export interface ClientCommunicationFormData {
  communication_type: CommunicationType | "";
  stakeholders: string;
  impacted_areas: ImpactedArea[];
  required_actions: string;
  client_deadline: string;
  notes: string;
}

interface NewClientCommunicationFormProps {
  communicationData: ClientCommunicationFormData;
  onCommunicationDataChange: (data: Partial<ClientCommunicationFormData>) => void;
  validation: ReturnType<
    typeof useFormValidation<ClientCommunicationFormData>
  >;
}

const COMMUNICATION_TYPE_OPTIONS: { value: CommunicationType; label: string }[] =
  [
    { value: "budget_change", label: "Budget Change" },
    { value: "creative_approval", label: "Creative Approval" },
    { value: "kpi_update", label: "KPI Update" },
    { value: "targeting_change", label: "Targeting Change" },
    { value: "other", label: "Other" },
  ];

const IMPACTED_AREA_OPTIONS: { value: ImpactedArea; label: string }[] = [
  { value: "budget", label: "Budget" },
  { value: "creative", label: "Creative" },
  { value: "kpi", label: "KPIs" },
  { value: "targeting", label: "Targeting" },
];

export default function NewClientCommunicationForm({
  communicationData,
  onCommunicationDataChange,
  validation,
}: NewClientCommunicationFormProps) {
  const { errors, validateField, clearFieldError, setErrors } = validation;

  const impactedAreasSet = useMemo(
    () => new Set(communicationData.impacted_areas || []),
    [communicationData.impacted_areas]
  );

  const handleFieldChange = <
    K extends keyof ClientCommunicationFormData,
  >(
    field: K,
    value: ClientCommunicationFormData[K]
  ) => {
    if (errors[field as string]) {
      clearFieldError(field);
    }

    const nextData = {
      ...communicationData,
      [field]: value,
    };
    onCommunicationDataChange(nextData);

    const error = validateField(field, value);
    if (error && error !== "") {
      setErrors({ ...errors, [field as string]: error });
    }
  };

  const handleImpactedAreaToggle = (area: ImpactedArea) => {
    const next = new Set(impactedAreasSet);
    if (next.has(area)) {
      next.delete(area);
    } else {
      next.add(area);
    }
    handleFieldChange("impacted_areas", Array.from(next) as ImpactedArea[]);
  };

  return (
    <form className="w-full space-y-4">
      {/* Communication Type */}
      <div>
        <label
          htmlFor="communication-type"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Communication Type *
        </label>
        <select
          id="communication-type"
          name="communication_type"
          value={communicationData.communication_type || ""}
          onChange={(e) =>
            handleFieldChange(
              "communication_type",
              e.target.value as CommunicationType | ""
            )
          }
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.communication_type ? "border-red-500" : "border-gray-300"
          }`}
          required
        >
          <option value="" disabled>
            Select communication type
          </option>
          {COMMUNICATION_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {errors.communication_type && (
          <p className="text-red-500 text-sm mt-1">
            {errors.communication_type}
          </p>
        )}
      </div>

      {/* Stakeholders */}
      <div>
        <label
          htmlFor="communication-stakeholders"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Stakeholders (optional)
        </label>
        <textarea
          id="communication-stakeholders"
          name="stakeholders"
          value={communicationData.stakeholders || ""}
          onChange={(e) =>
            handleFieldChange("stakeholders", e.target.value || "")
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={3}
          placeholder="List client contacts and internal team members involved in this communication."
        />
      </div>

      {/* Impacted Areas */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Impacted Areas *
        </label>
        <div className="space-y-2">
          {IMPACTED_AREA_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex items-center gap-2 text-sm text-gray-700"
            >
              <input
                type="checkbox"
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                checked={impactedAreasSet.has(opt.value)}
                onChange={() => handleImpactedAreaToggle(opt.value)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
        {errors.impacted_areas && (
          <p className="text-red-500 text-sm mt-1">
            {errors.impacted_areas}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Select at least one area that this communication affects, such as
          budget, creative, KPIs, or targeting.
        </p>
      </div>

      {/* Required Actions */}
      <div>
        <label
          htmlFor="communication-required-actions"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Required Actions *
        </label>
        <textarea
          id="communication-required-actions"
          name="required_actions"
          value={communicationData.required_actions || ""}
          onChange={(e) =>
            handleFieldChange("required_actions", e.target.value || "")
          }
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.required_actions ? "border-red-500" : "border-gray-300"
          }`}
          rows={4}
          placeholder="Describe the actions that must be taken in response to this communication."
          required
        />
        {errors.required_actions && (
          <p className="text-red-500 text-sm mt-1">
            {errors.required_actions}
          </p>
        )}
      </div>

      {/* Client Deadline */}
      <div>
        <label
          htmlFor="communication-client-deadline"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Client Deadline (optional)
        </label>
        <input
          id="communication-client-deadline"
          name="client_deadline"
          type="date"
          value={communicationData.client_deadline || ""}
          onChange={(e) =>
            handleFieldChange("client_deadline", e.target.value || "")
          }
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          If the client provided a specific deadline for these actions, record
          it here.
        </p>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="communication-notes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Notes (optional)
        </label>
        <textarea
          id="communication-notes"
          name="notes"
          value={communicationData.notes || ""}
          onChange={(e) => handleFieldChange("notes", e.target.value || "")}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Any additional context, such as meeting notes or follow-up details."
        />
      </div>

      {/* Hidden submit to support Enter key / validation */}
      <button type="submit" className="hidden">
        Submit Client Communication Form
      </button>
    </form>
  );
}

