'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import DecisionWorkbenchHeader from '@/components/decisions/DecisionWorkbenchHeader';
import SignalsPanel from '@/components/decisions/SignalsPanel';
import DecisionWorkspaceEditor from '@/components/decisions/DecisionWorkspaceEditor';
import ExecutionPanel from '@/components/decisions/ExecutionPanel';
import { DecisionAPI } from '@/lib/api/decisionApi';
import { ProjectAPI } from '@/lib/api/projectApi';
import type {
  DecisionDraftResponse,
  DecisionOptionDraft,
  DecisionStatus,
  DecisionValidationErrorResponse,
} from '@/types/decision';

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

const DecisionPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const decisionId = Number(params?.decisionId);
  const projectId = searchParams.get('project_id');
  const projectIdValue = projectId ? Number(projectId) : null;

  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<DecisionStatus | null>(null);
  const [title, setTitle] = useState('');
  const [contextSummary, setContextSummary] = useState('');
  const [reasoning, setReasoning] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [confidenceScore, setConfidenceScore] = useState<number | ''>('');
  const [options, setOptions] = useState<DecisionOptionDraft[]>([]);
  const [selectedSignalIds, setSelectedSignalIds] = useState<number[]>([]);
  const [dirty, setDirty] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [committedSnapshot, setCommittedSnapshot] = useState<any>(null);
  const [projectName, setProjectName] = useState<string | null>(null);

  const projectLabel = useMemo(() => {
    if (projectName) return projectName;
    if (projectIdValue) return `Project ${projectIdValue}`;
    return 'Project';
  }, [projectIdValue, projectName]);

  const syncDraftState = useCallback((draft: DecisionDraftResponse) => {
    setTitle(draft.title || '');
    setContextSummary(draft.contextSummary || '');
    setReasoning(draft.reasoning || '');
    setRiskLevel(draft.riskLevel || '');
    setConfidenceScore(
      typeof draft.confidenceScore === 'number' ? draft.confidenceScore : ''
    );
    setOptions(ensureOptions(draft.options));
    setLastSavedAt(draft.lastEditedAt || draft.createdAt || null);
    setDirty(false);
  }, []);

  const fetchDecision = useCallback(async () => {
    if (!decisionId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      try {
        const committed = await DecisionAPI.getDecision(decisionId, projectIdValue);
        setStatus(committed.status);
        setCommittedSnapshot(committed);
        setLoading(false);
        return;
      } catch (error: any) {
        const response = error?.response;
        if (response?.status === 409) {
          const currentStatus = response?.data?.details?.currentStatus as DecisionStatus;
          if (currentStatus) {
            setStatus(currentStatus);
            if (currentStatus !== 'DRAFT') {
              setLoading(false);
              return;
            }
          }
        } else {
          throw error;
        }
      }

      const draft = await DecisionAPI.getDraft(decisionId, projectIdValue);
      setStatus((prev) => prev || 'DRAFT');
      syncDraftState(draft);
    } catch (error: any) {
      console.error('Failed to load decision:', error);
      toast.error('Failed to load decision.');
    } finally {
      setLoading(false);
    }
  }, [decisionId, projectIdValue, syncDraftState]);

  useEffect(() => {
    fetchDecision();
  }, [fetchDecision]);

  useEffect(() => {
    let mounted = true;
    const loadProjectName = async () => {
      if (!projectIdValue) return;
      try {
        const project = await ProjectAPI.getProject(projectIdValue);
        if (mounted) {
          setProjectName(project?.name || null);
        }
      } catch (error) {
        console.warn('Failed to load project name:', error);
      }
    };
    loadProjectName();
    return () => {
      mounted = false;
    };
  }, [projectIdValue]);

  const updateField = (field: string, value: any) => {
    setDirty(true);
    if (field === 'contextSummary') setContextSummary(value);
    if (field === 'reasoning') setReasoning(value);
    if (field === 'riskLevel') setRiskLevel(value);
    if (field === 'confidenceScore') setConfidenceScore(value);
  };

  const handleOptionsChange = (nextOptions: DecisionOptionDraft[]) => {
    setOptions(nextOptions);
    setDirty(true);
  };

  const handleTitleChange = (nextTitle: string) => {
    setTitle(nextTitle);
    setDirty(true);
  };

  const handleSaveDraft = async () => {
    if (!decisionId) return;
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        title: title || null,
        contextSummary: contextSummary || null,
        reasoning: reasoning || null,
        riskLevel: riskLevel || null,
        confidenceScore: confidenceScore === '' ? null : confidenceScore,
        options: options.map((option, index) => ({
          ...option,
          order: index,
        })),
      };
      const draft = await DecisionAPI.patchDraft(decisionId, payload, projectIdValue);
      syncDraftState(draft);
      toast.success('Draft saved.');
    } catch (error: any) {
      console.error('Failed to save draft:', error);
      toast.error('Failed to save draft.');
    } finally {
      setSaving(false);
    }
  };

  const handleCommit = async () => {
    if (!decisionId) return;
    setCommitting(true);
    setErrors({});
    try {
      const response = await DecisionAPI.commit(decisionId, projectIdValue);
      setStatus(response.status);
      setCommittedSnapshot(response.decision);
      setDirty(false);
      toast.success(response.detail || 'Decision committed.');
    } catch (error: any) {
      const response = error?.response;
      if (response?.status === 400 && response?.data?.error) {
        const mapped = mapFieldErrors(response.data as DecisionValidationErrorResponse);
        setErrors(mapped);
        toast.error('Draft is incomplete. Please address the highlighted fields.');
      } else if (response?.status === 403) {
        toast.error('You do not have permission to commit this decision.');
      } else {
        console.error('Commit failed:', error);
        toast.error('Commit failed.');
      }
    } finally {
      setCommitting(false);
    }
  };

  const toggleSignal = (signalId: number) => {
    setSelectedSignalIds((prev) =>
      prev.includes(signalId)
        ? prev.filter((id) => id !== signalId)
        : [...prev, signalId]
    );
  };

  if (loading) {
    return (
      <Layout>
        <ProtectedRoute>
          <div className="flex h-full items-center justify-center">
            <div className="text-sm text-gray-500">Loading decision...</div>
          </div>
        </ProtectedRoute>
      </Layout>
    );
  }

  if (!status || status !== 'DRAFT') {
    return (
      <Layout>
        <ProtectedRoute>
          <div className="flex h-full flex-col items-center justify-center gap-4 bg-gray-50 px-6">
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-8 text-center shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Decision is {status || 'Unavailable'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Workplace is read-only after commit. Use the Decision list to review details.
              </p>
              {committedSnapshot?.title ? (
                <p className="mt-3 text-sm font-medium text-gray-700">
                  {committedSnapshot.title}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => router.push('/decisions')}
                className="mt-4 inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Back to Decisions
              </button>
            </div>
          </div>
        </ProtectedRoute>
      </Layout>
    );
  }

  return (
    <Layout>
      <ProtectedRoute>
        <div className="flex h-full flex-col bg-gray-50">
          <DecisionWorkbenchHeader
            projectLabel={projectLabel}
            status={status}
            title={title}
            dirty={dirty}
            lastSavedAt={lastSavedAt}
            saving={saving}
            committing={committing}
            onTitleChange={handleTitleChange}
            onSave={handleSaveDraft}
            onCommit={handleCommit}
          />
          <div className="flex flex-1 min-h-0">
            <div className="h-full w-[24%] min-w-[240px] max-w-[320px]">
              <SignalsPanel
                selectedSignalIds={selectedSignalIds}
                onToggle={toggleSignal}
              />
            </div>
            <div className="h-full flex-1 min-w-0 bg-gray-50">
              <DecisionWorkspaceEditor
                contextSummary={contextSummary}
                reasoning={reasoning}
                riskLevel={riskLevel as any}
                confidenceScore={confidenceScore}
                options={options}
                errors={errors}
                onChange={updateField}
                onOptionsChange={handleOptionsChange}
              />
            </div>
            <div className="h-full w-[24%] min-w-[220px] max-w-[320px]">
              <ExecutionPanel />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    </Layout>
  );
};

export default DecisionPage;
