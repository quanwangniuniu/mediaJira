'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { AlertCircle, ArrowLeft, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { ProjectMemberPicker } from '@/components/meetings/ProjectMemberPicker';
import { MeetingArtifactLinker } from '@/components/meetings/MeetingArtifactLinker';
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
import { hasVisibleText, sanitizeDocumentPreviewHtml } from '@/lib/meetings/documentPreview';
import type { AgendaItem, ArtifactLink, Meeting, MeetingDocument, ParticipantLink } from '@/types/meeting';
import { ProjectAPI, type ProjectData, type ProjectMemberData } from '@/lib/api/projectApi';
import { Button } from '@/components/ui/button';
import AutoResizeTextarea from '@/components/ui/AutoResizeTextarea';
import {
  meetingDateToInput,
  meetingTimeToInput,
  normalizeTimeForApi,
} from '@/lib/meetingSchedule';

const normalizeNumberParam = (value: unknown) => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return NaN;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : NaN;
};

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
      className={`flex items-start justify-between gap-3 rounded-xl border bg-white p-3 ${
        item.is_priority ? 'border-amber-200 bg-amber-50/40' : 'border-gray-200'
      } ${isDragging ? 'opacity-70' : ''}`}
    >
      {/* Use div (not button) as drag handle — nested buttons + dnd-kit + React can cause DOM/removeChild mismatches */}
      <div
        className="mt-1 cursor-grab rounded-md p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-600 active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        ≡
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">#{item.order_index}</div>
          <div className="flex items-center gap-2">
            {isSaving ? (
              <span className="text-xs text-gray-500">Saving…</span>
            ) : (
              <span className="text-xs text-gray-400" aria-hidden="true">
                <Check className="h-3 w-3" />
              </span>
            )}
          </div>
        </div>
        <AutoResizeTextarea
          value={draftValue}
          onChange={(e) => onDraftChange(e.currentTarget.value)}
          onBlur={onBlurSave}
          placeholder="Agenda item…"
          className="mt-1 w-full rounded-md border border-transparent px-2 py-1 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 pt-1 sm:flex-row sm:items-center sm:pt-4">
        <label className="flex cursor-pointer items-center gap-1.5 whitespace-nowrap text-xs text-gray-600 select-none">
          <input
            type="checkbox"
            checked={item.is_priority}
            disabled={isDeleting || isPrioritySaving}
            onChange={(e) => onPriorityChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
          />
          <span className={item.is_priority ? 'font-medium text-amber-900' : ''}>
            {isPrioritySaving ? 'Saving…' : 'Priority / focus'}
          </span>
        </label>
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
  const [removingArtifactIds, setRemovingArtifactIds] = useState<Set<number>>(new Set());

  const [schedDateDraft, setSchedDateDraft] = useState('');
  const [schedTimeDraft, setSchedTimeDraft] = useState('');
  const [extRefDraft, setExtRefDraft] = useState('');
  const [savingMeetingMeta, setSavingMeetingMeta] = useState(false);
  const [documentPreviewHtml, setDocumentPreviewHtml] = useState('');

  const orderedAgenda = useMemo(() => {
    const list = Array.isArray(agendaItems) ? agendaItems : [];
    return [...list].sort((a, b) => a.order_index - b.order_index || a.id - b.id);
  }, [agendaItems]);

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

        const [m, agenda, people, links, mems, p, doc] = await Promise.all([
          MeetingsAPI.getMeeting(projectId, meetingId),
          MeetingsAPI.listAgendaItems(projectId, meetingId),
          MeetingsAPI.listParticipants(projectId, meetingId),
          MeetingsAPI.listArtifacts(projectId, meetingId),
          ProjectAPI.getAllProjectMembers(projectId).catch(() => [] as ProjectMemberData[]),
          ProjectAPI.getProject(projectId).catch(() => null as ProjectData | null),
          MeetingsAPI.getMeetingDocument(projectId, meetingId).catch(() => null as MeetingDocument | null),
        ]);

        setMeeting(m);
        setProject(p);
        setAgendaItems(Array.isArray(agenda) ? agenda : []);
        setParticipants(Array.isArray(people) ? people : []);
        setArtifacts(Array.isArray(links) ? links : []);
        setProjectMembers(
          Array.isArray(mems) ? mems.filter((row) => row.is_active) : [],
        );
        setDocumentPreviewHtml(doc?.content ? sanitizeDocumentPreviewHtml(doc.content) : '');
      } catch (err: unknown) {
        console.error('Failed to load meeting workspace:', err);
        setProject(null);
        setProjectMembers([]);
        setDocumentPreviewHtml('');
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
      setMeeting(updated);
      toast.success('Schedule & reference saved');
    } catch (err: unknown) {
      console.error('Failed to save meeting meta:', err);
      toast.error(getApiErrorMessage(err, 'Failed to save meeting details'));
    } finally {
      setSavingMeetingMeta(false);
    }
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

  const participantLabelForUserId = (userId: number) => {
    const row = projectMembers.find((m) => m.user.id === userId);
    return row ? formatProjectMemberLabel(row) : `User #${userId}`;
  };

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
    }, 350);
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
      <div className="grid gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold text-gray-900">{meeting.title}</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                <span className="rounded-full bg-gray-100 px-2 py-0.5">{meeting.meeting_type}</span>
                <span className="rounded-full bg-gray-100 px-2 py-0.5">{meeting.status}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push(`/projects/${projectId}/meetings`)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </div>
          <p className="mt-3 text-sm text-gray-700">{meeting.objective}</p>

          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Scheduled date</label>
                <input
                  type="date"
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={schedDateDraft}
                  onChange={(e) => setSchedDateDraft(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Scheduled time</label>
                <input
                  type="time"
                  step={60}
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={schedTimeDraft}
                  onChange={(e) => setSchedTimeDraft(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">External reference</label>
                <input
                  type="text"
                  className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  value={extRefDraft}
                  onChange={(e) => setExtRefDraft(e.target.value)}
                  placeholder="e.g. Zoom link"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <Button type="button" size="sm" variant="outline" onClick={saveMeetingMeta} disabled={savingMeetingMeta}>
                {savingMeetingMeta ? (
                  <>
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Check className="mr-1 h-4 w-4" />
                    Save schedule & reference
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-gray-900">Meeting document</h3>
            <Button
              type="button"
              size="sm"
              onClick={() => router.push(`/projects/${projectId}/meetings/${meetingId}/document`)}
            >
              Open document
            </Button>
          </div>
          <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3 text-xs text-gray-700">
            {hasVisibleText(documentPreviewHtml) ? (
              <div
                className="[&_h1]:text-sm [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2"
                dangerouslySetInnerHTML={{ __html: documentPreviewHtml }}
              />
            ) : (
              <p>No document content yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Agenda</h3>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <AutoResizeTextarea
              value={newAgendaText}
              onChange={(e) => setNewAgendaText(e.currentTarget.value)}
              placeholder="Add an agenda item…"
              className="min-h-[2.5rem] flex-1 rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md border border-transparent px-1 py-1 text-xs text-gray-600 select-none sm:mb-0.5">
              <input
                type="checkbox"
                checked={newAgendaPriority}
                onChange={(e) => setNewAgendaPriority(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
              />
              Priority / focus
            </label>
            <Button
              size="sm"
              className="shrink-0"
              onClick={handleAddAgendaItem}
              disabled={addingAgenda || !newAgendaText.trim()}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>

          {/* Keep DndContext mounted across empty ↔ non-empty to avoid React/dnd-kit removeChild races */}
          <DndContext
            id={`meeting-${meetingId}-agenda-dnd`}
            collisionDetection={closestCenter}
            onDragEnd={(event) => {
              const activeId = Number(event.active?.id);
              const overId = Number(event.over?.id);
              if (!Number.isFinite(activeId) || !Number.isFinite(overId)) return;
              void reorderAgendaOptimistically(activeId, overId);
            }}
          >
            <SortableContext
              items={orderedAgenda.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="mt-4 grid gap-2">
                {orderedAgenda.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600">
                    No agenda items yet. Add your first item above.
                  </div>
                ) : (
                  <div className="grid gap-2">
                    {orderedAgenda.map((item) => (
                      <SortableAgendaRow
                        key={item.id}
                        item={item}
                        isSaving={savingAgendaIds.has(item.id)}
                        isDeleting={deletingAgendaIds.has(item.id)}
                        isPrioritySaving={savingAgendaPriorityIds.has(item.id)}
                        draftValue={agendaDrafts[item.id] ?? item.content ?? ''}
                        onDraftChange={(next) => {
                          setAgendaDrafts((prev) => ({ ...prev, [item.id]: next }));
                          queueAgendaSave(item.id, next);
                        }}
                        onBlurSave={() =>
                          saveAgendaItem(item.id, agendaDrafts[item.id] ?? item.content ?? '')
                        }
                        onDelete={() => deleteAgendaItem(item.id)}
                        onPriorityChange={(next) => void patchAgendaPriority(item.id, next)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Participants</h3>
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <div className="md:col-span-1">
              <label className="text-xs font-medium text-gray-700">Member</label>
              <div className="mt-1">
                <ProjectMemberPicker
                  projectId={projectId}
                  excludeUserIds={orderedParticipants.map((p) => p.user)}
                  value={newParticipantUserId}
                  onChange={setNewParticipantUserId}
                  disabled={addingParticipant}
                />
              </div>
            </div>
            <div className="md:col-span-1">
              <label className="text-xs font-medium text-gray-700">Role (optional)</label>
              <input
                value={newParticipantRole}
                onChange={(e) => setNewParticipantRole(e.currentTarget.value)}
                placeholder="e.g. Presenter"
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                size="sm"
                onClick={addParticipant}
                disabled={addingParticipant || newParticipantUserId == null}
                className="w-full"
              >
                <Plus className="h-4 w-4" />
                Add
              </Button>
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {orderedParticipants.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600">
                No participants yet. Add one above.
              </div>
            ) : (
              orderedParticipants.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900">{participantLabelForUserId(p.user)}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">link: {p.id}</span>
                      {savingParticipantIds.has(p.id) ? (
                        <span className="text-gray-500">Saving…</span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                    <input
                      value={participantRoleDrafts[p.id] ?? p.role ?? ''}
                      onChange={(e) =>
                        setParticipantRoleDrafts((prev) => ({ ...prev, [p.id]: e.currentTarget.value }))
                      }
                      onBlur={() => saveParticipantRole(p.id, participantRoleDrafts[p.id] ?? p.role ?? '')}
                      placeholder="Role…"
                      className="w-full rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 md:w-56"
                    />
                    <button
                      type="button"
                      onClick={() => removeParticipant(p.id)}
                      disabled={removingParticipantIds.has(p.id)}
                      className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remove
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Artifacts</h3>
          </div>

          <MeetingArtifactLinker
            resourceIndex={artifactResources}
            resourceLoading={artifactResourcesLoading}
            existing={artifacts}
            disabled={addingArtifact}
            onLink={(artifact_type, artifact_id) => void linkMeetingArtifact(artifact_type, artifact_id)}
          />

          <div className="mt-4 grid gap-2">
            {orderedArtifacts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 p-6 text-center text-sm text-gray-600">
                No artifacts linked yet. Add one above.
              </div>
            ) : (
              orderedArtifacts.map((a) => {
                const href =
                  Number.isFinite(projectId) && !Number.isNaN(projectId)
                    ? meetingArtifactHref(projectId, a.artifact_type, a.artifact_id)
                    : null;
                const title = meetingArtifactDisplayLabel(
                  a.artifact_type,
                  a.artifact_id,
                  artifactResources,
                );
                return (
                  <div
                    key={a.id}
                    className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-3 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900">{title}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span className="rounded-full bg-gray-100 px-2 py-0.5">
                          {normalizeMeetingArtifactType(a.artifact_type)} · id {a.artifact_id}
                        </span>
                        <span className="rounded-full bg-gray-100 px-2 py-0.5">link {a.id}</span>
                        {href ? (
                          <Link
                            href={href}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            Open in app →
                          </Link>
                        ) : null}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeArtifact(a.id)}
                      disabled={removingArtifactIds.has(a.id)}
                      className="inline-flex items-center justify-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Unlink
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <Layout mainScrollMode="page">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Meeting Preparation Workspace</h1>
              <p className="text-sm text-gray-600">
                Project:{' '}
                <span className="font-medium">
                  {project?.name?.trim() || (Number.isNaN(projectId) ? '—' : `#${projectId}`)}
                </span>
              </p>
            </div>
            <Link
              href={`/projects/${projectId}`}
              className="text-sm text-blue-600 hover:underline"
            >
              Back to project
            </Link>
          </div>

          {renderBody()}
        </div>
      </Layout>
    </ProtectedRoute>
  );
}

