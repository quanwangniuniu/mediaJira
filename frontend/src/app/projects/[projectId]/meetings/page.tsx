'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  Loader2,
  AlertCircle,
  CalendarRange,
  Trash2,
  List,
} from 'lucide-react';
import toast from 'react-hot-toast';

import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MeetingsAPI } from '@/lib/api/meetingsApi';
import type { Meeting, MeetingCreateRequest } from '@/types/meeting';
import { ProjectAPI, type ProjectData } from '@/lib/api/projectApi';
import { meetingTimeToInput, normalizeTimeForApi } from '@/lib/meetingSchedule';
import { formatMeetingsApiError } from '@/lib/meetingsApiErrors';
import {
  buildSystemTemplateOptions,
  fetchUnifiedMeetingTemplateOptions,
  labelForMeetingType,
  layoutConfigForNewMeetingFromSelection,
  type UnifiedMeetingTemplateOption,
} from '@/lib/meetings/unifiedMeetingTemplates';
import { MeetingSummaryPanel } from '@/components/meetings/MeetingSummaryPanel';
import { MeetingsWorkspaceShell } from '@/components/meetings/MeetingsWorkspaceShell';
import { QuickCreateMeetingModal } from '@/components/meetings/QuickCreateMeetingModal';
import { useAuthStore } from '@/lib/authStore';
import { cn } from '@/lib/utils';

export default function ProjectMeetingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectIdParam = params?.projectId as string | undefined;
  const projectId = projectIdParam ? Number(projectIdParam) : NaN;
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [project, setProject] = useState<ProjectData | null>(null);
  const [availableProjects, setAvailableProjects] = useState<ProjectData[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorTitle, setErrorTitle] = useState('Could not load meetings');

  const [creating, setCreating] = useState(false);
  const [unifiedTemplateOptions, setUnifiedTemplateOptions] = useState<UnifiedMeetingTemplateOption[]>(() =>
    buildSystemTemplateOptions(),
  );
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  const [centerMode, setCenterMode] = useState<'list' | 'create'>('list');

  useEffect(() => {
    if (!projectId || Number.isNaN(projectId)) {
      setError('Project ID is required');
      setProject(null);
      setAvailableProjects([]);
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setErrorTitle('Could not load meetings');

        const projects = await ProjectAPI.getProjects();
        setAvailableProjects(projects);
        let current =
          projects.find((p) => Number(p.id) === projectId) || null;

        // Detail endpoint uses the same membership-filtered queryset as list: non-members often get 404
        // (not "project missing from DB"). Never block meetings on this — use meetings API as source of truth.
        if (!current) {
          try {
            current = await ProjectAPI.getProject(projectId);
          } catch {
            current = null;
          }
        }

        setProject(current);

        try {
          const meetingList = await MeetingsAPI.listMeetings(projectId);
          setMeetings(meetingList);
        } catch (meetErr: unknown) {
          console.error('Failed to load meetings:', meetErr);
          setMeetings([]);
          const status = (meetErr as { response?: { status?: number } })?.response?.status;
          if (status === 403) {
            setErrorTitle('No access to meetings');
            setError(
              'You are not a member of this project (or your session cannot access it). Open Projects and enter a project you belong to, or ask an admin to add you.',
            );
            return;
          }
          setErrorTitle('Could not load meetings');
          setError(formatMeetingsApiError(meetErr, 'Failed to load meetings'));
        }
      } catch (err: unknown) {
        console.error('Failed to load meetings page:', err);
        setProject(null);
        setAvailableProjects([]);
        setMeetings([]);
        setErrorTitle('Could not load meetings');
        setError(formatMeetingsApiError(err, 'Failed to load meetings'));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  useEffect(() => {
    if (!projectId || Number.isNaN(projectId)) return;
    void fetchUnifiedMeetingTemplateOptions()
      .then(setUnifiedTemplateOptions)
      .catch((err) => {
        console.error('Failed to load meeting templates for create form:', err);
        setUnifiedTemplateOptions(buildSystemTemplateOptions());
      });
  }, [projectId, centerMode]);

  const handleProjectSelect = (nextProjectIdRaw: string) => {
    const nextProjectId = Number(nextProjectIdRaw);
    if (!Number.isFinite(nextProjectId) || Number.isNaN(nextProjectId)) return;
    if (nextProjectId === projectId) return;
    router.push(`/projects/${nextProjectId}/meetings`);
  };

  const projectsForSelect = useMemo(() => {
    if (!currentUserId) return availableProjects;
    const withOwnerInfo = availableProjects.filter((p) => p.owner?.id != null);
    if (withOwnerInfo.length === 0) return availableProjects;
    return withOwnerInfo.filter((p) => p.owner?.id === currentUserId);
  }, [availableProjects, currentUserId]);

  const handleQuickCreate = async ({
    title,
    meetingType,
    objective,
    scheduledDate,
    scheduledTime,
    participantUserIds,
  }: {
    title: string;
    meetingType: string;
    objective: string;
    scheduledDate?: string;
    scheduledTime?: string;
    participantUserIds: number[];
  }) => {
    if (!projectId || Number.isNaN(projectId)) {
      toast.error('Project ID is required');
      return;
    }
    if (!title.trim() || !meetingType.trim()) {
      toast.error('Please select a valid template');
      return;
    }

    const templateOpt = unifiedTemplateOptions.find((o) => o.value === meetingType.trim());
    if (!templateOpt) {
      toast.error('Select a valid meeting type or template');
      return;
    }

    const { meeting_type, layout_config } = layoutConfigForNewMeetingFromSelection(templateOpt);

    const payload: MeetingCreateRequest = {
      title: title.trim(),
      meeting_type,
      objective: objective.trim() || `${templateOpt.label} meeting`,
      participant_user_ids: participantUserIds,
      layout_config,
    };
    if (scheduledDate?.trim()) {
      payload.scheduled_date = scheduledDate.trim();
    }
    if (scheduledTime?.trim()) {
      payload.scheduled_time = normalizeTimeForApi(scheduledTime);
    }

    setCreating(true);
    try {
      const meeting = await MeetingsAPI.createMeeting(projectId, payload);
      const nested = layout_config.nestedSections ?? [];
      const flatItems = nested.flatMap((s) => s.items);
      if (flatItems.length > 0) {
        try {
          let order = 0;
          for (const section of nested) {
            for (const item of section.items) {
              await MeetingsAPI.createAgendaItem(projectId, meeting.id, {
                content: item.text,
                order_index: order,
                is_priority: item.duration === '10m',
              });
              order += 1;
            }
          }
          const refreshed = await MeetingsAPI.listAgendaItems(projectId, meeting.id);
          const refreshedList = Array.isArray(refreshed) ? refreshed : [];
          let idx = 0;
          const nextNested = nested.map((section) => ({
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
          await MeetingsAPI.patchMeeting(projectId, meeting.id, {
            layout_config: {
              blocks: layout_config.blocks,
              nestedSections: nextNested,
            },
          });
        } catch (seedErr) {
          console.error('Failed to seed agenda from template:', seedErr);
          toast.error('Meeting created, but the template agenda could not be fully applied.');
        }
      }

      toast.success('Meeting created');
      const meetingList = await MeetingsAPI.listMeetings(projectId);
      setMeetings(meetingList);
      setCenterMode('list');
      setSelectedMeetingId(null);
      setRightPanelOpen(false);
      router.push(`/projects/${projectId}/meetings/${meeting.id}`);
    } catch (err: unknown) {
      console.error('Failed to create meeting:', err);
      toast.error(formatMeetingsApiError(err, 'Failed to create meeting'));
    } finally {
      setCreating(false);
    }
  };

  const meetingsArray = useMemo(() => (Array.isArray(meetings) ? meetings : []), [meetings]);

  useEffect(() => {
    if (selectedMeetingId == null) return;
    if (!meetingsArray.some((m) => m.id === selectedMeetingId)) {
      setSelectedMeetingId(null);
      setRightPanelOpen(false);
    }
  }, [meetingsArray, selectedMeetingId]);

  const sortedMeetings = useMemo(
    () => [...meetingsArray].sort((a, b) => b.id - a.id),
    [meetingsArray],
  );

  const handleDelete = async (meetingId: number) => {
    if (!projectId || Number.isNaN(projectId)) {
      toast.error('Project ID is required');
      return;
    }
    if (deletingIds.has(meetingId)) return;

    const confirmed = window.confirm(
      'Delete this meeting? This will also remove its agenda items, participants, and artifacts.',
    );
    if (!confirmed) return;

    const snapshot = meetingsArray;
    setDeletingIds((prev) => new Set([...prev, meetingId]));
    setMeetings((prev) => (Array.isArray(prev) ? prev.filter((m) => m.id !== meetingId) : []));
    if (selectedMeetingId === meetingId) {
      setSelectedMeetingId(null);
      setRightPanelOpen(false);
    }

    try {
      await MeetingsAPI.deleteMeeting(projectId, meetingId);
      toast.success('Meeting deleted');
    } catch (err: unknown) {
      console.error('Failed to delete meeting:', err);
      setMeetings(snapshot);
      toast.error(formatMeetingsApiError(err, 'Failed to delete meeting'));
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(meetingId);
        return next;
      });
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="mt-3 font-medium text-gray-900">Loading meetings…</p>
          <p className="text-sm text-gray-600">
            Fetching meetings for this project.
          </p>
        </div>
      );
    }

    if (error) {
      return null;
    }

    if (!sortedMeetings.length) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
          <CalendarRange className="h-6 w-6 text-blue-600" />
          <p className="mt-3 font-medium text-gray-900">No meetings yet</p>
          <p className="text-sm text-gray-600">
            Click <span className="font-medium text-gray-800">Create</span> in the left sidebar to
            add your first meeting.
          </p>
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sortedMeetings.map((meeting) => (
          <div
            key={meeting.id}
            role="button"
            tabIndex={0}
            onClick={() => {
              setSelectedMeetingId(meeting.id);
              setRightPanelOpen(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setSelectedMeetingId(meeting.id);
                setRightPanelOpen(true);
              }
            }}
            className={`flex cursor-pointer flex-col items-start rounded-xl border bg-white p-4 text-left shadow-sm transition hover:border-blue-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
              selectedMeetingId === meeting.id
                ? 'border-blue-500 ring-2 ring-blue-100'
                : 'border-gray-200'
            }`}
          >
            <div className="mb-1 flex w-full items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {meeting.meeting_type
                  ? labelForMeetingType(meeting.meeting_type, unifiedTemplateOptions)
                  : 'Meeting'}
              </span>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {meeting.status}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    void handleDelete(meeting.id);
                  }}
                  disabled={deletingIds.has(meeting.id)}
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Delete meeting"
                  title="Delete meeting"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <h3 className="line-clamp-1 text-sm font-semibold text-gray-900">
              {meeting.title}
            </h3>
            <p className="mt-1 line-clamp-2 text-xs text-gray-600">
              {meeting.objective}
            </p>
            {(meeting.scheduled_date || meeting.scheduled_time || meeting.external_reference) && (
              <p className="mt-2 line-clamp-2 text-xs text-gray-500">
                {meeting.scheduled_date ? meeting.scheduled_date.slice(0, 10) : ''}
                {meeting.scheduled_date && meeting.scheduled_time ? ' · ' : ''}
                {meeting.scheduled_time ? meetingTimeToInput(meeting.scheduled_time) : ''}
                {(meeting.scheduled_date || meeting.scheduled_time) && meeting.external_reference
                  ? ' · '
                  : ''}
                {meeting.external_reference ? meeting.external_reference : ''}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const projectName = project?.name ?? `Project ${projectIdParam ?? ''}`;

  return (
    <ProtectedRoute>
      <Layout mainScrollMode="page">
        <div className="flex min-h-[calc(100vh-7rem)] w-full flex-col">
        <MeetingsWorkspaceShell
          detailOpen={centerMode === 'list' && Boolean(selectedMeetingId && rightPanelOpen)}
          detail={
            centerMode === 'list' &&
            selectedMeetingId != null &&
            Number.isFinite(projectId) &&
            !Number.isNaN(projectId) ? (
              <MeetingSummaryPanel
                key={selectedMeetingId}
                projectId={projectId}
                meetingId={selectedMeetingId}
                onClose={() => setRightPanelOpen(false)}
                onMeetingUpdated={(m) =>
                  setMeetings((prev) =>
                    Array.isArray(prev)
                      ? prev.map((row) => (row.id === m.id ? m : row))
                      : prev,
                  )
                }
              />
            ) : null
          }
          sidebar={
            <div className="flex flex-col gap-4 p-4">
              <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-sm">
                <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                  Project
                </label>
                <select
                  value={
                    Number.isFinite(projectId) && projectsForSelect.some((p) => p.id === projectId)
                      ? String(projectId)
                      : ''
                  }
                  disabled={loading || projectsForSelect.length === 0}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="mt-2 w-full rounded-md border border-gray-300 bg-white px-2 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-50"
                  aria-label="Select project for meetings"
                >
                  {projectsForSelect.length > 0 ? (
                    projectsForSelect.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      {projectName || 'Loading…'}
                    </option>
                  )}
                </select>
              </div>
              <nav className="space-y-2" aria-label="Meeting workspace sections">
                <button
                  type="button"
                  onClick={() => {
                    setCenterMode('list');
                    setRightPanelOpen(false);
                    setSelectedMeetingId(null);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition',
                    centerMode === 'list'
                      ? 'bg-white text-blue-800 shadow-sm ring-1 ring-blue-100'
                      : 'text-gray-700 hover:bg-white/80',
                  )}
                >
                  <List className="h-4 w-4 shrink-0" aria-hidden />
                  Meetings
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCenterMode('create');
                    setRightPanelOpen(false);
                    setSelectedMeetingId(null);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition',
                    centerMode === 'create'
                      ? 'bg-white text-blue-800 shadow-sm ring-1 ring-blue-100'
                      : 'text-gray-700 hover:bg-white/80',
                  )}
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden />
                  Create
                </button>
              </nav>
            </div>
          }
          main={
            <div className="px-4 py-5 lg:px-8">
          <div className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900">
              Meeting Preparation Workspace
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {centerMode === 'create'
                ? 'Use quick options to create a meeting in seconds.'
                : 'Select a meeting to open details on the right, or create a new one.'}
            </p>
          </div>

          {!loading && error ? (
            <div
              className="mb-4 flex flex-col gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800"
              role="alert"
            >
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">{errorTitle}</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  <Link
                    href="/projects"
                    className="mt-2 inline-block text-sm font-medium text-blue-700 hover:underline"
                  >
                    Go to Projects
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          <div className="mt-2">{renderContent()}</div>
          {centerMode === 'create' ? (
            <QuickCreateMeetingModal
              open
              creating={creating}
              projectId={projectId}
              templateOptions={unifiedTemplateOptions}
              onOpenChange={(nextOpen) => {
                if (!nextOpen) setCenterMode('list');
              }}
              onSubmit={handleQuickCreate}
            />
          ) : null}
            </div>
          }
        />
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
