'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Modal from '@/components/ui/Modal';
import SignalsPanel from '@/components/decisions/SignalsPanel';
import DecisionWorkspaceEditor from '@/components/decisions/DecisionWorkspaceEditor';
import DecisionCommitConfirmationModal from '@/components/decisions/DecisionCommitConfirmationModal';
import { DecisionAPI } from '@/lib/api/decisionApi';
import type {
  DecisionDraftResponse,
  DecisionOptionDraft,
  DecisionRiskLevel,
  DecisionSignal,
  DecisionValidationErrorResponse,
} from '@/types/decision';

interface DecisionEditModalProps {
  decisionId: number | null;
  projectId?: number | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const ensureOptions = (options?: DecisionOptionDraft[]) => {
  const base = options && options.length > 0 ? options : [];
  const normalized = base.map((option, index) => ({
    ...option,
    text: option.text || '',
    isSelected: Boolean(option.isSelected),
    order: Number.isFinite(option.order) ? option.order : index,
  }));

  while (normalized.length < 2) {
    normalized.push({
      text: '',
      isSelected: normalized.length === 0,
      order: normalized.length,
    });
  }

  if (!normalized.some((option) => option.isSelected)) {
    normalized[0].isSelected = true;
  }

  return normalized.map((option, index) => ({ ...option, order: index }));
};

const mapFieldErrors = (errorResponse: DecisionValidationErrorResponse) => {
  const fieldErrors = errorResponse?.error?.details?.fieldErrors || [];
  return fieldErrors.reduce<Record<string, string>>((acc, item) => {
    if (item.field) acc[item.field] = item.message;
    return acc;
  }, {});
};

const DecisionEditModal = ({
  decisionId,
  projectId,
  isOpen,
  onClose,
  onSaved,
}: DecisionEditModalProps) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitModalOpen, setCommitModalOpen] = useState(false);
  const [commitConfirmations, setCommitConfirmations] = useState<Record<string, boolean>>({
    alternatives: false,
    risk: false,
    review: false,
  });
  const [commitSignals, setCommitSignals] = useState<DecisionSignal[]>([]);
  const [loadingCommitDetails, setLoadingCommitDetails] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [title, setTitle] = useState('');
  const [contextSummary, setContextSummary] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [riskLevel, setRiskLevel] = useState<DecisionRiskLevel | ''>('');
  const [confidenceScore, setConfidenceScore] = useState<number>(3);
  const [options, setOptions] = useState<DecisionOptionDraft[]>([]);

  const canEdit = useMemo(() => Boolean(decisionId), [decisionId]);

  const syncDraftState = useCallback((draft: DecisionDraftResponse) => {
    setTitle(draft.title || '');
    setContextSummary(draft.contextSummary || '');
    setReasoning(draft.reasoning || '');
    setRiskLevel((draft.riskLevel as DecisionRiskLevel) || '');
    setConfidenceScore(
      typeof draft.confidenceScore === 'number' ? draft.confidenceScore : 3
    );
    setOptions(ensureOptions(draft.options));
    setErrors({});
  }, []);

  useEffect(() => {
    if (!isOpen || !decisionId) return;
    let mounted = true;
    setLoading(true);
    setErrorMessage(null);
    DecisionAPI.getDraft(decisionId, projectId)
      .then((draft) => {
        if (!mounted) return;
        syncDraftState(draft);
      })
      .catch((error) => {
        console.error('Failed to load draft:', error);
        if (mounted) setErrorMessage('Failed to load draft.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen, decisionId, projectId, syncDraftState]);

  useEffect(() => {
    if (!isOpen) {
      setErrorMessage(null);
      setErrors({});
      setCommitModalOpen(false);
      setCommitSignals([]);
      setCommitConfirmations({ alternatives: false, risk: false, review: false });
    }
  }, [isOpen]);

  const updateField = (field: string, value: any) => {
    if (field === 'contextSummary') setContextSummary(value);
    if (field === 'reasoning') setReasoning(value);
    if (field === 'riskLevel') setRiskLevel(value);
    if (field === 'confidenceScore') setConfidenceScore(value);
  };

  const handleOptionsChange = (nextOptions: DecisionOptionDraft[]) => {
    setOptions(nextOptions);
  };

  const handleSave = async () => {
    if (!decisionId) return;
    setSaving(true);
    setErrorMessage(null);
    setErrors({});
    try {
      const payload = {
        title: title || null,
        contextSummary: contextSummary || null,
        reasoning: reasoning || null,
        riskLevel: riskLevel || null,
        confidenceScore,
        options: options.map((option, index) => ({ ...option, order: index })),
      };
      const draft = await DecisionAPI.patchDraft(decisionId, payload, projectId);
      syncDraftState(draft);
      onClose();
      onSaved?.();
    } catch (error: any) {
      const response = error?.response;
      if (response?.status === 400 && response?.data?.error) {
        const mapped = mapFieldErrors(response.data as DecisionValidationErrorResponse);
        setErrors(mapped);
        setErrorMessage('Draft is incomplete. Please address the highlighted fields.');
      } else if (response?.status === 403) {
        setErrorMessage('You do not have permission to edit this draft.');
      } else {
        console.error('Failed to save draft:', error);
        setErrorMessage('Failed to save draft.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCommitModal = async () => {
    if (!decisionId) return;
    setCommitModalOpen(true);
    setCommitConfirmations({ alternatives: false, risk: false, review: false });
    setLoadingCommitDetails(true);
    try {
      const response = await DecisionAPI.listSignals(decisionId, projectId);
      setCommitSignals(response.items || []);
    } catch (error) {
      console.warn('Failed to load signals for commit modal:', error);
      setCommitSignals([]);
    } finally {
      setLoadingCommitDetails(false);
    }
  };

  const handleCommit = async () => {
    if (!decisionId) return;
    setCommitting(true);
    setErrorMessage(null);
    setErrors({});
    try {
      const response = await DecisionAPI.commit(decisionId, projectId);
      setCommitModalOpen(false);
      onClose();
      onSaved?.();
      return response;
    } catch (error: any) {
      const response = error?.response;
      if (response?.status === 400 && response?.data?.error) {
        const mapped = mapFieldErrors(response.data as DecisionValidationErrorResponse);
        setErrors(mapped);
        setErrorMessage('Draft is incomplete. Please address the highlighted fields.');
      } else if (response?.status === 403) {
        setErrorMessage('You do not have permission to commit this decision.');
      } else {
        console.error('Commit failed:', error);
        setErrorMessage('Commit failed.');
      }
    } finally {
      setCommitting(false);
    }
    return null;
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose}>
        <div className="w-full max-w-6xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <div className="text-sm font-semibold text-gray-900">Edit Draft</div>
            <div className="text-xs text-gray-500">Update decision details in place.</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto">
          {errorMessage ? (
            <div className="border-b border-amber-100 bg-amber-50 px-6 py-3 text-xs text-amber-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="px-6 pt-5">
            <label className="text-xs font-semibold text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Draft title"
              className="mt-2 w-full rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none"
            />
          </div>

          <div className="mt-5 flex min-h-[520px] flex-col gap-4 px-4 pb-6 lg:flex-row">
            <div className="h-full w-full max-w-full lg:w-[32%] lg:min-w-[240px] lg:max-w-[320px]">
              {decisionId ? (
                <SignalsPanel decisionId={decisionId} projectId={projectId} mode="edit" />
              ) : null}
            </div>
            <div className="h-full w-full flex-1 min-w-0 bg-gray-50">
              <DecisionWorkspaceEditor
                contextSummary={contextSummary}
                reasoning={reasoning}
                riskLevel={riskLevel}
                confidenceScore={confidenceScore}
                options={options}
                errors={errors}
                onChange={updateField}
                onOptionsChange={handleOptionsChange}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4">
          <div className="text-xs text-gray-400">
            {loading ? 'Loading draft…' : canEdit ? 'Draft ready' : 'No draft selected'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-600 hover:border-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleOpenCommitModal}
              disabled={!canEdit || loading || saving || committing}
              className={`rounded-md px-4 py-2 text-xs font-semibold ${
                !canEdit || loading || saving || committing
                  ? 'cursor-not-allowed bg-gray-200 text-gray-500'
                  : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              Commit
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canEdit || loading || saving}
              className={`rounded-md px-4 py-2 text-xs font-semibold text-white ${
                !canEdit || loading || saving
                  ? 'cursor-not-allowed bg-gray-300'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
      </Modal>
      <DecisionCommitConfirmationModal
        isOpen={commitModalOpen}
        onClose={() => setCommitModalOpen(false)}
        onConfirm={handleCommit}
        loading={loadingCommitDetails}
        signals={commitSignals}
        contextSummary={contextSummary}
        reasoning={reasoning}
        options={options}
        riskLevel={riskLevel}
        confidenceScore={confidenceScore}
        confirmations={commitConfirmations}
        onToggleConfirmation={(key) =>
          setCommitConfirmations((prev) => ({ ...prev, [key]: !prev[key] }))
        }
        confirming={committing}
      />
    </>
  );
};

export default DecisionEditModal;
