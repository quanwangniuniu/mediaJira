import { useCallback } from 'react';
import { WorkflowAPI } from '@/lib/api/workflowApi';
import {
  WorkflowNode,
  CreateNodeData,
  UpdateNodeData,
  BatchNodeOperation,
  BatchNodeOperationResult,
} from '@/types/workflow';
import { useWorkflowStore } from '@/lib/workflowStore';
import { generateTempId, extractErrorMessage } from '@/lib/utils/workflowHelpers';
import toast from 'react-hot-toast';

export const useWorkflowNode = (workflowId: number) => {
  const {
    graph,
    loading,
    error,
    setLoading,
    setError,
      addNode,
      updateNode,
      removeNode,
      saveSnapshot,
      rollbackToSnapshot,
      setGraph,
    } = useWorkflowStore();

  // Add a node (with optimistic update)
  const addNodeData = useCallback(
    async (data: CreateNodeData): Promise<WorkflowNode> => {
      if (!graph) {
        throw new Error('No workflow graph loaded. Please load the graph first.');
      }

      // Save snapshot for rollback
      const snapshotId = saveSnapshot('node', 'create');

      // Optimistic update: create temporary node
      const tempNode: WorkflowNode = {
        ...data,
        id: generateTempId(), // Temporary ID
        workflow_id: workflowId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      addNode(tempNode);

      try {
        setLoading(true);
        setError(null);
        console.log('Creating node via backend...');
        const response = await WorkflowAPI.createNode(workflowId, data);
        const newNode = response.data;

        // Replace temp node with real one
        removeNode(tempNode.id!);
        addNode(newNode);
        console.log('Node created successfully:', newNode.id);
        toast.success('Node added successfully');
        return newNode;
      } catch (err: any) {
        console.error('Failed to create node:', err);
        // Rollback optimistic update
        rollbackToSnapshot(snapshotId);
        setError(err);
        toast.error(extractErrorMessage(err, 'Failed to add node'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      graph,
      workflowId,
      addNode,
      removeNode,
      saveSnapshot,
      rollbackToSnapshot,
      setLoading,
      setError,
    ]
  );

  // Update a node (with optimistic update)
  const updateNodeData = useCallback(
    async (nodeId: number, data: Partial<UpdateNodeData>): Promise<WorkflowNode> => {
      if (!graph) {
        throw new Error('No workflow graph loaded. Please load the graph first.');
      }

      // Save snapshot for rollback
      const snapshotId = saveSnapshot('node', 'update');
      const oldNode = graph.nodes.find((n: WorkflowNode) => n.id === nodeId);

      if (!oldNode) {
        throw new Error(`Node with id ${nodeId} not found`);
      }

      // Optimistic update
      updateNode(nodeId, data);

      try {
        setLoading(true);
        setError(null);
        console.log(`Updating node ${nodeId}...`);
        const response = await WorkflowAPI.patchNode(workflowId, nodeId, data);
        const updatedNode = response.data;

        // Update with real data from server
        updateNode(nodeId, updatedNode);
        console.log('Node updated successfully');
        toast.success('Node updated successfully');
        return updatedNode;
      } catch (err: any) {
        console.error('Failed to update node:', err);
        // Rollback optimistic update
        rollbackToSnapshot(snapshotId);
        setError(err);
        toast.error(extractErrorMessage(err, 'Failed to update node'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [
      graph,
      workflowId,
      updateNode,
      saveSnapshot,
      rollbackToSnapshot,
      setLoading,
      setError,
    ]
  );

  // Remove a node (with optimistic update)
  const removeNodeData = useCallback(
    async (nodeId: number): Promise<void> => {
      if (!graph) {
        throw new Error('No workflow graph loaded. Please load the graph first.');
      }

      // Save snapshot for rollback
      const snapshotId = saveSnapshot('node', 'delete');

      // Optimistic update
      removeNode(nodeId);

      try {
        setLoading(true);
        setError(null);
        console.log(`Deleting node ${nodeId}...`);
        await WorkflowAPI.deleteNode(workflowId, nodeId);
        console.log('Node deleted successfully');
        toast.success('Node removed successfully');
      } catch (err: any) {
        console.error('Failed to delete node:', err);
        // Rollback optimistic update
        rollbackToSnapshot(snapshotId);
        setError(err);
        toast.error(extractErrorMessage(err, 'Failed to remove node'));
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [graph, workflowId, removeNode, saveSnapshot, rollbackToSnapshot, setLoading, setError]
  );

  // Batch operations on nodes
  const batchNodes = useCallback(
    async (operations: BatchNodeOperation): Promise<BatchNodeOperationResult> => {
      if (!graph) {
        throw new Error('No workflow graph loaded. Please load the graph first.');
      }

      // Save snapshot for rollback
      const snapshotId = saveSnapshot('graph', 'update');

      // Optimistic updates for batch operations
      if (operations.create) {
        operations.create.forEach((nodeData) => {
          const tempNode: WorkflowNode = {
            ...nodeData,
            id: generateTempId(),
            workflow_id: workflowId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          addNode(tempNode);
        });
      }

      if (operations.update) {
        operations.update.forEach(({ id, ...updateData }) => {
          updateNode(id, updateData);
        });
      }

      if (operations.delete) {
        operations.delete.forEach((id) => {
          removeNode(id);
        });
      }

      try {
        setLoading(true);
        setError(null);
        console.log('Executing batch node operations...');
        const result = await WorkflowAPI.batchNodes(workflowId, operations);

        // Refresh graph to get server state
        const refreshedGraph = await WorkflowAPI.getWorkflowGraph(workflowId);
        setGraph(refreshedGraph);

        console.log('Batch node operations completed successfully');
        toast.success(
          `Batch operations completed: ${result.created.length} created, ${result.updated.length} updated, ${result.deleted.length} deleted`
        );
        return result;
      } catch (err: any) {
        console.error('Failed to execute batch node operations:', err);
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
      addNode,
      updateNode,
      removeNode,
      saveSnapshot,
      rollbackToSnapshot,
      setGraph,
      setLoading,
      setError,
    ]
  );

  return {
    nodes: graph?.nodes || [],
    loading,
    error,
    addNode: addNodeData,
    updateNode: updateNodeData,
    removeNode: removeNodeData,
    batchNodes,
  };
};

