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

  useEffect(() => {
    fetchPlans();
  }, []);

  return {
    plans,
    loading,
    error,
    fetchPlans
  };
}

