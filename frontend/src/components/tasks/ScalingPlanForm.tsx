import { useEffect, useState } from "react";
import {
  ScalingPlanCreateRequest,
  ScalingPlanUpdateRequest,
} from "@/lib/api/optimizationScalingApi";

interface ScalingPlanFormProps {
  mode: "create" | "edit";
  initialPlan?: Partial<ScalingPlanCreateRequest & ScalingPlanUpdateRequest>;
  onChange?: (data: Partial<ScalingPlanCreateRequest & ScalingPlanUpdateRequest>) => void;
}

export function ScalingPlanForm({
  mode,
  initialPlan,
  onChange,
}: ScalingPlanFormProps) {
  const [localData, setLocalData] = useState<
    Partial<ScalingPlanCreateRequest & ScalingPlanUpdateRequest>
  >(initialPlan || {});

  useEffect(() => {
    setLocalData(initialPlan || {});
  }, [initialPlan]);

  const updateField = (
    field: keyof (ScalingPlanCreateRequest & ScalingPlanUpdateRequest),
    value: any
  ) => {
    const next = { ...localData, [field]: value };
    setLocalData(next);
    onChange?.(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Scaling strategy *
        </label>
        <select
          value={localData.strategy || ""}
          onChange={(e) =>
            updateField(
              "strategy",
              e.target.value as "horizontal" | "vertical" | "hybrid"
            )
          }
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="" disabled>
            Select strategy
          </option>
          <option value="horizontal">Horizontal (duplicate / expand)</option>
          <option value="vertical">Vertical (increase budget/bids)</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Scaling target
        </label>
        <textarea
          value={localData.scaling_target || ""}
          onChange={(e) => updateField("scaling_target", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Increase budget from $500/day to $3000/day while keeping ROAS ≥ 3.5"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Risks and considerations
        </label>
        <textarea
          value={localData.risk_considerations || ""}
          onChange={(e) =>
            updateField("risk_considerations", e.target.value)
          }
          rows={3}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Key risks (ROAS drop, CPA increase, learning phase reset, etc.)"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Max scaling limit
        </label>
        <input
          type="text"
          value={localData.max_scaling_limit || ""}
          onChange={(e) => updateField("max_scaling_limit", e.target.value)}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. Max +30% per step, cap at $3000/day"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Stop / rollback conditions
        </label>
        <textarea
          value={localData.stop_conditions || ""}
          onChange={(e) => updateField("stop_conditions", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="e.g. ROAS &lt; 3 for 2 days, CPA &gt; $50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Expected outcomes
        </label>
        <textarea
          value={localData.expected_outcomes || ""}
          onChange={(e) => updateField("expected_outcomes", e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Overall expectations (ROAS, revenue, volume, etc.)"
        />
      </div>
    </div>
  );
}

