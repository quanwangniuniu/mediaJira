import { create } from 'zustand';
import {
  Workflow,
  WorkflowNode,
  WorkflowConnection,
  WorkflowGraph,
  GraphValidationResult,
} from '@/types/workflow';

// Operation history entry for optimistic updates and rollback
interface OperationHistoryEntry {
  id: string;
  type: 'workflow' | 'node' | 'connection' | 'graph';
  operation: 'create' | 'update' | 'delete';
  timestamp: number;
  snapshot: {
    workflows?: Workflow[];
    graph?: WorkflowGraph;
    validationResult?: GraphValidationResult;
  };
}

interface WorkflowStore {
  // State
  workflows: Workflow[];
  currentWorkflow: Workflow | null;
  graph: WorkflowGraph | null;
  validationResult: GraphValidationResult | null;
  loading: boolean;
  error: any;
  operationHistory: OperationHistoryEntry[];

  // Basic Setters
  setWorkflows: (workflows: Workflow[]) => void;
  setCurrentWorkflow: (workflow: Workflow | null) => void;
  setGraph: (graph: WorkflowGraph | null) => void;
  setValidationResult: (result: GraphValidationResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: any) => void;

  // Workflow Actions
  addWorkflow: (workflow: Workflow) => void;
  updateWorkflow: (workflowId: number, updatedData: Partial<Workflow>) => void;
  removeWorkflow: (workflowId: number) => void;

  // Node Actions
  addNode: (node: WorkflowNode) => void;
  updateNode: (nodeId: number, updatedData: Partial<WorkflowNode>) => void;
  removeNode: (nodeId: number) => void;

  // Connection Actions
  addConnection: (connection: WorkflowConnection) => void;
  updateConnection: (connectionId: number, updatedData: Partial<WorkflowConnection>) => void;
  removeConnection: (connectionId: number) => void;

  // Graph Actions (batch operations on graph)
  updateGraph: (graph: WorkflowGraph) => void;

  // Optimistic Update Support
  saveSnapshot: (type: OperationHistoryEntry['type'], operation: OperationHistoryEntry['operation']) => string;
  rollbackToSnapshot: (snapshotId: string) => boolean;
  clearHistory: () => void;

  // Utility Actions
  clearCurrentWorkflow: () => void;
  clearGraph: () => void;
  clearValidationResult: () => void;
  clearError: () => void;
}

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  // Initial State
  workflows: [],
  currentWorkflow: null,
  graph: null,
  validationResult: null,
  loading: false,
  error: null,
  operationHistory: [],

  // Basic Setters
  setWorkflows: (workflows) => set({ workflows }),
  setCurrentWorkflow: (workflow) => set({ currentWorkflow: workflow }),
  setGraph: (graph) => set({ graph }),
  setValidationResult: (result) => set({ validationResult: result }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // Workflow Actions
  addWorkflow: (workflow) => {
    set((state) => ({
      workflows: [workflow, ...state.workflows],
    }));
  },

  updateWorkflow: (workflowId, updatedData) => {
    set((state) => ({
      workflows: state.workflows.map((wf) =>
        wf.id === workflowId ? { ...wf, ...updatedData } : wf
      ),
      currentWorkflow:
        state.currentWorkflow && state.currentWorkflow.id === workflowId
          ? { ...state.currentWorkflow, ...updatedData }
          : state.currentWorkflow,
      // Also update workflow in graph if it matches
      graph:
        state.graph && state.graph.workflow.id === workflowId
          ? {
              ...state.graph,
              workflow: { ...state.graph.workflow, ...updatedData },
            }
          : state.graph,
    }));
  },

  removeWorkflow: (workflowId) => {
    set((state) => ({
      workflows: state.workflows.filter((wf) => wf.id !== workflowId),
      currentWorkflow:
        state.currentWorkflow?.id === workflowId ? null : state.currentWorkflow,
      graph: state.graph?.workflow.id === workflowId ? null : state.graph,
    }));
  },

  // Node Actions
  addNode: (node) => {
    set((state) => {
      if (!state.graph) return state;

      return {
        graph: {
          ...state.graph,
          nodes: [...state.graph.nodes, node],
        },
      };
    });
  },

  updateNode: (nodeId, updatedData) => {
    set((state) => {
      if (!state.graph) return state;

      return {
        graph: {
          ...state.graph,
          nodes: state.graph.nodes.map((node) =>
            node.id === nodeId ? { ...node, ...updatedData } : node
          ),
        },
      };
    });
  },

  removeNode: (nodeId) => {
    set((state) => {
      if (!state.graph) return state;

      // Also remove connections that reference this node
      const updatedConnections = state.graph.connections.filter(
        (conn) =>
          conn.source_node_id !== nodeId && conn.target_node_id !== nodeId
      );

      return {
        graph: {
          ...state.graph,
          nodes: state.graph.nodes.filter((node) => node.id !== nodeId),
          connections: updatedConnections,
        },
      };
    });
  },

  // Connection Actions
  addConnection: (connection) => {
    set((state) => {
      if (!state.graph) return state;

      return {
        graph: {
          ...state.graph,
          connections: [...state.graph.connections, connection],
        },
      };
    });
  },

  updateConnection: (connectionId, updatedData) => {
    set((state) => {
      if (!state.graph) return state;

      return {
        graph: {
          ...state.graph,
          connections: state.graph.connections.map((conn) =>
            conn.id === connectionId ? { ...conn, ...updatedData } : conn
          ),
        },
      };
    });
  },

  removeConnection: (connectionId) => {
    set((state) => {
      if (!state.graph) return state;

      return {
        graph: {
          ...state.graph,
          connections: state.graph.connections.filter(
            (conn) => conn.id !== connectionId
          ),
        },
      };
    });
  },

  // Graph Actions
  updateGraph: (graph) => {
    set({ graph });
  },

  // Optimistic Update Support
  saveSnapshot: (type, operation) => {
    const snapshotId = `${type}-${operation}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    const state = get();

    const snapshot: OperationHistoryEntry['snapshot'] = {};

    if (type === 'workflow' || type === 'graph') {
      snapshot.workflows = [...state.workflows];
      if (state.graph) {
        snapshot.graph = {
          workflow: { ...state.graph.workflow },
          nodes: state.graph.nodes.map((n) => ({ ...n })),
          connections: state.graph.connections.map((c) => ({ ...c })),
        };
      }
    }

    if (type === 'graph') {
      if (state.validationResult) {
        snapshot.validationResult = {
          is_valid: state.validationResult.is_valid,
          errors: [...state.validationResult.errors],
          warnings: [...state.validationResult.warnings],
        };
      }
    }

    const entry: OperationHistoryEntry = {
      id: snapshotId,
      type,
      operation,
      timestamp: Date.now(),
      snapshot,
    };

    // Add entry and keep only last 10 snapshots to avoid memory issues
    set((state) => ({
      operationHistory: [...state.operationHistory, entry].slice(-10),
    }));

    return snapshotId;
  },

  rollbackToSnapshot: (snapshotId) => {
    const state = get();
    const snapshotIndex = state.operationHistory.findIndex(
      (entry) => entry.id === snapshotId
    );

    if (snapshotIndex === -1) {
      return false;
    }

    const snapshot = state.operationHistory[snapshotIndex].snapshot;

    // Merge all state updates into a single set call
    set((currentState) => ({
      ...(snapshot.workflows && { workflows: snapshot.workflows }),
      ...(snapshot.graph && { graph: snapshot.graph }),
      ...(snapshot.validationResult && { validationResult: snapshot.validationResult }),
      // Remove this snapshot and all newer ones from history
      operationHistory: currentState.operationHistory.slice(0, snapshotIndex),
    }));

    return true;
  },

  clearHistory: () => {
    set({ operationHistory: [] });
  },

  // Utility Actions
  clearCurrentWorkflow: () => {
    set({ currentWorkflow: null, graph: null, validationResult: null });
  },

  clearGraph: () => {
    set({ graph: null, validationResult: null });
  },

  clearValidationResult: () => {
    set({ validationResult: null });
  },

  clearError: () => {
    set({ error: null });
  },
}));

