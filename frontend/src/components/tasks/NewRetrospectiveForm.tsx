"use client";

import { useEffect } from "react";
import { useFormValidation } from "@/hooks/useFormValidation";

interface RetrospectiveData {
  campaign: string; // Project ID (UUID)
  scheduled_at?: string;
  status?: "scheduled" | "in_progress" | "completed" | "reported" | "cancelled";
  decision?: string;
  confidence_level?: 1 | 2 | 3 | 4 | 5;
  primary_assumption?: string;
  key_risk_ignore?: string;
}

interface NewRetrospectiveFormProps {
  onRetrospectiveDataChange: (data: any) => void;
  retrospectiveData: any;
  taskData: any;
  validation: any;
}

export default function NewRetrospectiveForm({
  onRetrospectiveDataChange,
  retrospectiveData,
  taskData,
  validation,
}: NewRetrospectiveFormProps) {
  const { errors, validateField, clearFieldError, setErrors } = validation;

  // Initialize campaign from taskData.project_id if available
  useEffect(() => {
    if (taskData.project_id && !retrospectiveData.campaign) {
      onRetrospectiveDataChange({
        ...retrospectiveData,
        campaign: taskData.project_id?.toString() || "",
        status: retrospectiveData.status || "scheduled",
        scheduled_at:
          retrospectiveData.scheduled_at || new Date().toISOString(),
      });
    }
  }, [taskData.project_id]);

  const handleInputChange = (field: keyof RetrospectiveData, value: any) => {
    // Clear error when user starts typing
    if (errors[field as string]) {
      clearFieldError(field);
    }

    // Update retrospectiveData in parent component
    onRetrospectiveDataChange({ ...retrospectiveData, [field]: value });

    // Real-time validation of the field
    const error = validateField(field, value);
    if (error && error !== "") {
      // Set error for this field
      setErrors({ ...errors, [field as string]: error });
    }
  };

  const confidenceOptions: Array<1 | 2 | 3 | 4 | 5> = [1, 2, 3, 4, 5];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form validation is handled by parent component
  };

  // Format datetime-local input value
  const formatDateTimeLocal = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 flex flex-col">
      {/* Campaign (Project) - Read-only from task */}
      <div>
        <label
          htmlFor="retrospective-campaign"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Campaign (Project) *
        </label>
        <input
          id="retrospective-campaign"
          name="campaign"
          type="text"
          value={
            retrospectiveData.campaign || taskData.project_id?.toString() || ""
          }
          onChange={(e) => handleInputChange("campaign", e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.campaign ? "border-red-500" : "border-gray-300"
          }`}
          placeholder="Project ID (from selected project)"
          required
          readOnly={!!taskData.project_id}
        />
        {errors.campaign && (
          <p className="text-red-500 text-sm mt-1">{errors.campaign}</p>
        )}
        {taskData.project_id && (
          <p className="text-xs text-gray-500 mt-1">
            Using project from task: {taskData.project_id}
          </p>
        )}
      </div>

      {/* Scheduled At */}
      <div>
        <label
          htmlFor="retrospective-scheduled-at"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Scheduled At
        </label>
        <input
          id="retrospective-scheduled-at"
          name="scheduled_at"
          type="datetime-local"
          value={formatDateTimeLocal(retrospectiveData.scheduled_at)}
          onChange={(e) => {
            const dateValue = e.target.value;
            const isoString = dateValue
              ? new Date(dateValue).toISOString()
              : "";
            handleInputChange("scheduled_at", isoString);
          }}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.scheduled_at ? "border-red-500" : "border-gray-300"
          }`}
        />
        {errors.scheduled_at && (
          <p className="text-red-500 text-sm mt-1">{errors.scheduled_at}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Defaults to current time if not specified
        </p>
      </div>

      {/* Status */}
      <div>
        <label
          htmlFor="retrospective-status"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Status
        </label>
        <select
          id="retrospective-status"
          name="status"
          value={retrospectiveData.status || "scheduled"}
          onChange={(e) => handleInputChange("status", e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.status ? "border-red-500" : "border-gray-300"
          }`}
        >
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="reported">Reported</option>
          <option value="cancelled">Cancelled</option>
        </select>
        {errors.status && (
          <p className="text-red-500 text-sm mt-1">{errors.status}</p>
        )}
        <p className="text-xs text-gray-500 mt-1">
          Defaults to &quot;Scheduled&quot; if not specified
        </p>
      </div>

      {/* Decision */}
      <div>
        <label
          htmlFor="retrospective-decision"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Decision *
        </label>
        <textarea
          id="retrospective-decision"
          name="decision"
          value={retrospectiveData.decision || ""}
          onChange={(e) => handleInputChange("decision", e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.decision ? "border-red-500" : "border-gray-300"
          }`}
          rows={3}
          placeholder="What decision was made?"
        />
        {errors.decision && (
          <p className="text-red-500 text-sm mt-1">{errors.decision}</p>
        )}
      </div>

      {/* Confidence Level */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Confidence Level *
        </label>
        <div className="flex flex-wrap gap-2">
          {confidenceOptions.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => handleInputChange("confidence_level", level)}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                retrospectiveData.confidence_level === level
                  ? "bg-indigo-100 border-indigo-500 text-indigo-700"
                  : "bg-white border-gray-300 text-gray-700 hover:bg-gray-50"
              }`}
              aria-pressed={retrospectiveData.confidence_level === level}
              aria-label={`Select confidence level ${level}`}
            >
              {level}
            </button>
          ))}
        </div>
        {errors.confidence_level && (
          <p className="text-red-500 text-sm mt-1">{errors.confidence_level}</p>
        )}
      </div>

      {/* Primary Assumption */}
      <div>
        <label
          htmlFor="retrospective-primary-assumption"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Primary Assumption *
        </label>
        <textarea
          id="retrospective-primary-assumption"
          name="primary_assumption"
          value={retrospectiveData.primary_assumption || ""}
          onChange={(e) =>
            handleInputChange("primary_assumption", e.target.value)
          }
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.primary_assumption ? "border-red-500" : "border-gray-300"
          }`}
          rows={3}
          placeholder="What key assumption supported this decision?"
        />
        {errors.primary_assumption && (
          <p className="text-red-500 text-sm mt-1">
            {errors.primary_assumption}
          </p>
        )}
      </div>

      {/* Key Risk Ignored (Optional) */}
      <div>
        <label
          htmlFor="retrospective-key-risk-ignore"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Key Risk Ignored
        </label>
        <textarea
          id="retrospective-key-risk-ignore"
          name="key_risk_ignore"
          value={retrospectiveData.key_risk_ignore || ""}
          onChange={(e) => handleInputChange("key_risk_ignore", e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.key_risk_ignore ? "border-red-500" : "border-gray-300"
          }`}
          rows={2}
          placeholder="Optional: Which risk was consciously ignored?"
        />
        {errors.key_risk_ignore && (
          <p className="text-red-500 text-sm mt-1">{errors.key_risk_ignore}</p>
        )}
      </div>

      {/* Hidden submit button for form validation and enter key support */}
      <button type="submit" className="hidden">
        Submit Retrospective Form
      </button>
    </form>
  );
}
