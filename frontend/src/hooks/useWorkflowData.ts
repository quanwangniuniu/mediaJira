import { useCallback } from 'react';
import { WorkflowAPI } from '@/lib/api/workflowApi';
import {
  Workflow,
  CreateWorkflowData,
  UpdateWorkflowData,
  WorkflowGraph,
  GraphValidationResult,
  GetWorkflowsParams,
} from '@/types/workflow';
import { useWorkflowStore } from '@/lib/workflowStore';
import { generateTempId, extractErrorMessage, formatValidationErrors } from '@/lib/utils/workflowHelpers';
import toast from 'react-hot-toast';

export const useWorkflowData = () => {
  const {
    workflows,
    currentWorkflow,
    graph,
    validationResult,
    loading,
    error,
    setWorkflows,
    setCurrentWorkflow,
    setGraph,
    setValidationResult,
    setLoading,
    setError,
    addWorkflow,
    updateWorkflow,
    removeWorkflow,
    saveSnapshot,
    rollbackToSnapshot,
    clearCurrentWorkflow,
    clearError,
  } = useWorkflowStore();

  // Fetch all workflows
  const fetchWorkflows = useCallback(
    async (params?: GetWorkflowsParams) => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching workflows from backend...');
        const response = await WorkflowAPI.getWorkflows(params);
        const fetchedWorkflows = response.data.results || response.data;
        setWorkflows(fetchedWorkflows);
        console.log('Workflows fetched successfully:', fetchedWorkflows.length);
        return fetchedWorkflows;
      } catch (err: any) {
        console.error('Failed to fetch workflows:', err);
        setError(err);
        toast.error('Failed to fetch workflows');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setWorkflows, setLoading, setError]
  );

  // Get a specific workflow
  const fetchWorkflow = useCallback(
    async (workflowId: number): Promise<Workflow> => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching workflow ${workflowId}...`);
        const response = await WorkflowAPI.getWorkflow(workflowId);
        const workflow = response.data;
        setCurrentWorkflow(workflow);
        console.log('Workflow fetched successfully');
        return workflow;
      } catch (err: any) {
        console.error('Failed to fetch workflow:', err);
        setError(err);
        toast.error('Failed to fetch workflow');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setCurrentWorkflow, setLoading, setError]
  );

  // Create a new workflow (with optimistic update)
  const createWorkflow = useCallback(
    async (data: CreateWorkflowData): Promise<Workflow> => {
      // Save snapshot for rollback
      const snapshotId = saveSnapshot('workflow', 'create');

      // Optimistic update: create temporary workflow
      const tempWorkflow: Workflow = {
        ...data,
        id: generateTempId(), // Temporary ID
        version: 1,
        is_active: data.is_active ?? true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addWorkflow(tempWorkflow);

      try {
        setLoading(true);
        setError(null);
        console.log('Creating workflow via backend...');
        const response = await WorkflowAPI.createWorkflow(data);
        const newWorkflow = response.data;

        // Replace temp workflow with real one
        removeWorkflow(tempWorkflow.id!);
        addWorkflow(newWorkflow);
        console.log('Workflow created successfully:', newWorkflow.id);
        toast.success('Workflow created successfully');
        return newWorkflow;
      } catch (err: any) {
        console.error('Failed to create workflow:', err);
        // Rollback optimistic update
        rollbackToSnapshot(snapshotId);
        setError(err);
        toast.error(extractErrorMessage(err, 'Failed to create workflow'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addWorkflow, removeWorkflow, saveSnapshot, rollbackToSnapshot, setLoading, setError]
  );

  // Update workflow (with optimistic update)
  const updateWorkflowData = useCallback(
    async (workflowId: number, data: Partial<UpdateWorkflowData>): Promise<Workflow> => {
      // Save snapshot for rollback
      const snapshotId = saveSnapshot('workflow', 'update');
      const oldData = workflows.find((w: Workflow) => w.id === workflowId);

      // Optimistic update
      if (oldData) {
        updateWorkflow(workflowId, data);
      }

      try {
        setLoading(true);
        setError(null);
        console.log(`Updating workflow ${workflowId}...`);
        const response = await WorkflowAPI.patchWorkflow(workflowId, data);
        const updatedWorkflow = response.data;

        // Update with real data from server
        updateWorkflow(workflowId, updatedWorkflow);
        console.log('Workflow updated successfully');
        toast.success('Workflow updated successfully');
        return updatedWorkflow;
      } catch (err: any) {
        console.error('Failed to update workflow:', err);
        // Rollback optimistic update
        rollbackToSnapshot(snapshotId);
        setError(err);
        toast.error(extractErrorMessage(err, 'Failed to update workflow'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [workflows, updateWorkflow, saveSnapshot, rollbackToSnapshot, setLoading, setError]
  );

  // Delete workflow (with optimistic update)
  const deleteWorkflowData = useCallback(
    async (workflowId: number): Promise<void> => {
      // Save snapshot for rollback
      const snapshotId = saveSnapshot('workflow', 'delete');

      // Optimistic update
      removeWorkflow(workflowId);

      try {
        setLoading(true);
        setError(null);
        console.log(`Deleting workflow ${workflowId}...`);
        await WorkflowAPI.deleteWorkflow(workflowId);
        console.log('Workflow deleted successfully');
        toast.success('Workflow deleted successfully');

        // Clear current workflow if it was deleted
        if (currentWorkflow?.id === workflowId) {
          clearCurrentWorkflow();
        }
      } catch (err: any) {
        console.error('Failed to delete workflow:', err);
        // Rollback optimistic update
        rollbackToSnapshot(snapshotId);
        setError(err);
        toast.error(extractErrorMessage(err, 'Failed to delete workflow'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      currentWorkflow,
      removeWorkflow,
      saveSnapshot,
      rollbackToSnapshot,
      clearCurrentWorkflow,
      setLoading,
      setError,
    ]
  );

  // Fetch workflow graph
  const fetchWorkflowGraph = useCallback(
    async (workflowId: number): Promise<WorkflowGraph> => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Fetching workflow graph ${workflowId}...`);
        const graphData = await WorkflowAPI.getWorkflowGraph(workflowId);
        setGraph(graphData);
        console.log('Workflow graph fetched successfully');
        return graphData;
      } catch (err: any) {
        console.error('Failed to fetch workflow graph:', err);
        setError(err);
        toast.error('Failed to fetch workflow graph');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setGraph, setLoading, setError]
  );

  // Validate workflow graph
  const validateWorkflowGraphData = useCallback(
    async (workflowId: number): Promise<GraphValidationResult> => {
      try {
        setLoading(true);
        setError(null);
        console.log(`Validating workflow graph ${workflowId}...`);
        const result = await WorkflowAPI.validateWorkflowGraph(workflowId);
        setValidationResult(result);
        console.log('Workflow graph validated');

        if (!result.is_valid) {
          const errorMsg = formatValidationErrors(result.errors);
          toast.error(`Validation failed: ${errorMsg}`);
        } else {
          toast.success('Workflow graph is valid');
        }

        return result;
      } catch (err: any) {
        console.error('Failed to validate workflow graph:', err);
        setError(err);
        toast.error('Failed to validate workflow graph');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setValidationResult, setLoading, setError]
  );

  return {
    workflows,
    currentWorkflow,
    graph,
    validationResult,
    loading,
    error,
    fetchWorkflows,
    fetchWorkflow,
    createWorkflow,
    updateWorkflow: updateWorkflowData,
    deleteWorkflow: deleteWorkflowData,
    fetchWorkflowGraph,
    validateWorkflowGraph: validateWorkflowGraphData,
    clearError,
  };
};

