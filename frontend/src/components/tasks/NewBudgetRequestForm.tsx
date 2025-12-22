'use client';

import { useEffect, useState } from "react";
import { useFormValidation } from '@/hooks/useFormValidation';
import { BudgetAPI } from '@/lib/api/budgetApi';

interface BudgetRequestData {
  amount: string;
  currency: string;
  ad_channel: number | null;
  notes?: string;
  budget_pool?: number | null;
}

interface NewBudgetRequestFormProps {
  onBudgetDataChange: (data: any) => void;
  budgetData: any;
  taskData: any;
  validation: any;
  onCreateBudgetPool?: () => void;
  onBudgetPoolCreated?: (budgetPoolId: number) => void; // Callback when a new budget pool is created
  refreshTrigger?: number; // Trigger to refresh budget pools list
}

export default function NewBudgetRequestForm({
  onBudgetDataChange,
  budgetData,
  taskData,
  validation,
  onCreateBudgetPool,
  onBudgetPoolCreated,
  refreshTrigger
}: NewBudgetRequestFormProps) {
  const { errors, validateField, clearFieldError, setErrors } = validation;
  const [loadingAdChannels, setLoadingAdChannels] = useState(false);
  const [adChannels, setAdChannels] = useState<{ id: number, name: string }[]>([]);
  const [loadingBudgetPools, setLoadingBudgetPools] = useState(false);
  const [budgetPools, setBudgetPools] = useState<any[]>([]);
  const [filteredBudgetPools, setFilteredBudgetPools] = useState<any[]>([]);
  const [lastProjectId, setLastProjectId] = useState<number | null>(null);

  // Get ad channels list based on selected project
  useEffect(() => {
    // TODO: fetch all ad channels
    // set mock ad channels for now
    setAdChannels([
      { id: 1, name: 'TikTok' },
      { id: 2, name: 'Facebook' },
    ]);
  }, []);

  // Clear budget pool selection immediately when project changes
  useEffect(() => {
    // If project changed, immediately clear budget pool selection
    if (lastProjectId !== null && lastProjectId !== taskData.project_id && budgetData.budget_pool) {
      onBudgetDataChange({ ...budgetData, budget_pool: null });
    }
    setLastProjectId(taskData.project_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskData.project_id]);

  // Fetch budget pools when project is selected or refreshTrigger changes
  useEffect(() => {
    const fetchBudgetPools = async () => {
      if (!taskData.project_id) {
        setBudgetPools([]);
        setFilteredBudgetPools([]);
        // Clear budget pool selection when project is cleared
        if (budgetData.budget_pool) {
          onBudgetDataChange({ ...budgetData, budget_pool: null });
        }
        return;
      }

      try {
        setLoadingBudgetPools(true);
        const response = await BudgetAPI.getBudgetPools({
          project_id: taskData.project_id
        });
        const pools = response.data.results || response.data || [];
        setBudgetPools(pools);

        // Double-check: Clear budget pool selection if it doesn't belong to current project
        if (budgetData.budget_pool) {
          const selectedPool = pools.find((p: any) => p.id === budgetData.budget_pool);
          if (!selectedPool) {
            // Selected pool doesn't belong to current project, clear it
            onBudgetDataChange({ ...budgetData, budget_pool: null });
          }
        }

        // Filter budget pools based on selected currency and ad channel
        filterBudgetPools(pools, budgetData.currency, budgetData.ad_channel);
      } catch (error) {
        console.error('Error fetching budget pools:', error);
        setBudgetPools([]);
        setFilteredBudgetPools([]);
        // Clear budget pool selection on error
        if (budgetData.budget_pool) {
          onBudgetDataChange({ ...budgetData, budget_pool: null });
        }
      } finally {
        setLoadingBudgetPools(false);
      }
    };

    fetchBudgetPools();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskData.project_id, refreshTrigger]);

  // Filter budget pools when currency or ad_channel changes
  useEffect(() => {
    filterBudgetPools(budgetPools, budgetData.currency, budgetData.ad_channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetData.currency, budgetData.ad_channel, budgetPools]);

  // Helper function to filter budget pools
  const filterBudgetPools = (pools: any[], currency: string, adChannel: number | null) => {
    if (!currency || !adChannel) {
      setFilteredBudgetPools([]);
      // Clear budget_pool selection when filters change
      if (budgetData.budget_pool) {
        onBudgetDataChange({ ...budgetData, budget_pool: null });
      }
      return;
    }

    const filtered = pools.filter(pool =>
      pool.currency === currency && pool.ad_channel === adChannel
    );
    setFilteredBudgetPools(filtered);

    // Auto-select if only one budget pool matches
    if (filtered.length === 1) {
      onBudgetDataChange({ ...budgetData, budget_pool: filtered[0].id });
    } else if (filtered.length === 0) {
      // Clear selection if no budget pools match
      if (budgetData.budget_pool) {
        onBudgetDataChange({ ...budgetData, budget_pool: null });
      }
    }
  };

  const handleInputChange = (field: keyof BudgetRequestData, value: any) => {
    // Clear error when user starts typing
    if (errors[field as string]) {
      clearFieldError(field);
    }
    
    // Update budgetData in parent component
    onBudgetDataChange({ ...budgetData, [field]: value });

    // Real-time validation of the field
    const error = validateField(field, value);
    if (error && error !== '') {
      // Set error for this field
      setErrors({ ...errors, [field as string]: error });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form validation is handled by parent component
    console.log('Budget request form submitted');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4 flex flex-col">
      {/* Amount */}
      <div>
        <label htmlFor="budget-amount" className="block text-sm font-medium text-gray-700 mb-1">
          Amount *
        </label>
        <input
          id="budget-amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          value={budgetData.amount || ''}
          onChange={(e) => handleInputChange('amount', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.amount ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter amount (e.g., 1000.00)"
          required
        />
        {errors.amount && (
          <p className="text-red-500 text-sm mt-1">{errors.amount}</p>
        )}
      </div>

      {/* Currency */}
      <div>
        <label htmlFor="budget-currency" className="block text-sm font-medium text-gray-700 mb-1">
          Currency *
        </label>
        <select
          id="budget-currency"
          name="currency"
          value={budgetData.currency || ''}
          onChange={(e) => handleInputChange('currency', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.currency ? 'border-red-500' : 'border-gray-300'
          }`}
          required
        >
          <option value="" disabled>
            Select currency
          </option>
          {/* TODO: display all currencies from the database, hardcoded currencies for now */}
          <option value="AUD">AUD - Australian Dollar</option>
        </select>
        {errors.currency && (
          <p className="text-red-500 text-sm mt-1">{errors.currency}</p>
        )}
      </div>

      {/* Ad Channel */}
      <div>
        <label htmlFor="budget-ad-channel" className="block text-sm font-medium text-gray-700 mb-1">
          Advertising Channel *
        </label>
        <select
          id="budget-ad-channel"
          name="ad_channel"
          value={budgetData.ad_channel || ''}
          onChange={(e) => handleInputChange('ad_channel', Number(e.target.value))}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.ad_channel ? 'border-red-500' : 'border-gray-300'
          }`}
          required
          disabled={loadingAdChannels}
        >
          <option value='' disabled>
            {loadingAdChannels ? 'Loading advertising channels...' : 'Select an advertising channel'}
          </option>
          {adChannels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.id} {channel.name}
            </option>
          ))}
          {adChannels.length === 0 && taskData.project_id && !loadingAdChannels && (
            <option value="" disabled>No ad channels found for this project</option>
          )}
        </select>
        {errors.ad_channel && (
          <p className="text-red-500 text-sm mt-1">{errors.ad_channel}</p>
        )}
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="budget-notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="budget-notes"
          name="notes"
          value={budgetData.notes || ''}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          rows={3}
          placeholder="Enter additional notes for this budget request"
        />
      </div>

      {/* Budget Pool Selection */}
      <div>
        <label htmlFor="budget-pool" className="block text-sm font-medium text-gray-700 mb-1">
          Budget Pool *
        </label>
        <select
          id="budget-pool"
          name="budget_pool"
          value={budgetData.budget_pool || ''}
          onChange={(e) => handleInputChange('budget_pool', Number(e.target.value))}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.budget_pool ? 'border-red-500' : 'border-gray-300'
          }`}
          required
          disabled={loadingBudgetPools || !budgetData.currency || !budgetData.ad_channel}
        >
          <option value='' disabled>
            {loadingBudgetPools
              ? 'Loading budget pools...'
              : !budgetData.currency || !budgetData.ad_channel
              ? 'Please select currency and ad channel first'
              : filteredBudgetPools.length === 0
              ? 'No budget pool available - please create one'
              : 'Select a budget pool'}
          </option>
          {filteredBudgetPools.map((pool) => (
            <option key={pool.id} value={pool.id}>
              Budget Pool #{pool.id} - Available: {pool.available_amount} {pool.currency}
            </option>
          ))}
        </select>
        {errors.budget_pool && (
          <p className="text-red-500 text-sm mt-1">{errors.budget_pool}</p>
        )}
        {budgetData.currency && budgetData.ad_channel && filteredBudgetPools.length === 0 && !loadingBudgetPools && (
          <p className="text-amber-600 text-sm mt-1">
            No budget pool found for this currency and ad channel combination. Please create a budget pool first.
          </p>
        )}
      </div>

      {/* Create Budget Pool Button */}
      <button
        type="button"
        className="w-fit self-center text-sm text-indigo-600 bg-gray-100 rounded-md px-3 py-2 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
        onClick={() => onCreateBudgetPool?.()}
      >
        + Create a Budget Pool
      </button>

      {/* Hidden submit button for form validation and enter key support */}
      <button type="submit" className="hidden">Submit Budget Request Form</button>
    </form>
  );
}