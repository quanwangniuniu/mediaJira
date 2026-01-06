"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import ReactFlow, {
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  Connection,
  NodeMouseHandler,
  EdgeMouseHandler,
  Node,
  Edge,
  NodeChange,
  EdgeChange,
  OnConnectStartParams,
  OnConnectStart,
  OnConnect,
  OnNodesDelete,
  OnEdgesDelete,
} from "reactflow";
import "reactflow/dist/style.css";
import { useWorkflowGraph } from "@/hooks/useWorkflowGraph";
import type { Selection } from "./WorkflowEditor";
import CustomWorkflowNode from "./CustomWorkflowNode";
import { calculateOptimalHandles } from "@/lib/handleCalculation";
import toast from "react-hot-toast";

interface WorkflowCanvasProps {
  workflowId: number;
  selection: Selection;
  onSelectionChange: (selection: Selection) => void;
  refreshTrigger?: number;
  showEdgeLabels?: boolean;
}

const nodeTypes = {
  custom: CustomWorkflowNode,
};

export default function WorkflowCanvas({
  workflowId,
  selection,
  onSelectionChange,
  refreshTrigger = 0,
  showEdgeLabels = true,
}: WorkflowCanvasProps) {
  const { nodes: storeNodes, connections: storeConnections, loading, loadGraph, removeNode, removeConnection, updateNode, updateConnection } = useWorkflowGraph();

  useEffect(() => {
    if (workflowId) {
      loadGraph(workflowId);
    }
  }, [workflowId, loadGraph, refreshTrigger]);

  // Transform backend nodes to ReactFlow nodes
  const reactFlowNodes: Node[] = useMemo(() => {
    if (!storeNodes || storeNodes.length === 0) return [];
    
    return storeNodes.map((node) => ({
      id: String(node.id),
      type: "custom", // Use custom node type with handles
      position: node.data?.position || { x: 0, y: 0 },
      data: {
        label: node.label,
        backgroundColor: node.color || '#3b82f6',
        borderColor: node.color || '#3b82f6',
        color: '#ffffff',
        ...node.data,
      },
    }));
  }, [storeNodes]);

  // Transform backend connections to ReactFlow edges
  const reactFlowEdges: Edge[] = useMemo(() => {
    return storeConnections.map((conn) => {
      // Get source and target node labels for default name
      const sourceNode = storeNodes.find(n => n.id === conn.source_node_id);
      const targetNode = storeNodes.find(n => n.id === conn.target_node_id);
      const defaultName = sourceNode && targetNode 
        ? `${sourceNode.label} → ${targetNode.label}`
        : 'Connection';
      
      return {
        id: String(conn.id),
        source: String(conn.source_node_id),
        target: String(conn.target_node_id),
        sourceHandle: `${conn.source_handle || 'right'}-source`,
        targetHandle: `${conn.target_handle || 'left'}-target`,
        type: "smoothstep",
        label: showEdgeLabels ? (conn.name || defaultName) : undefined, // Show label based on toggle
        animated: conn.connection_type === "loop",
        reconnectable: true, // Enable reconnection for both source and target (boolean enables both)
      };
    });
  }, [storeConnections, storeNodes, showEdgeLabels]);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  
  // Track current workflow and initialization state
  const currentWorkflowRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true); // Track if this is the first load after mount/refresh

  // Initialize nodes and edges when workflow loads or changes
  useEffect(() => {
    const workflowChanged = currentWorkflowRef.current !== workflowId;
    
    if (workflowChanged || currentWorkflowRef.current === null || refreshTrigger > 0) {
      console.log(`🔄 Initializing workflow ${workflowId} (changed: ${workflowChanged}, refresh: ${refreshTrigger})`);
      
      // Mark as initial load if workflow changed or first time or refreshed
      isInitialLoadRef.current = true;
      currentWorkflowRef.current = workflowId;
    }
  }, [workflowId, refreshTrigger]);
  
  // Load nodes and edges from backend data (only on initial load or workflow change)
  useEffect(() => {
    if (isInitialLoadRef.current && reactFlowNodes.length > 0) {
      setNodes(reactFlowNodes);
      setEdges(reactFlowEdges);
      
      // Mark initial load as complete
      isInitialLoadRef.current = false;
    }
  }, [reactFlowNodes, reactFlowEdges, setNodes, setEdges]);

  // Custom handler for node changes that intercepts deletions
  // (Position updates are now handled by onNodeDragStop)
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Handle node deletions
      const removals = changes.filter((change) => change.type === "remove");
      
      if (removals.length > 0) {
        removals.forEach((change) => {
          if (change.type === "remove") {
            const nodeId = Number(change.id);
            removeNode(workflowId, nodeId);
          }
        });
      }
      
      // Apply all changes to ReactFlow state
      onNodesChange(changes);
    },
    [onNodesChange, removeNode, workflowId]
  );

  // Save node position when drag ends - more reliable than checking dragging flag
  const handleNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      // Safety check: ensure node exists
      if (!node || !node.id) {
        console.warn('Invalid node in dragStop:', node);
        return;
      }
      
      const nodeId = Number(node.id);
      
      // Check if node ID is valid
      if (isNaN(nodeId)) {
        console.warn('Invalid node ID:', node.id);
        return;
      }
      
      console.log(`💾 Node drag stopped - saving node ${nodeId} position:`, node.position);
      
      // Find the existing node to get its current data
      const existingNode = storeNodes.find(n => n.id === nodeId);
      
      if (!existingNode) {
        console.warn('Node not found in store:', nodeId);
        return;
      }
      
      // Merge position into existing data instead of overwriting
      updateNode(workflowId, nodeId, {
        data: { 
          ...(existingNode?.data || {}),
          position: node.position 
        }
      });
    },
    [workflowId, storeNodes, updateNode]
  );

  // Custom handler for edge changes that intercepts deletions
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      // Check if any of the changes are removals
      const removals = changes.filter((change) => change.type === "remove");
      
      if (removals.length > 0) {
        // Handle edge deletions via the store (which calls the API)
        removals.forEach((change) => {
          if (change.type === "remove") {
            const connectionId = Number(change.id);
            removeConnection(workflowId, connectionId);
          }
        });
      }
      
      // Apply all changes to ReactFlow state
      onEdgesChange(changes);
    },
    [onEdgesChange, removeConnection, workflowId]
  );

  // Intelligently update nodes when backend data changes (ONLY during runtime, not initial load)
  useEffect(() => {
    // Skip during initial load - let the initial load effect handle it
    if (isInitialLoadRef.current) {
      return;
    }
    
    setNodes((currentNodes) => {
      // If no current nodes, this shouldn't happen during runtime
      if (currentNodes.length === 0) {
        return reactFlowNodes;
      }
      
      const currentIds = new Set(currentNodes.map(n => n.id));
      const newIds = new Set(reactFlowNodes.map(n => n.id));
      
      // Check what changed
      const addedIds = reactFlowNodes.filter(n => !currentIds.has(n.id));
      const removedIds = currentNodes.filter(n => !newIds.has(n.id));
      const unchangedIds = currentNodes.filter(n => newIds.has(n.id));
      
      // Start with existing nodes that still exist, preserving their UI positions but updating properties
      const mergedNodes = unchangedIds.map((currentNode) => {
        const backendNode = reactFlowNodes.find(n => n.id === currentNode.id);
        if (backendNode) {
          // Keep current UI position and selected state (user might be dragging/selecting)
          return {
            ...backendNode,
            position: currentNode.position, // Keep UI position during runtime
            selected: currentNode.selected, // Preserve selected state
            data: {
              ...backendNode.data,
              position: currentNode.position,
            }
          };
        }
        return currentNode;
      });
      
      // Add new nodes with their backend positions
      addedIds.forEach(newNode => {
        mergedNodes.push(newNode);
      });
      
      return mergedNodes;
    });
  }, [reactFlowNodes, setNodes]);

  // Intelligently update edges when backend data changes (ONLY during runtime, not initial load)
  useEffect(() => {
    // Skip during initial load
    if (isInitialLoadRef.current) {
      return;
    }
    
    setEdges((currentEdges) => {
      // If no current edges, this shouldn't happen during runtime
      if (currentEdges.length === 0) {
        return reactFlowEdges;
      }
      
      const currentIds = new Set(currentEdges.map(e => e.id));
      const newIds = new Set(reactFlowEdges.map(e => e.id));
      
      // Check what changed
      const addedIds = reactFlowEdges.filter(e => !currentIds.has(e.id));
      const removedIds = currentEdges.filter(e => !newIds.has(e.id));
      const unchangedIds = currentEdges.filter(e => newIds.has(e.id));
      
      // Start with existing edges that still exist, update with backend data
      const mergedEdges = unchangedIds.map((currentEdge) => {
        const backendEdge = reactFlowEdges.find(e => e.id === currentEdge.id);
        if (backendEdge) {
          // Preserve selected state from current edge
          return {
            ...backendEdge,
            selected: currentEdge.selected, // Preserve selected state
          };
        }
        return currentEdge;
      });
      
      // Add new edges with their backend data
      addedIds.forEach(newEdge => {
        mergedEdges.push(newEdge);
      });
      
      return mergedEdges;
    });
  }, [reactFlowEdges, setEdges]);

  const onNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      // Update sidebar selection
      onSelectionChange({ type: "node", id: Number(node.id) });
      
      // Mark this node as selected for keyboard deletion
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: n.id === node.id, // Only this node is selected
        }))
      );
    },
    [onSelectionChange, setNodes]
  );

  const onEdgeClick: EdgeMouseHandler = useCallback(
    (event, edge) => {
      // Update sidebar selection
      onSelectionChange({ type: "connection", id: Number(edge.id) });
      
      // Mark this edge as selected for keyboard deletion
      setEdges((eds) =>
        eds.map((e) => ({
          ...e,
          selected: e.id === edge.id, // Only this edge is selected
        }))
      );
      
      // Deselect all nodes
      setNodes((nds) =>
        nds.map((n) => ({
          ...n,
          selected: false,
        }))
      );
    },
    [onSelectionChange, setEdges, setNodes]
  );

  const onPaneClick = useCallback(() => {
    // Clear selection when clicking on empty space
    onSelectionChange({ type: "empty", id: null });
    
    // Deselect all nodes and edges
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: false,
      }))
    );
    setEdges((eds) =>
      eds.map((e) => ({
        ...e,
        selected: false,
      }))
    );
  }, [onSelectionChange, setNodes, setEdges]);

  // Simple onConnect for new connections (not used for reconnection)
  const onConnect: OnConnect = useCallback(
    (connection: Connection) => {
      console.log("ℹ️ New connection attempt - use 'Add connection' button instead");
    },
    []
  );

  // Handle edge reconnection (BOTH source and target via ReactFlow's native onReconnect)
  const onReconnect = useCallback(
    async (oldEdge: Edge, newConnection: Connection) => {
      const connectionId = Number(oldEdge.id);
      
      // Determine what changed: check both node and handle separately
      const sourceNodeChanged = oldEdge.source !== newConnection.source;
      const sourceHandleChanged = oldEdge.sourceHandle !== newConnection.sourceHandle;
      const targetNodeChanged = oldEdge.target !== newConnection.target;
      const targetHandleChanged = oldEdge.targetHandle !== newConnection.targetHandle;
      
      const sourceChanged = sourceNodeChanged || sourceHandleChanged;
      const targetChanged = targetNodeChanged || targetHandleChanged;
      
      // Store old values for rollback
      const oldSourceHandle = oldEdge.sourceHandle;
      const oldTargetHandle = oldEdge.targetHandle;
      const oldSource = oldEdge.source;
      const oldTarget = oldEdge.target;
      
      console.log(`🔄 Reconnecting edge ${connectionId}:`, {
        sourceChanged,
        targetChanged,
        sourceNodeChanged,
        sourceHandleChanged,
        targetNodeChanged,
        targetHandleChanged,
        oldEdge: { source: oldSource, sourceHandle: oldSourceHandle, target: oldTarget, targetHandle: oldTargetHandle },
        newConnection: { source: newConnection.source, sourceHandle: newConnection.sourceHandle, target: newConnection.target, targetHandle: newConnection.targetHandle },
      });
      
      // Optimistic update: Update edge immediately in UI, keeping ALL properties
      setEdges((eds) =>
        eds.map((edge) =>
          edge.id === oldEdge.id
            ? {
                ...edge, // Keep ALL existing properties
                source: newConnection.source || edge.source,
                target: newConnection.target || edge.target,
                sourceHandle: newConnection.sourceHandle || edge.sourceHandle,
                targetHandle: newConnection.targetHandle || edge.targetHandle,
              }
            : edge
        )
      );
      
      try {
        // Prepare update data - update what changed
        // Strip the -source/-target suffix from handle IDs for backend
        const updateData: any = {};
        
        // Update source if node or handle changed
        if (sourceChanged) {
          if (sourceNodeChanged && newConnection.source) {
          updateData.source_node_id = Number(newConnection.source);
          }
          if (sourceHandleChanged && newConnection.sourceHandle) {
          // Extract base position (e.g., "top-source" -> "top")
            const baseHandle = newConnection.sourceHandle.replace('-source', '').replace('-target', '');
            updateData.source_handle = baseHandle;
          } else if (sourceNodeChanged && newConnection.sourceHandle) {
            // If only node changed but we have handle info, include it
            const baseHandle = newConnection.sourceHandle.replace('-source', '').replace('-target', '');
          updateData.source_handle = baseHandle;
          }
        }
        
        // Update target if node or handle changed
        if (targetChanged) {
          if (targetNodeChanged && newConnection.target) {
          updateData.target_node_id = Number(newConnection.target);
          }
          if (targetHandleChanged && newConnection.targetHandle) {
          // Extract base position (e.g., "left-target" -> "left")
            const baseHandle = newConnection.targetHandle.replace('-source', '').replace('-target', '');
            updateData.target_handle = baseHandle;
          } else if (targetNodeChanged && newConnection.targetHandle) {
            // If only node changed but we have handle info, include it
            const baseHandle = newConnection.targetHandle.replace('-source', '').replace('-target', '');
          updateData.target_handle = baseHandle;
          }
        }
        
        console.log("📤 Sending update to backend:", updateData);
        
        // Update the connection in backend
        await updateConnection(workflowId, connectionId, updateData);
        
        console.log("✓ Edge reconnected successfully");
      } catch (error) {
        console.error("✗ Failed to reconnect edge:", error);
        
        // Rollback: Revert to old connection, keeping ALL properties
        setEdges((eds) =>
          eds.map((edge) =>
            edge.id === oldEdge.id
              ? {
                  ...edge,
                  source: oldSource,
                  target: oldTarget,
                  sourceHandle: oldSourceHandle,
                  targetHandle: oldTargetHandle,
                }
              : edge
          )
        );
      }
    },
    [workflowId, updateConnection, setEdges]
  );

  // When reconnection starts
  const onReconnectStart = useCallback(
    (event: any, edge: Edge, handleType: 'source' | 'target') => {
      console.log(`Started reconnecting ${handleType} of edge ${edge.id}`);
    },
    []
  );

  // When reconnection ends
  const onReconnectEnd = useCallback(
    (event: any, edge: Edge, handleType: 'source' | 'target') => {
      console.log(`🏁 Finished reconnecting ${handleType} of edge ${edge.id}`);
    },
    []
  );

  // Simple onConnectStart for logging
  const onConnectStart: OnConnectStart = useCallback(
    (event, params: OnConnectStartParams) => {
      console.log("🔗 Connect start:", params);
    },
    []
  );

  // Handle keyboard delete for nodes
  const onNodesDelete: OnNodesDelete = useCallback(
    (deletedNodes: Node[]) => {
      deletedNodes.forEach((node) => {
        const nodeId = Number(node.id);
        const storeNode = storeNodes.find(n => n.id === nodeId);
        
        // Prevent deletion of START node
        if (storeNode?.node_type === "start") {
          toast.error("START node cannot be deleted (Entry point)");
          // Restore the node
          setNodes((nds) => {
            if (!nds.find(n => n.id === node.id)) {
              return [...nds, node];
            }
            return nds;
          });
          return;
        }

        // Delete the node from backend
        console.log(`🗑️ Deleting node ${nodeId} via keyboard`);
        removeNode(workflowId, nodeId);
      });
    },
    [workflowId, removeNode, storeNodes, setNodes]
  );

  // Handle keyboard delete for edges
  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deletedEdges: Edge[]) => {
      deletedEdges.forEach((edge) => {
        const connectionId = Number(edge.id);
        console.log(`🗑️ Deleting connection ${connectionId} via keyboard`);
        removeConnection(workflowId, connectionId);
      });
    },
    [workflowId, removeConnection]
  );

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-gray-600">Loading workflow diagram...</div>
      </div>
    );
  }

  if (!storeNodes) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-gray-600">No workflow data</div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="text-center text-gray-500">
          <p className="text-lg font-medium mb-2">No nodes yet</p>
          <p className="text-sm">Add nodes to build your workflow diagram</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full" style={{ minHeight: "400px" }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onNodeDragStop={handleNodeDragStop}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        reconnectRadius={20}
        snapToGrid={true}
        snapGrid={[15, 15]}
        connectionLineStyle={{ stroke: '#3b82f6', strokeWidth: 2 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: false,
          reconnectable: true,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
      </ReactFlow>
    </div>
  );
}
