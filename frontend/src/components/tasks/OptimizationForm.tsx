import { useState, useEffect } from "react";
import {
  OptimizationCreateRequest,
  OptimizationUpdateRequest,
} from "@/lib/api/optimizationApi";
import Icon from "@/components/ui/Icon";

// Platform configuration
const PLATFORMS = [
  { code: "fb", name: "Facebook", icon: "facebook" as const },
  { code: "tt", name: "TikTok", icon: "tiktok" as const },
  { code: "ig", name: "Instagram", icon: "instagram" as const },
  { code: "ga", name: "Google Ads", icon: "google-ads" as const },
] as const;

// Preset metrics options
const PRESET_METRICS = [
  "CPA",
  "CTR",
  "ROAS",
  "CPM",
  "CPC",
  "CVR",
  "Impressions",
  "Clicks",
  "Conversions",
] as const;

// Window options for triggered metrics
const WINDOW_OPTIONS = ["24h", "48h", "7d", "14d", "30d"] as const;

// Types for metrics
interface TriggeredMetricItem {
  metricName: string;
  deltaPct: number | "";
  window: string;
  isCustom: boolean;
}

interface BaselineMetricItem {
  metricName: string;
  value: number | "";
  isCustom: boolean;
}

interface OptimizationFormProps {
  mode: "create" | "edit";
  initialData?: Partial<OptimizationCreateRequest & OptimizationUpdateRequest>;
  onChange?: (
    data: Partial<OptimizationCreateRequest & OptimizationUpdateRequest>
  ) => void;
}

interface ValidationErrors {
  triggeredMetrics?: Record<number, {
    metricName?: string;
    deltaPct?: string;
    window?: string;
  }>;
  baselineMetrics?: Record<number, {
    metricName?: string;
    value?: string;
  }>;
}

export function OptimizationForm({
  mode,
  initialData,
  onChange,
}: OptimizationFormProps) {
  const [localData, setLocalData] = useState<
    Partial<OptimizationCreateRequest & OptimizationUpdateRequest>
  >(initialData || {});

  // Convert JSON metrics to array format for UI
  const parseTriggeredMetrics = (
    metrics: Record<string, any> | null | undefined
  ): TriggeredMetricItem[] => {
    if (!metrics || typeof metrics !== "object") return [];
    return Object.entries(metrics).map(([key, value]) => ({
      metricName: key,
      deltaPct: value?.delta_pct ?? "",
      window: value?.window ?? "24h",
      isCustom: !PRESET_METRICS.includes(key as any),
    }));
  };

  const parseBaselineMetrics = (
    metrics: Record<string, any> | null | undefined
  ): BaselineMetricItem[] => {
    if (!metrics || typeof metrics !== "object") return [];
    return Object.entries(metrics).map(([key, value]) => ({
      metricName: key,
      value: typeof value === "number" ? value : "",
      isCustom: !PRESET_METRICS.includes(key as any),
    }));
  };

  // Convert array format back to JSON
  const buildTriggeredMetricsJSON = (
    items: TriggeredMetricItem[]
  ): Record<string, { delta_pct: number; window: string }> | null => {
    const result: Record<string, { delta_pct: number; window: string }> = {};
    items.forEach((item) => {
      if (
        item.metricName.trim() &&
        item.deltaPct !== "" &&
        typeof item.deltaPct === "number" &&
        item.window.trim()
      ) {
        result[item.metricName.trim()] = {
          delta_pct: item.deltaPct,
          window: item.window.trim(),
        };
      }
    });
    return Object.keys(result).length > 0 ? result : null;
  };

  const buildBaselineMetricsJSON = (
    items: BaselineMetricItem[]
  ): Record<string, number> | null => {
    const result: Record<string, number> = {};
    items.forEach((item) => {
      if (
        item.metricName.trim() &&
        item.value !== "" &&
        typeof item.value === "number"
      ) {
        result[item.metricName.trim()] = item.value;
      }
    });
    return Object.keys(result).length > 0 ? result : null;
  };

  // State for triggered metrics (array format)
  const [triggeredMetrics, setTriggeredMetrics] = useState<TriggeredMetricItem[]>(() => {
    const parsed = parseTriggeredMetrics(localData.triggered_metrics);
    return parsed.length > 0 ? parsed : [{ metricName: "", deltaPct: "", window: "24h", isCustom: false }];
  });

  // State for baseline metrics (array format)
  const [baselineMetrics, setBaselineMetrics] = useState<BaselineMetricItem[]>(() => {
    const parsed = parseBaselineMetrics(localData.baseline_metrics);
    return parsed.length > 0 ? parsed : [{ metricName: "", value: "", isCustom: false }];
  });

  // Validation errors state
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});

  // Validate triggered metrics
  const validateTriggeredMetrics = (): boolean => {
    const errors: ValidationErrors["triggeredMetrics"] = {};
    let isValid = true;

    triggeredMetrics.forEach((metric, index) => {
      const metricErrors: { metricName?: string; deltaPct?: string; window?: string } = {};
      
      if (!metric.metricName || metric.metricName.trim() === "") {
        metricErrors.metricName = "Metric name is required";
        isValid = false;
      }
      
      if (metric.deltaPct === "" || metric.deltaPct === null || metric.deltaPct === undefined) {
        metricErrors.deltaPct = "Delta % is required";
        isValid = false;
      } else if (typeof metric.deltaPct === "number" && isNaN(metric.deltaPct)) {
        metricErrors.deltaPct = "Delta % must be a valid number";
        isValid = false;
      }
      
      if (!metric.window || metric.window.trim() === "") {
        metricErrors.window = "Window is required";
        isValid = false;
      }

      if (Object.keys(metricErrors).length > 0) {
        errors[index] = metricErrors;
      }
    });

    setValidationErrors((prev) => ({ ...prev, triggeredMetrics: errors }));
    return isValid;
  };

  // Validate baseline metrics
  const validateBaselineMetrics = (): boolean => {
    const errors: ValidationErrors["baselineMetrics"] = {};
    let isValid = true;

    baselineMetrics.forEach((metric, index) => {
      const metricErrors: { metricName?: string; value?: string } = {};
      
      if (!metric.metricName || metric.metricName.trim() === "") {
        metricErrors.metricName = "Metric name is required";
        isValid = false;
      }
      
      if (metric.value === "" || metric.value === null || metric.value === undefined) {
        metricErrors.value = "Value is required";
        isValid = false;
      } else if (typeof metric.value === "number" && isNaN(metric.value)) {
        metricErrors.value = "Value must be a valid number";
        isValid = false;
      }

      if (Object.keys(metricErrors).length > 0) {
        errors[index] = metricErrors;
      }
    });

    setValidationErrors((prev) => ({ ...prev, baselineMetrics: errors }));
    return isValid;
  };

  // Clear validation errors for a specific triggered metric field
  const clearTriggeredMetricError = (index: number, field: "metricName" | "deltaPct" | "window") => {
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors.triggeredMetrics?.[index]) {
        const metricErrors = { ...newErrors.triggeredMetrics[index] };
        delete metricErrors[field];
        if (Object.keys(metricErrors).length === 0) {
          const triggeredErrors = { ...newErrors.triggeredMetrics };
          delete triggeredErrors[index];
          newErrors.triggeredMetrics = Object.keys(triggeredErrors).length > 0 ? triggeredErrors : undefined;
        } else {
          newErrors.triggeredMetrics = { ...newErrors.triggeredMetrics, [index]: metricErrors };
        }
      }
      return newErrors;
    });
  };

  // Clear validation errors for a specific baseline metric field
  const clearBaselineMetricError = (index: number, field: "metricName" | "value") => {
    setValidationErrors((prev) => {
      const newErrors = { ...prev };
      if (newErrors.baselineMetrics?.[index]) {
        const metricErrors = { ...newErrors.baselineMetrics[index] };
        delete metricErrors[field];
        if (Object.keys(metricErrors).length === 0) {
          const baselineErrors = { ...newErrors.baselineMetrics };
          delete baselineErrors[index];
          newErrors.baselineMetrics = Object.keys(baselineErrors).length > 0 ? baselineErrors : undefined;
        } else {
          newErrors.baselineMetrics = { ...newErrors.baselineMetrics, [index]: metricErrors };
        }
      }
      return newErrors;
    });
  };

  // Sync with initialData changes only on mount or when initialData actually changes
  useEffect(() => {
    if (initialData) {
      const triggered = parseTriggeredMetrics(initialData.triggered_metrics);
      const baseline = parseBaselineMetrics(initialData.baseline_metrics);
      // Only update if we have actual data, don't reset if arrays are empty (user might be editing)
      if (triggered.length > 0 || baseline.length > 0) {
        if (triggered.length > 0) {
          setTriggeredMetrics(triggered);
        }
        if (baseline.length > 0) {
          setBaselineMetrics(baseline);
        }
      }
    }
  }, []); // Only run on mount

  const updateField = (
    field: keyof (OptimizationCreateRequest & OptimizationUpdateRequest),
    value: any
  ) => {
    const next = { ...localData, [field]: value };
    setLocalData(next);
    onChange?.(next);
  };

  // Update triggered metrics and sync to JSON
  const updateTriggeredMetrics = (items: TriggeredMetricItem[]) => {
    setTriggeredMetrics(items);
    const json = buildTriggeredMetricsJSON(items);
    updateField("triggered_metrics", json);
  };

  // Update baseline metrics and sync to JSON
  const updateBaselineMetrics = (items: BaselineMetricItem[]) => {
    setBaselineMetrics(items);
    const json = buildBaselineMetricsJSON(items);
    updateField("baseline_metrics", json);
  };

  // Add new triggered metric
  const addTriggeredMetric = () => {
    const newMetric: TriggeredMetricItem = { metricName: "", deltaPct: "", window: "24h", isCustom: false };
    const newMetrics = [...triggeredMetrics, newMetric];
    setTriggeredMetrics(newMetrics);
    const json = buildTriggeredMetricsJSON(newMetrics);
    updateField("triggered_metrics", json);
    // Validate after adding
    setTimeout(() => validateTriggeredMetrics(), 0);
  };

  // Remove triggered metric
  const removeTriggeredMetric = (index: number) => {
    updateTriggeredMetrics(triggeredMetrics.filter((_, i) => i !== index));
  };

  // Update triggered metric field
  const updateTriggeredMetricField = (
    index: number,
    field: keyof TriggeredMetricItem,
    value: any
  ) => {
    // Clear error when user starts typing
    if (field === "metricName" || field === "deltaPct" || field === "window") {
      clearTriggeredMetricError(index, field);
    }
    
    const updated = [...triggeredMetrics];
    updated[index] = { ...updated[index], [field]: value };
    updateTriggeredMetrics(updated);
    
    // Validate after update
    setTimeout(() => validateTriggeredMetrics(), 0);
  };

  // Add new baseline metric
  const addBaselineMetric = () => {
    const newMetric: BaselineMetricItem = { metricName: "", value: "", isCustom: false };
    const newMetrics = [...baselineMetrics, newMetric];
    setBaselineMetrics(newMetrics);
    const json = buildBaselineMetricsJSON(newMetrics);
    updateField("baseline_metrics", json);
    // Validate after adding
    setTimeout(() => validateBaselineMetrics(), 0);
  };

  // Remove baseline metric
  const removeBaselineMetric = (index: number) => {
    updateBaselineMetrics(baselineMetrics.filter((_, i) => i !== index));
  };

  // Update baseline metric field
  const updateBaselineMetricField = (
    index: number,
    field: keyof BaselineMetricItem,
    value: any
  ) => {
    // Clear error when user starts typing
    if (field === "metricName" || field === "value") {
      clearBaselineMetricError(index, field);
    }
    
    const updated = [...baselineMetrics];
    updated[index] = { ...updated[index], [field]: value };
    updateBaselineMetrics(updated);
    
    // Validate after update
    setTimeout(() => validateBaselineMetrics(), 0);
  };

  const updateAffectedEntityIds = (
    field: "campaign_ids" | "ad_set_ids",
    value: string[]
  ) => {
    const current = localData.affected_entity_ids || {};
    const updated = { ...current, [field]: value };
    updateField("affected_entity_ids", updated);
  };

  const parseIdList = (value: string): string[] => {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  };

  const formatIdList = (ids: string[] | undefined): string => {
    return ids ? ids.join("\n") : "";
  };

  const validateIdFormat = (id: string): boolean => {
    // Format: platform:id where platform is non-empty and id is numeric
    const parts = id.split(":");
    return (
      parts.length === 2 && parts[0].length > 0 && /^\d+$/.test(parts[1])
    );
  };

  const parseJSONField = (value: string): Record<string, any> | null => {
    if (!value.trim()) return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const formatJSONField = (obj: Record<string, any> | null | undefined): string => {
    if (!obj) return "";
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-4">
      {/* Affected Entity IDs */}
      <div className="border border-gray-200 rounded-md p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Affected Entities
        </h3>
        {/* Platform Icons */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-gray-500 mr-2">Available platforms:</span>
          {PLATFORMS.map((platform) => (
            <div
              key={platform.code}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs"
            >
              <Icon name={platform.icon} size="sm" className="text-gray-600" />
              <span className="text-gray-700 font-medium">{platform.code}</span>
              <span className="text-gray-500">-</span>
              <span className="text-gray-600">{platform.name}</span>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign IDs (format: platform:id, one per line)
            </label>
            <textarea
              value={formatIdList(localData.affected_entity_ids?.campaign_ids)}
              onChange={(e) =>
                updateAffectedEntityIds("campaign_ids", parseIdList(e.target.value))
              }
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              placeholder="fb:123456&#10;tt:789012"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad Set IDs (format: platform:id, one per line)
            </label>
            <textarea
              value={formatIdList(localData.affected_entity_ids?.ad_set_ids)}
              onChange={(e) =>
                updateAffectedEntityIds("ad_set_ids", parseIdList(e.target.value))
              }
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              placeholder="fb:789"
            />
          </div>
        </div>
      </div>

      {/* Triggered Metrics */}
      <div className="border border-gray-200 rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-gray-900">
            Triggered Metrics
          </label>
          <button
            type="button"
            onClick={addTriggeredMetric}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            + Add Metric
          </button>
        </div>
        <div className="space-y-3">
          {triggeredMetrics.map((metric, index) => (
            <div
              key={`triggered-${index}-${metric.metricName || 'empty'}`}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-md border border-gray-200"
            >
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Metric Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Metric Name
                  </label>
                  {metric.isCustom ? (
                    <div>
                      <input
                        type="text"
                        value={metric.metricName}
                        onChange={(e) =>
                          updateTriggeredMetricField(
                            index,
                            "metricName",
                            e.target.value
                          )
                        }
                        placeholder="Custom metric"
                        className={`w-full px-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                          validationErrors.triggeredMetrics?.[index]?.metricName
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {validationErrors.triggeredMetrics?.[index]?.metricName && (
                        <p className="text-xs text-red-600 mt-1">
                          {validationErrors.triggeredMetrics[index].metricName}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <select
                        value={metric.metricName || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "__custom__") {
                            updateTriggeredMetricField(index, "isCustom", true);
                            updateTriggeredMetricField(index, "metricName", "");
                          } else if (value !== "") {
                            updateTriggeredMetricField(index, "isCustom", false);
                            updateTriggeredMetricField(index, "metricName", value);
                          } else {
                            updateTriggeredMetricField(index, "metricName", "");
                          }
                        }}
                        className={`w-full px-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                          validationErrors.triggeredMetrics?.[index]?.metricName
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300"
                        }`}
                      >
                        <option value="">Select metric</option>
                        {PRESET_METRICS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                        <option value="__custom__">+ Custom</option>
                      </select>
                      {validationErrors.triggeredMetrics?.[index]?.metricName && (
                        <p className="text-xs text-red-600 mt-1">
                          {validationErrors.triggeredMetrics[index].metricName}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Delta % */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Delta % *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={metric.deltaPct === "" ? "" : metric.deltaPct}
                    onChange={(e) => {
                      const inputValue = e.target.value;
                      if (inputValue === "" || inputValue === "-") {
                        updateTriggeredMetricField(index, "deltaPct", "");
                      } else {
                        const numValue = parseFloat(inputValue);
                        if (!isNaN(numValue)) {
                          updateTriggeredMetricField(index, "deltaPct", numValue);
                        }
                      }
                    }}
                    placeholder="35"
                    className={`w-full px-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                      validationErrors.triggeredMetrics?.[index]?.deltaPct
                        ? "border-red-500 focus:ring-red-500"
                        : "border-gray-300"
                    }`}
                  />
                  {validationErrors.triggeredMetrics?.[index]?.deltaPct && (
                    <p className="text-xs text-red-600 mt-1">
                      {validationErrors.triggeredMetrics[index].deltaPct}
                    </p>
                  )}
                </div>

                {/* Window */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Window *
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <select
                        value={metric.window}
                        onChange={(e) =>
                          updateTriggeredMetricField(index, "window", e.target.value)
                        }
                        className={`w-full px-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                          validationErrors.triggeredMetrics?.[index]?.window
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300"
                        }`}
                      >
                        {WINDOW_OPTIONS.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                      {validationErrors.triggeredMetrics?.[index]?.window && (
                        <p className="text-xs text-red-600 mt-1">
                          {validationErrors.triggeredMetrics[index].window}
                        </p>
                      )}
                    </div>
                    {triggeredMetrics.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTriggeredMetric(index)}
                        className="px-2 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md text-sm font-medium"
                        title="Remove metric"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {triggeredMetrics.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">
              No triggered metrics added. Click &quot;+ Add Metric&quot; to add one.
            </p>
          )}
        </div>
      </div>

      {/* Baseline Metrics */}
      <div className="border border-gray-200 rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <label className="block text-sm font-semibold text-gray-900">
            Baseline Metrics
          </label>
          <button
            type="button"
            onClick={addBaselineMetric}
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            + Add Metric
          </button>
        </div>
        <div className="space-y-3">
          {baselineMetrics.map((metric, index) => (
            <div
              key={`baseline-${index}-${metric.metricName || 'empty'}`}
              className="flex items-start gap-3 p-3 bg-gray-50 rounded-md border border-gray-200"
            >
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Metric Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Metric Name
                  </label>
                  {metric.isCustom ? (
                    <div>
                      <input
                        type="text"
                        value={metric.metricName}
                        onChange={(e) =>
                          updateBaselineMetricField(
                            index,
                            "metricName",
                            e.target.value
                          )
                        }
                        placeholder="Custom metric"
                        className={`w-full px-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                          validationErrors.baselineMetrics?.[index]?.metricName
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {validationErrors.baselineMetrics?.[index]?.metricName && (
                        <p className="text-xs text-red-600 mt-1">
                          {validationErrors.baselineMetrics[index].metricName}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <select
                        value={metric.metricName || ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value === "__custom__") {
                            updateBaselineMetricField(index, "isCustom", true);
                            updateBaselineMetricField(index, "metricName", "");
                          } else if (value !== "") {
                            updateBaselineMetricField(index, "isCustom", false);
                            updateBaselineMetricField(index, "metricName", value);
                          } else {
                            updateBaselineMetricField(index, "metricName", "");
                          }
                        }}
                        className={`w-full px-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                          validationErrors.baselineMetrics?.[index]?.metricName
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300"
                        }`}
                      >
                        <option value="">Select metric</option>
                        {PRESET_METRICS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                        <option value="__custom__">+ Custom</option>
                      </select>
                      {validationErrors.baselineMetrics?.[index]?.metricName && (
                        <p className="text-xs text-red-600 mt-1">
                          {validationErrors.baselineMetrics[index].metricName}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Value */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Value *
                  </label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <input
                        type="number"
                        step="0.01"
                        value={metric.value === "" ? "" : metric.value}
                        onChange={(e) => {
                          const inputValue = e.target.value;
                          if (inputValue === "" || inputValue === "-") {
                            updateBaselineMetricField(index, "value", "");
                          } else {
                            const numValue = parseFloat(inputValue);
                            if (!isNaN(numValue)) {
                              updateBaselineMetricField(index, "value", numValue);
                            }
                          }
                        }}
                        placeholder="12.3"
                        className={`w-full px-2 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${
                          validationErrors.baselineMetrics?.[index]?.value
                            ? "border-red-500 focus:ring-red-500"
                            : "border-gray-300"
                        }`}
                      />
                      {validationErrors.baselineMetrics?.[index]?.value && (
                        <p className="text-xs text-red-600 mt-1">
                          {validationErrors.baselineMetrics[index].value}
                        </p>
                      )}
                    </div>
                    {baselineMetrics.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBaselineMetric(index)}
                        className="px-2 py-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md text-sm font-medium"
                        title="Remove metric"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {baselineMetrics.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-2">
              No baseline metrics added. Click &quot;+ Add Metric&quot; to add one.
            </p>
          )}
        </div>
      </div>

      {/* Action Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Action Type *
        </label>
        <select
          value={localData.action_type || "pause"}
          onChange={(e) =>
            updateField(
              "action_type",
              e.target.value as "pause" | "scale" | "duplicate" | "edit"
            )
          }
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        >
          <option value="pause">Pause</option>
          <option value="scale">Scale</option>
          <option value="duplicate">Duplicate</option>
          <option value="edit">Edit</option>
        </select>
      </div>

      {/* Planned Action */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Planned Action
        </label>
        <textarea
          value={localData.planned_action || ""}
          onChange={(e) => updateField("planned_action", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Describe what action will be taken..."
        />
      </div>

      {/* Execution Status */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Execution Status *
        </label>
        <select
          value={localData.execution_status || "detected"}
          onChange={(e) =>
            updateField(
              "execution_status",
              e.target.value as
                | "detected"
                | "planned"
                | "executed"
                | "monitoring"
                | "completed"
                | "cancelled"
            )
          }
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        >
          <option value="detected">Detected</option>
          <option value="planned">Planned</option>
          <option value="executed">Executed</option>
          <option value="monitoring">Monitoring</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Executed At */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Executed At
        </label>
        <input
          type="datetime-local"
          value={
            localData.executed_at
              ? new Date(localData.executed_at).toISOString().slice(0, 16)
              : ""
          }
          onChange={(e) => {
            const value = e.target.value ? new Date(e.target.value).toISOString() : null;
            updateField("executed_at", value);
          }}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Monitored At */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Monitored At
        </label>
        <input
          type="datetime-local"
          value={
            localData.monitored_at
              ? new Date(localData.monitored_at).toISOString().slice(0, 16)
              : ""
          }
          onChange={(e) => {
            const value = e.target.value ? new Date(e.target.value).toISOString() : null;
            updateField("monitored_at", value);
          }}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Outcome Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Outcome Notes
        </label>
        <textarea
          value={localData.outcome_notes || ""}
          onChange={(e) => updateField("outcome_notes", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Notes about outcome and performance changes..."
        />
      </div>

      {/* Observed Metrics (for edit mode or monitoring status) */}
      {(mode === "edit" || localData.execution_status === "monitoring" || localData.execution_status === "completed") && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Observed Metrics (JSON)
          </label>
          <textarea
            value={formatJSONField(localData.observed_metrics)}
            onChange={(e) => {
              const parsed = parseJSONField(e.target.value);
              updateField("observed_metrics", parsed);
            }}
            rows={4}
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
            placeholder='{"CPA": 10.5, "CTR": 1.2}'
          />
        </div>
      )}
    </div>
  );
}

