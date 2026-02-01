'use client';

import { useState, useEffect } from 'react';
import { CampaignAPI } from '@/lib/api/campaignApi';
import { CampaignStatusHistoryItem } from '@/types/campaign';
import UserAvatar from '@/people/UserAvatar';
import CampaignStatusBadge from './CampaignStatusBadge';
import { ArrowRight, Clock } from 'lucide-react';

interface CampaignStatusHistoryProps {
  campaignId: string;
}

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
};

const formatFullTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export default function CampaignStatusHistory({ campaignId }: CampaignStatusHistoryProps) {
  const [historyItems, setHistoryItems] = useState<CampaignStatusHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await CampaignAPI.getStatusHistory(campaignId);
        const items = Array.isArray(response.data) ? response.data : [];
        setHistoryItems(items);
      } catch (err: any) {
        console.error('Failed to fetch status history:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load status history');
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      fetchHistory();
    }
  }, [campaignId]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading status history...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
        <div className="text-center py-8 text-gray-500">
          <p>No status changes recorded yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
      
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
        
        <div className="space-y-4">
          {historyItems.map((item) => {
            const userName = item.changed_by?.username || item.changed_by?.email || 'Unknown';
            const userDisplay = item.changed_by ? {
              name: userName,
              email: item.changed_by.email,
            } : null;

            return (
              <div key={item.id} className="relative flex gap-4 pl-2">
                {/* Icon */}
                <div className="relative z-10">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 text-blue-600" />
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start gap-3">
                    {userDisplay && (
                      <UserAvatar user={userDisplay} size="sm" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-gray-900">
                          {userDisplay ? (
                            <span className="font-medium">{userName}</span>
                          ) : (
                            <span className="text-gray-500">System</span>
                          )}{' '}
                          changed status
                        </span>
                        <CampaignStatusBadge status={item.from_status} />
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                        <CampaignStatusBadge status={item.to_status} />
                      </div>
                      {item.note && (
                        <p className="text-sm text-gray-600 mt-1">{item.note}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div 
                        className="text-xs text-gray-500"
                        title={formatFullTimestamp(item.created_at)}
                      >
                        {formatTimestamp(item.created_at)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

