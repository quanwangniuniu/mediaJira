'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SpreadsheetAPI } from '@/lib/api/spreadsheetApi';
import { SpreadsheetData, SheetData, CreateSheetRequest, UpdateSheetRequest } from '@/types/spreadsheet';
import { AlertCircle, ArrowLeft, FileSpreadsheet, Loader2, Plus, X } from 'lucide-react';
import CreateSheetModal from '@/components/spreadsheets/CreateSheetModal';
import SpreadsheetGrid, { SpreadsheetGridHandle } from '@/components/spreadsheets/SpreadsheetGrid';
import PatternAgentPanel from '@/components/spreadsheets/PatternAgentPanel';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { PatternAPI } from '@/lib/api/patternApi';
import { rowColToA1 } from '@/lib/spreadsheets/a1';
import {
  HEADER_ROW_INDEX,
  RENAME_DEDUP_WINDOW_MS,
  recordRenameColumnStep,
  shouldRecordHeaderRename,
  RenameDedupState,
} from '@/lib/spreadsheets/patternRecorder';
import {
  CreatePatternPayload,
  ApplyHighlightParams,
  FillSeriesParams,
  InsertColumnParams,
  InsertRowParams,
  DeleteColumnParams,
  PatternStep,
  TimelineItem,
  flattenTimelineItems,
  WorkflowPatternDetail,
  WorkflowPatternStepRecord,
  WorkflowPatternSummary,
  PatternJobStatus,
} from '@/types/patterns';
import {
  deleteTimelineItemById,
  timelineItemsToCreateSteps,
  updateTimelineItemById,
} from '@/lib/spreadsheets/timelineItems';

export default function SpreadsheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const spreadsheetId = params?.spreadsheetId as string;
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createSheetModalOpen, setCreateSheetModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createSheetDefaultName, setCreateSheetDefaultName] = useState('Sheet1');
  const [renamingSheetId, setRenamingSheetId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [sheetMenuOpenId, setSheetMenuOpenId] = useState<number | null>(null);
  const [sheetMenuAnchor, setSheetMenuAnchor] = useState<{ top: number; left: number } | null>(null);
  const [deleteConfirmSheet, setDeleteConfirmSheet] = useState<SheetData | null>(null);
  const [deletingSheet, setDeletingSheet] = useState(false);
  const [highlightCell, setHighlightCell] = useState<{ row: number; col: number } | null>(null);
  const [patterns, setPatterns] = useState<WorkflowPatternSummary[]>([]);
  const [exportingPattern, setExportingPattern] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<WorkflowPatternDetail | null>(null);
  const [applySteps, setApplySteps] = useState<
    Array<WorkflowPatternStepRecord & { status: 'pending' | 'success' | 'error'; errorMessage?: string }>
  >([]);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applyFailedIndex, setApplyFailedIndex] = useState<number | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [patternJobId, setPatternJobId] = useState<string | null>(null);
  const [patternJobStatus, setPatternJobStatus] = useState<PatternJobStatus | null>(null);
  const [patternJobProgress, setPatternJobProgress] = useState(0);
  const [patternJobStep, setPatternJobStep] = useState<number | null>(null);
  const [patternJobError, setPatternJobError] = useState<string | null>(null);
  const gridRef = useRef<SpreadsheetGridHandle | null>(null);
  const patternJobStartRef = useRef<number | null>(null);
  const renameDedupRef = useRef<Record<number, RenameDedupState>>({});
  const activeJobIdRef = useRef<string | null>(null);
  const applyStepsRef = useRef<
    Array<WorkflowPatternStepRecord & { status: 'pending' | 'success' | 'error'; errorMessage?: string }>
  >([]);
  const applyHighlightStepsRef = useRef<(steps: WorkflowPatternStepRecord[]) => void>(() => {});
  const isReplayingRef = useRef(false);
  const [agentStepsBySheet, setAgentStepsBySheet] = useState<Record<number, TimelineItem[]>>({});

  useEffect(() => {
    if (activeSheetId == null) return;
    setHighlightCell(null);
  }, [activeSheetId]);

  const agentSteps = activeSheetId != null ? agentStepsBySheet[activeSheetId] ?? [] : [];

  const updateAgentSteps = useCallback(
    (updater: TimelineItem[] | ((prev: TimelineItem[]) => TimelineItem[])) => {
      if (activeSheetId == null) return;
      setAgentStepsBySheet((prev) => {
        const current = prev[activeSheetId] ?? [];
        const next = typeof updater === 'function' ? updater(current) : updater;
        if (next === current) return prev;
        return {
          ...prev,
          [activeSheetId]: next,
        };
      });
    },
    [activeSheetId]
  );

  const createStepId = () =>
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `step_${Date.now()}_${Math.random().toString(16).slice(2)}`;


  const getNextSheetName = (existingSheets: SheetData[]) => {
    const sheetNumberRegex = /^sheet(\d+)$/i;
    let maxNumber = 0;
    existingSheets.forEach((sheet) => {
      const match = sheet.name.trim().match(sheetNumberRegex);
      if (match) {
        const num = Number(match[1]);
        if (!Number.isNaN(num)) {
          maxNumber = Math.max(maxNumber, num);
        }
      }
    });
    return `Sheet${maxNumber + 1}`;
  };

  const createFirstSheetIfNeeded = async (existingSheets: SheetData[]) => {
    if (!spreadsheetId || existingSheets.length > 0) {
      return null;
    }

    // Always try to create Sheet1 for the first sheet.
    try {
      return await SpreadsheetAPI.createSheet(Number(spreadsheetId), { name: 'Sheet1' });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400) {
        // If Sheet1 already exists server-side (race/auto-create), fetch it.
        const retryResponse = await SpreadsheetAPI.listSheets(Number(spreadsheetId));
        const retrySheets = retryResponse.results || [];
        if (retrySheets.length > 0) {
          return retrySheets[0];
        }
      }
      throw err;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!spreadsheetId) {
        setError('Spreadsheet ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch spreadsheet
        const spreadsheetData = await SpreadsheetAPI.getSpreadsheet(Number(spreadsheetId));
        setSpreadsheet(spreadsheetData);

        // Fetch sheets
        const sheetsResponse = await SpreadsheetAPI.listSheets(Number(spreadsheetId));
        const sheetsList = sheetsResponse.results || [];

        // Auto-create the first sheet if none exist yet
        if (sheetsList.length === 0) {
          const newSheet = await createFirstSheetIfNeeded(sheetsList);
          if (newSheet) {
            setSheets([newSheet]);
            setActiveSheetId(newSheet.id);
          }
        } else {
          setSheets(sheetsList);
          setCreateSheetDefaultName(getNextSheetName(sheetsList));
          
          // Set first sheet as active if available
          if (sheetsList.length > 0 && !activeSheetId) {
            setActiveSheetId(sheetsList[0].id);
          }
        }
      } catch (err: any) {
        console.error('Failed to load data:', err);
        const errorMessage =
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to load spreadsheet';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [spreadsheetId]);

  useEffect(() => {
    const loadPatterns = async () => {
      try {
        const response = await PatternAPI.listPatterns();
        setPatterns(response.results || []);
      } catch (err) {
        console.error('Failed to load patterns:', err);
      }
    };
    loadPatterns();
  }, []);

  const loadPatternDetail = useCallback(async (patternId: string) => {
    try {
      const pattern = await PatternAPI.getPattern(patternId);
      const sortedSteps = [...(pattern.steps || [])].sort((a, b) => a.seq - b.seq);
      setSelectedPattern(pattern);
      setApplySteps(
        sortedSteps.map((step) => ({
          ...step,
          status: 'pending',
        }))
      );
      setApplyError(null);
      setApplyFailedIndex(null);
    } catch (err) {
      console.error('Failed to load pattern detail:', err);
      toast.error('Failed to load pattern');
    }
  }, []);

  const handleDeletePattern = useCallback(
    async (patternId: string) => {
      try {
        await PatternAPI.deletePattern(patternId);
        setPatterns((prev) => prev.filter((pattern) => pattern.id !== patternId));
        if (selectedPattern?.id === patternId) {
          setSelectedPattern(null);
          setApplySteps([]);
          setApplyError(null);
          setApplyFailedIndex(null);
        }
        toast.success('Pattern deleted');
      } catch (err: any) {
        console.error('Failed to delete pattern:', err);
        const errorMessage =
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to delete pattern';
        toast.error(errorMessage);
      }
    },
    [selectedPattern]
  );





  const applyHighlightSteps = useCallback((steps: WorkflowPatternStepRecord[]) => {
    steps.forEach((step) => {
      if (step.type !== 'APPLY_HIGHLIGHT' || step.disabled) return;
      gridRef.current?.applyHighlightOperation(step.params as ApplyHighlightParams);
    });
  }, []);

  useEffect(() => {
    applyStepsRef.current = applySteps;
    applyHighlightStepsRef.current = applyHighlightSteps;
  }, [applySteps, applyHighlightSteps]);

  const applyPatternSteps = useCallback(async () => {
    if (!selectedPattern || !spreadsheetId || !activeSheetId) return;
    isReplayingRef.current = true;
    setIsApplying(true);
    setApplyError(null);
    setApplyFailedIndex(null);
    setPatternJobError(null);
    setPatternJobProgress(0);
    setPatternJobStep(null);
    setPatternJobId(null);
    setPatternJobStatus(null);
    setApplySteps((prev) => prev.map((step) => ({ ...step, status: 'pending', errorMessage: undefined })));

    try {
      const applyUrl = `/api/spreadsheet/patterns/${selectedPattern.id}/apply/`;
      if (process.env.NODE_ENV !== 'production') {
        console.info('[PatternApply] POST', applyUrl, {
          spreadsheet_id: Number(spreadsheetId),
          sheet_id: activeSheetId,
        });
      }
      const response = await PatternAPI.applyPattern(selectedPattern.id, {
        spreadsheet_id: Number(spreadsheetId),
        sheet_id: activeSheetId,
      });
      if (process.env.NODE_ENV !== 'production') {
        console.info('[PatternApply] job_id', response.job_id, 'status', response.status);
      }
      patternJobStartRef.current = Date.now();
      setPatternJobId(response.job_id);
      setPatternJobStatus(response.status);
    } catch (err: any) {
      isReplayingRef.current = false;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to apply pattern';
      setApplyError(message);
      setIsApplying(false);
      toast.error(message);
    }
  }, [selectedPattern, spreadsheetId, activeSheetId]);

  useEffect(() => {
    if (!patternJobId) return;
    if (activeJobIdRef.current === patternJobId) {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[PatternPoll] skip duplicate poll start', { jobId: patternJobId });
      }
      return;
    }
    activeJobIdRef.current = patternJobId;
    let cancelled = false;
    let timer: NodeJS.Timeout | null = null;

    const isTerminal = (job: { status: string; finishedAt?: string | null }) =>
      job.status === 'succeeded' ||
      job.status === 'failed' ||
      job.status === 'canceled' ||
      job.finishedAt != null;

    if (process.env.NODE_ENV !== 'production') {
      console.info('[PatternPoll] start', { jobId: patternJobId });
    }

    const poll = async () => {
      try {
        const job = await PatternAPI.getPatternJob(patternJobId);
        if (cancelled) return;

        setPatternJobStatus(job.status);
        setPatternJobProgress(job.progress ?? 0);
        setPatternJobStep(job.current_step ?? null);
        setPatternJobError(job.error_message ?? null);

        setApplySteps((prev) =>
          prev.map((step) => {
            if (job.status === 'succeeded') {
              return { ...step, status: 'success', errorMessage: undefined };
            }
            if (job.status === 'failed' && job.current_step === step.seq) {
              return { ...step, status: 'error', errorMessage: job.error_message ?? 'Failed to apply step' };
            }
            if (job.current_step != null && step.seq < job.current_step) {
              return { ...step, status: 'success', errorMessage: undefined };
            }
            return { ...step, status: 'pending', errorMessage: undefined };
          })
        );

        if (isTerminal(job)) {
          activeJobIdRef.current = null;
          isReplayingRef.current = false;
          if (process.env.NODE_ENV !== 'production') {
            console.info('[PatternPoll] stop', { jobId: patternJobId, status: job.status, finishedAt: job.finishedAt });
          }
        }

        if (job.status === 'succeeded') {
          setIsApplying(false);
          patternJobStartRef.current = null;
          gridRef.current?.refresh();
          const steps = applyStepsRef.current;
          applyHighlightStepsRef.current(steps);
          return;
        }

        if (job.status === 'failed') {
          setIsApplying(false);
          setApplyError(job.error_message ?? 'Failed to apply pattern');
          setApplyFailedIndex(
            job.current_step != null ? Math.max(0, job.current_step - 1) : null
          );
          patternJobStartRef.current = null;
          return;
        }

        if (job.status === 'canceled') {
          setIsApplying(false);
          patternJobStartRef.current = null;
          return;
        }

        if (job.status === 'queued') {
          const startedAt = patternJobStartRef.current;
          if (startedAt && Date.now() - startedAt > 60000) {
            activeJobIdRef.current = null;
            isReplayingRef.current = false;
            const message = 'Pattern job is still queued after 60s. Worker may not be consuming tasks.';
            setIsApplying(false);
            setApplyError(message);
            setPatternJobError(message);
            return;
          }
        }
      } catch (err: any) {
        if (cancelled) return;
        activeJobIdRef.current = null;
        isReplayingRef.current = false;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to fetch job status';
        setApplyError(message);
        setIsApplying(false);
        if (process.env.NODE_ENV !== 'production') {
          console.info('[PatternPoll] stop (error)', { jobId: patternJobId });
        }
        return;
      }

      timer = setTimeout(poll, 1500);
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      if (activeJobIdRef.current === patternJobId) {
        activeJobIdRef.current = null;
      }
    };
  }, [patternJobId]);

  const handleFormulaCommit = useCallback((data: { row: number; col: number; formula: string }) => {
    if (isReplayingRef.current) {
      if (process.env.NODE_ENV !== 'production') {
        console.info('[PatternRecorder] skip formula (replaying)');
      }
      return;
    }
    const targetRow = data.row + 1;
    const targetCol = data.col + 1;
    const a1 = rowColToA1(targetRow, targetCol) ?? 'A1';
    updateAgentSteps((prev) => [
      ...prev,
      {
        id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `step_${Date.now()}_${Math.random().toString(16).slice(2)}`,
        type: 'APPLY_FORMULA',
        target: { row: targetRow, col: targetCol },
        a1,
        formula: data.formula,
        disabled: false,
        createdAt: new Date().toISOString(),
      },
    ]);
  }, [updateAgentSteps]);

  const handleHeaderRenameCommit = useCallback(
    (payload: { rowIndex: number; colIndex: number; newValue: string; oldValue: string }) => {
      if (isReplayingRef.current) {
        if (process.env.NODE_ENV !== 'production') {
          console.info('[PatternRecorder] skip header rename (replaying)');
        }
        return;
      }
      if (!shouldRecordHeaderRename(payload.rowIndex)) return;
      if (activeSheetId == null) return;
      updateAgentSteps((prev) => {
        const sheetState = renameDedupRef.current[activeSheetId] ?? {};
        const flat = flattenTimelineItems(prev);
        const result = recordRenameColumnStep(
          flat,
          {
            columnIndex: payload.colIndex,
            newName: payload.newValue,
            oldName: payload.oldValue,
            headerRowIndex: HEADER_ROW_INDEX,
          },
          sheetState,
          createStepId,
          Date.now(),
          RENAME_DEDUP_WINDOW_MS
        );
        renameDedupRef.current[activeSheetId] = result.state;
        return result.steps;
      });
    },
    [activeSheetId, updateAgentSteps]
  );

  const handleHighlightCommit = useCallback(
    (payload: ApplyHighlightParams) => {
      if (isReplayingRef.current) {
        if (process.env.NODE_ENV !== 'production') {
          console.info('[PatternRecorder] skip highlight (replaying)');
        }
        return;
      }
      if (activeSheetId == null) return;
      updateAgentSteps((prev) => [
        ...prev,
        {
          id: createStepId(),
          type: 'APPLY_HIGHLIGHT',
          params: payload,
          disabled: false,
          createdAt: new Date().toISOString(),
        },
      ]);
    },
    [activeSheetId, updateAgentSteps]
  );

  const buildPatternStepPayload = (step: PatternStep, index: number) => {
    const seq = index + 1;
    switch (step.type) {
      case 'APPLY_FORMULA':
        return {
          seq,
          type: step.type,
          disabled: step.disabled,
          params: {
            target: step.target,
            a1: step.a1,
            formula: step.formula,
          },
        };
      case 'INSERT_ROW':
        return {
          seq,
          type: step.type,
          disabled: step.disabled,
          params: step.params,
        };
      case 'INSERT_COLUMN':
        return {
          seq,
          type: step.type,
          disabled: step.disabled,
          params: step.params,
        };
      case 'DELETE_COLUMN':
        return {
          seq,
          type: step.type,
          disabled: step.disabled,
          params: step.params,
        };
      case 'FILL_SERIES':
        return {
          seq,
          type: step.type,
          disabled: step.disabled,
          params: step.params,
        };
      case 'SET_COLUMN_NAME':
        return {
          seq,
          type: step.type,
          disabled: step.disabled,
          params: step.params,
        };
      case 'APPLY_HIGHLIGHT':
        return {
          seq,
          type: step.type,
          disabled: step.disabled,
          params: step.params,
        };
      default: {
        const _exhaustive: never = step;
        return _exhaustive;
      }
    }
  };

  const applyPatternStepUpdates = (step: PatternStep, updates: Partial<PatternStep>): PatternStep => {
    switch (step.type) {
      case 'APPLY_FORMULA':
        return { ...step, ...(updates as Partial<typeof step>) };
      case 'INSERT_ROW':
        return { ...step, ...(updates as Partial<typeof step>) };
      case 'INSERT_COLUMN':
        return { ...step, ...(updates as Partial<typeof step>) };
      case 'DELETE_COLUMN':
        return { ...step, ...(updates as Partial<typeof step>) };
      case 'FILL_SERIES':
        return { ...step, ...(updates as Partial<typeof step>) };
      case 'SET_COLUMN_NAME':
        return { ...step, ...(updates as Partial<typeof step>) };
      case 'APPLY_HIGHLIGHT':
        return { ...step, ...(updates as Partial<typeof step>) };
      default: {
        const _exhaustive: never = step;
        return _exhaustive;
      }
    }
  };

  const handleExportPattern = useCallback(
    async (name: string, selectedItems: TimelineItem[]) => {
      if (!spreadsheetId || selectedItems.length === 0) return false;
      const payload: CreatePatternPayload = {
        name,
        description: '',
        origin: {
          spreadsheet_id: Number(spreadsheetId),
          sheet_id: activeSheetId ?? undefined,
        },
        steps: timelineItemsToCreateSteps(selectedItems),
      };

      setExportingPattern(true);
      try {
        const created = await PatternAPI.createPattern(payload);
        toast.success('Pattern saved');
        setPatterns((prev) => [created, ...prev]);
        return true;
      } catch (err: any) {
        console.error('Failed to save pattern:', err);
        const errorMessage =
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to save pattern';
        toast.error(errorMessage);
        return false;
      } finally {
        setExportingPattern(false);
      }
    },
    [activeSheetId, spreadsheetId]
  );

  const handleCreateSheet = async (data: CreateSheetRequest) => {
    if (!spreadsheetId) {
      toast.error('Spreadsheet ID is required');
      return;
    }

    setCreating(true);
    try {
      const newSheet = await SpreadsheetAPI.createSheet(Number(spreadsheetId), data);
      toast.success('Sheet created successfully');
      
      // Refresh the sheets list
      const sheetsResponse = await SpreadsheetAPI.listSheets(Number(spreadsheetId));
      const sheetsList = sheetsResponse.results || [];
      setSheets(sheetsList);
      setCreateSheetDefaultName(getNextSheetName(sheetsList));
      
      // Set the new sheet as active
      setActiveSheetId(newSheet.id);
      
      // Close modal
      setCreateSheetModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create sheet:', err);
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to create sheet';
      toast.error(errorMessage);
      throw err;
    } finally {
      setCreating(false);
    }
  };

  const handleRenameSheet = async (sheetId: number, data: UpdateSheetRequest) => {
    if (!spreadsheetId) {
      toast.error('Spreadsheet ID is required');
      return;
    }

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      toast.error('Sheet name is required');
      return;
    }

    if (trimmedName.length > 200) {
      toast.error('Sheet name cannot exceed 200 characters');
      return;
    }

    setRenaming(true);
    try {
      const updatedSheet = await SpreadsheetAPI.updateSheet(Number(spreadsheetId), sheetId, {
        name: trimmedName,
      });

      setSheets((prev) =>
        prev.map((sheet) => (sheet.id === sheetId ? { ...sheet, name: updatedSheet.name } : sheet))
      );

      toast.success('Sheet renamed');
      setRenamingSheetId(null);
      setRenameValue('');
    } catch (err: any) {
      console.error('Failed to rename sheet:', err);
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to rename sheet';
      toast.error(errorMessage);
    } finally {
      setRenaming(false);
    }
  };

  const beginRenameSheet = (sheet: SheetData) => {
    setRenamingSheetId(sheet.id);
    setRenameValue(sheet.name);
  };

  const cancelRenameSheet = () => {
    setRenamingSheetId(null);
    setRenameValue('');
  };

  const handleDeleteSheet = useCallback(
    async (sheet: SheetData) => {
      if (!spreadsheetId || !projectId) {
        toast.error('Project or Spreadsheet ID is required');
        return;
      }

      setDeletingSheet(true);
      try {
        await SpreadsheetAPI.deleteSheet(Number(projectId), Number(spreadsheetId), sheet.id);
        toast.success('Sheet deleted');

        const sheetsResponse = await SpreadsheetAPI.listSheets(Number(spreadsheetId));
        const sheetsList = sheetsResponse.results || [];
        setSheets(sheetsList);

        if (!sheetsList.length) {
          setActiveSheetId(null);
        } else if (activeSheetId === sheet.id) {
          const deletedIndex = sheets.findIndex((s) => s.id === sheet.id);
          const nextSheet =
            sheetsList[deletedIndex] ||
            sheetsList[deletedIndex - 1] ||
            sheetsList[0];
          setActiveSheetId(nextSheet.id);
        }
      } catch (err: any) {
        console.error('Failed to delete sheet:', err);
        const errorMessage =
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Delete failed.';
        toast.error(errorMessage);
      } finally {
        setDeletingSheet(false);
        setDeleteConfirmSheet(null);
        setSheetMenuOpenId(null);
      }
    },
    [spreadsheetId, projectId, activeSheetId, sheets]
  );

  useEffect(() => {
    if (sheetMenuOpenId === null) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest('[data-sheet-menu]') || target.closest('[data-sheet-menu-trigger]')) {
        return;
      }
      setSheetMenuOpenId(null);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSheetMenuOpenId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [sheetMenuOpenId]);

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 py-10">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <p className="mt-3 font-medium text-gray-900">Loading spreadsheet…</p>
                <p className="text-sm text-gray-600">Fetching spreadsheet details from the backend.</p>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 py-10">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-white p-10 text-center text-red-600">
                <AlertCircle className="h-6 w-6" />
                <p className="mt-3 font-semibold">Could not load spreadsheet</p>
                <p className="text-sm text-red-500">{error}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setError(null);
                      setLoading(true);
                      const fetchData = async () => {
                        try {
                          const spreadsheetData = await SpreadsheetAPI.getSpreadsheet(Number(spreadsheetId));
                          setSpreadsheet(spreadsheetData);
                          const sheetsResponse = await SpreadsheetAPI.listSheets(Number(spreadsheetId));
                          setSheets(sheetsResponse.results || []);
                        } catch (err: any) {
                          setError(
                            err?.response?.data?.error ||
                              err?.response?.data?.detail ||
                              err?.message ||
                              'Failed to load spreadsheet'
                          );
                        } finally {
                          setLoading(false);
                        }
                      };
                      fetchData();
                    }}
                    className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Retry
                  </button>
                  <Link
                    href={`/projects/${projectId}/spreadsheets`}
                    className="rounded-full bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
                  >
                    Back to Spreadsheets
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!spreadsheet) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 py-10">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-600">
                <FileSpreadsheet className="h-7 w-7 text-gray-400" />
                <p className="mt-3 font-semibold text-gray-900">Spreadsheet not found</p>
                <p className="text-sm text-gray-500">The spreadsheet you're looking for doesn't exist.</p>
                <Link
                  href={`/projects/${projectId}/spreadsheets`}
                  className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Back to Spreadsheets
                </Link>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const activeSheet = sheets.find(s => s.id === activeSheetId);

  return (
    <ProtectedRoute>
      <Layout>
        {/* Full viewport height, no page scroll: only the grid container scrolls. */}
        <div className="h-full min-h-0 overflow-hidden bg-white flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => router.push(`/projects/${projectId}/spreadsheets`)}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-green-50 text-green-700">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <h1 className="text-lg font-medium text-gray-900">{spreadsheet.name}</h1>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sheet Tabs */}
          <div className="border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4">
              <div className="flex items-center gap-1 overflow-x-auto">
                {sheets.map((sheet) => {
                  const isRenaming = renamingSheetId === sheet.id;
                  const isActive = activeSheetId === sheet.id;
                  const isMenuOpen = sheetMenuOpenId === sheet.id;

                  return (
                    <div
                      key={sheet.id}
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        isActive
                          ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if (!isRenaming) {
                          setActiveSheetId(sheet.id);
                        }
                      }}
                      onDoubleClick={() => beginRenameSheet(sheet)}
                    >
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleRenameSheet(sheet.id, { name: renameValue });
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelRenameSheet();
                              }
                            }}
                            className="h-7 w-32 rounded border border-gray-300 px-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                            disabled={renaming}
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameSheet(sheet.id, { name: renameValue })}
                            className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            disabled={renaming}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={cancelRenameSheet}
                            className="rounded border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                            disabled={renaming}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <span>{sheet.name}</span>
                          <div className="relative" data-sheet-menu>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                                setSheetMenuAnchor({
                                  top: rect.bottom + 6,
                                  left: rect.right,
                                });
                                setSheetMenuOpenId(isMenuOpen ? null : sheet.id);
                              }}
                              onMouseDown={(e) => e.stopPropagation()}
                              className="ml-1 rounded px-1 text-xs text-gray-500 hover:bg-gray-200"
                              aria-haspopup="menu"
                              aria-expanded={isMenuOpen}
                              title="Sheet actions"
                              data-sheet-menu-trigger
                            >
                              ⋯
                            </button>
                            {isMenuOpen && sheetMenuAnchor &&
                              createPortal(
                                <div
                                  className="fixed z-[1000] w-32 rounded-md border border-gray-200 bg-white shadow-lg"
                                  style={{
                                    top: sheetMenuAnchor.top,
                                    left: sheetMenuAnchor.left - 128,
                                  }}
                                  role="menu"
                                  data-sheet-menu
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      setSheetMenuOpenId(null);
                                      setDeleteConfirmSheet(sheet);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-semibold text-red-600 hover:bg-red-50"
                                    role="menuitem"
                                  >
                                    Delete
                                  </button>
                                </div>,
                                document.body
                              )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    setCreateSheetDefaultName(getNextSheetName(sheets));
                    setCreateSheetModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                  title="Create new sheet"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Sheet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Spreadsheet Content Area: flex-1 + min-h-0 so it gets bounded height and grid scrolls inside. */}
          <div className="flex-1 min-h-0 overflow-hidden bg-gray-50 flex flex-col">
            {activeSheet ? (
              <div className="flex-1 min-h-0 flex h-full overflow-hidden">
                <div className="flex-1 min-h-0 overflow-hidden">
                  <SpreadsheetGrid
                    ref={gridRef}
                    spreadsheetId={Number(spreadsheetId)}
                    sheetId={activeSheet.id}
                    spreadsheetName={spreadsheet.name}
                    sheetName={activeSheet.name}
                    onFormulaCommit={handleFormulaCommit}
                    onHeaderRenameCommit={handleHeaderRenameCommit}
                    onHighlightCommit={handleHighlightCommit}
                    onInsertRowCommit={(payload: InsertRowParams) => {
                      updateAgentSteps((prev) => [
                        ...prev,
                        {
                          id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
                            ? crypto.randomUUID()
                            : `step_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                          type: 'INSERT_ROW',
                          params: payload,
                          disabled: false,
                          createdAt: new Date().toISOString(),
                        },
                      ]);
                    }}
                    onInsertColumnCommit={(payload: InsertColumnParams) => {
                      updateAgentSteps((prev) => [
                        ...prev,
                        {
                          id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
                            ? crypto.randomUUID()
                            : `step_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                          type: 'INSERT_COLUMN',
                          params: payload,
                          disabled: false,
                          createdAt: new Date().toISOString(),
                        },
                      ]);
                    }}
                    onDeleteColumnCommit={(payload: DeleteColumnParams) => {
                      updateAgentSteps((prev) => [
                        ...prev,
                        {
                          id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
                            ? crypto.randomUUID()
                            : `step_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                          type: 'DELETE_COLUMN',
                          params: payload,
                          disabled: false,
                          createdAt: new Date().toISOString(),
                        },
                      ]);
                    }}
                    onFillCommit={(payload: FillSeriesParams) => {
                      updateAgentSteps((prev) => [
                        ...prev,
                        {
                          id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
                            ? crypto.randomUUID()
                            : `step_${Date.now()}_${Math.random().toString(16).slice(2)}`,
                          type: 'FILL_SERIES',
                          params: payload,
                          disabled: false,
                          createdAt: new Date().toISOString(),
                        },
                      ]);
                    }}
                    highlightCell={highlightCell}
                  />
                </div>
                <PatternAgentPanel
                  items={agentSteps}
                  patterns={patterns}
                  selectedPatternId={selectedPattern?.id ?? null}
                  applySteps={applySteps}
                  applyError={applyError}
                  applyFailedIndex={applyFailedIndex}
                  isApplying={isApplying}
                  exporting={exportingPattern}
                  onReorder={updateAgentSteps}
                  onUpdateStep={(id, updates) =>
                    updateAgentSteps((prev) => updateTimelineItemById(prev, id, updates))
                  }
                  onDeleteStep={(id) =>
                    updateAgentSteps((prev) => deleteTimelineItemById(prev, id))
                  }
                  onHoverStep={(step) => {
                    if (step.type === 'APPLY_FORMULA') {
                      setHighlightCell({ row: step.target.row - 1, col: step.target.col - 1 });
                    }
                  }}
                  onClearHover={() => setHighlightCell(null)}
                  onExportPattern={handleExportPattern}
                  onSelectPattern={loadPatternDetail}
                  onDeletePattern={handleDeletePattern}
                  onApplyPattern={applyPatternSteps}
                  onRetryApply={applyPatternSteps}
                  applyJobStatus={patternJobStatus}
                  applyJobProgress={patternJobProgress}
                  applyJobError={patternJobError}
                />
              </div>
            ) : sheets.length === 0 ? (
              <div className="flex items-center justify-center flex-1">
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white p-12 text-center">
                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-semibold text-gray-900 mb-2">No sheets yet</p>
                  <p className="text-sm text-gray-500 mb-6">Create your first sheet to get started.</p>
                  <button
                    onClick={() => {
                      setCreateSheetDefaultName(getNextSheetName(sheets));
                      setCreateSheetModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus className="h-4 w-4" />
                    Create Sheet
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Layout>
      <CreateSheetModal
        isOpen={createSheetModalOpen}
        onClose={() => setCreateSheetModalOpen(false)}
        onSubmit={handleCreateSheet}
        loading={creating}
        defaultName={createSheetDefaultName}
      />
      {deleteConfirmSheet && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!deletingSheet) {
              setDeleteConfirmSheet(null);
            }
          }}
        >
          <div className="w-[min(420px,calc(100vw-2rem))]">
            <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
              <div className="px-6 pt-6 pb-4 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Delete sheet</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Delete &quot;{deleteConfirmSheet.name}&quot;? This action cannot be undone.
                </p>
              </div>
              <div className="p-6 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmSheet(null)}
                  className="rounded border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  disabled={deletingSheet}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => deleteConfirmSheet && void handleDeleteSheet(deleteConfirmSheet)}
                  className="rounded bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                  disabled={deletingSheet}
                >
                  {deletingSheet ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </ProtectedRoute>
  );
}
