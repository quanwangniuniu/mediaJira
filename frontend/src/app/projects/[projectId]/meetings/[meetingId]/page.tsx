'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AlertCircle, Circle, CheckCircle2, Copy, ExternalLink, Check, Loader2, Plus, Trash2, CalendarDays, Target, Users, Lightbulb, Rocket } from 'lucide-react';
import { motion } from 'framer-motion';
import { DndContext, closestCenter, type DragEndEvent, type DragStartEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MeetingHeader } from '@/components/meetings/meeting-header';
import { AgendaSection } from '@/components/meetings/agenda-section';
import { ArtifactsSection } from '@/components/meetings/artifacts-section';
import { SortableBlock } from '@/components/meetings/SortableBlock';
import { CustomBlock } from '@/components/meetings/CustomBlock';
import { TemplateSidebar } from '@/components/meetings/TemplateSidebar';
import type { SidebarTemplate } from '@/components/meetings/TemplateSidebar';
import { formatProjectMemberLabel } from '@/components/meetings/projectMemberLabel';
import { DecisionAPI } from '@/lib/api/decisionApi';
import { TaskAPI } from '@/lib/api/taskApi';
import { SpreadsheetAPI } from '@/lib/api/spreadsheetApi';
import { MeetingsAPI } from '@/lib/api/meetingsApi';
import type { TaskData } from '@/types/task';
import {
  isKnownMeetingArtifactKind,
  meetingArtifactDisplayLabel,
  meetingArtifactHref,
  normalizeMeetingArtifactType,
  type MeetingArtifactResourceIndex,
} from '@/lib/meetings/artifactLinks';
import type { AgendaItem, ArtifactLink, Meeting, ParticipantLink } from '@/types/meeting';
import { ProjectAPI, type ProjectData, type ProjectMemberData } from '@/lib/api/projectApi';
import { Button } from '@/components/ui/button';
import AutoResizeTextarea from '@/components/ui/AutoResizeTextarea';
import {
  meetingDateToInput,
  meetingTimeToInput,
  normalizeTimeForApi,
} from '@/lib/meetingSchedule';
import { getNestedTemplateForMeetingType, getTemplateForMeetingType, type NestedAgendaTemplateSection } from '@/lib/meetings/meetingTemplates';
import { MEETING_TYPE_OPTIONS } from '@/lib/meetings/meetingTypes';

const normalizeNumberParam = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return NaN;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
};

type WorkspaceBlockType = 'header' | 'agenda' | 'participants' | 'artifacts' | 'custom_block';
type WorkspaceBlock = {
  id: string;
  type: WorkspaceBlockType;
  title?: string;
  content?: string;
};
type NestedSection = NestedAgendaTemplateSection;

function normalizeMeetingFromApi(m: Meeting): Meeting {
  const raw = m.layout_config;
  const layout = Array.isArray(raw) ? raw : [];
  return { ...m, layout_config: layout };
}

function SortableAgendaRow({
  item,
  isSaving,
  isDeleting,
  isPrioritySaving,
  draftValue,
  onDraftChange,
  onBlurSave,
  onDelete,
  onPriorityChange,
}: {
  item: AgendaItem;
  isSaving: boolean;
  isDeleting: boolean;
  isPrioritySaving: boolean;
  draftValue: string;
  onDraftChange: (next: string) => void;
  onBlurSave: () => void;
  onDelete: () => void;
  onPriorityChange: (next: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2 ${
        item.is_priority ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100'
      } ${isDragging ? 'opacity-70 shadow-sm ring-1 ring-blue-100' : ''}`}
    >
      {/* Use div (not button) as drag handle — nested buttons + dnd-kit + React can cause DOM/removeChild mismatches */}
      <div
        className="cursor-grab rounded-md p-1 text-gray-300 opacity-0 transition group-hover:opacity-100 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ≡
      </div>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Circle className="h-4 w-4 text-gray-300" />
        <AutoResizeTextarea
          value={draftValue}
          onChange={(e) => onDraftChange(e.currentTarget.value)}
          onBlur={onBlurSave}
          placeholder="Agenda item…"
          className="w-full rounded-md border border-transparent bg-transparent px-0 py-0.5 text-sm text-gray-700 focus:border-transparent focus:outline-none focus:ring-0"
        />
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="min-w-[34px] text-right text-sm text-gray-400">{item.is_priority ? '10m' : '5m'}</span>
        <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-gray-600 select-none">
          <input
            type="checkbox"
            checked={item.is_priority}
            disabled={isDeleting || isPrioritySaving}
            onChange={(e) => onPriorityChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          <span className={item.is_priority ? 'font-medium text-amber-900' : 'text-gray-400'}>
            {isPrioritySaving ? '...' : 'Focus'}
          </span>
        </label>
        {isSaving ? (
          <span className="text-xs text-gray-500">Saving…</span>
        ) : (
          <span className="text-xs text-gray-300" aria-hidden="true">
            <Check className="h-3 w-3" />
          </span>
        )}
        <button
          type="button"
          onClick={onDelete}
          disabled={isDeleting}
          className="rounded-md p-2 text-gray-500 hover:bg-gray-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Delete agenda item"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SortableNestedSection({
  section,
  isEditingTitle,
  onStartEditTitle,
  onSaveTitle,
  children,
}: {
  section: NestedSection;
  isEditingTitle: boolean;
  onStartEditTitle: () => void;
  onSaveTitle: (title: string) => void;
  children: React.ReactNode;
}) {
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({
    id: `section:${section.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="p-1"
    >
      <div className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-black uppercase">
        <button
          type="button"
          className="cursor-grab rounded p-1 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-gray-500 active:cursor-grabbing"
          {...(attributes as React.HTMLAttributes<HTMLButtonElement>)}
          {...listeners}
          aria-label="Drag section"
        >
          ⠿
        </button>
        {isEditingTitle ? (
          <input
            autoFocus
            defaultValue={section.title}
            onBlur={(e) => onSaveTitle(e.currentTarget.value.trim() || 'New Section')}
            onKeyDown={(e) => {
              if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
            }}
            className="bg-transparent text-sm font-bold text-black outline-none"
          />
        ) : (
          <button type="button" onClick={onStartEditTitle} className="text-left text-sm font-bold text-black">
            {section.title}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function SortableNestedItem({
  sectionId,
  item,
  onToggle,
  onTextChange,
  onDurationChange,
}: {
  sectionId: string;
  item: NestedSection['items'][number];
  onToggle: () => void;
  onTextChange: (text: string) => void;
  onDurationChange: (duration: string) => void;
}) {
  const { setNodeRef, attributes, listeners, transform, transition } = useSortable({
    id: `item:${item.id}`,
  });
  const [editingText, setEditingText] = useState(false);
  const [editingDuration, setEditingDuration] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className="group/item flex items-center gap-2 px-1 py-1"
      data-section-id={sectionId}
    >
      <button
        type="button"
        className="cursor-grab rounded p-1 text-gray-300 opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-gray-500 active:cursor-grabbing"
        {...(attributes as React.HTMLAttributes<HTMLButtonElement>)}
        {...listeners}
        aria-label="Drag item"
      >
        ⠿
      </button>
      <button type="button" onClick={onToggle} className="text-gray-400 hover:text-gray-600" aria-label="Toggle complete">
        {item.completed ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Circle className="h-4 w-4 text-gray-400" />}
      </button>
      {editingText ? (
        <input
          autoFocus
          value={item.text}
          onChange={(e) => onTextChange(e.target.value)}
          onBlur={() => setEditingText(false)}
          className={`min-w-0 flex-1 border-none bg-transparent px-1 py-0.5 text-sm outline-none ${
            item.completed ? 'line-through text-slate-400' : 'text-slate-700'
          }`}
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingText(true)}
          className={`min-w-0 flex-1 px-1 py-0.5 text-left text-sm ${
            item.completed ? 'line-through text-slate-400' : 'text-slate-700'
          }`}
        >
          {item.text || 'Empty item'}
        </button>
      )}
      {editingDuration ? (
        <input
          autoFocus
          value={item.duration}
          onChange={(e) => onDurationChange(e.target.value)}
          onBlur={() => setEditingDuration(false)}
          className="w-12 border-none bg-transparent px-1 py-0.5 text-right text-xs text-gray-500 outline-none"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditingDuration(true)}
          className="w-12 text-right text-xs text-gray-400"
        >
          {item.duration}
        </button>
      )}
    </div>
  );
}

export default function MeetingWorkspacePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = normalizeNumberParam(params?.projectId);
  const meetingId = normalizeNumberParam(params?.meetingId);

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
  const [participants, setParticipants] = useState<ParticipantLink[]>([]);
  const [artifacts, setArtifacts] = useState<ArtifactLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newAgendaText, setNewAgendaText] = useState('');
  const [newAgendaPriority, setNewAgendaPriority] = useState(false);
  const [addingAgenda, setAddingAgenda] = useState(false);
  const [agendaDrafts, setAgendaDrafts] = useState<Record<number, string>>({});
  const [savingAgendaIds, setSavingAgendaIds] = useState<Set<number>>(new Set());
  const [savingAgendaPriorityIds, setSavingAgendaPriorityIds] = useState<Set<number>>(new Set());
  const [deletingAgendaIds, setDeletingAgendaIds] = useState<Set<number>>(new Set());
  const saveTimersRef = useRef<Record<number, number | null>>({});

  const [projectMembers, setProjectMembers] = useState<ProjectMemberData[]>([]);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [newParticipantUserId, setNewParticipantUserId] = useState<number | null>(null);
  const [newParticipantRole, setNewParticipantRole] = useState('');
  const [isParticipantEditorOpen, setIsParticipantEditorOpen] = useState(false);
  const [addingParticipant, setAddingParticipant] = useState(false);
  const [participantRoleDrafts, setParticipantRoleDrafts] = useState<Record<number, string>>({});
  const [savingParticipantIds, setSavingParticipantIds] = useState<Set<number>>(new Set());
  const [removingParticipantIds, setRemovingParticipantIds] = useState<Set<number>>(new Set());

  const [artifactResources, setArtifactResources] = useState<MeetingArtifactResourceIndex>({
    decisions: [],
    tasks: [],
    spreadsheets: [],
  });
  const [artifactResourcesLoading, setArtifactResourcesLoading] = useState(false);
  const [addingArtifact, setAddingArtifact] = useState(false);
  const [isArtifactEditorOpen, setIsArtifactEditorOpen] = useState(false);
  const [artifactEditorType, setArtifactEditorType] = useState<'decision' | 'task' | 'spreadsheet'>(
    'decision',
  );
  const [artifactEditorId, setArtifactEditorId] = useState<number | null>(null);
  const [removingArtifactIds, setRemovingArtifactIds] = useState<Set<number>>(new Set());

  const [schedDateDraft, setSchedDateDraft] = useState('');
  const [schedTimeDraft, setSchedTimeDraft] = useState('');
  const [extRefDraft, setExtRefDraft] = useState('');
  const [savingMeetingMeta, setSavingMeetingMeta] = useState(false);
  const [meetingTypeSaving, setMeetingTypeSaving] = useState(false);
  const [isAgendaDragging, setIsAgendaDragging] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState<string | null>(null);
  const [templateDirty, setTemplateDirty] = useState(false);
  const [nestedSections, setNestedSections] = useState<NestedSection[]>([]);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [activeSectionDragId, setActiveSectionDragId] = useState<string | null>(null);
  const [activeItemDragId, setActiveItemDragId] = useState<string | null>(null);
  const [layoutSaving, setLayoutSaving] = useState(false);
  const [layoutSaveFeedback, setLayoutSaveFeedback] = useState<'idle' | 'saving' | 'saved'>('idle');
  const layoutSavedTimerRef = useRef<number | null>(null);
  const [originalLayout, setOriginalLayout] = useState<WorkspaceBlock[] | null>(null);

  const [customTemplates, setCustomTemplates] = useState<SidebarTemplate[]>([]);
  const [blocks, setBlocks] = useState<WorkspaceBlock[]>([
    { id: 'header', type: 'header' },
    { id: 'agenda', type: 'agenda' },
    { id: 'participants', type: 'participants' },
    { id: 'artifacts', type: 'artifacts' },
  ]);

  const orderedAgenda = useMemo(() => {
    const list = Array.isArray(agendaItems) ? agendaItems : [];
    return [...list].sort((a, b) => a.order_index - b.order_index || a.id - b.id);
  }, [agendaItems]);

  const layoutStorageKey = useMemo(
    () =>
      Number.isFinite(projectId) && Number.isFinite(meetingId)
        ? `meeting-workspace-layout:${projectId}:${meetingId}`
        : null,
    [projectId, meetingId],
  );

  useEffect(() => {
    if (!meeting || !layoutStorageKey) return;
    let hydrated = false;
    let foundSaved = false;
    const rawFromApi = normalizeMeetingFromApi(meeting as Meeting).layout_config;
    const blocksFromApi = Array.isArray(rawFromApi) ? rawFromApi : [];
    if (Array.isArray(rawFromApi)) {
      setBlocks(blocksFromApi as WorkspaceBlock[]);
      setOriginalLayout(blocksFromApi as WorkspaceBlock[]);
      hydrated = true;
    }
    if (!hydrated && typeof window !== 'undefined') {
      const saved = window.localStorage.getItem(layoutStorageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setBlocks(parsed as WorkspaceBlock[]);
            setOriginalLayout(parsed as WorkspaceBlock[]);
            foundSaved = true;
          }
        } catch {
          // ignore malformed local layout
        }
      }
    }

    if (!hydrated && !foundSaved) {
      // Capture default module set as the baseline for "dirty" detection.
      setOriginalLayout((prev) => prev ?? blocks);
    }
  }, [meeting?.id, layoutStorageKey]);

  const isLayoutDirty = useMemo(() => {
    if (!originalLayout) return false;
    return JSON.stringify(blocks) !== JSON.stringify(originalLayout);
  }, [blocks, originalLayout]);

  const saveLayoutNow = async (nextBlocks: WorkspaceBlock[]) => {
    if (!layoutStorageKey || !Number.isFinite(projectId) || !Number.isFinite(meetingId)) return;
    const getApiErrorMessageLocal = (err: unknown, fallback: string) => {
      const anyErr = err as {
        response?: { data?: any };
        message?: string;
      };
      const data = anyErr?.response?.data as any;
      if (data?.error) return String(data.error);
      if (data?.detail) return String(data.detail);
      if (data && typeof data === 'object') {
        try {
          return JSON.stringify(data);
        } catch {
          return fallback;
        }
      }
      return String(anyErr?.message || fallback);
    };

    setLayoutSaving(true);
    setLayoutSaveFeedback('saving');
    try {
      await MeetingsAPI.saveMeetingLayout(projectId, meetingId, nextBlocks);
      setOriginalLayout(nextBlocks);
      setLayoutSaveFeedback('saved');
      if (layoutSavedTimerRef.current) window.clearTimeout(layoutSavedTimerRef.current);
      layoutSavedTimerRef.current = window.setTimeout(() => setLayoutSaveFeedback('idle'), 1800);
    } catch (err: unknown) {
      toast.error(getApiErrorMessageLocal(err, 'Failed to save layout'));
      setLayoutSaveFeedback('idle');
    } finally {
      setLayoutSaving(false);
    }
  };

  useEffect(() => {
    if (!layoutStorageKey) return;
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(layoutStorageKey, JSON.stringify(blocks));
  }, [blocks, layoutStorageKey]);

  useEffect(() => {
    setAgendaDrafts((prev) => {
      const next: Record<number, string> = { ...prev };
      for (const item of orderedAgenda) {
        if (!(item.id in next)) next[item.id] = item.content ?? '';
      }
      for (const key of Object.keys(next)) {
        const id = Number(key);
        if (!Number.isFinite(id)) continue;
        if (!orderedAgenda.some((item) => item.id === id)) delete next[id];
      }
      return next;
    });
  }, [orderedAgenda]);

  useEffect(() => {
    // Sync flat backend agenda into default single nested section when no template is active.
    if (activeTemplateId) return;
    setNestedSections([
      {
        id: 'section-default',
        title: 'Agenda',
        items: orderedAgenda.map((item) => ({
          id: String(item.id),
          text: item.content ?? '',
          completed: false,
          duration: item.is_priority ? '10m' : '5m',
        })),
      },
    ]);
  }, [orderedAgenda, activeTemplateId]);

  const orderedParticipants = useMemo(() => {
    const list = Array.isArray(participants) ? participants : [];
    return [...list].sort((a, b) => (a.user ?? 0) - (b.user ?? 0) || a.id - b.id);
  }, [participants]);

  useEffect(() => {
    setParticipantRoleDrafts((prev) => {
      const next: Record<number, string> = { ...prev };
      for (const p of orderedParticipants) {
        if (!(p.id in next)) next[p.id] = p.role ?? '';
      }
      for (const key of Object.keys(next)) {
        const id = Number(key);
        if (!Number.isFinite(id)) continue;
        if (!orderedParticipants.some((p) => p.id === id)) delete next[id];
      }
      return next;
    });
  }, [orderedParticipants]);

  useEffect(() => {
    if (!meeting) return;
    setSchedDateDraft(meetingDateToInput(meeting.scheduled_date));
    setSchedTimeDraft(meetingTimeToInput(meeting.scheduled_time));
    setExtRefDraft(meeting.external_reference ?? '');
  }, [
    meeting?.id,
    meeting?.scheduled_date,
    meeting?.scheduled_time,
    meeting?.external_reference,
  ]);

  useEffect(() => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) {
      setError('Project ID and Meeting ID are required');
      setProject(null);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [m, agenda, people, links, mems, p] = await Promise.all([
          MeetingsAPI.getMeeting(projectId, meetingId),
          MeetingsAPI.listAgendaItems(projectId, meetingId),
          MeetingsAPI.listParticipants(projectId, meetingId),
          MeetingsAPI.listArtifacts(projectId, meetingId),
          ProjectAPI.getAllProjectMembers(projectId).catch(() => [] as ProjectMemberData[]),
          ProjectAPI.getProject(projectId).catch(() => null as ProjectData | null),
        ]);

        setMeeting(normalizeMeetingFromApi(m));
        setProject(p);
        setAgendaItems(Array.isArray(agenda) ? agenda : []);
        setParticipants(Array.isArray(people) ? people : []);
        setArtifacts(Array.isArray(links) ? links : []);
        setProjectMembers(
          Array.isArray(mems) ? mems.filter((row) => row.is_active) : [],
        );
      } catch (err: unknown) {
        console.error('Failed to load meeting workspace:', err);
        setProject(null);
        setProjectMembers([]);
        const message =
          (err as { response?: { data?: { error?: string; detail?: string } }; message?: string })
            ?.response?.data?.error ||
          (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          (err as { message?: string })?.message ||
          'Failed to load meeting workspace';
        setError(String(message));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId, meetingId]);

  // Meeting Type Sync: when opening a meeting, auto-apply the matching template agenda structure.
  // This ensures the initial editor state matches `meeting.meeting_type`.
  useEffect(() => {
    if (!meeting) return;
    if (!meeting.meeting_type) return;
    if (activeTemplateId) return; // avoid overriding user/template interactions
    if (loading) return;
    void applyTemplateIfAgendaEmpty(meeting.meeting_type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting?.id, loading]);

  // Load saved custom templates so the sidebar reflects persisted data.
  useEffect(() => {
    if (loading) return;
    void (async () => {
      try {
        const list = await MeetingsAPI.listMeetingTemplates();
        const normalized: SidebarTemplate[] = (Array.isArray(list) ? list : [])
          .map((tpl) => {
            const rawCfg = tpl.layout_config as any;

            // We only want templates created via "Configure Template" (layout_config = { blocks, nestedSections }).
            // Some built-in templates saved via "Save Changes" store layout_config as nestedSections array only.
            const cfgObj = rawCfg && typeof rawCfg === 'object' ? rawCfg : null;
            const hasBlocksArray = !!cfgObj && Array.isArray(cfgObj.blocks);
            const hasLegacyBlocksArray =
              Array.isArray(rawCfg) &&
              rawCfg.length > 0 &&
              rawCfg[0] &&
              typeof rawCfg[0] === 'object' &&
              'type' in rawCfg[0];

            if (!hasBlocksArray && !hasLegacyBlocksArray) return null;

            const blocks = hasBlocksArray ? (cfgObj.blocks as WorkspaceBlock[]) : (rawCfg as WorkspaceBlock[]);
            const meta = `${blocks.length} modules`;

            return {
              id: tpl.id,
              name: tpl.name,
              meta,
              layout_config: tpl.layout_config,
            } as SidebarTemplate;
          })
          .filter(Boolean) as SidebarTemplate[];

        setCustomTemplates(normalized);
      } catch (err) {
        // Ignore sidebar load failures; built-in templates still work.
        console.error('Failed to load custom meeting templates:', err);
      }
    })();
  }, [loading]);

  useEffect(() => {
    if (!Number.isFinite(projectId) || !meeting) {
      setArtifactResources({ decisions: [], tasks: [], spreadsheets: [] });
      setArtifactResourcesLoading(false);
      return;
    }

    let cancelled = false;
    setArtifactResourcesLoading(true);

    const load = async () => {
      try {
        const [dList, tRes, ssRes] = await Promise.all([
          DecisionAPI.listDecisions(projectId),
          TaskAPI.getTasks({ project_id: projectId }),
          SpreadsheetAPI.listSpreadsheets(projectId, { page_size: 200 }),
        ]);
        if (cancelled) return;
        const rawTasks = (tRes as { data?: { results?: TaskData[] } & TaskData[] }).data;
        const tasksList = Array.isArray(rawTasks?.results)
          ? rawTasks.results
          : Array.isArray(rawTasks)
            ? rawTasks
            : [];
        setArtifactResources({
          decisions: dList.items ?? [],
          tasks: tasksList,
          spreadsheets: ssRes.results ?? [],
        });
      } catch {
        if (!cancelled) {
          setArtifactResources({ decisions: [], tasks: [], spreadsheets: [] });
        }
      } finally {
        if (!cancelled) setArtifactResourcesLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectId, meeting?.id]);

  const getApiErrorMessage = (err: unknown, fallback: string) => {
    const anyErr = err as {
      response?: { data?: unknown };
      message?: string;
    };
    const data = anyErr?.response?.data as any;
    if (data?.error) return String(data.error);
    if (data?.detail) return String(data.detail);
    if (data && typeof data === 'object') {
      try {
        return JSON.stringify(data);
      } catch {
        // ignore
      }
    }
    return String(anyErr?.message || fallback);
  };

  const saveMeetingMeta = async () => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;
    if (savingMeetingMeta) return;

    setSavingMeetingMeta(true);
    try {
      const updated = await MeetingsAPI.patchMeeting(projectId, meetingId, {
        scheduled_date: schedDateDraft.trim() || null,
        scheduled_time: schedTimeDraft.trim() ? normalizeTimeForApi(schedTimeDraft) : null,
        external_reference: extRefDraft.trim() || null,
      });
      setMeeting(normalizeMeetingFromApi(updated));
      toast.success('Schedule & reference saved');
    } catch (err: unknown) {
      console.error('Failed to save meeting meta:', err);
      toast.error(getApiErrorMessage(err, 'Failed to save meeting details'));
    } finally {
      setSavingMeetingMeta(false);
    }
  };

  const applyTemplateIfAgendaEmpty = async (meetingType: string) => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;
    if (orderedAgenda.length > 0) return;

    const templateSections = getNestedTemplateForMeetingType(meetingType);
    if (templateSections.length === 0) return;
    const templateItems = templateSections.flatMap((s) => s.items);

    // Ensure nested agenda state matches the meeting type template (and uses numeric ids after creation)
    setActiveTemplateId(meetingType);
    setTemplateDirty(false);
    setNestedSections(templateSections);

    try {
      for (let i = 0; i < templateItems.length; i += 1) {
        const item = templateItems[i];
        await MeetingsAPI.createAgendaItem(projectId, meetingId, {
          content: item.text,
          order_index: i,
          is_priority: item.duration === '10m',
        });
      }
      const refreshed = await MeetingsAPI.listAgendaItems(projectId, meetingId);
      const refreshedList = Array.isArray(refreshed) ? refreshed : [];
      setAgendaItems(refreshedList);

      // Replace nested item ids (string template ids) with backend numeric agenda item ids,
      // so edits can debounce-save to the backend.
      if (refreshedList.length > 0) {
        let idx = 0;
        const nextNested = templateSections.map((section) => ({
          ...section,
          items: section.items.map((it) => {
            const agendaItem = refreshedList[idx];
            idx += 1;
            return {
              ...it,
              id: agendaItem ? String(agendaItem.id) : it.id,
            };
          }),
        }));
        setNestedSections(nextNested);
      }
      toast.success('Template agenda applied');
    } catch (err: unknown) {
      console.error('Failed to apply meeting template:', err);
      toast.error(getApiErrorMessage(err, 'Failed to apply template'));
    }
  };

  const handleMeetingTypeChange = async (nextType: string) => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;
    if (!meeting) return;
    const trimmed = nextType.trim();
    if (!trimmed || trimmed === meeting.meeting_type || meetingTypeSaving) return;

    setMeetingTypeSaving(true);
    try {
      const updated = await MeetingsAPI.patchMeeting(projectId, meetingId, {
        meeting_type: trimmed,
      });
      setMeeting(normalizeMeetingFromApi(updated));
      await applyTemplateIfAgendaEmpty(trimmed);
      toast.success('Meeting type updated');
    } catch (err: unknown) {
      console.error('Failed to update meeting type:', err);
      toast.error(getApiErrorMessage(err, 'Failed to update meeting type'));
    } finally {
      setMeetingTypeSaving(false);
    }
  };

  const saveMeetingTitle = async (nextTitle: string) => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;
    if (!meeting || nextTitle.trim() === meeting.title.trim()) return;
    try {
      const updated = await MeetingsAPI.patchMeeting(projectId, meetingId, { title: nextTitle.trim() });
      setMeeting(normalizeMeetingFromApi(updated));
      toast.success('Title saved');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save title'));
    }
  };

  const saveMeetingObjective = async (nextObjective: string) => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;
    if (!meeting || (nextObjective ?? '').trim() === (meeting.objective ?? '').trim()) return;
    try {
      const updated = await MeetingsAPI.patchMeeting(projectId, meetingId, { objective: nextObjective.trim() || '' });
      setMeeting(normalizeMeetingFromApi(updated));
      toast.success('Objective saved');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save objective'));
    }
  };

  const handleTemplateSelect = async (meetingType: string) => {
    setIsSidebarOpen(true);
    setNestedSections(getNestedTemplateForMeetingType(meetingType));
    setActiveTemplateId(meetingType);
    setTemplateDirty(false);
    if (meeting?.meeting_type !== meetingType) await handleMeetingTypeChange(meetingType);
    await applyTemplateIfAgendaEmpty(meetingType);
    toast.success('Template applied');
    setIsSidebarOpen(false);
  };

  const enterCreateMode = () => {
    // Align with the requirement: configuration mode should provide a clean "LEGO base".
    setBlocks([]);
    // Use a truthy id to prevent "default single section" sync effect from overwriting
    // our draft nestedSections while the user configures a new template.
    setActiveTemplateId('create-template');
    setTemplateDirty(false);
    setNestedSections([]);
    toast('画布已清空，请添加模块开始构建', { icon: 'ℹ️' });
  };

  const applySidebarTemplate = (tpl: SidebarTemplate) => {
    if (tpl.meetingType) {
      void handleTemplateSelect(tpl.meetingType);
      return;
    }

    // Custom template: apply stored layout_config (supports both legacy array and new object shape).
    const rawCfg = tpl.layout_config as unknown;

    let layoutBlocks: WorkspaceBlock[] | null = null;
    let layoutNestedSections: NestedSection[] | null = null;

    if (Array.isArray(rawCfg)) {
      layoutBlocks = rawCfg as WorkspaceBlock[];
    } else if (rawCfg && typeof rawCfg === 'object') {
      const cfg = rawCfg as { blocks?: unknown; nestedSections?: unknown };
      if (Array.isArray(cfg.blocks)) layoutBlocks = cfg.blocks as WorkspaceBlock[];
      if (Array.isArray(cfg.nestedSections))
        layoutNestedSections = cfg.nestedSections as NestedSection[];
    }

    if (!layoutBlocks) {
      toast.error('Invalid template layout');
      return;
    }

    setBlocks(layoutBlocks);
    if (layoutNestedSections) {
      // Use a truthy id to prevent the "default single section" sync effect from overwriting our draft.
      setActiveTemplateId(tpl.id);
      setNestedSections(layoutNestedSections);
    } else {
      setActiveTemplateId(null);
    }
    setTemplateDirty(false);
    void (async () => {
      // If meeting agenda is empty, create backend agenda rows so nested edits can debounce-save.
      if (orderedAgenda.length === 0 && layoutNestedSections) {
        const flatItems = layoutNestedSections.flatMap((s) => s.items);
        try {
          for (let i = 0; i < flatItems.length; i += 1) {
            const item = flatItems[i];
            await MeetingsAPI.createAgendaItem(projectId, meetingId, {
              content: item.text,
              order_index: i,
              is_priority: item.duration === '10m',
            });
          }

          const refreshed = await MeetingsAPI.listAgendaItems(projectId, meetingId);
          const refreshedList = Array.isArray(refreshed) ? refreshed : [];
          setAgendaItems(refreshedList);

          // Sync nested item ids to backend numeric agenda item ids.
          if (refreshedList.length > 0) {
            let idx = 0;
            const nextNested = layoutNestedSections.map((section) => ({
              ...section,
              items: section.items.map((it) => {
                const agendaItem = refreshedList[idx];
                idx += 1;
                return {
                  ...it,
                  id: agendaItem ? String(agendaItem.id) : it.id,
                };
              }),
            }));
            setNestedSections(nextNested);
          }
        } catch (err: unknown) {
          toast.error(getApiErrorMessage(err, 'Failed to apply template'));
          return;
        }
      }

      toast.success('Template applied');
      setIsSidebarOpen(false);
    })();
  };

  const orderedArtifacts = useMemo(() => {
    const list = Array.isArray(artifacts) ? artifacts : [];
    return [...list].sort(
      (a, b) =>
        String(a.artifact_type ?? '').localeCompare(String(b.artifact_type ?? '')) ||
        (a.artifact_id ?? 0) - (b.artifact_id ?? 0) ||
        a.id - b.id,
    );
  }, [artifacts]);

  const templateIcons = [
    { icon: CalendarDays, tint: 'bg-blue-100 text-blue-600' },
    { icon: Target, tint: 'bg-purple-100 text-purple-600' },
    { icon: Users, tint: 'bg-green-100 text-green-600' },
    { icon: Lightbulb, tint: 'bg-yellow-100 text-yellow-600' },
    { icon: Rocket, tint: 'bg-indigo-100 text-indigo-600' },
  ] as const;

  const templateLibrary = MEETING_TYPE_OPTIONS.map((opt, index) => {
    const matched = templateIcons[index % templateIcons.length];
    const itemCount = getTemplateForMeetingType(opt.value).length;
    return {
      id: opt.value,
      meetingType: opt.value,
      name: opt.label,
      meta: `1 section • ${itemCount} items`,
      icon: matched.icon,
      tint: matched.tint,
    };
  });

  const templateList: SidebarTemplate[] = [...templateLibrary, ...customTemplates];

  const participantLabelForUserId = (userId: number) => {
    const row = projectMembers.find((m) => m.user.id === userId);
    return row ? formatProjectMemberLabel(row) : `User #${userId}`;
  };

  const availableMembers = useMemo(
    () => projectMembers.filter((m) => !orderedParticipants.some((p) => p.user === m.user.id)),
    [projectMembers, orderedParticipants],
  );

  const artifactChoices = useMemo(() => {
    const linked = new Set(artifacts.map((a) => `${normalizeMeetingArtifactType(a.artifact_type)}:${a.artifact_id}`));
    const byType = {
      decision: artifactResources.decisions
        .filter((d) => !linked.has(`decision:${d.id}`))
        .map((d) => ({ id: d.id, label: d.title?.trim() || `Decision #${d.id}` })),
      task: artifactResources.tasks
        .filter((t) => t.id != null && !linked.has(`task:${t.id}`))
        .map((t) => ({ id: t.id as number, label: t.summary?.trim() || `Task #${t.id}` })),
      spreadsheet: artifactResources.spreadsheets
        .filter((s) => !linked.has(`spreadsheet:${s.id}`))
        .map((s) => ({ id: s.id, label: s.name?.trim() || `Spreadsheet #${s.id}` })),
    };
    return byType;
  }, [artifactResources, artifacts]);

  const addParticipant = async () => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;
    if (addingParticipant) return;

    if (newParticipantUserId == null) {
      toast.error('Select a project member');
      return;
    }

    const userId = newParticipantUserId;

    setAddingParticipant(true);
    try {
      const created = await MeetingsAPI.addParticipant(projectId, meetingId, {
        user: userId,
        role: newParticipantRole.trim() ? newParticipantRole.trim() : null,
      });
      setParticipants((prev) => [...(Array.isArray(prev) ? prev : []), created]);
      setNewParticipantUserId(null);
      setNewParticipantRole('');
      setIsParticipantEditorOpen(false);
      toast.success('Participant added');
    } catch (err: unknown) {
      console.error('Failed to add participant:', err);
      toast.error(getApiErrorMessage(err, 'Failed to add participant'));
    } finally {
      setAddingParticipant(false);
    }
  };

  const linkMeetingArtifact = async (artifact_type: string, artifact_id: number) => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;
    if (addingArtifact) return;

    const id = Math.trunc(artifact_id);
    if (!Number.isFinite(id) || id < 1) {
      toast.error('Invalid artifact id');
      return;
    }

    const storedType = isKnownMeetingArtifactKind(artifact_type)
      ? normalizeMeetingArtifactType(artifact_type)
      : artifact_type.trim().slice(0, 50);
    if (!storedType) {
      toast.error('Artifact type is required');
      return;
    }

    const dup = artifacts.some(
      (x) =>
        normalizeMeetingArtifactType(x.artifact_type) === normalizeMeetingArtifactType(storedType) &&
        x.artifact_id === id,
    );
    if (dup) {
      toast.error('This resource is already linked');
      return;
    }

    setAddingArtifact(true);
    try {
      const created = await MeetingsAPI.addArtifact(projectId, meetingId, {
        artifact_type: storedType,
        artifact_id: id,
      });
      setArtifacts((prev) => [...(Array.isArray(prev) ? prev : []), created]);
      setIsArtifactEditorOpen(false);
      setArtifactEditorId(null);
      toast.success('Artifact linked');
    } catch (err: unknown) {
      console.error('Failed to add artifact:', err);
      toast.error(getApiErrorMessage(err, 'Failed to add artifact'));
    } finally {
      setAddingArtifact(false);
    }
  };

  const removeArtifact = async (artifactLinkId: number) => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;
    if (removingArtifactIds.has(artifactLinkId)) return;

    const snapshot = artifacts;
    setRemovingArtifactIds((prev) => new Set([...prev, artifactLinkId]));
    setArtifacts((prev) => prev.filter((a) => a.id !== artifactLinkId));

    try {
      await MeetingsAPI.removeArtifact(projectId, meetingId, artifactLinkId);
      toast.success('Artifact unlinked');
    } catch (err: unknown) {
      console.error('Failed to remove artifact:', err);
      setArtifacts(snapshot);
      toast.error(getApiErrorMessage(err, 'Failed to remove artifact'));
    } finally {
      setRemovingArtifactIds((prev) => {
        const next = new Set(prev);
        next.delete(artifactLinkId);
        return next;
      });
    }
  };

  const saveParticipantRole = async (participantLinkId: number, nextRole: string) => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;
    if (savingParticipantIds.has(participantLinkId)) return;

    const current = participants.find((p) => p.id === participantLinkId);
    const trimmed = nextRole.trim();
    const currentRole = (current?.role ?? '').trim();
    if (trimmed === currentRole) return;

    setSavingParticipantIds((prev) => new Set([...prev, participantLinkId]));
    try {
      const updated = await MeetingsAPI.patchParticipant(projectId, meetingId, participantLinkId, {
        role: trimmed ? trimmed : null,
      });
      setParticipants((prev) => prev.map((p) => (p.id === participantLinkId ? updated : p)));
      toast.success('Role saved');
    } catch (err: unknown) {
      console.error('Failed to save participant role:', err);
      toast.error(getApiErrorMessage(err, 'Failed to save participant role'));
      if (current) setParticipantRoleDrafts((prev) => ({ ...prev, [participantLinkId]: current.role ?? '' }));
    } finally {
      setSavingParticipantIds((prev) => {
        const next = new Set(prev);
        next.delete(participantLinkId);
        return next;
      });
    }
  };

  const removeParticipant = async (participantLinkId: number) => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;
    if (removingParticipantIds.has(participantLinkId)) return;

    const snapshot = participants;
    setRemovingParticipantIds((prev) => new Set([...prev, participantLinkId]));
    setParticipants((prev) => prev.filter((p) => p.id !== participantLinkId));

    try {
      await MeetingsAPI.removeParticipant(projectId, meetingId, participantLinkId);
      toast.success('Participant removed');
    } catch (err: unknown) {
      console.error('Failed to remove participant:', err);
      setParticipants(snapshot);
      toast.error(getApiErrorMessage(err, 'Failed to remove participant'));
    } finally {
      setRemovingParticipantIds((prev) => {
        const next = new Set(prev);
        next.delete(participantLinkId);
        return next;
      });
    }
  };

  const saveAgendaItem = async (
    agendaItemId: number,
    nextContent: string,
    opts?: { silent?: boolean },
  ) => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;

    const trimmed = nextContent.trim();
    const current = agendaItems.find((a) => a.id === agendaItemId);
    const currentContent = (current?.content ?? '').trim();
    if (trimmed === currentContent) return;

    setSavingAgendaIds((prev) => new Set([...prev, agendaItemId]));
    try {
      const updated = await MeetingsAPI.patchAgendaItem(projectId, meetingId, agendaItemId, {
        content: trimmed,
      });
      setAgendaItems((prev) => prev.map((a) => (a.id === agendaItemId ? updated : a)));
      if (!opts?.silent) toast.success('Saved');
    } catch (err: unknown) {
      console.error('Failed to save agenda item:', err);
      toast.error(getApiErrorMessage(err, 'Failed to save agenda item'));
      if (current) setAgendaDrafts((prev) => ({ ...prev, [agendaItemId]: current.content ?? '' }));
    } finally {
      setSavingAgendaIds((prev) => {
        const next = new Set(prev);
        next.delete(agendaItemId);
        return next;
      });
    }
  };

  const patchAgendaPriority = async (agendaItemId: number, is_priority: boolean) => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;

    const current = agendaItems.find((a) => a.id === agendaItemId);
    if (!current || current.is_priority === is_priority) return;

    setSavingAgendaPriorityIds((prev) => new Set([...prev, agendaItemId]));
    try {
      const updated = await MeetingsAPI.patchAgendaItem(projectId, meetingId, agendaItemId, {
        is_priority,
      });
      setAgendaItems((prev) => prev.map((a) => (a.id === agendaItemId ? updated : a)));
    } catch (err: unknown) {
      console.error('Failed to update agenda priority:', err);
      toast.error(getApiErrorMessage(err, 'Failed to update priority'));
    } finally {
      setSavingAgendaPriorityIds((prev) => {
        const next = new Set(prev);
        next.delete(agendaItemId);
        return next;
      });
    }
  };

  const queueAgendaSave = (agendaItemId: number, nextContent: string) => {
    const existing = saveTimersRef.current[agendaItemId];
    if (existing) window.clearTimeout(existing);

    saveTimersRef.current[agendaItemId] = window.setTimeout(() => {
      saveTimersRef.current[agendaItemId] = null;
      void saveAgendaItem(agendaItemId, nextContent, { silent: true });
    }, 500);
  };

  const reorderBlocks = (activeId: string, overId: string) => {
    if (activeId === overId) return;
    setBlocks((prev) => {
      const oldIndex = prev.findIndex((b) => b.id === activeId);
      const newIndex = prev.findIndex((b) => b.id === overId);
      if (oldIndex < 0 || newIndex < 0) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const addBlock = (type: WorkspaceBlockType) => {
    if (type === 'custom_block') {
      setBlocks((prev) => [
        ...prev,
        { id: `custom-${crypto.randomUUID()}`, type: 'custom_block', title: 'Custom Block', content: '' },
      ]);
      return;
    }
    setBlocks((prev) => [...prev, { id: `${type}-${crypto.randomUUID()}`, type }]);
  };

  const removeBlock = (blockId: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== blockId));
  };

  const copyBlock = (blockId: string) => {
    setBlocks((prev) => {
      const source = prev.find((b) => b.id === blockId);
      if (!source) return prev;
      const clone: WorkspaceBlock = {
        ...source,
        id: `${source.type}-${crypto.randomUUID()}`,
        title: source.title ?? (source.type === 'custom_block' ? 'Custom Block' : undefined),
      };
      return [...prev, clone];
    });
  };

  const findSectionByItemId = (itemId: string) =>
    nestedSections.find((section) => section.items.some((item) => item.id === itemId));

  const handleNestedDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    if (id.startsWith('section:')) setActiveSectionDragId(id.replace('section:', ''));
    if (id.startsWith('item:')) setActiveItemDragId(id.replace('item:', ''));
  };

  const handleNestedDragEnd = (event: DragEndEvent) => {
    setActiveSectionDragId(null);
    setActiveItemDragId(null);
    const active = String(event.active.id ?? '');
    const over = String(event.over?.id ?? '');
    if (!active || !over || active === over) return;

    if (active.startsWith('section:') && over.startsWith('section:')) {
      const activeSectionId = active.replace('section:', '');
      const overSectionId = over.replace('section:', '');
      setNestedSections((prev) => {
        const oldIndex = prev.findIndex((s) => s.id === activeSectionId);
        const newIndex = prev.findIndex((s) => s.id === overSectionId);
        if (oldIndex < 0 || newIndex < 0) return prev;
        setTemplateDirty(true);
        return arrayMove(prev, oldIndex, newIndex);
      });
      return;
    }

    if (active.startsWith('item:')) {
      const activeItemId = active.replace('item:', '');
      const overItemId = over.replace('item:', '');
      setNestedSections((prev) => {
        const fromSection = prev.find((s) => s.items.some((i) => i.id === activeItemId));
        const toSection = prev.find((s) => s.items.some((i) => i.id === overItemId))
          ?? (over.startsWith('section:') ? prev.find((s) => s.id === over.replace('section:', '')) : undefined);
        if (!fromSection || !toSection) return prev;
        const moving = fromSection.items.find((i) => i.id === activeItemId);
        if (!moving) return prev;

        const next = prev.map((section) => ({
          ...section,
          items: section.items.filter((i) => i.id !== activeItemId),
        }));
        const targetIndex = next.findIndex((s) => s.id === toSection.id);
        if (targetIndex < 0) return prev;
        const overIndex = next[targetIndex].items.findIndex((i) => i.id === overItemId);
        const insertIndex = overIndex >= 0 ? overIndex : next[targetIndex].items.length;
        next[targetIndex].items.splice(insertIndex, 0, moving);
        setTemplateDirty(true);
        return [...next];
      });
    }
  };

  const updateNestedItem = (sectionId: string, itemId: string, patch: Partial<NestedSection['items'][number]>) => {
    setNestedSections((prev) =>
      prev.map((section) =>
        section.id !== sectionId
          ? section
          : {
              ...section,
              items: section.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
            },
      ),
    );
    setTemplateDirty(true);
  };

  const addSection = () => {
    const sectionId = `section-${crypto.randomUUID()}`;
    setNestedSections((prev) => [
      ...prev,
      { id: sectionId, title: 'New Section', items: [] },
    ]);
    setEditingSectionId(sectionId);
    setTemplateDirty(true);
  };

  const saveSectionTitle = (sectionId: string, title: string) => {
    setNestedSections((prev) =>
      prev.map((section) => (section.id === sectionId ? { ...section, title } : section)),
    );
    setEditingSectionId(null);
    setTemplateDirty(true);
  };

  const addItemToSection = (sectionId: string) => {
    setNestedSections((prev) =>
      prev.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              items: [
                ...section.items,
                {
                  id: `item-${crypto.randomUUID()}`,
                  text: 'New item',
                  completed: false,
                  duration: '5m',
                },
              ],
            }
          : section,
      ),
    );
    setTemplateDirty(true);
  };

  const saveTemplateLayout = async () => {
    if (!activeTemplateId) return;
    try {
      await MeetingsAPI.saveTemplateLayout(activeTemplateId, nestedSections);
      setTemplateDirty(false);
      toast.success('Template layout saved');
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save template layout'));
    }
  };

  const createCustomTemplate = async (payload: { name: string; layout_config: unknown }) => {
    try {
      // Ensure payload contains full nested sections/items structure for later re-application.
      const created = await MeetingsAPI.createMeetingTemplate({
        name: payload.name,
        layout_config: {
          blocks: payload.layout_config,
          nestedSections,
        },
      });

      const cfg = created.layout_config as any;
      const blocksLayout = Array.isArray(cfg?.blocks)
        ? (cfg.blocks as WorkspaceBlock[])
        : Array.isArray(cfg)
          ? (cfg as WorkspaceBlock[])
          : [];

      const meta = `${blocksLayout.length} modules`;
      const normalized: SidebarTemplate = {
        id: created.id,
        name: created.name,
        meta,
        layout_config: created.layout_config,
      };

      setCustomTemplates((prev) => [normalized, ...prev]);
      return normalized;
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, 'Failed to save template'));
      throw err;
    }
  };

  const deleteAgendaItem = async (agendaItemId: number) => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;
    if (deletingAgendaIds.has(agendaItemId)) return;

    const snapshot = agendaItems;
    setDeletingAgendaIds((prev) => new Set([...prev, agendaItemId]));
    setAgendaItems((prev) => prev.filter((a) => a.id !== agendaItemId));

    try {
      await MeetingsAPI.deleteAgendaItem(projectId, meetingId, agendaItemId);
    } catch (err: unknown) {
      console.error('Failed to delete agenda item:', err);
      setAgendaItems(snapshot);
      toast.error(getApiErrorMessage(err, 'Failed to delete agenda item'));
    } finally {
      setDeletingAgendaIds((prev) => {
        const next = new Set(prev);
        next.delete(agendaItemId);
        return next;
      });
    }
  };

  const handleAddAgendaItem = async () => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;
    const content = newAgendaText.trim();
    if (!content) return;

    const nextOrderIndex =
      orderedAgenda.length > 0 ? orderedAgenda[orderedAgenda.length - 1].order_index + 1 : 0;

    setAddingAgenda(true);
    try {
      const created = await MeetingsAPI.createAgendaItem(projectId, meetingId, {
        content,
        order_index: nextOrderIndex,
        is_priority: newAgendaPriority,
      });
      setAgendaItems((prev) => [...(Array.isArray(prev) ? prev : []), created]);
      setNewAgendaText('');
      setNewAgendaPriority(false);
    } catch (err: unknown) {
      console.error('Failed to add agenda item:', err);
      toast.error(getApiErrorMessage(err, 'Failed to add agenda item'));
    } finally {
      setAddingAgenda(false);
    }
  };

  const reorderAgendaOptimistically = async (activeId: number, overId: number) => {
    if (!projectId || Number.isNaN(projectId) || !meetingId || Number.isNaN(meetingId)) return;
    if (activeId === overId) return;

    const before = orderedAgenda;
    const oldIndex = before.findIndex((a) => a.id === activeId);
    const newIndex = before.findIndex((a) => a.id === overId);
    if (oldIndex < 0 || newIndex < 0) return;

    const moved = arrayMove(before, oldIndex, newIndex).map((item, index) => ({
      ...item,
      order_index: index,
    }));

    setAgendaItems(moved);

    try {
      await MeetingsAPI.reorderAgendaItems(projectId, meetingId, {
        items: moved.map((i) => ({ id: i.id, order_index: i.order_index })),
      });
    } catch (err: unknown) {
      console.error('Failed to reorder agenda items:', err);
      setAgendaItems(before);
      toast.error(getApiErrorMessage(err, 'Failed to reorder agenda items'));
    }
  };

  const renderBody = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="mt-3 font-medium text-gray-900">Loading meeting…</p>
          <p className="text-sm text-gray-600">Preparing workspace.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-white p-10 text-center text-red-600">
          <AlertCircle className="h-6 w-6" />
          <p className="mt-3 font-semibold">Could not load meeting</p>
          <p className="text-sm text-red-500">{error}</p>
          {Number.isNaN(projectId) ? null : (
            <button
              type="button"
              onClick={() => router.push(`/projects/${projectId}/meetings`)}
              className="mt-4 text-sm font-medium text-blue-600 hover:underline"
            >
              Back to meetings
            </button>
          )}
        </div>
      );
    }

    if (!meeting) {
      return (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
          Meeting not found.
        </div>
      );
    }

    return (
      <div className="flex w-full gap-0 overflow-hidden">
        <motion.div
          className="min-w-0"
          animate={{ width: isSidebarOpen ? 'calc(100% - 350px)' : '100%' }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        >
        <DndContext
          id={`meeting-${meetingId}-workspace-dnd`}
          collisionDetection={closestCenter}
          onDragEnd={(event) => {
            const activeId = String(event.active?.id ?? '');
            const overId = String(event.over?.id ?? '');
            if (!activeId || !overId) return;
            reorderBlocks(activeId, overId);
          }}
          accessibility={{
            announcements: {
              onDragStart: () => '',
              onDragMove: () => '',
              onDragOver: () => '',
              onDragEnd: () => '',
              onDragCancel: () => '',
            },
            screenReaderInstructions: {
              draggable: '',
            },
          }}
        >
          <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-12 text-left">
              {blocks.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500">
                  画布为空，请从侧边栏点击模块或在下方添加 Block
                </div>
              ) : null}
              {blocks.map((block) => {
                if (block.type === 'header') {
                  return (
                    <SortableBlock
                      id={block.id}
                      key={block.id}
                      actions={(
                        <div className="flex items-center gap-2 rounded-md p-0">
                          <button
                            type="button"
                            onClick={() => copyBlock(block.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                            aria-label="Copy block"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeBlock(block.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-red-600"
                            aria-label="Delete block"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    >
                      <MeetingHeader
                        title={meeting.title}
                        meetingType={meeting.meeting_type}
                        status={meeting.status}
                        meetingTypeSaving={meetingTypeSaving}
                        objective={meeting.objective}
                        scheduledDate={schedDateDraft}
                        scheduledTime={schedTimeDraft}
                        externalReference={extRefDraft}
                        saving={savingMeetingMeta}
                        onScheduledDateChange={setSchedDateDraft}
                        onScheduledTimeChange={setSchedTimeDraft}
                        onExternalReferenceChange={setExtRefDraft}
                        onMeetingTypeChange={(value) => void handleMeetingTypeChange(value)}
                        onSave={() => void saveMeetingMeta()}
                        onBack={() => router.push(`/projects/${projectId}/meetings`)}
                        onTitleSave={(value) => void saveMeetingTitle(value)}
                        onObjectiveSave={(value) => void saveMeetingObjective(value)}
                      />
                    </SortableBlock>
                  );
                }

                if (block.type === 'agenda') {
                  return (
                    <SortableBlock
                      id={block.id}
                      key={block.id}
                      actions={(
                        <div className="flex items-center gap-2 rounded-md p-0">
                          <button
                            type="button"
                            onClick={() => copyBlock(block.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                            aria-label="Copy block"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeBlock(block.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-red-600"
                            aria-label="Delete block"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    >
                      <AgendaSection
                        orderedAgenda={orderedAgenda}
                        addingAgenda={addingAgenda}
                        newAgendaText={newAgendaText}
                        newAgendaPriority={newAgendaPriority}
                        onNewAgendaTextChange={setNewAgendaText}
                        onNewAgendaPriorityChange={setNewAgendaPriority}
                        onAddAgendaItem={() => void handleAddAgendaItem()}
                        onUseTemplate={() => setIsSidebarOpen((v) => !v)}
                        isDragging={isAgendaDragging}
                      >
                        <DndContext
                          id={`meeting-${meetingId}-agenda-nested-dnd`}
                          collisionDetection={closestCenter}
                          onDragStart={handleNestedDragStart}
                          onDragEnd={handleNestedDragEnd}
                          onDragCancel={() => {
                            setActiveSectionDragId(null);
                            setActiveItemDragId(null);
                          }}
                          accessibility={{
                            announcements: {
                              onDragStart: () => '',
                              onDragMove: () => '',
                              onDragOver: () => '',
                              onDragEnd: () => '',
                              onDragCancel: () => '',
                            },
                            screenReaderInstructions: {
                              draggable: '',
                            },
                          }}
                        >
                          <SortableContext
                            items={nestedSections.map((section) => `section:${section.id}`)}
                            strategy={verticalListSortingStrategy}
                          >
                            <div className="space-y-4">
                              {nestedSections.map((section) => (
                                <SortableNestedSection
                                  key={section.id}
                                  section={section}
                                  isEditingTitle={editingSectionId === section.id}
                                  onStartEditTitle={() => setEditingSectionId(section.id)}
                                  onSaveTitle={(title) => saveSectionTitle(section.id, title)}
                                >
                                  <SortableContext
                                    items={section.items.map((item) => `item:${item.id}`)}
                                    strategy={verticalListSortingStrategy}
                                  >
                                    <div className="space-y-1">
                                      {section.items.map((item) => (
                                        <SortableNestedItem
                                          key={item.id}
                                          sectionId={section.id}
                                          item={item}
                                          onToggle={() =>
                                            updateNestedItem(section.id, item.id, { completed: !item.completed })
                                          }
                                          onTextChange={(text) => {
                                            updateNestedItem(section.id, item.id, { text });
                                            const numericId = Number(item.id);
                                            if (Number.isFinite(numericId)) queueAgendaSave(numericId, text);
                                          }}
                                          onDurationChange={(duration) => updateNestedItem(section.id, item.id, { duration })}
                                        />
                                      ))}
                                    </div>
                                  </SortableContext>
                                  <button
                                    type="button"
                                    className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                                    onClick={() => addItemToSection(section.id)}
                                  >
                                    + Add Item
                                  </button>
                                </SortableNestedSection>
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                        <div className="mt-4">
                          <button
                            type="button"
                            className="text-sm text-gray-600 hover:text-gray-800"
                            onClick={addSection}
                          >
                            + Add Section
                          </button>
                        </div>
                      </AgendaSection>
                    </SortableBlock>
                  );
                }

                if (block.type === 'participants') {
                  return (
                    <SortableBlock
                      id={block.id}
                      key={block.id}
                      actions={(
                        <div className="flex items-center gap-2 rounded-md p-0">
                          <button
                            type="button"
                            onClick={() => copyBlock(block.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                            aria-label="Copy block"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeBlock(block.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-red-600"
                            aria-label="Delete block"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    >
                      <section className="p-1">
                        <div className="mb-3 flex items-center justify-between">
                          <h3 className="text-xl font-bold text-slate-900">
                            Participants ({orderedParticipants.length})
                          </h3>
                          <button
                            type="button"
                            className="text-sm text-gray-500 transition hover:text-gray-800"
                            onClick={() => setIsParticipantEditorOpen((v) => !v)}
                          >
                            + Add
                          </button>
                        </div>
                        {isParticipantEditorOpen ? (
                          <div className="mb-3 flex items-center gap-2">
                            <select
                              value={newParticipantUserId ?? ''}
                              onChange={(e) => setNewParticipantUserId(e.target.value ? Number(e.target.value) : null)}
                              className="min-w-[220px] border-none bg-transparent px-1 py-1 text-sm text-slate-700 outline-none"
                            >
                              <option value="">Select member…</option>
                              {availableMembers.map((m) => (
                                <option key={m.id} value={m.user.id}>
                                  {formatProjectMemberLabel(m)}
                                </option>
                              ))}
                            </select>
                            <input
                              value={newParticipantRole}
                              onChange={(e) => setNewParticipantRole(e.currentTarget.value)}
                              placeholder="role"
                              className="border-none bg-transparent px-1 py-1 text-sm text-slate-600 outline-none"
                            />
                            <button
                              type="button"
                              onClick={addParticipant}
                              disabled={addingParticipant || newParticipantUserId == null}
                              className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-40"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsParticipantEditorOpen(false);
                                setNewParticipantUserId(null);
                                setNewParticipantRole('');
                              }}
                              className="text-xs text-slate-400 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : null}
                        <div className="grid gap-2">
                          {orderedParticipants.length === 0 ? (
                            <div className="p-2 text-sm text-gray-500">
                              No participants yet.
                            </div>
                          ) : (
                            orderedParticipants.map((p) => (
                              <div key={p.id} className="flex items-center justify-between px-2 py-2">
                                <div className="flex min-w-0 items-center gap-3">
                                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700">
                                    {participantLabelForUserId(p.user)
                                      .split(' ')
                                      .map((s) => s.charAt(0))
                                      .join('')
                                      .slice(0, 2)
                                      .toUpperCase()}
                                  </span>
                                  <span className="truncate text-sm font-medium text-gray-800">{participantLabelForUserId(p.user)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    value={participantRoleDrafts[p.id] ?? p.role ?? ''}
                                    onChange={(e) =>
                                      setParticipantRoleDrafts((prev) => ({ ...prev, [p.id]: e.currentTarget.value }))
                                    }
                                    onBlur={() => void saveParticipantRole(p.id, participantRoleDrafts[p.id] ?? p.role ?? '')}
                                    className="w-28 border-none bg-transparent px-1 py-1 text-xs text-gray-700 outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => removeParticipant(p.id)}
                                    disabled={removingParticipantIds.has(p.id)}
                                    className="rounded-md p-1 text-gray-400 transition hover:bg-gray-50 hover:text-red-500"
                                    aria-label="Remove participant"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </section>
                    </SortableBlock>
                  );
                }

                if (block.type === 'custom_block') {
                  return (
                    <SortableBlock
                      id={block.id}
                      key={block.id}
                      actions={(
                      <div className="flex items-center gap-2 rounded-md p-0">
                          <button
                            type="button"
                            onClick={() => copyBlock(block.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                            aria-label="Copy block"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeBlock(block.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-red-600"
                            aria-label="Delete block"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    >
                      <CustomBlock
                        title={block.title ?? 'Custom Block'}
                        content={block.content ?? ''}
                        onTitleChange={(value) =>
                          setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, title: value } : b)))
                        }
                        onContentChange={(value) =>
                          setBlocks((prev) => prev.map((b) => (b.id === block.id ? { ...b, content: value } : b)))
                        }
                      />
                    </SortableBlock>
                  );
                }

                return (
                  <SortableBlock
                    id={block.id}
                    key={block.id}
                    actions={(
                      <div className="flex items-center gap-2 rounded-md p-0">
                        <button
                          type="button"
                          onClick={() => copyBlock(block.id)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
                          aria-label="Copy block"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBlock(block.id)}
                          className="rounded p-1 text-slate-400 hover:bg-slate-50 hover:text-red-600"
                          aria-label="Delete block"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  >
                    <ArtifactsSection
                      artifactsCount={orderedArtifacts.length}
                      orderedArtifacts={orderedArtifacts}
                      addingArtifact={addingArtifact}
                      onFocusAdd={() => setIsArtifactEditorOpen((v) => !v)}
                      linker={
                        isArtifactEditorOpen ? (
                          <div className="mb-2 flex items-center gap-2">
                            <select
                              value={artifactEditorType}
                              onChange={(e) => {
                                setArtifactEditorType(e.target.value as 'decision' | 'task' | 'spreadsheet');
                                setArtifactEditorId(null);
                              }}
                              className="border-none bg-transparent px-1 py-1 text-sm text-slate-700 outline-none"
                              disabled={artifactResourcesLoading || addingArtifact}
                            >
                              <option value="decision">Decision</option>
                              <option value="task">Task</option>
                              <option value="spreadsheet">Spreadsheet</option>
                            </select>
                            <select
                              value={artifactEditorId ?? ''}
                              onChange={(e) => setArtifactEditorId(e.target.value ? Number(e.target.value) : null)}
                              className="min-w-[240px] border-none bg-transparent px-1 py-1 text-sm text-slate-700 outline-none"
                              disabled={artifactResourcesLoading || addingArtifact}
                            >
                              <option value="">
                                {artifactResourcesLoading ? 'Loading…' : 'Select resource…'}
                              </option>
                              {artifactChoices[artifactEditorType].map((row) => (
                                <option key={`${artifactEditorType}-${row.id}`} value={row.id}>
                                  {row.label}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                artifactEditorId != null
                                  ? void linkMeetingArtifact(artifactEditorType, artifactEditorId)
                                  : null
                              }
                              disabled={addingArtifact || artifactEditorId == null}
                              className="text-xs text-slate-600 hover:text-slate-900 disabled:opacity-40"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setIsArtifactEditorOpen(false);
                                setArtifactEditorId(null);
                              }}
                              className="text-xs text-slate-400 hover:text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : null
                      }
                      rows={orderedArtifacts.map((a) => {
                        const href =
                          Number.isFinite(projectId) && !Number.isNaN(projectId)
                            ? meetingArtifactHref(projectId, a.artifact_type, a.artifact_id)
                            : null;
                        const title = meetingArtifactDisplayLabel(
                          a.artifact_type,
                          a.artifact_id,
                          artifactResources,
                        );
                        const artifactType = normalizeMeetingArtifactType(a.artifact_type);
                        return (
                          <div key={a.id} className="flex items-center justify-between px-2 py-2">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-medium text-gray-800">{title}</div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                                <span>{artifactType === 'decision' ? '📘 Decision' : artifactType === 'task' ? '✅ Task' : '📎 Artifact'} · {a.artifact_id}</span>
                                {href ? (
                                  <Link href={href} className="inline-flex items-center gap-1 text-blue-600 hover:underline">
                                    Open <ExternalLink className="h-3 w-3" />
                                  </Link>
                                ) : null}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeArtifact(a.id)}
                              disabled={removingArtifactIds.has(a.id)}
                              className="rounded-md p-1 text-gray-400 transition hover:bg-gray-50 hover:text-red-500"
                              aria-label="Unlink artifact"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    />
                  </SortableBlock>
                );
              })}
              <div>
                <button
                  type="button"
                  onClick={() => addBlock('custom_block')}
                  className="text-sm text-slate-500 transition hover:text-slate-800"
                >
                  + Add Custom Block
                </button>
              </div>
            </div>
          </SortableContext>
        </DndContext>
        </motion.div>

        <TemplateSidebar
          isOpen={isSidebarOpen}
          blocks={blocks}
          templateList={templateList}
          onApplyTemplate={applySidebarTemplate}
          onEnterCreateMode={enterCreateMode}
          onAddDefaultBlock={addBlock}
          onCreateTemplate={createCustomTemplate}
          templateDirty={templateDirty}
          activeTemplateId={activeTemplateId}
          onSaveTemplateAgendaChanges={saveTemplateLayout}
          onAfterSave={() => setIsSidebarOpen(false)}
        />
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <Layout mainScrollMode="page">
        <div className="min-h-screen bg-[#F8F9FA]">
        <div className="mx-auto w-full max-w-5xl px-6 py-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-gray-900">Meeting Preparation Workspace</h1>
              <p className="text-sm text-gray-600">
                Project:{' '}
                <span className="font-medium">
                  {project?.name?.trim() || (Number.isNaN(projectId) ? '—' : `#${projectId}`)}
                </span>
              </p>
              {layoutSaving ? <p className="text-xs text-slate-400">Saving layout…</p> : null}
            </div>
            <div className="flex items-center gap-3">
              {isLayoutDirty ? (
                <button
                  type="button"
                  onClick={() => void saveLayoutNow(blocks)}
                  disabled={layoutSaving}
                  className={
                    layoutSaveFeedback === 'saved'
                      ? 'inline-flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700'
                      : layoutSaveFeedback === 'saving'
                        ? 'inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600'
                        : 'inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50'
                  }
                >
                  {layoutSaveFeedback === 'saved' ? <Check className="h-4 w-4" /> : null}
                  {layoutSaveFeedback === 'saved'
                    ? 'Saved!'
                    : layoutSaveFeedback === 'saving'
                      ? 'Saving...'
                      : 'Save Layout'}
                </button>
              ) : null}
              <Link href={`/projects/${projectId}`} className="text-sm text-blue-600 hover:underline">
                Back to project
              </Link>
            </div>
          </div>

          {renderBody()}
        </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

