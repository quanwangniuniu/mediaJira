import { useState, useCallback } from 'react';
import { BudgetAPI } from '@/lib/api/budgetApi';
import { CreateBudgetPoolData, BudgetPoolData } from '@/lib/api/budgetApi';

export const useBudgetPoolData = () => {
  const [budgetPools, setBudgetPools] = useState<BudgetPoolData[]>([]);
  const [currentBudgetPool, setCurrentBudgetPool] = useState<BudgetPoolData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  // Get all budget pools with optional filters
  const fetchBudgetPools = useCallback(async (params?: {
    project_id?: number;
    currency?: string;
  }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await BudgetAPI.getBudgetPools(params);
      const fetchedBudgetPools = response.data.results || response.data;
      setBudgetPools(fetchedBudgetPools);
      return fetchedBudgetPools;
    } catch (err) {
      setError(err);
      console.error('Failed to fetch budget pools:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get a specific budget pool by ID
  const fetchBudgetPool = useCallback(async (budgetPoolId: number): Promise<BudgetPoolData> => {
    try {
      setLoading(true);
      setError(null);
      const response = await BudgetAPI.getBudgetPool(budgetPoolId);
      const budgetPool = response.data;
      setCurrentBudgetPool(budgetPool);
      return budgetPool;
    } catch (err) {
      setError(err);
      console.error('Failed to fetch budget pool:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Create a new budget pool
  const createBudgetPool = useCallback(async (budgetPoolData: CreateBudgetPoolData): Promise<BudgetPoolData> => {
    try {
      setLoading(true);
      setError(null);
      const response = await BudgetAPI.createBudgetPool(budgetPoolData);
      const newBudgetPool = response.data;
      
      // Add the new budget pool to the list
      setBudgetPools(prev => [newBudgetPool, ...prev]);
      
      return newBudgetPool;
    } catch (err) {
      setError(err);
      console.error('Failed to create budget pool:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update a specific budget pool
  const updateBudgetPool = useCallback((budgetPoolId: number, updatedData: Partial<BudgetPoolData>) => {
    setBudgetPools(prev => prev.map(budgetPool =>
      budgetPool.id === budgetPoolId ? { ...budgetPool, ...updatedData } : budgetPool
    ));

    // Also update currentBudgetPool if it matches
    setCurrentBudgetPool(prev =>
      prev && prev.id === budgetPoolId ? { ...prev, ...updatedData } : prev
    );
  }, []);

  // Delete a budget pool
  const deleteBudgetPool = useCallback(async (budgetPoolId: number) => {
    try {
      setLoading(true);
      setError(null);
      await BudgetAPI.deleteBudgetPool(budgetPoolId);
      
      // Remove from the list
      setBudgetPools(prev => prev.filter(budgetPool => budgetPool.id !== budgetPoolId));
      
      // Clear currentBudgetPool if it was deleted
      setCurrentBudgetPool(prev => prev && prev.id === budgetPoolId ? null : prev);
    } catch (err) {
      setError(err);
      console.error('Failed to delete budget pool:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    budgetPools,
    currentBudgetPool,
    loading,
    error,
    fetchBudgetPools,
    fetchBudgetPool,
    createBudgetPool,
    updateBudgetPool,
    deleteBudgetPool,
  };
};
