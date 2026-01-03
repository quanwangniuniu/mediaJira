"use client";

import type { Selection } from "./WorkflowEditor";
import NodeEditor from "./NodeEditor";
import ConnectionEditor from "./ConnectionEditor";
import WorkflowEmptyState from "./WorkflowEmptyState";

interface WorkflowSidebarProps {
  selection: Selection;
  workflowId: number;
}

export default function WorkflowSidebar({ selection, workflowId }: WorkflowSidebarProps) {
  return (
    <div className="w-96 border-l border-gray-200 bg-white overflow-y-auto">
      {selection.type === "node" && selection.id !== null && (
        <NodeEditor nodeId={selection.id} workflowId={workflowId} />
      )}
      {selection.type === "connection" && selection.id !== null && (
        <ConnectionEditor connectionId={selection.id} workflowId={workflowId} />
      )}
      {selection.type === "empty" && <WorkflowEmptyState />}
    </div>
  );
}

