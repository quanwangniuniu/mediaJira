'use client';

import { useEffect, useMemo, useState } from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, PencilLine, Trash } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import { columnIndexToLabel, parseA1 } from '@/lib/spreadsheets/a1';
import { PatternJobStatus, PatternStep, WorkflowPatternSummary } from '@/types/patterns';

interface PatternAgentPanelProps {
  steps: PatternStep[];
  patterns: WorkflowPatternSummary[];
  selectedPatternId: string | null;
  applySteps: Array<{
    id: string;
    seq: number;
    type: string;
    params: Record<string, any>;
    disabled: boolean;
    status: 'pending' | 'success' | 'error';
    errorMessage?: string;
  }>;
  applyError: string | null;
  applyFailedIndex: number | null;
  isApplying: boolean;
  exporting: boolean;
  applyJobStatus: PatternJobStatus | null;
  applyJobProgress: number;
  applyJobError: string | null;
  onReorder: (steps: PatternStep[]) => void;
  onUpdateStep: (id: string, updates: Partial<PatternStep>) => void;
  onDeleteStep: (id: string) => void;
  onHoverStep: (step: PatternStep) => void;
  onClearHover: () => void;
  onExportPattern: (name: string, steps: PatternStep[]) => Promise<boolean>;
  onSelectPattern: (patternId: string) => void;
  onDeletePattern: (patternId: string) => void;
  onApplyPattern: () => void;
  onRetryApply: () => void;
}

const formatTime = (iso: string) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString();
};

  const StepCard = ({
  step,
  isSelected,
  onSelect,
  onToggleDisabled,
  onDelete,
  onDoubleClick,
  onHover,
  onLeave,
}: {
  step: PatternStep;
  isSelected: boolean;
  onSelect: () => void;
  onToggleDisabled: () => void;
  onDelete: () => void;
  onDoubleClick: () => void;
  onHover: () => void;
  onLeave: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  let preview = '';
  if (step.type === 'APPLY_FORMULA') {
    preview = `${step.a1} = ${step.formula.startsWith('=') ? step.formula.slice(1) : step.formula}`;
  } else if (step.type === 'INSERT_ROW') {
    preview = `Insert row ${step.params.position} ${step.params.index}`;
  } else if (step.type === 'INSERT_COLUMN') {
    const label = columnIndexToLabel(step.params.index);
    preview = `Insert column ${step.params.position} of ${label}`;
  } else if (step.type === 'DELETE_COLUMN') {
    const label = columnIndexToLabel(step.params.index);
    preview = `Delete column ${label}`;
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className={`group rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition ${
        step.disabled ? 'opacity-60' : ''
      } ${isDragging ? 'shadow-lg' : 'hover:shadow-md hover:scale-[1.01]'}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-1 text-gray-400 hover:text-gray-600"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm font-semibold text-gray-900">{preview}</div>
            <button
              type="button"
              onClick={onDelete}
              className="text-gray-400 hover:text-red-500"
              aria-label="Delete step"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-1 text-xs text-gray-500">{formatTime(step.createdAt)}</div>
          <div className="mt-2 flex items-center justify-between gap-2 text-xs text-gray-600">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isSelected} onChange={onSelect} />
              Select
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={step.disabled} onChange={onToggleDisabled} />
              Disable
            </label>
          </div>
        </div>
        {step.type === 'APPLY_FORMULA' && (
          <button
            type="button"
            onClick={onDoubleClick}
            className="text-gray-400 hover:text-blue-500"
            aria-label="Edit step"
          >
            <PencilLine className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};

export default function PatternAgentPanel({
  steps,
  patterns,
  selectedPatternId,
  applySteps,
  applyError,
  applyFailedIndex,
  isApplying,
  exporting,
  applyJobStatus,
  applyJobProgress,
  applyJobError,
  onReorder,
  onUpdateStep,
  onDeleteStep,
  onHoverStep,
  onClearHover,
  onExportPattern,
  onSelectPattern,
  onDeletePattern,
  onApplyPattern,
  onRetryApply,
}: PatternAgentPanelProps) {
  const [activeTab, setActiveTab] = useState<'timeline' | 'patterns'>('timeline');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState('');
  const [editFormula, setEditFormula] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportName, setExportName] = useState('');
  const [exportError, setExportError] = useState<string | null>(null);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => steps.some((step) => step.id === id)));
  }, [steps]);

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((step) => step.id === active.id);
    const newIndex = steps.findIndex((step) => step.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(steps, oldIndex, newIndex));
  };

  const openEditModal = (step: PatternStep) => {
    if (step.type !== 'APPLY_FORMULA') return;
    setEditingStepId(step.id);
    setEditTarget(step.a1);
    setEditFormula(step.formula);
    setEditError(null);
  };

  const handleSaveEdit = () => {
    if (!editingStepId) return;
    const target = parseA1(editTarget);
    if (!target) {
      setEditError('Target must be a valid A1 cell reference');
      return;
    }
    if (!editFormula.trim().startsWith('=')) {
      setEditError('Formula must start with "="');
      return;
    }
    onUpdateStep(editingStepId, {
      target,
      a1: editTarget.toUpperCase(),
      formula: editFormula.trim(),
    });
    setEditingStepId(null);
  };

  const selectedSteps = steps.filter((step) => selectedSet.has(step.id));
  const allSelected = steps.length > 0 && selectedIds.length === steps.length;
  const hasApplySteps = applySteps.length > 0;
  const hasJobStatus = applyJobStatus != null;

  return (
    <div className="flex h-full w-80 flex-col border-l border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-4">
        <div className="text-sm font-semibold text-gray-900">Pattern Agent</div>
        <div className="mt-2 flex gap-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('timeline')}
            className={`rounded px-2 py-1 ${
              activeTab === 'timeline' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('patterns')}
            className={`rounded px-2 py-1 ${
              activeTab === 'patterns' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'
            }`}
          >
            Patterns
          </button>
        </div>
      </div>

      {activeTab === 'timeline' ? (
        <div className="flex-1 overflow-y-auto p-4">
          {steps.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-500">
              No formula steps yet. Commit a formula in the grid to record it.
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between text-xs">
                <div className="text-gray-500">{selectedIds.length} selected</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIds(steps.map((step) => step.id))}
                    className="rounded border border-gray-200 px-2 py-1 font-semibold text-gray-700 hover:bg-gray-50"
                    disabled={allSelected}
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="rounded border border-gray-200 px-2 py-1 font-semibold text-gray-700 hover:bg-gray-50"
                    disabled={selectedIds.length === 0}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={steps.map((step) => step.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-3">
                    {steps.map((step) => (
                      <StepCard
                        key={step.id}
                        step={step}
                        isSelected={selectedSet.has(step.id)}
                        onSelect={() => {
                          setSelectedIds((prev) =>
                            prev.includes(step.id) ? prev.filter((id) => id !== step.id) : [...prev, step.id]
                          );
                        }}
                        onToggleDisabled={() =>
                          onUpdateStep(step.id, {
                            disabled: !step.disabled,
                          })
                        }
                        onDelete={() => onDeleteStep(step.id)}
                        onDoubleClick={() => openEditModal(step)}
                        onHover={() => onHoverStep(step)}
                        onLeave={onClearHover}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4">
          {patterns.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-xs text-gray-500">
              No saved patterns yet.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                {patterns.map((pattern) => (
                  <div
                    key={pattern.id}
                    className={`flex w-full items-start justify-between rounded border px-3 py-2 text-left text-xs ${
                      selectedPatternId === pattern.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <button type="button" onClick={() => onSelectPattern(pattern.id)} className="flex-1">
                      <div className="font-semibold text-gray-900">{pattern.name}</div>
                      <div className="text-gray-500">{formatTime(pattern.createdAt)}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePattern(pattern.id)}
                      className="ml-2 text-gray-400 hover:text-red-500"
                      aria-label="Delete pattern"
                    >
                      <Trash className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              {hasApplySteps && (
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <div className="mb-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onApplyPattern}
                      disabled={isApplying}
                      className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                    >
                      {isApplying ? 'Applying...' : 'Apply'}
                    </button>
                    {applyFailedIndex != null && (
                      <button
                        type="button"
                        onClick={onRetryApply}
                        disabled={isApplying}
                        className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Retry
                      </button>
                    )}
                  </div>

                  {applyError && (
                    <div className="mb-3 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-700">
                      Stopped on step {applyFailedIndex != null ? applyFailedIndex + 1 : ''}: {applyError}
                    </div>
                  )}

                  {hasJobStatus && (
                    <div className="mb-3 rounded border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Status: {applyJobStatus}</span>
                        <span>{applyJobProgress}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded bg-gray-200">
                        <div
                          className="h-full bg-blue-600 transition-all"
                          style={{ width: `${applyJobProgress}%` }}
                        />
                      </div>
                      {applyJobError && (
                        <div className="mt-2 text-xs text-red-700">{applyJobError}</div>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    {applySteps.map((step, index) => {
                      let preview = '';
                      if (step.type === 'APPLY_FORMULA') {
                        const target = step.params?.target;
                        const label =
                          target && target.row != null && target.col != null
                            ? `${columnIndexToLabel(target.col)}${target.row}`
                            : 'Cell';
                        const formula = step.params?.formula ?? '';
                        preview = `${label} = ${formula.startsWith('=') ? formula.slice(1) : formula}`;
                      } else if (step.type === 'INSERT_ROW') {
                        preview = `Insert row ${step.params?.position} ${step.params?.index}`;
                      } else if (step.type === 'INSERT_COLUMN') {
                        const label = columnIndexToLabel(step.params?.index ?? 1);
                        preview = `Insert column ${step.params?.position} of ${label}`;
                      } else if (step.type === 'DELETE_COLUMN') {
                        const label = columnIndexToLabel(step.params?.index ?? 1);
                        preview = `Delete column ${label}`;
                      } else {
                        preview = step.type;
                      }

                      const statusClass =
                        step.status === 'success'
                          ? 'border-green-200 bg-green-50'
                          : step.status === 'error'
                            ? 'border-red-200 bg-red-50'
                            : 'border-gray-200 bg-white';

                      return (
                        <div key={step.id ?? index} className={`rounded border p-2 text-xs ${statusClass}`}>
                          <div className="font-semibold text-gray-900">{preview}</div>
                          {step.status === 'error' && step.errorMessage && (
                            <div className="mt-1 text-xs text-red-700">{step.errorMessage}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="border-t border-gray-100 p-4">
          <button
            type="button"
            disabled={selectedSteps.length === 0 || exporting}
            onClick={() => {
              setExportName('');
              setExportError(null);
              setExportModalOpen(true);
            }}
            className="w-full rounded bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Export Pattern
          </button>
        </div>
      )}

      {editingStepId && (
        <Modal isOpen={true} onClose={() => setEditingStepId(null)}>
          <div className="w-[min(420px,calc(100vw-2rem))]">
            <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
              <div className="border-b border-gray-100 px-6 pb-4 pt-6">
                <h2 className="text-lg font-semibold text-gray-900">Edit Formula Step</h2>
                <p className="text-xs text-gray-500">Update the target cell and formula.</p>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Target cell</label>
                  <input
                    value={editTarget}
                    onChange={(e) => setEditTarget(e.target.value)}
                    className="mt-2 w-full rounded border border-gray-200 px-3 py-2 text-sm"
                    placeholder="A1"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700">Formula</label>
                  <input
                    value={editFormula}
                    onChange={(e) => setEditFormula(e.target.value)}
                    className="mt-2 w-full rounded border border-gray-200 px-3 py-2 text-sm"
                    placeholder="=SUM(A1:A10)"
                  />
                </div>
                {editError && <div className="text-xs text-red-600">{editError}</div>}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 p-4">
                <button
                  type="button"
                  onClick={() => setEditingStepId(null)}
                  className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {exportModalOpen && (
        <Modal isOpen={true} onClose={() => setExportModalOpen(false)}>
          <div className="w-[min(420px,calc(100vw-2rem))]">
            <div className="rounded-2xl bg-white shadow-2xl ring-1 ring-gray-100">
              <div className="border-b border-gray-100 px-6 pb-4 pt-6">
                <h2 className="text-lg font-semibold text-gray-900">Export Pattern</h2>
                <p className="text-xs text-gray-500">Save selected steps as a reusable pattern.</p>
              </div>
              <div className="space-y-4 p-6">
                <div>
                  <label className="text-xs font-semibold text-gray-700">Pattern name</label>
                  <input
                    value={exportName}
                    onChange={(e) => setExportName(e.target.value)}
                    className="mt-2 w-full rounded border border-gray-200 px-3 py-2 text-sm"
                    placeholder="My Pattern"
                  />
                </div>
                {exportError && <div className="text-xs text-red-600">{exportError}</div>}
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-gray-100 p-4">
                <button
                  type="button"
                  onClick={() => setExportModalOpen(false)}
                  className="rounded border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                  disabled={exporting}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (!exportName.trim()) {
                      setExportError('Pattern name is required');
                      return;
                    }
                    setExportError(null);
                    const success = await onExportPattern(exportName.trim(), selectedSteps);
                    if (success) {
                      setExportModalOpen(false);
                    }
                  }}
                  className="rounded bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                  disabled={exporting}
                >
                  {exporting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

