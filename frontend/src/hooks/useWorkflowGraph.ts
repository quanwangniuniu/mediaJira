import { useWorkflowGraphStore } from "@/lib/workflowGraphStore";

export const useWorkflowGraph = () => {
  const store = useWorkflowGraphStore();
  return {
    graph: store.graph,
    nodes: store.nodes,
    connections: store.connections,
    loading: store.loading,
    error: store.error,
    hasPendingOperations: store.pendingOperations.size > 0,
    hasUnsavedChanges: store.hasUnsavedChanges,
    loadGraph: store.loadGraph,
    clearGraph: store.clearGraph,
    addNode: store.addNode,
    updateNode: store.updateNode,
    removeNode: store.removeNode,
    addConnection: store.addConnection,
    updateConnection: store.updateConnection,
    removeConnection: store.removeConnection,
    batchUpdateNodes: store.batchUpdateNodes,
    batchUpdateConnections: store.batchUpdateConnections,
    saveSnapshot: store.saveSnapshot,
    restoreSnapshot: store.restoreSnapshot,
    markAsSaved: store.markAsSaved,
    setLoading: store.setLoading,
    setError: store.setError,
  };
};

