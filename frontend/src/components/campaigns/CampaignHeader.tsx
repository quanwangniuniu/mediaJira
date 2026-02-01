'use client';

import React from 'react';
import { CampaignData, CampaignObjective, CampaignPlatform } from '@/types/campaign';
import CampaignStatusBadge from './CampaignStatusBadge';
import { Badge } from '@/components/ui/badge';
import InlineEditController from '@/inline-edit/InlineEditController';
import InlineSelectController from '@/inline-edit/InlineSelectController';
import InlineMultiSelectController from '@/inline-edit/InlineMultiSelectController';
import InlineDateController from '@/inline-edit/InlineDateController';
import UserAvatar from '@/people/UserAvatar';
import Button from '@/components/button/Button';
import { Calendar, User, FolderOpen, Settings, Save } from 'lucide-react';

interface CampaignHeaderProps {
  campaign: CampaignData;
  onUpdate: (data: {
    name?: string;
    objective?: CampaignObjective;
    platforms?: CampaignPlatform[];
    end_date?: string;
    hypothesis?: string;
  }) => Promise<void>;
  loading?: boolean;
  onChangeStatus?: () => void;
  onSaveAsTemplate?: () => void;
}

const objectiveLabels: Record<string, string> = {
  AWARENESS: 'Awareness',
  CONSIDERATION: 'Consideration',
  CONVERSION: 'Conversion',
  RETENTION: 'Retention',
  ENGAGEMENT: 'Engagement',
  TRAFFIC: 'Traffic',
  LEAD_GENERATION: 'Lead Gen',
  APP_PROMOTION: 'App Promotion',
};

const objectiveOptions: Array<{ value: CampaignObjective; label: string }> = [
  { value: 'AWARENESS', label: 'Awareness' },
  { value: 'CONSIDERATION', label: 'Consideration' },
  { value: 'CONVERSION', label: 'Conversion' },
  { value: 'RETENTION', label: 'Retention' },
  { value: 'ENGAGEMENT', label: 'Engagement' },
  { value: 'TRAFFIC', label: 'Traffic' },
  { value: 'LEAD_GENERATION', label: 'Lead Gen' },
  { value: 'APP_PROMOTION', label: 'App Promotion' },
];

const platformLabels: Record<string, string> = {
  META: 'Meta',
  GOOGLE_ADS: 'Google Ads',
  TIKTOK: 'TikTok',
  LINKEDIN: 'LinkedIn',
  SNAPCHAT: 'Snapchat',
  TWITTER: 'Twitter',
  PINTEREST: 'Pinterest',
  REDDIT: 'Reddit',
  PROGRAMMATIC: 'Programmatic',
  EMAIL: 'Email',
};

const platformOptions: Array<{ value: CampaignPlatform; label: string }> = [
  { value: 'META', label: 'Meta' },
  { value: 'GOOGLE_ADS', label: 'Google Ads' },
  { value: 'TIKTOK', label: 'TikTok' },
  { value: 'LINKEDIN', label: 'LinkedIn' },
  { value: 'SNAPCHAT', label: 'Snapchat' },
  { value: 'TWITTER', label: 'Twitter' },
  { value: 'PINTEREST', label: 'Pinterest' },
  { value: 'REDDIT', label: 'Reddit' },
  { value: 'PROGRAMMATIC', label: 'Programmatic' },
  { value: 'EMAIL', label: 'Email' },
];

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export default function CampaignHeader({ campaign, onUpdate, loading, onChangeStatus, onSaveAsTemplate }: CampaignHeaderProps) {
  const handleNameSave = async (newName: string) => {
    if (newName.trim() === campaign.name) {
      return; // No change
    }
    await onUpdate({ name: newName.trim() });
  };

  const handleObjectiveSave = async (newObjective: CampaignObjective) => {
    if (newObjective === campaign.objective) {
      return; // No change
    }
    await onUpdate({ objective: newObjective });
  };

  const handlePlatformsSave = async (newPlatforms: CampaignPlatform[]) => {
    if (JSON.stringify(newPlatforms.sort()) === JSON.stringify(campaign.platforms.sort())) {
      return; // No change
    }
    await onUpdate({ platforms: newPlatforms });
  };

  const handleEndDateSave = async (newEndDate: string | null) => {
    const currentEndDate = campaign.end_date || null;
    if (newEndDate === currentEndDate) {
      return; // No change
    }
    await onUpdate({ end_date: newEndDate || undefined });
  };

  const handleHypothesisSave = async (newHypothesis: string) => {
    const trimmedHypothesis = newHypothesis.trim() || undefined;
    if (trimmedHypothesis === campaign.hypothesis) {
      return; // No change
    }
    await onUpdate({ hypothesis: trimmedHypothesis });
  };

  const validateName = (value: string): string | null => {
    if (!value.trim()) {
      return 'Campaign name is required';
    }
    if (value.trim().length < 3) {
      return 'Campaign name must be at least 3 characters';
    }
    return null;
  };

  const validatePlatforms = (value: CampaignPlatform[]): string | null => {
    if (value.length === 0) {
      return 'At least one platform must be selected';
    }
    return null;
  };

  const validateEndDate = (value: string | null): string | null => {
    if (value && campaign.start_date && value < campaign.start_date) {
      return 'End date must be after start date';
    }
    return null;
  };

  const ownerName = campaign.owner?.username || campaign.owner?.email || 'Unknown';
  const ownerDisplay = {
    name: ownerName,
    email: campaign.owner?.email,
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
      {/* Campaign Name with Inline Editing */}
      <div className="mb-4">
        <InlineEditController
          value={campaign.name}
          onSave={handleNameSave}
          validate={validateName}
          inputType="input"
          className="text-2xl font-bold text-gray-900"
          renderTrigger={(value) => (
            <h1 className="text-2xl font-bold text-gray-900 hover:text-blue-600 transition-colors cursor-pointer">
              {value}
            </h1>
          )}
        />
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Status:</span>
          <CampaignStatusBadge status={campaign.status} />
          {campaign.status !== 'ARCHIVED' && onChangeStatus && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onChangeStatus}
              leftIcon={<Settings className="h-3 w-3" />}
              className="ml-2"
            >
              Change
            </Button>
          )}
          {campaign.status !== 'ARCHIVED' && onSaveAsTemplate && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onSaveAsTemplate}
              leftIcon={<Save className="h-3 w-3" />}
              className="ml-2"
            >
              Save as Template
            </Button>
          )}
        </div>

        {/* Objective */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Objective:</span>
          <InlineSelectController
            value={campaign.objective}
            options={objectiveOptions}
            onSave={handleObjectiveSave}
            className="text-sm text-gray-900"
          />
        </div>

        {/* Platforms */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-500">Platforms:</span>
          <InlineMultiSelectController
            value={campaign.platforms}
            options={platformOptions}
            onSave={handlePlatformsSave}
            validate={validatePlatforms}
            className="text-sm"
          />
        </div>

        {/* Start Date */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Start:</span>
          <span className="text-sm text-gray-900">{formatDate(campaign.start_date)}</span>
        </div>

        {/* End Date */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">End:</span>
          <InlineDateController
            value={campaign.end_date}
            onSave={handleEndDateSave}
            validate={validateEndDate}
            minDate={campaign.start_date}
            placeholder="Not set"
            className="text-sm text-gray-900"
          />
        </div>

        {/* Owner */}
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Owner:</span>
          <div className="flex items-center gap-2">
            <UserAvatar user={ownerDisplay} size="sm" />
            <span className="text-sm text-gray-900">{ownerName}</span>
          </div>
        </div>

        {/* Project */}
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Project:</span>
          <span className="text-sm text-gray-900">{campaign.project?.name || 'N/A'}</span>
        </div>
      </div>

      {/* Hypothesis */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm font-medium text-gray-500 mb-1">Hypothesis:</p>
        <InlineEditController
          value={campaign.hypothesis || ''}
          onSave={handleHypothesisSave}
          inputType="textarea"
          placeholder="Add a hypothesis for this campaign..."
          className="text-sm text-gray-700"
          renderTrigger={(value) => (
            <p className="text-sm text-gray-700 hover:text-blue-600 transition-colors cursor-pointer min-h-[1.5rem]">
              {value || <span className="text-gray-400 italic">Add a hypothesis for this campaign...</span>}
            </p>
          )}
        />
      </div>
    </div>
  );
}

