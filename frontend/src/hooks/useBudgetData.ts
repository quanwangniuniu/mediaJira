import { useState, useEffect, useCallback } from 'react';
import { BudgetAPI } from '@/lib/api/budgetApi';
import { BudgetRequestData, ApprovalDecisionData } from '@/lib/api/budgetApi';

// Hook return type for better type safety
interface UseBudgetDataReturn {
  budgetRequests: BudgetRequestData[];
  currentBudgetRequest: BudgetRequestData | null;
  loading: boolean;
  error: any;
  fetchBudgetRequests: (params?: any) => Promise<void>;
  createBudgetRequest: (budgetData: BudgetRequestData) => Promise<BudgetRequestData>;
  getBudgetRequest: (id: number) => Promise<BudgetRequestData>;
  updateBudgetRequest: (id: number, data: Partial<BudgetRequestData>) => Promise<BudgetRequestData>;
  deleteBudgetRequest: (id: number) => Promise<void>;
  startReview: (id: number) => Promise<any>;
  makeDecision: (id: number, data: ApprovalDecisionData) => Promise<any>;
}

export const useBudgetData = (): UseBudgetDataReturn => {
  const [budgetRequests, setBudgetRequests] = useState<BudgetRequestData[]>([]);
  const [currentBudgetRequest, setCurrentBudgetRequest] = useState<BudgetRequestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  // Fetch all budget requests
  const fetchBudgetRequests = useCallback(async (params?: any) => {
    try {
      setLoading(true);
      setError(null);
      const response = await BudgetAPI.getBudgetRequests(params);
      setBudgetRequests(response.data || []);
    } catch (err) {
      console.error('Error fetching budget requests:', err);
      setError(err);
      setBudgetRequests([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new budget request
  const createBudgetRequest = useCallback(async (budgetData: BudgetRequestData): Promise<BudgetRequestData> => {
    try {
      setLoading(true);
      setError(null);
      const response = await BudgetAPI.createBudgetRequest(budgetData);
      const newBudgetRequest = response.data;
      
      // Update local state
      setBudgetRequests(prev => [...prev, newBudgetRequest]);
      setCurrentBudgetRequest(newBudgetRequest);
      
      return newBudgetRequest;
    } catch (err) {
      console.error('Error creating budget request:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a specific budget request
  const getBudgetRequest = useCallback(async (id: number): Promise<BudgetRequestData> => {
    try {
      setLoading(true);
      setError(null);
      const response = await BudgetAPI.getBudgetRequest(id);
      const budgetRequest = response.data;
      setCurrentBudgetRequest(budgetRequest);
      return budgetRequest;
    } catch (err) {
      console.error('Error fetching budget request:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a budget request
  const updateBudgetRequest = useCallback(async (id: number, data: Partial<BudgetRequestData>): Promise<BudgetRequestData> => {
    try {
      setLoading(true);
      setError(null);
      const response = await BudgetAPI.updateBudgetRequest(id, data);
      const updatedBudgetRequest = response.data;
      
      // Update local state
      setBudgetRequests(prev => 
        prev.map(br => br.id === id ? updatedBudgetRequest : br)
      );
      if (currentBudgetRequest?.id === id) {
        setCurrentBudgetRequest(updatedBudgetRequest);
      }
      
      return updatedBudgetRequest;
    } catch (err) {
      console.error('Error updating budget request:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentBudgetRequest]);

  // Delete a budget request
  const deleteBudgetRequest = useCallback(async (id: number): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      await BudgetAPI.deleteBudgetRequest(id);
      
      // Update local state
      setBudgetRequests(prev => prev.filter(br => br.id !== id));
      if (currentBudgetRequest?.id === id) {
        setCurrentBudgetRequest(null);
      }
    } catch (err) {
      console.error('Error deleting budget request:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentBudgetRequest]);

  // Start review for a budget request
  const startReview = useCallback(async (id: number): Promise<any> => {
    try {
      setLoading(true);
      setError(null);
      const response = await BudgetAPI.startReview(id);
      
      // Refresh the budget request data
      await getBudgetRequest(id);
      
      return response.data;
    } catch (err) {
      console.error('Error starting review:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getBudgetRequest]);

  // Make approval decision
  const makeDecision = useCallback(async (id: number, data: ApprovalDecisionData): Promise<any> => {
    try {
      setLoading(true);
      setError(null);
      const response = await BudgetAPI.makeDecision(id, data);
      
      // Refresh the budget request data
      await getBudgetRequest(id);
      
      return response.data;
    } catch (err) {
      console.error('Error making decision:', err);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getBudgetRequest]);

  return {
    budgetRequests,
    currentBudgetRequest,
    loading,
    error,
    fetchBudgetRequests,
    createBudgetRequest,
    getBudgetRequest,
    updateBudgetRequest,
    deleteBudgetRequest,
    startReview,
    makeDecision,
  };
};
