'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import DecisionTree from '@/components/decisions/DecisionTree';
import Modal from '@/components/ui/Modal';
import { DecisionAPI } from '@/lib/api/decisionApi';
import type {
  DecisionConnectionItem,
  DecisionConnectionsResponse,
  DecisionGraphResponse,
} from '@/types/decision';

interface DecisionLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  decisionId: number;
  projectId?: number | null;
  selfSeq?: number | null;
  onSaved?: () => void;
}

const formatChipLabel = (item: DecisionConnectionItem) => {
  const title = item.title ? item.title.trim() : '';
  if (!title) return `#${item.project_seq}`;
  return `#${item.project_seq} ${title}`;
};

const DecisionLinkModal = ({
  isOpen,
  onClose,
  decisionId,
  projectId,
  selfSeq,
  onSaved,
}: DecisionLinkModalProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inputSeq, setInputSeq] = useState('');
  const [graph, setGraph] = useState<DecisionGraphResponse>({ nodes: [], edges: [] });
  const [graphLoading, setGraphLoading] = useState(false);
  const [selectedBySeq, setSelectedBySeq] = useState<Record<number, DecisionConnectionItem>>({});

  const selectedSeqs = useMemo(
    () => Object.keys(selectedBySeq).map((seq) => Number(seq)),
    [selectedBySeq]
  );

  const seqLookup = useMemo(() => {
    const map = new Map<number, string | null>();
    graph.nodes.forEach((node) => {
      if (node.projectSeq) {
        map.set(node.projectSeq, node.title || null);
      }
    });
    return map;
  }, [graph.nodes]);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    DecisionAPI.getConnections(decisionId, projectId)
      .then((data: DecisionConnectionsResponse) => {
        if (!mounted) return;
        const next: Record<number, DecisionConnectionItem> = {};
        data.connected.forEach((item) => {
          next[item.project_seq] = item;
        });
        setSelectedBySeq(next);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load connections:', err);
        if (!mounted) return;
        setError('Failed to load connections.');
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen, decisionId, projectId]);

  useEffect(() => {
    if (!isOpen || !projectId) return;
    let mounted = true;
    setGraphLoading(true);
    DecisionAPI.getDecisionGraph(projectId)
      .then((data) => {
        if (!mounted) return;
        setGraph(data);
        setGraphLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load decision graph:', err);
        if (!mounted) return;
        setGraph({ nodes: [], edges: [] });
        setGraphLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [isOpen, projectId]);

  const handleAddSeq = () => {
    setError(null);
    const parsed = Number.parseInt(inputSeq, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid positive seq.');
      return;
    }
    if (selfSeq && parsed === selfSeq) {
      setError('Cannot link a decision to itself.');
      return;
    }
    if (selectedBySeq[parsed]) {
      toast('Decision already linked.');
      return;
    }
    setSelectedBySeq((prev) => ({
      ...prev,
      [parsed]: {
        id: -parsed,
        project_seq: parsed,
        title: seqLookup.get(parsed) ?? null,
      },
    }));
    setInputSeq('');
  };

  const handleAddDecision = (decision: DecisionGraphResponse['nodes'][number]) => {
    if (!decision.projectSeq) return;
    if (selfSeq && decision.projectSeq === selfSeq) {
      setError('Cannot link a decision to itself.');
      return;
    }
    if (selectedBySeq[decision.projectSeq]) {
      toast('Decision already linked.');
      return;
    }
    setSelectedBySeq((prev) => ({
      ...prev,
      [decision.projectSeq as number]: {
        id: decision.id,
        project_seq: decision.projectSeq as number,
        title: decision.title || null,
      },
    }));
  };

  const handleRemoveSeq = (seq: number) => {
    setSelectedBySeq((prev) => {
      const next = { ...prev };
      delete next[seq];
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await DecisionAPI.updateConnections(decisionId, selectedSeqs, projectId);
      setSaving(false);
      onClose();
      onSaved?.();
    } catch (err: any) {
      console.error('Failed to update connections:', err);
      const message = err?.response?.data?.detail;
      setError(message || 'Failed to save connections.');
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Link Decisions</h2>
        </div>
        <div className="space-y-6 px-6 py-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-900">Connected Decisions</h3>
              {loading ? (
                <span className="text-xs text-gray-400">Loading...</span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              {selectedSeqs.length === 0 ? (
                <span className="text-xs text-gray-400">No connections yet.</span>
              ) : (
                selectedSeqs
                  .sort((a, b) => a - b)
                  .map((seq) => {
                    const item = selectedBySeq[seq];
                    const label = item ? formatChipLabel(item) : `#${seq}`;
                    return (
                      <span
                        key={`seq-${seq}`}
                        className="inline-flex max-w-full items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs text-gray-700"
                      >
                        <span className="max-w-[220px] truncate">{label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSeq(seq)}
                          className="text-gray-400 hover:text-gray-600"
                          aria-label={`Remove ${label}`}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-sm font-semibold text-gray-900">Decision Tree</h3>
              <span className="text-xs text-gray-400">
                Direction is inferred automatically based on decision number.
              </span>
            </div>
            {graphLoading ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-sm text-gray-500">
                Loading decision graph...
              </div>
            ) : (
              <DecisionTree
                nodes={graph.nodes}
                edges={graph.edges}
                projectId={projectId}
                mode="selector"
                onAddDecision={handleAddDecision}
                selectedSeqs={selectedSeqs}
                focusSeq={selfSeq ?? undefined}
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-700">Add by seq</label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={inputSeq}
                onChange={(event) => setInputSeq(event.target.value)}
                placeholder="e.g. 12"
                className="w-32 rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
                inputMode="numeric"
              />
              <button
                type="button"
                onClick={handleAddSeq}
                className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-gray-400">
              Use this if you know the decision number.
            </p>
            {error ? <p className="text-xs text-red-600">{error}</p> : null}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DecisionLinkModal;
