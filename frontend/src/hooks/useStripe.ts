import { useState, useCallback } from 'react';
import api from '../lib/api';
import toast from 'react-hot-toast';

interface CreateOrganizationData {
  name: string;
  description?: string;
  email_domain?: string;
}

interface Organization {
  id: number;
  name: string;
  slug: string;
}

interface Subscription {
  id: number;
  plan: {
    id: number;
    name: string;
    max_team_members: number;
    max_previews_per_day: number;
    max_tasks_per_day: number;
    stripe_price_id: string;
  };
  stripe_subscription_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface UsageDaily {
  id: number;
  date: string;
  previews_used: number;
  tasks_used: number;
}

interface UseStripeReturn {
  // Organization operations
  createOrganization: (data: CreateOrganizationData) => Promise<Organization>;
  createOrganizationLoading: boolean;
  
  // Subscription operations
  getSubscription: () => Promise<Subscription | null>;
  getSubscriptionLoading: boolean;
  
  // Usage operations
  getUsage: () => Promise<UsageDaily | null>;
  getUsageLoading: boolean;
  // Org users management
  getOrganizationUsers: (page?: number, page_size?: number) => Promise<{count: number; next: string | null; previous: string | null; results: any[]}>;
  removeOrganizationUser: (userId: number) => Promise<boolean>;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

export default function useStripe(): UseStripeReturn {
  const [createOrganizationLoading, setCreateOrganizationLoading] = useState(false);
  const [getSubscriptionLoading, setGetSubscriptionLoading] = useState(false);
  const [getUsageLoading, setGetUsageLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [listUsersLoading, setListUsersLoading] = useState(false);
  const [removeUserLoading, setRemoveUserLoading] = useState(false);

  const clearError = () => setError(null);

  const createOrganization = async (data: CreateOrganizationData): Promise<Organization> => {
    setCreateOrganizationLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/stripe/organization/', data);
      
      // Show success message
      toast.success('Organization created successfully!');
      
      return response.data;
    } catch (error: any) {
      let errorMessage = 'Failed to create organization';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        // Handle validation errors
        if (errorData.name) {
          errorMessage = errorData.name[0];
        } else if (errorData.email_domain) {
          errorMessage = errorData.email_domain[0];
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setCreateOrganizationLoading(false);
    }
  };

  const getSubscription = useCallback(async (): Promise<Subscription | null> => {
    setGetSubscriptionLoading(true);
    setError(null);

    try {
      const response = await api.get('/api/stripe/subscription/');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No subscription found - this is normal for users without subscriptions
        return null;
      }
      
      let errorMessage = 'Failed to fetch subscription';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setGetSubscriptionLoading(false);
    }
  }, []);

  const getUsage = useCallback(async (): Promise<UsageDaily | null> => {
    setGetUsageLoading(true);
    setError(null);

    try {
      const response = await api.get('/api/stripe/usage/');
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        // No usage found - this is normal for users without usage records
        return null;
      }
      
      let errorMessage = 'Failed to fetch usage data';
      if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setGetUsageLoading(false);
    }
  }, []);

  const getOrganizationUsers = useCallback(async (page = 1, page_size = 10) => {
    setListUsersLoading(true);
    setError(null);
    try {
      const response = await api.get(`/api/stripe/organization/users/`, { params: { page, page_size } });
      return response.data;
    } catch (error: any) {
      let message = 'Failed to load organization users';
      if (error.response?.data?.error) message = error.response.data.error;
      setError(message);
      throw new Error(message);
    } finally {
      setListUsersLoading(false);
    }
  }, []);

  const removeOrganizationUser = useCallback(async (userId: number) => {
    setRemoveUserLoading(true);
    setError(null);
    try {
      await api.delete(`/api/stripe/organization/users/${userId}/`);
      toast.success('User removed from organization');
      return true;
    } catch (error: any) {
      let message = 'Failed to remove user';
      if (error.response?.data?.error) message = error.response.data.error;
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setRemoveUserLoading(false);
    }
  }, []);

  return {
    createOrganization,
    createOrganizationLoading,
    getSubscription,
    getSubscriptionLoading,
    getUsage,
    getUsageLoading,
    getOrganizationUsers,
    removeOrganizationUser,
    error,
    clearError
  };
}
