'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import DecisionTree from '@/components/decisions/DecisionTree';
import { DecisionAPI } from '@/lib/api/decisionApi';
import type {
  DecisionGraphEdge,
  DecisionGraphNode,
  DecisionGraphResponse,
} from '@/types/decision';

export interface DecisionLinkEditorProps {
  projectId: number | null;
  selfSeq?: number | null;
  onSaved?: () => void;
  onClose: () => void;
  isActive?: boolean;
  onEditDecision?: (node: DecisionGraphNode) => void;
  onCreateDecision?: () => void;
  onDelete?: (node: DecisionGraphNode) => void;
  canReview?: boolean;
  canDelete?: boolean;
  autoFocusToday?: boolean;
  focusDateKey?: string | null;
  variant?: 'card' | 'inline';
}

function connectedSeqsFromEdges(
  edges: DecisionGraphEdge[],
  idToNode: Map<number, DecisionGraphResponse['nodes'][number]>
): Map<number, number[]> {
  const byNode = new Map<number, Set<number>>();
  edges.forEach((e) => {
    const fromNode = idToNode.get(e.from);
    const toNode = idToNode.get(e.to);
    if (fromNode?.projectSeq != null && toNode?.projectSeq != null) {
      if (!byNode.has(e.from)) byNode.set(e.from, new Set());
      byNode.get(e.from)!.add(toNode.projectSeq);
      if (!byNode.has(e.to)) byNode.set(e.to, new Set());
      byNode.get(e.to)!.add(fromNode.projectSeq);
    }
  });
  const result = new Map<number, number[]>();
  byNode.forEach((set, nodeId) => {
    result.set(nodeId, Array.from(set).sort((a, b) => a - b));
  });
  return result;
}

function edgesEqual(a: DecisionGraphEdge[], b: DecisionGraphEdge[]): boolean {
  if (a.length !== b.length) return false;
  const norm = (e: DecisionGraphEdge) => `${e.from},${e.to}`;
  const setA = new Set(a.map(norm));
  const setB = new Set(b.map(norm));
  if (setA.size !== setB.size) return false;
  for (const key of setA) if (!setB.has(key)) return false;
  return true;
}

const DecisionLinkEditor = ({
  projectId,
  selfSeq,
  onSaved,
  onClose,
  isActive = true,
  onEditDecision,
  onCreateDecision,
  onDelete,
  canReview,
  canDelete,
  autoFocusToday,
  focusDateKey,
  variant = 'card',
}: DecisionLinkEditorProps) => {
  const [graph, setGraph] = useState<DecisionGraphResponse>({ nodes: [], edges: [] });
  const [initialEdges, setInitialEdges] = useState<DecisionGraphEdge[]>([]);
  const [graphLoading, setGraphLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const idToNode = useMemo(() => {
    const map = new Map<number, DecisionGraphResponse['nodes'][number]>();
    graph.nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [graph.nodes]);

  const hasUnsavedChanges = useMemo(
    () => !edgesEqual(graph.edges, initialEdges),
    [graph.edges, initialEdges]
  );

  const handleCreateLink = useCallback(
    (fromId: number, toId: number) => {
      if (!projectId) return;
      const fromNode = idToNode.get(fromId);
      const toNode = idToNode.get(toId);
      if (!fromNode?.projectSeq || !toNode?.projectSeq) {
        toast.error('Seq unavailable for linking.');
        return;
      }
      if (fromId === toId) {
        toast.error('Cannot link a decision to itself.');
        return;
      }
      const fromSeq = fromNode.projectSeq;
      const toSeq = toNode.projectSeq;
      const newEdge =
        fromSeq <= toSeq ? { from: fromId, to: toId } : { from: toId, to: fromId };
      setGraph((prev) => ({
        ...prev,
        edges: prev.edges.some(
          (e) =>
            (e.from === newEdge.from && e.to === newEdge.to) ||
            (e.from === newEdge.to && e.to === newEdge.from)
        )
          ? prev.edges
          : [...prev.edges, newEdge],
      }));
    },
    [projectId, idToNode]
  );

  const handleRemoveLink = useCallback((fromId: number, toId: number) => {
    setGraph((prev) => ({
      ...prev,
      edges: prev.edges.filter(
        (e) =>
          !(e.from === fromId && e.to === toId) && !(e.from === toId && e.to === fromId)
      ),
    }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!projectId || !hasUnsavedChanges) return;
    const currentByNode = connectedSeqsFromEdges(graph.edges, idToNode);
    const initialByNode = connectedSeqsFromEdges(initialEdges, idToNode);
    const updates: { decisionId: number; connectedSeqs: number[] }[] = [];
    graph.nodes.forEach((node) => {
      const current = currentByNode.get(node.id) ?? [];
      const initial = initialByNode.get(node.id) ?? [];
      const setCurrent = new Set(current);
      const setInitial = new Set(initial);
      if (setCurrent.size !== setInitial.size || current.some((s) => !setInitial.has(s))) {
        updates.push({ decisionId: node.id, connectedSeqs: current });
      }
    });
    if (updates.length === 0) {
      setInitialEdges(graph.edges);
      return;
    }
    setSaving(true);
    try {
      await Promise.all(
        updates.map((u) =>
          DecisionAPI.updateConnections(u.decisionId, u.connectedSeqs, projectId)
        )
      );
      setInitialEdges(graph.edges);
      toast.success('Links saved.');
      onSaved?.();
    } catch (err: any) {
      console.error('Failed to save links:', err);
      toast.error(err?.response?.data?.detail || 'Failed to save links.');
    } finally {
      setSaving(false);
    }
  }, [projectId, hasUnsavedChanges, graph, initialEdges, idToNode, onSaved]);

  const handleCancel = useCallback(() => {
    setGraph((prev) => ({ ...prev, edges: initialEdges }));
  }, [initialEdges]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges && !window.confirm('You have unsaved link changes. Close anyway?')) {
      return;
    }
    onClose();
  }, [hasUnsavedChanges, onClose]);

  useEffect(() => {
    if (!isActive || !projectId) return;
    let mounted = true;
    setGraphLoading(true);
    DecisionAPI.getDecisionGraph(projectId)
      .then((data) => {
        if (!mounted) return;
        setGraph(data);
        setInitialEdges(data.edges);
        setGraphLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load decision graph:', err);
        if (!mounted) return;
        setGraph({ nodes: [], edges: [] });
        setInitialEdges([]);
        setGraphLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isActive, projectId]);

  if (!isActive) return null;

  const content = (
    <>
      {!projectId ? (
        <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-6 text-sm text-amber-800">
          Project is required to edit links.
        </div>
      ) : graphLoading ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
          Loading decision graph...
        </div>
      ) : (
        <DecisionTree
          nodes={graph.nodes}
          edges={graph.edges}
          projectId={projectId}
          focusSeq={selfSeq ?? undefined}
          linkingEnabled
          linkingDisabled={saving}
          onCreateLink={handleCreateLink}
          onRemoveLink={handleRemoveLink}
          onEditDecision={onEditDecision}
          onCreateDecision={onCreateDecision}
          onDelete={onDelete}
          canReview={canReview}
          canDelete={canDelete}
          autoFocusToday={autoFocusToday}
          focusDateKey={focusDateKey ?? undefined}
        />
      )}
      {saving && <p className="text-xs text-gray-500">Saving...</p>}
    </>
  );

  const footer = (
    <div
      className={
        variant === 'card'
          ? 'flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4'
          : 'flex items-center justify-end gap-2 pt-2'
      }
    >
      {hasUnsavedChanges && (
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300"
          disabled={saving}
        >
          Cancel
        </button>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !hasUnsavedChanges}
        className="rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
      <button
        type="button"
        onClick={handleClose}
        className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300"
        disabled={saving}
      >
        Close
      </button>
    </div>
  );

  if (variant === 'inline') {
    return (
      <div className="space-y-3">
        {content}
        {footer}
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl">
      <div className="border-b border-gray-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Link Decisions</h2>
      </div>
      <div className="space-y-4 px-6 py-5">
        <p className="text-xs text-gray-600">
          Drag to link, click a line to unlink. Click Save to apply all changes.
        </p>
        {content}
      </div>
      {footer}
    </div>
  );
};

export default DecisionLinkEditor;
