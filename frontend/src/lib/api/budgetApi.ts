import api from '../api';

// Budget request type definitions
export interface BudgetRequestData {
  id?: number;
  task?: number;
  amount: string;
  currency: string;
  ad_channel: number;
  ad_channel_detail?: {
    id: number;
    name: string;
  };
  notes?: string;
  current_approver?: number;  // Make optional for creation
  // Read-only fields (returned by API but not for creation)
  requested_by?: number;
  status?: string;
  submitted_at?: string;
  is_escalated?: boolean;
  budget_pool?: number;
}

export interface ApprovalDecisionData {
  decision: 'approve' | 'reject';
  comment: string;
  next_approver?: number;
}

export interface BudgetPoolData {
  id: number;
  project: number;
  ad_channel: number;
  total_amount: string;
  used_amount: string;
  currency: string;
  available_amount: string;
}

export interface CreateBudgetPoolData {
  project: number;
  ad_channel: number;
  total_amount: string;
  currency: string;
}

export const BudgetAPI = {
  
  // Create a new budget request
  createBudgetRequest: (data: BudgetRequestData) => 
    api.post('/api/budgets/requests/', data),

  // Get all budget requests with optional filters
  getBudgetRequests: (params?: {
    status?: string;
    project_id?: number;
    requested_by?: number;
  }) => api.get('/api/budgets/requests/', { params }),

  // Get a specific budget request
  getBudgetRequest: (id: number) => 
    api.get(`/api/budgets/requests/${id}/`),

  // Update a budget request
  updateBudgetRequest: (id: number, data: Partial<BudgetRequestData>) => 
    api.patch(`/api/budgets/requests/${id}/`, data),

  // Delete a budget request
  deleteBudgetRequest: (id: number) => 
    api.delete(`/api/budgets/requests/${id}/`),

  // Start review for a budget request
  startReview: (id: number) => 
    api.post(`/api/budgets/requests/${id}/start-review/`),

  // Approve or reject a budget request
  makeDecision: (id: number, data: ApprovalDecisionData) => 
    api.patch(`/api/budgets/requests/${id}/decision/`, data),

  // Get budget pools
  getBudgetPools: (params?: {
    project_id?: number;
    currency?: string;
  }) => api.get('/api/budgets/pools/', { params }),

  // Create a budget pool
  createBudgetPool: (data: CreateBudgetPoolData) => 
    api.post('/api/budgets/pools/', data),

  // Get a specific budget pool
  getBudgetPool: (id: number) => 
    api.get(`/api/budgets/pools/${id}/`),

  // Update a budget pool
  updateBudgetPool: (id: number, data: any) => 
    api.patch(`/api/budgets/pools/${id}/`, data),

  // Delete a budget pool
  deleteBudgetPool: (id: number) => 
    api.delete(`/api/budgets/pools/${id}/`),
};
