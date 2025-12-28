import api from '../api';
import {
  Workflow,
  CreateWorkflowData,
  UpdateWorkflowData,
  WorkflowNode,
  CreateNodeData,
  UpdateNodeData,
  WorkflowConnection,
  CreateConnectionData,
  UpdateConnectionData,
  WorkflowGraph,
  GraphValidationResult,
  BatchNodeOperation,
  BatchConnectionOperation,
  BatchNodeOperationResult,
  BatchConnectionOperationResult,
  GetWorkflowsParams,
} from '@/types/workflow';

export const WorkflowAPI = {
  // ==================== Workflow CRUD ====================
  
  /**
   * Get all workflows with optional filters
   */
  getWorkflows: (params?: GetWorkflowsParams): Promise<{ data: Workflow[] | { results: Workflow[]; count: number } }> =>
    api.get('/api/workflows/workflows/', { params }),

  /**
   * Get a specific workflow by ID
   */
  getWorkflow: (workflowId: number): Promise<{ data: Workflow }> =>
    api.get(`/api/workflows/workflows/${workflowId}/`),

  /**
   * Create a new workflow
   */
  createWorkflow: (data: CreateWorkflowData) =>
    api.post('/api/workflows/workflows/', data),

  /**
   * Update a workflow (full update)
   */
  updateWorkflow: (workflowId: number, data: UpdateWorkflowData) =>
    api.put(`/api/workflows/workflows/${workflowId}/`, data),

  /**
   * Update a workflow (partial update)
   */
  patchWorkflow: (workflowId: number, data: Partial<UpdateWorkflowData>) =>
    api.patch(`/api/workflows/workflows/${workflowId}/`, data),

  /**
   * Delete a workflow
   */
  deleteWorkflow: (workflowId: number) =>
    api.delete(`/api/workflows/workflows/${workflowId}/`),

  // ==================== Graph Operations ====================
  
  /**
   * Get complete workflow graph (workflow + nodes + connections)
   */
  getWorkflowGraph: async (workflowId: number): Promise<WorkflowGraph> => {
    const response = await api.get(`/api/workflows/workflows/${workflowId}/graph/`);
    return response.data as WorkflowGraph;
  },

  /**
   * Validate workflow graph structure and rules
   */
  validateWorkflowGraph: async (workflowId: number): Promise<GraphValidationResult> => {
    const response = await api.post(`/api/workflows/workflows/${workflowId}/validate/`);
    return response.data as GraphValidationResult;
  },

  // ==================== Node CRUD ====================
  
  /**
   * Get all nodes for a workflow
   */
  getNodes: (workflowId: number): Promise<{ data: WorkflowNode[] | { results: WorkflowNode[]; count: number } }> =>
    api.get(`/api/workflows/workflows/${workflowId}/nodes/`),

  /**
   * Get a specific node by ID
   */
  getNode: (workflowId: number, nodeId: number): Promise<{ data: WorkflowNode }> =>
    api.get(`/api/workflows/workflows/${workflowId}/nodes/${nodeId}/`),

  /**
   * Create a new node in a workflow
   */
  createNode: (workflowId: number, data: CreateNodeData) =>
    api.post(`/api/workflows/workflows/${workflowId}/nodes/`, data),

  /**
   * Update a node (full update)
   */
  updateNode: (workflowId: number, nodeId: number, data: UpdateNodeData) =>
    api.put(`/api/workflows/workflows/${workflowId}/nodes/${nodeId}/`, data),

  /**
   * Update a node (partial update)
   */
  patchNode: (workflowId: number, nodeId: number, data: Partial<UpdateNodeData>) =>
    api.patch(`/api/workflows/workflows/${workflowId}/nodes/${nodeId}/`, data),

  /**
   * Delete a node
   */
  deleteNode: (workflowId: number, nodeId: number) =>
    api.delete(`/api/workflows/workflows/${workflowId}/nodes/${nodeId}/`),

  // ==================== Connection CRUD ====================
  
  /**
   * Get all connections for a workflow
   */
  getConnections: (workflowId: number): Promise<{ data: WorkflowConnection[] | { results: WorkflowConnection[]; count: number } }> =>
    api.get(`/api/workflows/workflows/${workflowId}/connections/`),

  /**
   * Get a specific connection by ID
   */
  getConnection: (workflowId: number, connectionId: number): Promise<{ data: WorkflowConnection }> =>
    api.get(`/api/workflows/workflows/${workflowId}/connections/${connectionId}/`),

  /**
   * Create a new connection in a workflow
   */
  createConnection: (workflowId: number, data: CreateConnectionData) =>
    api.post(`/api/workflows/workflows/${workflowId}/connections/`, data),

  /**
   * Update a connection (full update)
   */
  updateConnection: (workflowId: number, connectionId: number, data: UpdateConnectionData) =>
    api.put(`/api/workflows/workflows/${workflowId}/connections/${connectionId}/`, data),

  /**
   * Update a connection (partial update)
   */
  patchConnection: (workflowId: number, connectionId: number, data: Partial<UpdateConnectionData>) =>
    api.patch(`/api/workflows/workflows/${workflowId}/connections/${connectionId}/`, data),

  /**
   * Delete a connection
   */
  deleteConnection: (workflowId: number, connectionId: number) =>
    api.delete(`/api/workflows/workflows/${workflowId}/connections/${connectionId}/`),

  // ==================== Batch Operations ====================
  
  /**
   * Batch operations on nodes (create, update, delete)
   * All operations are atomic - all succeed or all fail
   */
  batchNodes: async (
    workflowId: number,
    data: BatchNodeOperation
  ): Promise<BatchNodeOperationResult> => {
    const response = await api.post(
      `/api/workflows/workflows/${workflowId}/nodes/batch/`,
      data
    );
    return response.data as BatchNodeOperationResult;
  },

  /**
   * Batch operations on connections (create, update, delete)
   * All operations are atomic - all succeed or all fail
   */
  batchConnections: async (
    workflowId: number,
    data: BatchConnectionOperation
  ): Promise<BatchConnectionOperationResult> => {
    const response = await api.post(
      `/api/workflows/workflows/${workflowId}/connections/batch/`,
      data
    );
    return response.data as BatchConnectionOperationResult;
  },
};

