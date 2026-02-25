import { useState } from "react";
import {
  ExperimentCreateRequest,
  ExperimentUpdateRequest,
} from "@/lib/api/experimentApi";
import Icon from "@/components/ui/Icon";

// Platform configuration
const PLATFORMS = [
  { code: "fb", name: "Facebook", icon: "facebook" as const },
  { code: "tt", name: "TikTok", icon: "tiktok" as const },
  { code: "ig", name: "Instagram", icon: "instagram" as const },
  { code: "ga", name: "Google Ads", icon: "google-ads" as const },
] as const;

export interface ExperimentServerErrors {
  control_group?: string;
  variant_group?: string;
}

interface ExperimentFormProps {
  mode: "create" | "edit";
  initialData?: Partial<ExperimentCreateRequest & ExperimentUpdateRequest>;
  onChange?: (
    data: Partial<ExperimentCreateRequest & ExperimentUpdateRequest>
  ) => void;
  serverErrors?: ExperimentServerErrors | null;
}

export function ExperimentForm({
  mode,
  initialData,
  onChange,
  serverErrors,
}: ExperimentFormProps) {
  const [localData, setLocalData] = useState<
    Partial<ExperimentCreateRequest & ExperimentUpdateRequest>
  >(initialData || {});
  const [controlGroupErrors, setControlGroupErrors] = useState<{
    campaigns?: string;
    ad_set_ids?: string;
    ad_ids?: string;
  }>({});
  const [variantGroupErrors, setVariantGroupErrors] = useState<{
    campaigns?: string;
    ad_set_ids?: string;
    ad_ids?: string;
  }>({});

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

  const normalizeId = (raw: string): string => {
    const trimmed = raw.trim();
    const idx = trimmed.indexOf(":");
    if (idx === -1) return trimmed;
    const platform = trimmed.slice(0, idx).trim();
    const idPart = trimmed.slice(idx + 1).trim();
    return platform && idPart ? `${platform}:${idPart}` : trimmed;
  };

  const parseIdList = (value: string): string[] => {
    return value
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => normalizeId(line));
  };

  const formatIdList = (ids: string[] | undefined): string => {
    return ids ? ids.join("\n") : "";
  };

  const validateIdFormat = (id: string): boolean => {
    const normalized = normalizeId(id);
    const parts = normalized.split(":");
    if (parts.length !== 2) return false;
    const platform = parts[0];
    const idPart = parts[1];
    return platform.length > 0 && /^\d+$/.test(idPart);
  };

  const handleIdsChange = (
    group: "control_group" | "variant_group",
    field: "campaigns" | "ad_set_ids" | "ad_ids",
    raw: string
  ) => {
    const lines = raw.split("\n");
    const parsed = parseIdList(raw);

    if (group === "control_group") {
      updateControlGroupField(field, parsed);
    } else {
      updateVariantGroupField(field, parsed);
    }

    const invalid: string[] = [];
    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      if (!validateIdFormat(trimmed)) {
        invalid.push(trimmed);
      }
    });

    const message =
      invalid.length > 0
        ? `Invalid ID format: ${invalid.join(", ")}. Expected 'platform:id' with numeric id (e.g. fb:789).`
        : undefined;

    if (group === "control_group") {
      setControlGroupErrors((prev) => ({ ...prev, [field]: message }));
    } else {
      setVariantGroupErrors((prev) => ({ ...prev, [field]: message }));
    }
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
        {serverErrors?.control_group && (
          <p className="mb-2 text-xs text-red-600">{serverErrors.control_group}</p>
        )}
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
              Campaigns (format: platform:id, one per line)
            </label>
            <textarea
              value={formatIdList(localData.control_group?.campaigns)}
              onChange={(e) =>
                handleIdsChange("control_group", "campaigns", e.target.value)
              }
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              placeholder="fb:123456&#10;tt:789012"
            />
            {controlGroupErrors.campaigns && (
              <p className="mt-1 text-xs text-red-600">
                {controlGroupErrors.campaigns}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad Set IDs (format: platform:id, one per line)
            </label>
            <textarea
              value={formatIdList(localData.control_group?.ad_set_ids)}
              onChange={(e) =>
                handleIdsChange("control_group", "ad_set_ids", e.target.value)
              }
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              placeholder="fb:789"
            />
            {controlGroupErrors.ad_set_ids && (
              <p className="mt-1 text-xs text-red-600">
                {controlGroupErrors.ad_set_ids}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad IDs (format: platform:id, one per line)
            </label>
            <textarea
              value={formatIdList(localData.control_group?.ad_ids)}
              onChange={(e) =>
                handleIdsChange("control_group", "ad_ids", e.target.value)
              }
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              placeholder="fb:101"
            />
            {controlGroupErrors.ad_ids && (
              <p className="mt-1 text-xs text-red-600">
                {controlGroupErrors.ad_ids}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Variant Group */}
      <div className="border border-gray-200 rounded-md p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">
          Variant Group
        </h3>
        {serverErrors?.variant_group && (
          <p className="mb-2 text-xs text-red-600">{serverErrors.variant_group}</p>
        )}
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
              Campaigns (format: platform:id, one per line)
            </label>
            <textarea
              value={formatIdList(localData.variant_group?.campaigns)}
              onChange={(e) =>
                handleIdsChange("variant_group", "campaigns", e.target.value)
              }
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              placeholder="fb:654321"
            />
            {variantGroupErrors.campaigns && (
              <p className="mt-1 text-xs text-red-600">
                {variantGroupErrors.campaigns}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad Set IDs (format: platform:id, one per line)
            </label>
            <textarea
              value={formatIdList(localData.variant_group?.ad_set_ids)}
              onChange={(e) =>
                handleIdsChange("variant_group", "ad_set_ids", e.target.value)
              }
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              placeholder="fb:789"
            />
            {variantGroupErrors.ad_set_ids && (
              <p className="mt-1 text-xs text-red-600">
                {variantGroupErrors.ad_set_ids}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ad IDs (format: platform:id, one per line)
            </label>
            <textarea
              value={formatIdList(localData.variant_group?.ad_ids)}
              onChange={(e) =>
                handleIdsChange("variant_group", "ad_ids", e.target.value)
              }
              rows={2}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-mono"
              placeholder="fb:101"
            />
            {variantGroupErrors.ad_ids && (
              <p className="mt-1 text-xs text-red-600">
                {variantGroupErrors.ad_ids}
              </p>
            )}
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

