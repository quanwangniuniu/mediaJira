'use client';

import { useEffect, useState } from "react";
import { PolicyAPI, PolicyChoicesResponse } from '@/lib/api/policyApi';

interface PolicyFormData {
  platform: string;
  policy_change_type: string;
  policy_description: string;
  policy_reference_url: string;
  effective_date: string;
  affected_campaigns: string;
  affected_ad_sets: string;
  affected_assets: string;
  performance_impact: string;
  budget_impact: string;
  compliance_risk: string;
  immediate_actions_required: string;
  action_deadline: string;
}

interface NewPlatformPolicyUpdateFormProps {
  onPolicyDataChange: (data: any) => void;
  policyData: any;
  taskData: any;
  validation: any;
}

export default function NewPlatformPolicyUpdateForm({
  onPolicyDataChange,
  policyData,
  taskData,
  validation,
}: NewPlatformPolicyUpdateFormProps) {
  const { errors, validateField, clearFieldError, setErrors } = validation;
  const [loadingChoices, setLoadingChoices] = useState(false);
  const [platforms, setPlatforms] = useState<{ value: string; label: string }[]>([]);
  const [policyChangeTypes, setPolicyChangeTypes] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const fetchChoices = async () => {
      try {
        setLoadingChoices(true);
        const response = await PolicyAPI.getChoices();
        const data: PolicyChoicesResponse = response.data;
        setPlatforms(data.platforms || []);
        setPolicyChangeTypes(data.policy_change_types || []);
      } catch (error) {
        console.error('Error fetching policy choices:', error);
      } finally {
        setLoadingChoices(false);
      }
    };
    fetchChoices();
  }, []);

  const handleInputChange = (field: keyof PolicyFormData, value: any) => {
    if (errors[field as string]) {
      clearFieldError(field);
    }
    onPolicyDataChange({ ...policyData, [field]: value });
    const error = validateField(field, value);
    if (error && error !== '') {
      setErrors({ ...errors, [field as string]: error });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 flex flex-col">
      {/* Platform */}
      <div>
        <label htmlFor="policy-platform" className="block text-sm font-medium text-gray-700 mb-1">
          Platform *
        </label>
        <select
          id="policy-platform"
          name="platform"
          value={policyData.platform || ''}
          onChange={(e) => handleInputChange('platform', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.platform ? 'border-red-500' : 'border-gray-300'
          }`}
          required
          disabled={loadingChoices}
        >
          <option value="" disabled>
            {loadingChoices ? 'Loading platforms...' : 'Select a platform'}
          </option>
          {platforms.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        {errors.platform && (
          <p className="text-red-500 text-sm mt-1">{errors.platform}</p>
        )}
      </div>

      {/* Policy Change Type */}
      <div>
        <label htmlFor="policy-change-type" className="block text-sm font-medium text-gray-700 mb-1">
          Policy Change Type *
        </label>
        <select
          id="policy-change-type"
          name="policy_change_type"
          value={policyData.policy_change_type || ''}
          onChange={(e) => handleInputChange('policy_change_type', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.policy_change_type ? 'border-red-500' : 'border-gray-300'
          }`}
          required
          disabled={loadingChoices}
        >
          <option value="" disabled>
            {loadingChoices ? 'Loading policy change types...' : 'Select a policy change type'}
          </option>
          {policyChangeTypes.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {errors.policy_change_type && (
          <p className="text-red-500 text-sm mt-1">{errors.policy_change_type}</p>
        )}
      </div>

      {/* Policy Description */}
      <div>
        <label htmlFor="policy-description" className="block text-sm font-medium text-gray-700 mb-1">
          Policy Description *
        </label>
        <textarea
          id="policy-description"
          name="policy_description"
          value={policyData.policy_description || ''}
          onChange={(e) => handleInputChange('policy_description', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.policy_description ? 'border-red-500' : 'border-gray-300'
          }`}
          rows={3}
          placeholder="Describe the policy change"
          required
        />
        {errors.policy_description && (
          <p className="text-red-500 text-sm mt-1">{errors.policy_description}</p>
        )}
      </div>

      {/* Policy Reference URL */}
      <div>
        <label htmlFor="policy-reference-url" className="block text-sm font-medium text-gray-700 mb-1">
          Policy Reference URL
        </label>
        <input
          id="policy-reference-url"
          name="policy_reference_url"
          type="url"
          value={policyData.policy_reference_url || ''}
          onChange={(e) => handleInputChange('policy_reference_url', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="https://example.com/policy-update"
        />
      </div>

      {/* Effective Date */}
      <div>
        <label htmlFor="policy-effective-date" className="block text-sm font-medium text-gray-700 mb-1">
          Effective Date
        </label>
        <input
          id="policy-effective-date"
          name="effective_date"
          type="date"
          value={policyData.effective_date || ''}
          onChange={(e) => handleInputChange('effective_date', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Affected Campaigns */}
      <div>
        <label htmlFor="policy-affected-campaigns" className="block text-sm font-medium text-gray-700 mb-1">
          Affected Campaigns
        </label>
        <textarea
          id="policy-affected-campaigns"
          name="affected_campaigns"
          value={policyData.affected_campaigns || ''}
          onChange={(e) => handleInputChange('affected_campaigns', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={2}
          placeholder="Comma-separated campaign names"
        />
      </div>

      {/* Affected Ad Sets */}
      <div>
        <label htmlFor="policy-affected-ad-sets" className="block text-sm font-medium text-gray-700 mb-1">
          Affected Ad Sets
        </label>
        <textarea
          id="policy-affected-ad-sets"
          name="affected_ad_sets"
          value={policyData.affected_ad_sets || ''}
          onChange={(e) => handleInputChange('affected_ad_sets', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={2}
          placeholder="Comma-separated ad set names"
        />
      </div>

      {/* Affected Assets */}
      <div>
        <label htmlFor="policy-affected-assets" className="block text-sm font-medium text-gray-700 mb-1">
          Affected Assets
        </label>
        <textarea
          id="policy-affected-assets"
          name="affected_assets"
          value={policyData.affected_assets || ''}
          onChange={(e) => handleInputChange('affected_assets', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={2}
          placeholder="Comma-separated asset names"
        />
      </div>

      {/* Performance Impact */}
      <div>
        <label htmlFor="policy-performance-impact" className="block text-sm font-medium text-gray-700 mb-1">
          Performance Impact
        </label>
        <textarea
          id="policy-performance-impact"
          name="performance_impact"
          value={policyData.performance_impact || ''}
          onChange={(e) => handleInputChange('performance_impact', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={2}
          placeholder="Describe potential performance impact"
        />
      </div>

      {/* Budget Impact */}
      <div>
        <label htmlFor="policy-budget-impact" className="block text-sm font-medium text-gray-700 mb-1">
          Budget Impact
        </label>
        <textarea
          id="policy-budget-impact"
          name="budget_impact"
          value={policyData.budget_impact || ''}
          onChange={(e) => handleInputChange('budget_impact', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={2}
          placeholder="Describe potential budget impact"
        />
      </div>

      {/* Compliance Risk */}
      <div>
        <label htmlFor="policy-compliance-risk" className="block text-sm font-medium text-gray-700 mb-1">
          Compliance Risk
        </label>
        <textarea
          id="policy-compliance-risk"
          name="compliance_risk"
          value={policyData.compliance_risk || ''}
          onChange={(e) => handleInputChange('compliance_risk', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={2}
          placeholder="Describe compliance risk"
        />
      </div>

      {/* Immediate Actions Required */}
      <div>
        <label htmlFor="policy-immediate-actions" className="block text-sm font-medium text-gray-700 mb-1">
          Immediate Actions Required *
        </label>
        <textarea
          id="policy-immediate-actions"
          name="immediate_actions_required"
          value={policyData.immediate_actions_required || ''}
          onChange={(e) => handleInputChange('immediate_actions_required', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.immediate_actions_required ? 'border-red-500' : 'border-gray-300'
          }`}
          rows={3}
          placeholder="Describe immediate actions that need to be taken"
          required
        />
        {errors.immediate_actions_required && (
          <p className="text-red-500 text-sm mt-1">{errors.immediate_actions_required}</p>
        )}
      </div>

      {/* Action Deadline */}
      <div>
        <label htmlFor="policy-action-deadline" className="block text-sm font-medium text-gray-700 mb-1">
          Action Deadline
        </label>
        <input
          id="policy-action-deadline"
          name="action_deadline"
          type="date"
          value={policyData.action_deadline || ''}
          onChange={(e) => handleInputChange('action_deadline', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <button type="submit" className="hidden">Submit Policy Update Form</button>
    </form>
  );
}
