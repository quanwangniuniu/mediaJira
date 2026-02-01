'use client';

import { useState, useEffect } from 'react';
import { CampaignAPI } from '@/lib/api/campaignApi';
import { CampaignCheckIn } from '@/types/campaign';
import UserAvatar from '@/people/UserAvatar';
import Button from '@/components/button/Button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Minus, AlertCircle, Plus, Edit, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface CampaignCheckInsProps {
  campaignId: string;
  onEdit?: (checkIn: CampaignCheckIn) => void;
  onDelete?: (checkInId: string) => void;
  onCreate?: () => void;
  refreshTrigger?: number; // Trigger refresh when this value changes
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

const getSentimentConfig = (sentiment: string) => {
  switch (sentiment.toUpperCase()) {
    case 'POSITIVE':
      return {
        icon: CheckCircle,
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
        iconColor: 'text-green-600',
      };
    case 'NEGATIVE':
      return {
        icon: AlertCircle,
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200',
        iconColor: 'text-red-600',
      };
    default: // NEUTRAL
      return {
        icon: Minus,
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-800',
        borderColor: 'border-gray-200',
        iconColor: 'text-gray-600',
      };
  }
};

export default function CampaignCheckIns({ campaignId, onEdit, onDelete, onCreate, refreshTrigger }: CampaignCheckInsProps) {
  const [checkIns, setCheckIns] = useState<CampaignCheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);

  useEffect(() => {
    const fetchCheckIns = async () => {
      if (!campaignId) return;
      
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching check-ins for campaign:', campaignId, 'refreshTrigger:', refreshTrigger);
        const response = await CampaignAPI.getCheckIns(campaignId);
        console.log('API response:', response);
        console.log('API response.data:', response.data);
        
        // Handle both paginated and non-paginated responses
        let items: CampaignCheckIn[] = [];
        const data = response.data as any; // Type assertion to handle different response formats
        if (Array.isArray(data)) {
          items = data;
        } else if (data?.results && Array.isArray(data.results)) {
          items = data.results;
        } else if (data?.items && Array.isArray(data.items)) {
          items = data.items;
        }
        
        console.log('Parsed check-ins:', items);
        setCheckIns(items);
      } catch (err: any) {
        console.error('Failed to fetch check-ins:', err);
        setError(err.response?.data?.error || err.message || 'Failed to load check-ins');
      } finally {
        setLoading(false);
      }
    };

    fetchCheckIns();
  }, [campaignId, refreshTrigger]); // refreshTrigger triggers re-fetch

  const handleDelete = async (checkIn: CampaignCheckIn) => {
    if (!window.confirm('Are you sure you want to delete this check-in?')) {
      return;
    }

    try {
      await CampaignAPI.deleteCheckIn(campaignId, checkIn.id);
      setCheckIns((prev) => prev.filter((item) => item.id !== checkIn.id));
      toast.success('Check-in deleted successfully');
      if (onDelete) {
        onDelete(checkIn.id);
      }
    } catch (err: any) {
      console.error('Failed to delete check-in:', err);
      toast.error(err.response?.data?.error || err.message || 'Failed to delete check-in');
    }
  };


  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Check-ins</h2>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Loading check-ins...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Check-ins</h2>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Check-ins</h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            if (onCreate) {
              onCreate();
            } else if (onEdit) {
              onEdit({} as CampaignCheckIn); // Fallback: trigger create mode via onEdit
            }
          }}
          leftIcon={<Plus className="h-4 w-4" />}
        >
          New Check-in
        </Button>
      </div>

      {checkIns.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">No check-ins yet. Create your first check-in to track campaign health.</p>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (onCreate) {
                onCreate();
              } else if (onEdit) {
                onEdit({} as CampaignCheckIn); // Fallback: trigger create mode via onEdit
              }
            }}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Create Check-in
          </Button>
        </div>
      ) : (
        <div className="space-y-0">
          {checkIns.map((checkIn) => {
            const sentimentConfig = getSentimentConfig(checkIn.sentiment);
            const Icon = sentimentConfig.icon;
            const userName = checkIn.checked_by?.username || checkIn.checked_by?.email || 'Unknown';
            const userDisplay = checkIn.checked_by ? {
              name: userName,
              email: checkIn.checked_by.email,
            } : null;

            return (
              <div
                key={checkIn.id}
                className="flex items-start gap-4 py-4 border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
                onMouseEnter={() => setHoveredRow(checkIn.id)}
                onMouseLeave={() => {
                  setHoveredRow(null);
                  setShowMenu(null);
                }}
              >
                {/* Sentiment Badge */}
                <div className="flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={`${sentimentConfig.bgColor} ${sentimentConfig.textColor} ${sentimentConfig.borderColor} flex items-center gap-1.5`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${sentimentConfig.iconColor}`} />
                    {checkIn.sentiment_display}
                  </Badge>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
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
                          )}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(checkIn.created_at)}
                        </span>
                      </div>
                      {checkIn.note && (
                        <p className="text-sm text-gray-600 mt-1">{checkIn.note}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0 relative">
                  {(hoveredRow === checkIn.id || showMenu === checkIn.id) && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (onEdit) {
                            onEdit(checkIn);
                          }
                        }}
                        className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit check-in"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(checkIn)}
                        className="p-1.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete check-in"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

