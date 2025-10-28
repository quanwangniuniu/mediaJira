import { useState } from 'react';
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

interface UseStripeReturn {
  // Organization operations
  createOrganization: (data: CreateOrganizationData) => Promise<Organization>;
  createOrganizationLoading: boolean;
  
  // Error handling
  error: string | null;
  clearError: () => void;
}

export default function useStripe(): UseStripeReturn {
  const [createOrganizationLoading, setCreateOrganizationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return {
    createOrganization,
    createOrganizationLoading,
    error,
    clearError
  };
}
