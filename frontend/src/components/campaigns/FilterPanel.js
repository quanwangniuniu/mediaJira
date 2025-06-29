'use client';

import React from 'react';
import { useState } from 'react';
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const CAMPAIGN_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'digital_display', label: 'Digital Display' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'search_engine', label: 'Search Engine' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'print', label: 'Print' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'influencer', label: 'Influencer' },
];

export default function FilterPanel({ filters, onFilterChange }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      status: '',
      campaign_type: '',
      search: '',
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const hasActiveFilters = Object.values(localFilters).some(value => value !== '');

  return (
    <div className="filter-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            <XMarkIcon className="h-4 w-4 mr-1" />
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search */}
        <div>
          <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
            Search
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="search"
              value={localFilters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="input"
              placeholder="Search campaigns..."
            />
          </div>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={localFilters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="input"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Campaign Type Filter */}
        <div>
          <label htmlFor="campaign_type" className="block text-sm font-medium text-gray-700 mb-1">
            Campaign Type
          </label>
          <select
            id="campaign_type"
            value={localFilters.campaign_type}
            onChange={(e) => handleFilterChange('campaign_type', e.target.value)}
            className="input"
          >
            {CAMPAIGN_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-2">
          {Object.entries(localFilters).map(([key, value]) => {
            if (!value) return null;
            
            const getFilterLabel = (key, value) => {
              switch (key) {
                case 'status':
                  return STATUS_OPTIONS.find(opt => opt.value === value)?.label || value;
                case 'campaign_type':
                  return CAMPAIGN_TYPE_OPTIONS.find(opt => opt.value === value)?.label || value;
                case 'search':
                  return `Search: "${value}"`;
                default:
                  return value;
              }
            };

            return (
              <span
                key={key}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
              >
                {getFilterLabel(key, value)}
                <button
                  onClick={() => handleFilterChange(key, '')}
                  className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full text-indigo-400 hover:bg-indigo-200 hover:text-indigo-500 focus:outline-none focus:bg-indigo-500 focus:text-white"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
} 