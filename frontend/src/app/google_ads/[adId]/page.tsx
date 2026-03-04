'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import useAuth from '@/hooks/useAuth';
import { useGoogleAdsData } from '@/hooks/useGoogleAdsData';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { GoogleAdsAPI } from '@/lib/api/googleAdsApi';

function GoogleAdsDetailPageContent() {
  const { adId } = useParams();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { currentAd, loading, fetchAd } = useGoogleAdsData();

  const layoutUser = user
    ? {
        name: user.username || 'User',
        email: user.email || '',
        role: user.roles?.[0] || 'user',
      }
    : undefined;

  const handleUserAction = async (action: string) => {
    if (action === 'settings') {
      router.push('/profile/settings');
    } else if (action === 'logout') {
      await logout();
    }
  };

  useEffect(() => {
    if (adId) {
      fetchAd(parseInt(adId as string));
    }
  }, [adId, fetchAd]);

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString));
  };

  const getStatusDisplay = (status?: string) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTypeDisplay = (type?: string) => {
    if (!type) return 'Unknown';
    return type.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getStatusColor = (status?: string) => {
    const statusColors: Record<string, string> = {
      DRAFT: 'bg-gray-100 text-gray-800',
      PENDING_REVIEW: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-blue-100 text-blue-800',
      REJECTED: 'bg-red-100 text-red-800',
      PUBLISHED: 'bg-green-100 text-green-800',
    };
    return statusColors[status || ''] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Layout user={layoutUser} onUserAction={handleUserAction}>
        <div className="container">
          <LoadingSpinner />
        </div>
      </Layout>
    );
  }

  if (!currentAd) {
    return (
      <Layout user={layoutUser} onUserAction={handleUserAction}>
        <div className="container">
          <h1 className="text-3xl font-bold text-gray-900">Ad Not Found</h1>
          <p className="mt-2 text-gray-600">The requested ad could not be found.</p>
          <button onClick={() => router.back()} className="btn btn-secondary mt-4">
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout user={layoutUser} onUserAction={handleUserAction}>
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Ad Details: {currentAd.name || 'Unnamed Ad'}
          </h1>
          <button onClick={() => router.back()} className="btn btn-secondary">
            Go Back
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Ad Information</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">Details about the Google Ad.</p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Ad ID</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{currentAd.id}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{currentAd.name || '-'}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(currentAd.status)}`}>
                    {getStatusDisplay(currentAd.status)}
                  </span>
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Ad Type</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{getTypeDisplay(currentAd.type)}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Resource Name</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 font-mono">{(currentAd as any).resource_name || '-'}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Google Ads ID</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{currentAd.google_ads_id || '-'}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Display URL</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {currentAd.display_url ? (
                    <a href={currentAd.display_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                      {currentAd.display_url}
                    </a>
                  ) : '-'}
                </dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Final URLs</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {currentAd.final_urls && currentAd.final_urls.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {currentAd.final_urls.map((url, index) => (
                        <li key={index}>
                          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                            {url}
                          </a>
                        </li>
                      ))}
                    </ul>
                  ) : '-'}
                </dd>
              </div>
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Created At</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(currentAd.created_at)}</dd>
              </div>
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Updated At</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{formatDate(currentAd.updated_at)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Ad Type Specific Information */}
        {(currentAd.responsive_search_ad || currentAd.responsive_display_ad || currentAd.video_ad || currentAd.image_ad || currentAd.video_responsive_ad) && (
          <div className="mt-8 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Ad Type Details</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Specific information for the {getTypeDisplay(currentAd.type)}.</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="text-sm text-gray-500">
                <p>Ad type specific details will be displayed here based on the selected ad type.</p>
                <p className="mt-2">This section will show headlines, descriptions, media assets, and other type-specific information.</p>
              </div>
            </div>
          </div>
        )}

        {/* Performance Data Placeholder */}
        <div className="mt-8">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Performance Data (TODO)</h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">This section will display performance metrics for the ad.</p>
        </div>
      </div>
    </Layout>
  );
}

export default function GoogleAdsDetailPage() {
  return (
    <ProtectedRoute>
      <GoogleAdsDetailPageContent />
    </ProtectedRoute>
  );
}
