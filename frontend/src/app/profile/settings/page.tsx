'use client';

import React, { useState, useEffect } from 'react';
import { usePreferences } from '../../../hooks/usePreferences';
import { PreferencesFormData, LanguageOption, TimezoneOption } from '../../../types/preferences';
import Toggle from '../../../components/ui/Toggle';
import LoadingSpinner from '../../../components/ui/LoadingSpinner';

// Language options
const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'zh-CN', label: '中文 (简体)' },
  { value: 'zh-TW', label: '中文 (繁體)' },
  { value: 'ja-JP', label: '日本語' },
  { value: 'ko-KR', label: '한국어' },
  { value: 'fr-FR', label: 'Français' },
  { value: 'de-DE', label: 'Deutsch' },
  { value: 'es-ES', label: 'Español' },
];

// Timezone options (commonly used timezones)
const TIMEZONE_OPTIONS: TimezoneOption[] = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong' },
  { value: 'Asia/Seoul', label: 'Seoul' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

const FREQUENCY_OPTIONS = [
  { value: 'immediate', label: 'Immediate' },
  { value: 'digest_daily', label: 'Daily Digest' },
  { value: 'digest_weekly', label: 'Weekly Digest' },
];

export default function SettingsPage() {
  const { formData, loading, saving, updatePreferences } = usePreferences();
  const [localFormData, setLocalFormData] = useState<PreferencesFormData | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local form data when preferences are loaded
  useEffect(() => {
    if (formData && !localFormData) {
      setLocalFormData(formData);
    }
  }, [formData, localFormData]);

  // Check if form has changes with better comparison
  useEffect(() => {
    if (formData && localFormData) {
      const hasChanges = (
        formData.language !== localFormData.language ||
        formData.timezone !== localFormData.timezone ||
        formData.frequency !== localFormData.frequency ||
        formData.slack_enabled !== localFormData.slack_enabled ||
        formData.email_digest_enabled !== localFormData.email_digest_enabled ||
        formData.in_app_alert_enabled !== localFormData.in_app_alert_enabled
      );
      setHasChanges(hasChanges);
    }
  }, [formData, localFormData]);

  const handleFormChange = (field: keyof PreferencesFormData, value: any) => {
    if (localFormData) {
      setLocalFormData(prev => ({
        ...prev!,
        [field]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (localFormData) {
      const result = await updatePreferences(localFormData);
      if (result.success) {
        setHasChanges(false);
      }
    }
  };

  const handleReset = () => {
    if (formData) {
      setLocalFormData(formData);
      setHasChanges(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (!localFormData) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Unable to load preferences
          </h2>
          <p className="text-gray-500">Please try refreshing the page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage your language, timezone, and notification preferences
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-8">
          {/* Language and Timezone Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                id="language"
                value={localFormData.language}
                onChange={(e) => handleFormChange('language', e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                id="timezone"
                value={localFormData.timezone}
                onChange={(e) => handleFormChange('timezone', e.target.value)}
                disabled={saving}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                {TIMEZONE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Notification Frequency Section */}
          <div>
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
              Notification Frequency
            </label>
            <select
              id="frequency"
              value={localFormData.frequency}
              onChange={(e) => handleFormChange('frequency', e.target.value)}
              disabled={saving}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
            >
              {FREQUENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Notification Preferences Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Notification Preferences
            </h3>
            <div className="space-y-1 border border-gray-200 rounded-md divide-y divide-gray-200">
              <div className="px-4">
                <Toggle
                  id="slack_enabled"
                  label="Slack Notifications"
                  description="Receive notifications via Slack"
                  checked={localFormData.slack_enabled}
                  onChange={(checked) => handleFormChange('slack_enabled', checked)}
                  disabled={saving}
                />
              </div>
              
              <div className="px-4">
                <Toggle
                  id="email_digest_enabled"
                  label="Email Digest"
                  description="Receive email summaries of your notifications"
                  checked={localFormData.email_digest_enabled}
                  onChange={(checked) => handleFormChange('email_digest_enabled', checked)}
                  disabled={saving}
                />
              </div>
              
              <div className="px-4">
                <Toggle
                  id="in_app_alert_enabled"
                  label="In-App Alerts"
                  description="Show notifications within the application"
                  checked={localFormData.in_app_alert_enabled}
                  onChange={(checked) => handleFormChange('in_app_alert_enabled', checked)}
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleReset}
              disabled={saving || !hasChanges}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={saving || !hasChanges}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {saving && <LoadingSpinner size="sm" />}
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 