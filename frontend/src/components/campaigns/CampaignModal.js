'use client';

import React, { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import Modal from '@/components/ui/Modal';

const CAMPAIGN_TYPES = [
  { value: 'digital_display', label: 'Digital Display' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'search_engine', label: 'Search Engine' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'print', label: 'Print' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'influencer', label: 'Influencer' },
];

export default function CampaignModal({ isOpen, onClose, onSubmit, submitting = false }) {
  const [form, setForm] = useState({
    name: '',
    campaign_type: '',
    start_date: '',
    end_date: '',
    budget: ''
  });
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!form.name || form.name.trim().length < 2) {
      newErrors.name = 'Campaign name must be at least 2 characters long';
    }
    
    if (!form.campaign_type || form.campaign_type.trim().length === 0) {
      newErrors.campaign_type = 'Campaign type is required';
    }
    
    if (!form.start_date) {
      newErrors.start_date = 'Start date is required';
    }
    
    if (!form.end_date) {
      newErrors.end_date = 'End date is required';
    }
    
    if (form.start_date && form.end_date && new Date(form.start_date) >= new Date(form.end_date)) {
      newErrors.end_date = 'End date must be after start date';
    }
    
    if (!form.budget || parseFloat(form.budget) <= 0) {
      newErrors.budget = 'Budget must be greater than 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    await onSubmit(form);
    
    // Only reset form if submission was successful (no errors)
    if (!submitting) {
      setForm({ name: '', campaign_type: '', start_date: '', end_date: '', budget: '' });
      setErrors({});
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setForm({ name: '', campaign_type: '', start_date: '', end_date: '', budget: '' });
      setErrors({});
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Create Campaign
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={form.name}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.name ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Enter campaign name"
              disabled={submitting}
              required
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label htmlFor="campaign_type" className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Type *
            </label>
            <select
              id="campaign_type"
              name="campaign_type"
              value={form.campaign_type}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.campaign_type ? 'border-red-300' : 'border-gray-300'
              }`}
              disabled={submitting}
              required
            >
              <option value="">Select campaign type</option>
              {CAMPAIGN_TYPES.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.campaign_type && (
              <p className="mt-1 text-sm text-red-600">{errors.campaign_type}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="start_date" className="block text-sm font-medium text-gray-700 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                id="start_date"
                name="start_date"
                value={form.start_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.start_date ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={submitting}
                required
              />
              {errors.start_date && (
                <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
              )}
            </div>

            <div>
              <label htmlFor="end_date" className="block text-sm font-medium text-gray-700 mb-2">
                End Date *
              </label>
              <input
                type="date"
                id="end_date"
                name="end_date"
                value={form.end_date}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.end_date ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={submitting}
                required
              />
              {errors.end_date && (
                <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
              Budget ($) *
            </label>
            <input
              type="number"
              id="budget"
              name="budget"
              value={form.budget}
              onChange={handleChange}
              min="0.01"
              step="0.01"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                errors.budget ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="0.00"
              disabled={submitting}
              required
            />
            {errors.budget && (
              <p className="mt-1 text-sm text-red-600">{errors.budget}</p>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 