'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useCampaignData } from '@/hooks/useCampaignData';
import CampaignHeader from '@/components/campaigns/CampaignHeader';
import CampaignTasks from '@/components/campaigns/CampaignTasks';
import Button from '@/components/button/Button';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { currentCampaign, loading, error, fetchCampaign, updateCampaign } = useCampaignData();

  useEffect(() => {
    if (campaignId) {
      fetchCampaign(campaignId).catch((err) => {
        console.error('Failed to fetch campaign:', err);
        toast.error('Failed to load campaign');
      });
    }
  }, [campaignId, fetchCampaign]);

  const handleUpdate = async (data: { name?: string }) => {
    if (!campaignId) return;
    
    try {
      await updateCampaign(campaignId, data);
      toast.success('Campaign updated successfully');
    } catch (err: any) {
      console.error('Failed to update campaign:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to update campaign';
      toast.error(errorMessage);
      throw err; // Re-throw to let InlineEditController handle it
    }
  };

  const handleBack = () => {
    router.push('/campaigns');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="p-6">
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading campaign...</span>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error || !currentCampaign) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="p-6">
            <Button
              variant="secondary"
              onClick={handleBack}
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              className="mb-4"
            >
              Back to Campaigns
            </Button>
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">
                {error?.response?.data?.error || error?.message || 'Failed to load campaign'}
              </p>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <Layout>
        <div className="p-6">
          {/* Back Button */}
          <Button
            variant="secondary"
            onClick={handleBack}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="mb-4"
          >
            Back to Campaigns
          </Button>

          {/* Campaign Header */}
          <CampaignHeader
            campaign={currentCampaign}
            onUpdate={handleUpdate}
            loading={loading}
          />

          {/* Related Tasks */}
          <CampaignTasks campaignId={campaignId} />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

