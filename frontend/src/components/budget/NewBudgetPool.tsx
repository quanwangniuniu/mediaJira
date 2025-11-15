'use client';

import { useEffect, useState } from "react";
import { useFormValidation } from '@/hooks/useFormValidation';
import { CreateBudgetPoolData } from "@/lib/api/budgetApi";
import { ProjectAPI } from '@/lib/api/projectApi';

interface NewBudgetPoolProps {
  onBudgetPoolDataChange?: (data: Partial<CreateBudgetPoolData>) => void;
  budgetPoolData?: Partial<CreateBudgetPoolData>;
  validation?: ReturnType<typeof useFormValidation<CreateBudgetPoolData>>;
  loading?: boolean;
}

export default function NewBudgetPool({ 
  onBudgetPoolDataChange, 
  budgetPoolData = {}, 
  validation,
  loading = false
}: NewBudgetPoolProps) {
  // Local state for form data
  const [formData, setFormData] = useState<Partial<CreateBudgetPoolData>>({
    project: budgetPoolData.project || undefined,
    ad_channel: budgetPoolData.ad_channel || undefined,
    total_amount: budgetPoolData.total_amount || '',
    currency: budgetPoolData.currency || '',
  });

  // Local validation if not provided by parent
  const localValidation = useFormValidation({
    project: (value) => !value || value === 0 ? 'Project is required' : '',
    ad_channel: (value) => !value || value === 0 ? 'Advertising channel is required' : '',
    total_amount: (value) => {
      if (!value || value.trim() === '') return 'Total amount is required';
      const numValue = parseFloat(value);
      if (isNaN(numValue) || numValue <= 0) return 'Total amount must be a positive number';
      return '';
    },
    currency: (value) => {
      if (!value || value.trim() === '') return 'Currency is required';
      if (value.length !== 3) return 'Currency must be 3 characters (e.g., AUD, USD)';
      return '';
    },
  });

  // Use provided validation or local validation
  const { errors, validateField, clearFieldError, setErrors } = validation || localValidation;

  const [loadingProjects, setLoadingProjects] = useState(false);
  const [projects, setProjects] = useState<{ id: number, name: string }[]>([]);
  const [loadingAdChannels, setLoadingAdChannels] = useState(false);
  const [adChannels, setAdChannels] = useState<{ id: number, name: string }[]>([]);

  // Get projects list
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingProjects(true);
        const response = await ProjectAPI.getProjects();
        setProjects(response.data);
      } catch (error) {
        console.error('Error fetching projects:', error);
        // Set empty array on error - user will see "No projects available"
        setProjects([]);
      } finally {
        setLoadingProjects(false);
      }
    };

    fetchProjects();
  }, []);

  // Get ad channels list
  useEffect(() => {
    // TODO: fetch all ad channels from API
    // set mock ad channels for now
    setAdChannels([
      { id: 1, name: 'TikTok' },
      { id: 2, name: 'Facebook' },
    ]);
  }, []);

  const handleInputChange = (field: keyof CreateBudgetPoolData, value: any) => {
    // Clear error when user starts typing
    if (errors[field as string]) {
      clearFieldError(field);
    }
    
    // Update local form data
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Update parent component if callback provided
    onBudgetPoolDataChange?.(newFormData);

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
    console.log('Budget pool form submitted');
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      {/* Project */}
      <div>
        <label htmlFor="budget-pool-project" className="block text-sm font-medium text-gray-700 mb-1">
          Project *
        </label>
        <select
          id="budget-pool-project"
          name="project"
          value={formData.project || ''}
          onChange={(e) => handleInputChange('project', Number(e.target.value))}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.project ? 'border-red-500' : 'border-gray-300'
          }`}
          required
          disabled={loadingProjects || loading}
        >
          <option value='' disabled>
            {loadingProjects ? 'Loading projects...' : 'Select project'}
          </option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              #{project.id} {project.name}
            </option>
          ))}
          {projects.length === 0 && !loadingProjects && (
            <option value='' disabled>
              No projects available
            </option>
          )}
        </select>
        {errors.project && (
          <p className="text-red-500 text-sm mt-1">{errors.project}</p>
        )}
      </div>

      {/* Advertising Channel */}
      <div>
        <label htmlFor="budget-pool-ad-channel" className="block text-sm font-medium text-gray-700 mb-1">
          Advertising Channel *
        </label>
        <select
          id="budget-pool-ad-channel"
          name="ad_channel"
          value={formData.ad_channel || ''}
          onChange={(e) => handleInputChange('ad_channel', Number(e.target.value))}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.ad_channel ? 'border-red-500' : 'border-gray-300'
          }`}
          required
          disabled={loadingAdChannels || loading}
        >
          <option value='' disabled>
            {loadingAdChannels ? 'Loading advertising channels...' : 'Select an advertising channel'}
          </option>
          {adChannels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              #{channel.id} {channel.name}
            </option>
          ))}
        </select>
        {errors.ad_channel && (
          <p className="text-red-500 text-sm mt-1">{errors.ad_channel}</p>
        )}
      </div>

      {/* Total Amount */}
      <div>
        <label htmlFor="budget-pool-total-amount" className="block text-sm font-medium text-gray-700 mb-1">
          Total Amount *
        </label>
        <input
          id="budget-pool-total-amount"
          name="total_amount"
          type="number"
          step="0.01"
          min="0.01"
          value={formData.total_amount || ''}
          onChange={(e) => handleInputChange('total_amount', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.total_amount ? 'border-red-500' : 'border-gray-300'
          }`}
          placeholder="Enter total budget amount (e.g., 10000.00)"
          required
          disabled={loading}
        />
        {errors.total_amount && (
          <p className="text-red-500 text-sm mt-1">{errors.total_amount}</p>
        )}
      </div>

      {/* Currency */}
      <div>
        <label htmlFor="budget-pool-currency" className="block text-sm font-medium text-gray-700 mb-1">
          Currency *
        </label>
        <select
          id="budget-pool-currency"
          name="currency"
          value={formData.currency || ''}
          onChange={(e) => handleInputChange('currency', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
            errors.currency ? 'border-red-500' : 'border-gray-300'
          }`}
          required
          disabled={loading}
        >
          <option value="" disabled>
            Select currency
          </option>
          {/* TODO: display all currencies from the database, hardcoded currencies for now */}
          <option value="AUD">AUD - Australian Dollar</option>
          <option value="USD">USD - US Dollar</option>
          <option value="EUR">EUR - Euro</option>
        </select>
        {errors.currency && (
          <p className="text-red-500 text-sm mt-1">{errors.currency}</p>
        )}
      </div>

      {/* Hidden submit button for form validation and enter key support */}
      <button type="submit" className="hidden">Submit Budget Pool Form</button>
    </form>
  );
}