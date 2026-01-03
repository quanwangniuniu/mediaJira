/**
 * Workflow Graph State Management Store
 * Handles graph state with optimistic updates and rollback on API failure
 */

import { create } from "zustand";
import { WorkflowAPI } from "./api/workflowApi";
import type {
  WorkflowGraph,
  WorkflowNode,
  WorkflowConnection,
  WorkflowNodeCreate,
  WorkflowConnectionCreate,
  BatchNodeOperation,
  BatchConnectionOperation,
} from "@/types/workflow";

// ========================================
// State Interface
// ========================================

interface WorkflowGraphState {
  // Current graph data
  graph: WorkflowGraph | null;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  
  // Loading states
  loading: boolean;
  error: string | null;
  
  // Optimistic update tracking
  pendingOperations: Set<string>;
  
  // Snapshot for discard changes
  snapshot: {
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
  } | null;
  hasUnsavedChanges: boolean;
  
  // ========================================
  // Graph Operations
  // ========================================
  
  loadGraph: (workflowId: number) => Promise<void>;
  clearGraph: () => void;
  
  // ========================================
  // Node Operations (with optimistic updates)
  // ========================================
  
  addNode: (workflowId: number, nodeData: WorkflowNodeCreate) => Promise<WorkflowNode | null>;
  updateNode: (
    workflowId: number,
    nodeId: number,
    updates: Partial<WorkflowNodeCreate>
  ) => Promise<WorkflowNode | null>;
  removeNode: (workflowId: number, nodeId: number) => Promise<boolean>;
  
  // ========================================
  // Connection Operations (with optimistic updates)
  // ========================================
  
  addConnection: (
    workflowId: number,
    connectionData: WorkflowConnectionCreate
  ) => Promise<WorkflowConnection | null>;
  updateConnection: (
    workflowId: number,
    connectionId: number,
    updates: Partial<WorkflowConnectionCreate>
  ) => Promise<WorkflowConnection | null>;
  removeConnection: (workflowId: number, connectionId: number) => Promise<boolean>;
  
  // ========================================
  // Batch Operations
  // ========================================
  
  batchUpdateNodes: (
    workflowId: number,
    operations: BatchNodeOperation
  ) => Promise<boolean>;
  batchUpdateConnections: (
    workflowId: number,
    operations: BatchConnectionOperation
  ) => Promise<boolean>;
  
  // ========================================
  // Snapshot & Discard Changes
  // ========================================
  
  saveSnapshot: () => void;
  restoreSnapshot: () => void;
  markAsSaved: () => void;
  
  // ========================================
  // Utility Operations
  // ========================================
  
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

// ========================================
// Store Implementation
// ========================================

export const useWorkflowGraphStore = create<WorkflowGraphState>((set, get) => ({
  // Initial state
  graph: null,
  nodes: [],
  connections: [],
  loading: false,
  error: null,
  pendingOperations: new Set<string>(),
  snapshot: null,
  hasUnsavedChanges: false,

  // ========================================
  // Graph Operations
  // ========================================

  loadGraph: async (workflowId: number) => {
    set({ loading: true, error: null });
    try {
      const graph = await WorkflowAPI.getGraph(workflowId);
      
      // Backend already filters is_deleted=False, so we just use the data directly
      const nodes = graph.nodes || [];
      const connections = graph.connections || [];
      
      set({
        graph,
        nodes,
        connections,
        loading: false,
        error: null,
        // Save snapshot for discard changes
        snapshot: {
          nodes: JSON.parse(JSON.stringify(nodes)),
          connections: JSON.parse(JSON.stringify(connections)),
        },
        hasUnsavedChanges: false,
      });
    } catch (error: any) {
      const errorMessage = error?.response?.data?.detail || error?.message || "Failed to load graph";
      set({ loading: false, error: errorMessage });
      console.error("Failed to load workflow graph:", error);
    }
  },

  clearGraph: () => {
    set({
      graph: null,
      nodes: [],
      connections: [],
      error: null,
      pendingOperations: new Set<string>(),
    });
  },

  // ========================================
  // Node Operations (with optimistic updates)
  // ========================================

  addNode: async (workflowId: number, nodeData: WorkflowNodeCreate) => {
    const operationId = `add-node-${Date.now()}`;
    const { pendingOperations } = get();
    
    // Create temporary node for optimistic update
    const tempNode: WorkflowNode = {
      id: -Date.now(), // Temporary negative ID
      workflow_id: workflowId,
      node_type: nodeData.node_type,
      label: nodeData.label,
      data: nodeData.data || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic update: Add node immediately
    set((state) => ({
      nodes: [...state.nodes, tempNode],
      pendingOperations: new Set([...pendingOperations, operationId]),
      hasUnsavedChanges: true,
    }));

    try {
      // Make API call
      const createdNode = await WorkflowAPI.createNode(workflowId, nodeData);
      
      // Replace temporary node with real node from server
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          nodes: state.nodes.map((n) => (n.id === tempNode.id ? createdNode : n)),
          pendingOperations: newPending,
          error: null,
        };
      });
      
      return createdNode;
    } catch (error: any) {
      // Rollback: Remove the temporary node
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          nodes: state.nodes.filter((n) => n.id !== tempNode.id),
          pendingOperations: newPending,
          error: error?.response?.data?.detail || error?.message || "Failed to add node",
        };
      });
      
      console.error("Failed to add node:", error);
      return null;
    }
  },

  updateNode: async (
    workflowId: number,
    nodeId: number,
    updates: Partial<WorkflowNodeCreate>
  ) => {
    const operationId = `update-node-${nodeId}-${Date.now()}`;
    const { nodes, pendingOperations } = get();
    
    // Store original node for rollback
    const originalNode = nodes.find((n) => n.id === nodeId);
    if (!originalNode) {
      set({ error: "Node not found" });
      return null;
    }

    // Optimistic update: Update node immediately
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, ...updates, updated_at: new Date().toISOString() } : n
      ),
      pendingOperations: new Set([...pendingOperations, operationId]),
      hasUnsavedChanges: true,
    }));

    try {
      // Make API call
      const updatedNode = await WorkflowAPI.updateNode(workflowId, nodeId, updates);
      
      // Update with server response
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          nodes: state.nodes.map((n) => (n.id === nodeId ? updatedNode : n)),
          pendingOperations: newPending,
          error: null,
        };
      });
      
      return updatedNode;
    } catch (error: any) {
      // Rollback: Restore original node
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          nodes: state.nodes.map((n) => (n.id === nodeId ? originalNode : n)),
          pendingOperations: newPending,
          error: error?.response?.data?.detail || error?.message || "Failed to update node",
        };
      });
      
      console.error("Failed to update node:", error);
      return null;
    }
  },

  removeNode: async (workflowId: number, nodeId: number) => {
    const operationId = `remove-node-${nodeId}-${Date.now()}`;
    const { nodes, connections, pendingOperations } = get();
    
    // Store original data for rollback
    const originalNode = nodes.find((n) => n.id === nodeId);
    const relatedConnections = connections.filter(
      (c) => c.source_node_id === nodeId || c.target_node_id === nodeId
    );

    if (!originalNode) {
      set({ error: "Node not found" });
      return false;
    }

    // Optimistic update: Remove node and related connections immediately
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      connections: state.connections.filter(
        (c) => c.source_node_id !== nodeId && c.target_node_id !== nodeId
      ),
      pendingOperations: new Set([...pendingOperations, operationId]),
      hasUnsavedChanges: true,
    }));

    try {
      // Make API call
      await WorkflowAPI.deleteNode(workflowId, nodeId);
      
      // Confirm deletion
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          pendingOperations: newPending,
          error: null,
        };
      });
      
      return true;
    } catch (error: any) {
      // Rollback: Restore node and connections
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          nodes: [...state.nodes, originalNode],
          connections: [...state.connections, ...relatedConnections],
          pendingOperations: newPending,
          error: error?.response?.data?.detail || error?.message || "Failed to remove node",
        };
      });
      
      console.error("Failed to remove node:", error);
      return false;
    }
  },

  // ========================================
  // Connection Operations (with optimistic updates)
  // ========================================

  addConnection: async (workflowId: number, connectionData: WorkflowConnectionCreate) => {
    const operationId = `add-connection-${Date.now()}`;
    const { pendingOperations } = get();
    
    // Create temporary connection for optimistic update
    const tempConnection: WorkflowConnection = {
      id: -Date.now(), // Temporary negative ID
      workflow_id: workflowId,
      source_node_id: connectionData.source_node_id,
      target_node_id: connectionData.target_node_id,
      connection_type: connectionData.connection_type || "sequential",
      name: connectionData.name,
      condition_config: connectionData.condition_config,
      priority: connectionData.priority || 0,
      source_handle: connectionData.source_handle,
      target_handle: connectionData.target_handle,
      event_type: connectionData.event_type || "manual_transition",
      properties: connectionData.properties || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Optimistic update: Add connection immediately
    set((state) => ({
      connections: [...state.connections, tempConnection],
      pendingOperations: new Set([...pendingOperations, operationId]),
      hasUnsavedChanges: true,
    }));

    try {
      // Make API call
      const createdConnection = await WorkflowAPI.createConnection(workflowId, connectionData);
      
      // Replace temporary connection with real connection from server
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          connections: state.connections.map((c) =>
            c.id === tempConnection.id ? createdConnection : c
          ),
          pendingOperations: newPending,
          error: null,
        };
      });
      
      return createdConnection;
    } catch (error: any) {
      // Rollback: Remove the temporary connection
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          connections: state.connections.filter((c) => c.id !== tempConnection.id),
          pendingOperations: newPending,
          error: error?.response?.data?.detail || error?.message || "Failed to add connection",
        };
      });
      
      console.error("Failed to add connection:", error);
      return null;
    }
  },

  updateConnection: async (
    workflowId: number,
    connectionId: number,
    updates: Partial<WorkflowConnectionCreate>
  ) => {
    const operationId = `update-connection-${connectionId}-${Date.now()}`;
    const { connections, pendingOperations } = get();
    
    // Store original connection for rollback
    const originalConnection = connections.find((c) => c.id === connectionId);
    if (!originalConnection) {
      set({ error: "Connection not found" });
      return null;
    }

    // Optimistic update: Update connection immediately
    set((state) => ({
      connections: state.connections.map((c) =>
        c.id === connectionId ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
      ),
      pendingOperations: new Set([...pendingOperations, operationId]),
      hasUnsavedChanges: true,
    }));

    try {
      // Make API call
      const updatedConnection = await WorkflowAPI.updateConnection(
        workflowId,
        connectionId,
        updates
      );
      
      // Update with server response
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          connections: state.connections.map((c) =>
            c.id === connectionId ? updatedConnection : c
          ),
          pendingOperations: newPending,
          error: null,
        };
      });
      
      return updatedConnection;
    } catch (error: any) {
      // Rollback: Restore original connection
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          connections: state.connections.map((c) =>
            c.id === connectionId ? originalConnection : c
          ),
          pendingOperations: newPending,
          error:
            error?.response?.data?.detail || error?.message || "Failed to update connection",
        };
      });
      
      console.error("Failed to update connection:", error);
      return null;
    }
  },

  removeConnection: async (workflowId: number, connectionId: number) => {
    const operationId = `remove-connection-${connectionId}-${Date.now()}`;
    const { connections, pendingOperations } = get();
    
    // Store original connection for rollback
    const originalConnection = connections.find((c) => c.id === connectionId);
    if (!originalConnection) {
      set({ error: "Connection not found" });
      return false;
    }

    // Optimistic update: Remove connection immediately
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== connectionId),
      pendingOperations: new Set([...pendingOperations, operationId]),
      hasUnsavedChanges: true,
    }));

    try {
      // Make API call
      await WorkflowAPI.deleteConnection(workflowId, connectionId);
      
      // Confirm deletion
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          pendingOperations: newPending,
          error: null,
        };
      });
      
      return true;
    } catch (error: any) {
      // Rollback: Restore connection
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          connections: [...state.connections, originalConnection],
          pendingOperations: newPending,
          error: error?.response?.data?.detail || error?.message || "Failed to remove connection",
        };
      });
      
      console.error("Failed to remove connection:", error);
      return false;
    }
  },

  // ========================================
  // Batch Operations
  // ========================================

  batchUpdateNodes: async (workflowId: number, operations: BatchNodeOperation) => {
    const operationId = `batch-nodes-${Date.now()}`;
    const { nodes, pendingOperations } = get();
    
    // Store original state for rollback
    const originalNodes = [...nodes];

    // Optimistic update: Apply all operations immediately
    set((state) => {
      let newNodes = [...state.nodes];

      // Handle deletions
      if (operations.delete) {
        newNodes = newNodes.filter((n) => !operations.delete!.includes(n.id));
      }

      // Handle updates
      if (operations.update) {
        operations.update.forEach((update) => {
          const index = newNodes.findIndex((n) => n.id === update.id);
          if (index !== -1) {
            newNodes[index] = { ...newNodes[index], ...update };
          }
        });
      }

      // Handle creations (with temporary IDs)
      if (operations.create) {
        const tempNodes = operations.create.map((nodeData, idx) => ({
          id: -(Date.now() + idx),
          workflow_id: workflowId,
          node_type: nodeData.node_type,
          label: nodeData.label,
          data: nodeData.data || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        newNodes = [...newNodes, ...tempNodes];
      }

      return {
        nodes: newNodes,
        pendingOperations: new Set([...pendingOperations, operationId]),
      };
    });

    try {
      // Make API call
      const result = await WorkflowAPI.batchNodes(workflowId, operations);
      
      // Update with server response
      set((state) => {
        let newNodes = [...state.nodes];

        // Replace temporary nodes with created ones
        if (result.created && result.created.length > 0) {
          // Remove temp nodes
          newNodes = newNodes.filter((n) => n.id >= 0);
          // Add created nodes
          newNodes = [...newNodes, ...result.created];
        }

        // Update modified nodes
        if (result.updated && result.updated.length > 0) {
          result.updated.forEach((updatedNode) => {
            const index = newNodes.findIndex((n) => n.id === updatedNode.id);
            if (index !== -1) {
              newNodes[index] = updatedNode;
            }
          });
        }

        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);

        return {
          nodes: newNodes,
          pendingOperations: newPending,
          error: null,
        };
      });
      
      return true;
    } catch (error: any) {
      // Rollback: Restore original state
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          nodes: originalNodes,
          pendingOperations: newPending,
          error: error?.response?.data?.detail || error?.message || "Failed to batch update nodes",
        };
      });
      
      console.error("Failed to batch update nodes:", error);
      return false;
    }
  },

  batchUpdateConnections: async (
    workflowId: number,
    operations: BatchConnectionOperation
  ) => {
    const operationId = `batch-connections-${Date.now()}`;
    const { connections, pendingOperations } = get();
    
    // Store original state for rollback
    const originalConnections = [...connections];

    // Optimistic update: Apply all operations immediately
    set((state) => {
      let newConnections = [...state.connections];

      // Handle deletions
      if (operations.delete) {
        newConnections = newConnections.filter((c) => !operations.delete!.includes(c.id));
      }

      // Handle updates
      if (operations.update) {
        operations.update.forEach((update) => {
          const index = newConnections.findIndex((c) => c.id === update.id);
          if (index !== -1) {
            newConnections[index] = { ...newConnections[index], ...update };
          }
        });
      }

      // Handle creations (with temporary IDs)
      if (operations.create) {
        const tempConnections = operations.create.map((connData, idx) => ({
          id: -(Date.now() + idx),
          workflow_id: workflowId,
          source_node_id: connData.source_node_id,
          target_node_id: connData.target_node_id,
          connection_type: connData.connection_type || "sequential",
          condition_config: connData.condition_config,
          priority: connData.priority || 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }));
        newConnections = [...newConnections, ...tempConnections];
      }

      return {
        connections: newConnections,
        pendingOperations: new Set([...pendingOperations, operationId]),
      };
    });

    try {
      // Make API call
      const result = await WorkflowAPI.batchConnections(workflowId, operations);
      
      // Update with server response
      set((state) => {
        let newConnections = [...state.connections];

        // Replace temporary connections with created ones
        if (result.created && result.created.length > 0) {
          // Remove temp connections
          newConnections = newConnections.filter((c) => c.id >= 0);
          // Add created connections
          newConnections = [...newConnections, ...result.created];
        }

        // Update modified connections
        if (result.updated && result.updated.length > 0) {
          result.updated.forEach((updatedConnection) => {
            const index = newConnections.findIndex((c) => c.id === updatedConnection.id);
            if (index !== -1) {
              newConnections[index] = updatedConnection;
            }
          });
        }

        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);

        return {
          connections: newConnections,
          pendingOperations: newPending,
          error: null,
        };
      });
      
      return true;
    } catch (error: any) {
      // Rollback: Restore original state
      set((state) => {
        const newPending = new Set(state.pendingOperations);
        newPending.delete(operationId);
        
        return {
          connections: originalConnections,
          pendingOperations: newPending,
          error:
            error?.response?.data?.detail ||
            error?.message ||
            "Failed to batch update connections",
        };
      });
      
      console.error("Failed to batch update connections:", error);
      return false;
    }
  },

  // ========================================
  // Utility Operations
  // ========================================

  // ========================================
  // Snapshot & Discard Changes
  // ========================================
  
  saveSnapshot: () => {
    const { nodes, connections } = get();
    set({
      snapshot: {
        nodes: JSON.parse(JSON.stringify(nodes)),
        connections: JSON.parse(JSON.stringify(connections)),
      },
      hasUnsavedChanges: false,
    });
  },
  
  restoreSnapshot: () => {
    const { snapshot } = get();
    if (snapshot) {
      set({
        nodes: JSON.parse(JSON.stringify(snapshot.nodes)),
        connections: JSON.parse(JSON.stringify(snapshot.connections)),
        hasUnsavedChanges: false,
      });
    }
  },
  
  markAsSaved: () => {
    const { nodes, connections } = get();
    set({
      snapshot: {
        nodes: JSON.parse(JSON.stringify(nodes)),
        connections: JSON.parse(JSON.stringify(connections)),
      },
      hasUnsavedChanges: false,
    });
  },
  
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
}));
