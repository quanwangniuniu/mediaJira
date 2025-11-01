import { useState, useEffect } from 'react';
import api from '@/lib/api';

interface Plan {
  id: number;
  name: string;
  desc: string | null;
  max_team_members: number;
  max_previews_per_day: number;
  max_tasks_per_day: number;
  stripe_price_id: string;
  price: number | null;
  price_currency: string | null;
  price_id: string;
}

interface UsePlanReturn {
  plans: Plan[];
  loading: boolean;
  error: string | null;
  fetchPlans: () => Promise<void>;
  createCheckoutSession: (planId: number) => Promise<void>;
  cancelSubscription: () => Promise<void>;
}

export default function usePlan(): UsePlanReturn {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.get('/api/stripe/plans/');
      setPlans(response.data.results || []);
    } catch (error: any) {
      console.error('Error fetching plans:', error);
      let errorMessage = 'Failed to fetch plans';
      
      if (error.response?.data) {
        const errorData = error.response.data;
        
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      }
      
      setError(errorMessage);
      setPlans([]);
    } finally {
      setLoading(false);
    }
  };

  const createCheckoutSession = async (planId: number) => {
    try {
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const response = await api.post('/api/stripe/checkout/', {
        plan_id: planId,
        success_url: `${baseUrl}/plans`,
        cancel_url: `${baseUrl}/plans`
      });
      
      // Backend now returns JSON with checkout_url instead of 303 redirect
      if (response.data && response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
        return;
      }
      
      throw new Error('No checkout URL received');
    } catch (error: any) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  };

  const cancelSubscription = async () => {
    try {
      await api.post('/api/stripe/subscription/cancel/');
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  return {
    plans,
    loading,
    error,
    fetchPlans,
    createCheckoutSession,
    cancelSubscription
  };
}

