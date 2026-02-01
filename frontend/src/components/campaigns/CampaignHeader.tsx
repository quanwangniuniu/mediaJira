'use client';

import React from 'react';
import { CampaignData } from '@/types/campaign';
import CampaignStatusBadge from './CampaignStatusBadge';
import { Badge } from '@/components/ui/badge';
import InlineEditController from '@/inline-edit/InlineEditController';
import UserAvatar from '@/people/UserAvatar';
import Button from '@/components/button/Button';
import { Calendar, User, FolderOpen, Settings } from 'lucide-react';

interface CampaignHeaderProps {
  campaign: CampaignData;
  onUpdate: (data: { name?: string }) => Promise<void>;
  loading?: boolean;
  onChangeStatus?: () => void;
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

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  });
};

export default function CampaignHeader({ campaign, onUpdate, loading, onChangeStatus }: CampaignHeaderProps) {
  const handleNameSave = async (newName: string) => {
    if (newName.trim() === campaign.name) {
      return; // No change
    }
    await onUpdate({ name: newName.trim() });
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
        </div>

        {/* Objective */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">Objective:</span>
          <span className="text-sm text-gray-900">
            {objectiveLabels[campaign.objective] || campaign.objective}
          </span>
        </div>

        {/* Platforms */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-500">Platforms:</span>
          <div className="flex flex-wrap gap-1">
            {campaign.platforms.map((platform) => (
              <Badge key={platform} variant="outline" className="text-xs">
                {platformLabels[platform] || platform}
              </Badge>
            ))}
          </div>
        </div>

        {/* Start Date */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-500">Start:</span>
          <span className="text-sm text-gray-900">{formatDate(campaign.start_date)}</span>
        </div>

        {/* End Date */}
        {campaign.end_date && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-500">End:</span>
            <span className="text-sm text-gray-900">{formatDate(campaign.end_date)}</span>
          </div>
        )}

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

      {/* Hypothesis (if available) */}
      {campaign.hypothesis && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-sm font-medium text-gray-500 mb-1">Hypothesis:</p>
          <p className="text-sm text-gray-700">{campaign.hypothesis}</p>
        </div>
      )}
    </div>
  );
}

