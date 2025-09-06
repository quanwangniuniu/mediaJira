'use client';

import { useEffect, useState } from "react";
import { useFormValidation } from '@/hooks/useFormValidation';

interface BudgetRequestData {
  amount: string;
  currency: string;
  ad_channel: number | null;
  notes?: string;
}

interface NewBudgetRequestFormProps {
  onBudgetDataChange: (data: any) => void;
  budgetData: any;
  taskData: any;
  validation: any;
  onCreateBudgetPool?: () => void;
}

export default function NewBudgetRequestForm({ 
  onBudgetDataChange, 
  budgetData, 
  taskData, 
  validation,
  onCreateBudgetPool 
}: NewBudgetRequestFormProps) {
  const { errors, validateField, clearFieldError, setErrors } = validation;
  const [loadingAdChannels, setLoadingAdChannels] = useState(false);
  const [adChannels, setAdChannels] = useState<{ id: number, name: string }[]>([]);

  // Get ad channels list based on selected project
  useEffect(() => {
    // TODO: fetch all ad channels
    // set mock ad channels for now
    setAdChannels([
      { id: 1, name: 'TikTok' },
      { id: 2, name: 'Facebook' },
    ]);
  }, []);

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

      {/* Create Budget Pool */}
      <button 
        className="w-fit self-center text-sm text-indigo-600 bg-gray-100 rounded-md px-3 py-2 hover:text-indigo-400"
        onClick={() => onCreateBudgetPool?.()}
      >
        Create a Budget Pool first
      </button>

      {/* Hidden submit button for form validation and enter key support */}
      <button type="submit" className="hidden">Submit Budget Request Form</button>
    </form>
  );
}