import { useCallback } from 'react';
import { WorkflowAPI } from '@/lib/api/workflowApi';
import {
  WorkflowConnection,
  WorkflowNode,
  CreateConnectionData,
  UpdateConnectionData,
  BatchConnectionOperation,
  BatchConnectionOperationResult,
} from '@/types/workflow';
import { useWorkflowStore } from '@/lib/workflowStore';
import { generateTempId, extractErrorMessage } from '@/lib/utils/workflowHelpers';
import toast from 'react-hot-toast';

export const useWorkflowConnection = (workflowId: number) => {
  const {
    graph,
    loading,
    error,
    setLoading,
    setError,
      addConnection,
      updateConnection,
      removeConnection,
      saveSnapshot,
      rollbackToSnapshot,
      setGraph,
    } = useWorkflowStore();

  // Create a connection (with optimistic update)
  const createConnectionData = useCallback(
    async (data: CreateConnectionData): Promise<WorkflowConnection> => {
      if (!graph) {
        throw new Error('No workflow graph loaded. Please load the graph first.');
      }

      // Save snapshot for rollback
      const snapshotId = saveSnapshot('connection', 'create');

      // Optimistic update: create temporary connection
      const tempConnection: WorkflowConnection = {
        ...data,
        id: generateTempId(), // Temporary ID
        workflow_id: workflowId,
        connection_type: data.connection_type || 'sequential',
        priority: data.priority || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addConnection(tempConnection);

      try {
        setLoading(true);
        setError(null);
        console.log('Creating connection via backend...');
        const response = await WorkflowAPI.createConnection(workflowId, data);
        const newConnection = response.data;

        // Replace temp connection with real one
        removeConnection(tempConnection.id!);
        addConnection(newConnection);
        console.log('Connection created successfully:', newConnection.id);
        toast.success('Connection created successfully');
        return newConnection;
      } catch (err: any) {
        console.error('Failed to create connection:', err);
        // Rollback optimistic update
        rollbackToSnapshot(snapshotId);
        setError(err);
        toast.error(extractErrorMessage(err, 'Failed to create connection'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      graph,
      workflowId,
      addConnection,
      removeConnection,
      saveSnapshot,
      rollbackToSnapshot,
      setLoading,
      setError,
    ]
  );

  // Update a connection (with optimistic update)
  const updateConnectionData = useCallback(
    async (
      connectionId: number,
      data: Partial<UpdateConnectionData>
    ): Promise<WorkflowConnection> => {
      if (!graph) {
        throw new Error('No workflow graph loaded. Please load the graph first.');
      }

      // Save snapshot for rollback
      const snapshotId = saveSnapshot('connection', 'update');
      const oldConnection = graph.connections.find((c: WorkflowConnection) => c.id === connectionId);

      if (!oldConnection) {
        throw new Error(`Connection with id ${connectionId} not found`);
      }

      // Optimistic update
      updateConnection(connectionId, data);

      try {
        setLoading(true);
        setError(null);
        console.log(`Updating connection ${connectionId}...`);
        const response = await WorkflowAPI.patchConnection(workflowId, connectionId, data);
        const updatedConnection = response.data;

        // Update with real data from server
        updateConnection(connectionId, updatedConnection);
        console.log('Connection updated successfully');
        toast.success('Connection updated successfully');
        return updatedConnection;
      } catch (err: any) {
        console.error('Failed to update connection:', err);
        // Rollback optimistic update
        rollbackToSnapshot(snapshotId);
        setError(err);
        toast.error(extractErrorMessage(err, 'Failed to update connection'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      graph,
      workflowId,
      updateConnection,
      saveSnapshot,
      rollbackToSnapshot,
      setLoading,
      setError,
    ]
  );

  // Remove a connection (with optimistic update)
  const removeConnectionData = useCallback(
    async (connectionId: number): Promise<void> => {
      if (!graph) {
        throw new Error('No workflow graph loaded. Please load the graph first.');
      }

      // Save snapshot for rollback
      const snapshotId = saveSnapshot('connection', 'delete');

      // Optimistic update
      removeConnection(connectionId);

      try {
        setLoading(true);
        setError(null);
        console.log(`Deleting connection ${connectionId}...`);
        await WorkflowAPI.deleteConnection(workflowId, connectionId);
        console.log('Connection deleted successfully');
        toast.success('Connection removed successfully');
      } catch (err: any) {
        console.error('Failed to delete connection:', err);
        // Rollback optimistic update
        rollbackToSnapshot(snapshotId);
        setError(err);
        toast.error(extractErrorMessage(err, 'Failed to remove connection'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      graph,
      workflowId,
      removeConnection,
      saveSnapshot,
      rollbackToSnapshot,
      setLoading,
      setError,
    ]
  );

  // Batch operations on connections
  const batchConnections = useCallback(
    async (
      operations: BatchConnectionOperation
    ): Promise<BatchConnectionOperationResult> => {
      if (!graph) {
        throw new Error('No workflow graph loaded. Please load the graph first.');
      }

      // Save snapshot for rollback
      const snapshotId = saveSnapshot('graph', 'update');

      // Optimistic updates for batch operations
      if (operations.create) {
        operations.create.forEach((connData) => {
          const tempConnection: WorkflowConnection = {
            ...connData,
            id: generateTempId(),
            workflow_id: workflowId,
            connection_type: connData.connection_type || 'sequential',
            priority: connData.priority || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          addConnection(tempConnection);
        });
      }

      if (operations.update) {
        operations.update.forEach(({ id, ...updateData }) => {
          updateConnection(id, updateData);
        });
      }

      if (operations.delete) {
        operations.delete.forEach((id) => {
          removeConnection(id);
        });
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Executing batch connection operations...');
        const result = await WorkflowAPI.batchConnections(workflowId, operations);

        // Refresh graph to get server state
        const refreshedGraph = await WorkflowAPI.getWorkflowGraph(workflowId);
        setGraph(refreshedGraph);

        console.log('Batch connection operations completed successfully');
        toast.success(
          `Batch operations completed: ${result.created.length} created, ${result.updated.length} updated, ${result.deleted.length} deleted`
        );
        return result;
      } catch (err: any) {
        console.error('Failed to execute batch connection operations:', err);
        // Rollback optimistic update
        rollbackToSnapshot(snapshotId);
        setError(err);
        toast.error(extractErrorMessage(err, 'Failed to execute batch operations'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      graph,
      workflowId,
      addConnection,
      updateConnection,
      removeConnection,
      saveSnapshot,
      rollbackToSnapshot,
      setGraph,
      setLoading,
      setError,
    ]
  );

  // Validate connection (frontend pre-validation)
  const validateConnection = useCallback(
    (data: CreateConnectionData): { valid: boolean; error?: string } => {
      if (!graph) {
        return { valid: false, error: 'No workflow graph loaded' };
      }

      // Check if source node exists
      const sourceNode = graph.nodes.find((n: WorkflowNode) => n.id === data.source_node_id);
      if (!sourceNode) {
        return { valid: false, error: 'Source node not found' };
      }

      // Check if target node exists
      const targetNode = graph.nodes.find((n: WorkflowNode) => n.id === data.target_node_id);
      if (!targetNode) {
        return { valid: false, error: 'Target node not found' };
      }

      // Check self-connection
      if (data.source_node_id === data.target_node_id) {
        return { valid: false, error: 'A node cannot connect to itself' };
      }

      // Check if connection already exists
      const existingConnection = graph.connections.find(
        (c: WorkflowConnection) =>
          c.source_node_id === data.source_node_id &&
          c.target_node_id === data.target_node_id
      );
      if (existingConnection) {
        return { valid: false, error: 'Connection already exists' };
      }

      return { valid: true };
    },
    [graph]
  );

  return {
    connections: graph?.connections || [],
    loading,
    error,
    createConnection: createConnectionData,
    updateConnection: updateConnectionData,
    removeConnection: removeConnectionData,
    batchConnections,
    validateConnection,
  };
};

