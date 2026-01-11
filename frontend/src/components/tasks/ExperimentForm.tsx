import { useState } from "react";
import {
  ExperimentCreateRequest,
  ExperimentUpdateRequest,
} from "@/lib/api/experimentApi";

interface ExperimentFormProps {
  mode: "create" | "edit";
  initialData?: Partial<ExperimentCreateRequest & ExperimentUpdateRequest>;
  onChange?: (
    data: Partial<ExperimentCreateRequest & ExperimentUpdateRequest>
  ) => void;
}

export function ExperimentForm({
  mode,
  initialData,
  onChange,
}: ExperimentFormProps) {
  const [localData, setLocalData] = useState<
    Partial<ExperimentCreateRequest & ExperimentUpdateRequest>
  >(initialData || {});

  const updateField = (
    field: keyof (ExperimentCreateRequest & ExperimentUpdateRequest),
    value: any
  ) => {
    const next = { ...localData, [field]: value };
    setLocalData(next);
    onChange?.(next);
  };

  const updateControlGroupField = (
    field: "campaigns" | "ad_set_ids" | "ad_ids",
    value: string[]
  ) => {
    const currentGroup = localData.control_group || {};
    const updated = { ...currentGroup, [field]: value };
    updateField("control_group", updated);
  };

  const updateVariantGroupField = (
    field: "campaigns" | "ad_set_ids" | "ad_ids",
    value: string[]
  ) => {
    const currentGroup = localData.variant_group || {};
    const updated = { ...currentGroup, [field]: value };
    updateField("variant_group", updated);
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

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hypothesis *
        </label>
        <textarea
          value={localData.hypothesis || ""}
          onChange={(e) => updateField("hypothesis", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g., New video creative increases CTR by 10% compared to top-performing creative"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expected Outcome
        </label>
        <textarea
          value={localData.expected_outcome || ""}
          onChange={(e) => updateField("expected_outcome", e.target.value)}
          rows={2}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g., 10% increase in CTR"
        />
      </div>

      {/* Control Group */}
      <div className="border border-gray-200 rounded-md p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Control Group
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaigns (format: platform:id, one per line)
            </label>
            <textarea
              value={formatIdList(localData.control_group?.campaigns)}
              onChange={(e) =>
                updateControlGroupField("campaigns", parseIdList(e.target.value))
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
              value={formatIdList(localData.control_group?.ad_set_ids)}
              onChange={(e) =>
                updateControlGroupField(
                  "ad_set_ids",
                  parseIdList(e.target.value)
                )
              }
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              placeholder="fb:789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad IDs (format: platform:id, one per line)
            </label>
            <textarea
              value={formatIdList(localData.control_group?.ad_ids)}
              onChange={(e) =>
                updateControlGroupField("ad_ids", parseIdList(e.target.value))
              }
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              placeholder="fb:101"
            />
          </div>
        </div>
      </div>

      {/* Variant Group */}
      <div className="border border-gray-200 rounded-md p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Variant Group
        </h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaigns (format: platform:id, one per line)
            </label>
            <textarea
              value={formatIdList(localData.variant_group?.campaigns)}
              onChange={(e) =>
                updateVariantGroupField("campaigns", parseIdList(e.target.value))
              }
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              placeholder="fb:654321"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad Set IDs (format: platform:id, one per line)
            </label>
            <textarea
              value={formatIdList(localData.variant_group?.ad_set_ids)}
              onChange={(e) =>
                updateVariantGroupField(
                  "ad_set_ids",
                  parseIdList(e.target.value)
                )
              }
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              placeholder="fb:789"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad IDs (format: platform:id, one per line)
            </label>
            <textarea
              value={formatIdList(localData.variant_group?.ad_ids)}
              onChange={(e) =>
                updateVariantGroupField("ad_ids", parseIdList(e.target.value))
              }
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              placeholder="fb:101"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Success Metric
        </label>
        <input
          type="text"
          value={localData.success_metric || ""}
          onChange={(e) => updateField("success_metric", e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g., CTR, CPA, ROAS"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Constraints
        </label>
        <textarea
          value={localData.constraints || ""}
          onChange={(e) => updateField("constraints", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g., Budget constraint: max $5000 per group"
        />
      </div>

      {mode === "create" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            value={localData.status || "draft"}
            onChange={(e) =>
              updateField(
                "status",
                e.target.value as
                  | "draft"
                  | "running"
                  | "paused"
                  | "completed"
                  | "cancelled"
              )
            }
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="draft">Draft</option>
            <option value="running">Running</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      )}
    </div>
  );
}

