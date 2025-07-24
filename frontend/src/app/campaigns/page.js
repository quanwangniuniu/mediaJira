'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { PlusIcon, FunnelIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import CampaignCard from '@/components/campaigns/CampaignCard';
import CampaignModal from '@/components/campaigns/CampaignModal';
import DashboardStats from '@/components/campaigns/DashboardStats';
import FilterPanel from '@/components/campaigns/FilterPanel';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import useAuth from '@/hooks/useAuth';

// Configure axios defaults
axios.defaults.timeout = 10000; // 10 second timeout
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add request interceptor for logging
axios.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('Response error:', error);
    
    // Handle different types of errors
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 400:
          console.error('Bad request:', data);
          break;
        case 401:
          console.error('Unauthorized');
          break;
        case 403:
          console.error('Forbidden');
          break;
        case 404:
          console.error('Not found');
          break;
        case 405:
          console.error('Method not allowed');
          break;
        case 500:
          console.error('Server error');
          break;
        default:
          console.error(`HTTP ${status} error`);
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network error - no response received');
    } else {
      // Something else happened
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    campaign_type: '',
    search: ''
  });
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { user, loading: userLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    fetchCampaigns();
    fetchDashboardStats();
    // eslint-disable-next-line
  }, [filters]);

  const showError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 5000); // Clear error after 5 seconds
  };

  const showSuccess = (message) => {
    // You can implement a toast notification here
    console.log('Success:', message);
  };

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      
      const response = await axios.get('/api/campaigns/', { params });
      
      if (response.data && Array.isArray(response.data.results)) {
        setCampaigns(response.data.results);
      } else if (Array.isArray(response.data)) {
        setCampaigns(response.data);
      } else {
        setCampaigns([]);
        console.warn('Unexpected response format:', response.data);
      }
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      
      if (error.response?.status === 405) {
        showError('API endpoint not configured properly. Please check backend setup.');
      } else if (error.response?.status === 404) {
        showError('Campaigns endpoint not found. Please check API configuration.');
      } else if (error.code === 'ECONNABORTED') {
        showError('Request timed out. Please check your connection and try again.');
      } else if (!error.response) {
        showError('Network error. Please check your connection and try again.');
      } else {
        showError(`Failed to load campaigns: ${error.response?.data?.error || error.message}`);
      }
      
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true);
      const response = await axios.get('/api/campaigns/dashboard_stats/');
      
      if (response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      // Don't show error for stats as it's not critical
      setStats(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const validateCampaignData = (data) => {
    const errors = [];
    
    if (!data.name || data.name.trim().length < 2) {
      errors.push('Campaign name must be at least 2 characters long');
    }
    
    if (!data.campaign_type || data.campaign_type.trim().length === 0) {
      errors.push('Campaign type is required');
    }
    
    if (!data.start_date) {
      errors.push('Start date is required');
    }
    
    if (!data.end_date) {
      errors.push('End date is required');
    }
    
    if (data.start_date && data.end_date && new Date(data.start_date) >= new Date(data.end_date)) {
      errors.push('End date must be after start date');
    }
    
    if (!data.budget || parseFloat(data.budget) <= 0) {
      errors.push('Budget must be greater than 0');
    }
    
    return errors;
  };

  const handleCreateCampaign = async (campaignData) => {
    try {
      setSubmitting(true);
      setError(null);
      
      // Validate data before sending
      const validationErrors = validateCampaignData(campaignData);
      if (validationErrors.length > 0) {
        showError(`Validation errors: ${validationErrors.join(', ')}`);
        return;
      }
      
      // Prepare data for API
      const apiData = {
        ...campaignData,
        budget: parseFloat(campaignData.budget),
        status: 'draft' // Default status
      };
      
      const response = await axios.post('/api/campaigns/', apiData);
      
      if (response.data) {
        const newCampaign = response.data;
        setCampaigns(prev => [newCampaign, ...prev]);
        setShowModal(false);
        showSuccess('Campaign created successfully!');
        fetchDashboardStats(); // Refresh stats
      }
    } catch (error) {
      console.error('Error creating campaign:', error);
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        if (errorData.details) {
          showError(`Validation failed: ${JSON.stringify(errorData.details)}`);
        } else if (errorData.error) {
          showError(errorData.error);
        } else {
          showError('Invalid campaign data. Please check your inputs.');
        }
      } else if (error.response?.status === 405) {
        showError('Create campaign endpoint not available. Please check backend configuration.');
      } else if (error.response?.status === 500) {
        showError('Server error while creating campaign. Please try again.');
      } else {
        showError(`Failed to create campaign: ${error.response?.data?.error || error.message}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (campaignId, newStatus, reason = '') => {
    try {
      setError(null);
      
      const response = await axios.post(`/api/campaigns/${campaignId}/update_status/`, { 
        status: newStatus, 
        reason 
      });
      
      if (response.data) {
        setCampaigns(prev => prev.map(campaign => 
          campaign.id === campaignId 
            ? { ...campaign, status: newStatus }
            : campaign
        ));
        showSuccess('Campaign status updated successfully!');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      
      if (error.response?.status === 400) {
        const errorData = error.response.data;
        showError(errorData.error || 'Invalid status transition');
      } else if (error.response?.status === 404) {
        showError('Campaign not found');
      } else {
        showError(`Failed to update campaign status: ${error.response?.data?.error || error.message}`);
      }
    }
  };

  const handleFilterChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleRetry = () => {
    fetchCampaigns();
    fetchDashboardStats();
  };

  const layoutUser = user
    ? {
        name: user.username || user.email,
        email: user.email,
        role: user.roles && user.roles.length > 0 ? user.roles[0] : undefined,
      }
    : undefined;

  const handleUserAction = async (action) => {
    if (action === 'settings') {
      router.push('/profile/settings');
    } else if (action === 'logout') {
      await logout();
    }
  };

  return (
    <Layout user={layoutUser} onUserAction={handleUserAction}>
      <div className="campaigns-bg">
        <div className="container">
          {error && (
            <div className="error-banner">
              <div className="error-content">
                <span>{error}</span>
                <button onClick={handleRetry} className="btn btn-secondary">Retry</button>
              </div>
            </div>
          )}

          <div className="campaigns-header">
            <div>
              <h1 className="page-title">Campaigns</h1>
              <p className="subtitle">
                Manage your advertising campaigns and track performance
              </p>
            </div>
            <div className="campaigns-header-actions">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="btn btn-secondary"
                disabled={loading}
              >
                Filters
              </button>
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary"
                disabled={loading || submitting}
              >
                New Campaign
              </button>
            </div>
          </div>

          {stats && (
            <div className="dashboard-stats-wrapper">
              <DashboardStats stats={stats} loading={statsLoading} />
            </div>
          )}

          {showFilters && (
            <div className="filter-panel-wrapper">
              <FilterPanel filters={filters} onFilterChange={handleFilterChange} />
            </div>
          )}

          <div className="campaigns-grid-wrapper">
            {loading ? (
              <div className="centered">
                <LoadingSpinner size="lg" />
                <p>Loading campaigns...</p>
              </div>
            ) : campaigns.length === 0 ? (
              <div className="empty-state">
                <h3>No campaigns found</h3>
                <p>
                  {error ? 'Unable to load campaigns. Please try again.' : 'Get started by creating a new campaign.'}
                </p>
                {error && (
                  <button onClick={handleRetry} className="btn btn-secondary">
                    Retry
                  </button>
                )}
                {!error && (
                  <button
                    onClick={() => setShowModal(true)}
                    className="btn btn-primary"
                  >
                    New Campaign
                  </button>
                )}
              </div>
            ) : (
              <div className="campaigns-grid">
                {campaigns.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onStatusUpdate={handleStatusUpdate}
                  />
                ))}
              </div>
            )}
          </div>

          {showModal && (
            <CampaignModal
              isOpen={showModal}
              onClose={() => setShowModal(false)}
              onSubmit={handleCreateCampaign}
              submitting={submitting}
            />
          )}
        </div>
      </div>
    </Layout>
  );
} 