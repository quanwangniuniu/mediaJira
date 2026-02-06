'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CampaignData, CampaignPlatform } from '@/types/campaign';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import CampaignStatusBadge from './CampaignStatusBadge';

interface CampaignTableProps {
  campaigns: CampaignData[];
  onCampaignClick?: (campaign: CampaignData) => void;
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

const platformLabels: Record<CampaignPlatform, string> = {
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
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function CampaignTable({ campaigns, onCampaignClick }: CampaignTableProps) {
  const router = useRouter();

  const handleRowClick = (campaign: CampaignData) => {
    if (onCampaignClick) {
      onCampaignClick(campaign);
    } else {
      router.push(`/campaigns/${campaign.id}`);
    }
  };

  if (campaigns.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No campaigns found</p>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Objective</TableHead>
            <TableHead>Platforms</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Start Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {campaigns.map((campaign) => (
            <TableRow
              key={campaign.id}
              className="cursor-pointer hover:bg-gray-50"
              onClick={() => handleRowClick(campaign)}
            >
              <TableCell className="font-medium">{campaign.name}</TableCell>
              <TableCell>
                <CampaignStatusBadge status={campaign.status} />
              </TableCell>
              <TableCell>{objectiveLabels[campaign.objective] || campaign.objective}</TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {campaign.platforms.slice(0, 2).map((platform) => (
                    <Badge key={platform} variant="outline" className="text-xs">
                      {platformLabels[platform] || platform}
                    </Badge>
                  ))}
                  {campaign.platforms.length > 2 && (
                    <Badge variant="outline" className="text-xs">
                      +{campaign.platforms.length - 2}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {campaign.owner?.username || campaign.owner?.email || 'N/A'}
              </TableCell>
              <TableCell>{formatDate(campaign.start_date)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

