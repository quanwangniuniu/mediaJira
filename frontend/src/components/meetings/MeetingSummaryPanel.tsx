'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Copy,
  ExternalLink,
  Loader2,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { Button } from '@/components/ui/button';
import { MeetingDateTimePicker } from '@/components/meetings/MeetingDateTimePicker';
import { ProjectMemberPicker } from '@/components/meetings/ProjectMemberPicker';
import { formatProjectMemberLabel } from '@/components/meetings/projectMemberLabel';
import { ProjectAPI, type ProjectMemberData } from '@/lib/api/projectApi';

import { MeetingsAPI } from '@/lib/api/meetingsApi';
import {
  meetingDateToInput,
  meetingTimeToInput,
  normalizeTimeForApi,
} from '@/lib/meetingSchedule';
import {
  buildSystemTemplateOptions,
  fetchUnifiedMeetingTemplateOptions,
  layoutConfigForNewMeetingFromSelection,
  type UnifiedMeetingTemplateOption,
} from '@/lib/meetings/unifiedMeetingTemplates';
import { replaceAgendaAndLayoutFromNested } from '@/lib/meetings/replaceMeetingAgendaFromTemplate';
import { MeetingLifecyclePanel } from '@/components/meetings/MeetingLifecyclePanel';
import { hasVisibleText, sanitizeDocumentPreviewHtml } from '@/lib/meetings/documentPreview';

import type { Meeting, MeetingDocument, MeetingPartialUpdateRequest, ParticipantLink } from '@/types/meeting';

export interface MeetingSummaryPanelProps {
  projectId: number;
  meetingId: number;
  onClose: () => void;
  /** Called after meeting fields are saved so parent can refresh list cards. */
  onMeetingUpdated?: (meeting: Meeting) => void;
}

export function MeetingSummaryPanel({
  projectId,
  meetingId,
  onClose,
  onMeetingUpdated,
}: MeetingSummaryPanelProps) {
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [titleDraft, setTitleDraft] = useState('');
  const [objectiveDraft, setObjectiveDraft] = useState('');
  const [meetingTypeDraft, setMeetingTypeDraft] = useState('');
  const [schedDateDraft, setSchedDateDraft] = useState('');
  const [schedTimeDraft, setSchedTimeDraft] = useState('');
  const [extRefDraft, setExtRefDraft] = useState('');
  const [savingMeta, setSavingMeta] = useState(false);
  const [unifiedTemplateOptions, setUnifiedTemplateOptions] = useState<UnifiedMeetingTemplateOption[]>(() =>
    buildSystemTemplateOptions(),
  );
  const [documentPreviewHtml, setDocumentPreviewHtml] = useState('');

  const [participants, setParticipants] = useState<ParticipantLink[]>([]);
  const [projectMembers, setProjectMembers] = useState<ProjectMemberData[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [removingPid, setRemovingPid] = useState<number | null>(null);

  const loadMeeting = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, doc] = await Promise.all([
        MeetingsAPI.getMeeting(projectId, meetingId),
        MeetingsAPI.getMeetingDocument(projectId, meetingId).catch(() => null as MeetingDocument | null),
      ]);
      setMeeting(m);
      setTitleDraft(m.title);
      setObjectiveDraft(m.objective);
      setMeetingTypeDraft(m.meeting_type);
      setSchedDateDraft(meetingDateToInput(m.scheduled_date));
      setSchedTimeDraft(meetingTimeToInput(m.scheduled_time));
      setExtRefDraft(m.external_reference ?? '');
      setDocumentPreviewHtml(doc?.content ? sanitizeDocumentPreviewHtml(doc.content) : '');
    } catch {
      setMeeting(null);
      setDocumentPreviewHtml('');
      setError('Could not load this meeting.');
    } finally {
      setLoading(false);
    }
  }, [projectId, meetingId]);

  const loadParticipants = useCallback(async () => {
    setLoadingPeople(true);
    try {
      const [plist, mems] = await Promise.all([
        MeetingsAPI.listParticipants(projectId, meetingId),
        ProjectAPI.getAllProjectMembers(projectId).catch(() => [] as ProjectMemberData[]),
      ]);
      setParticipants(Array.isArray(plist) ? plist : []);
      setProjectMembers(Array.isArray(mems) ? mems.filter((m) => m.is_active) : []);
    } catch {
      setParticipants([]);
      setProjectMembers([]);
    } finally {
      setLoadingPeople(false);
    }
  }, [projectId, meetingId]);

  useEffect(() => {
    void loadMeeting();
  }, [loadMeeting]);

  useEffect(() => {
    void fetchUnifiedMeetingTemplateOptions()
      .then(setUnifiedTemplateOptions)
      .catch((err) => {
        console.error('Failed to load meeting templates for details panel:', err);
        setUnifiedTemplateOptions(buildSystemTemplateOptions());
      });
  }, [projectId]);

  useEffect(() => {
    if (!meeting) return;
    void loadParticipants();
  }, [meeting, loadParticipants]);

  const templateSelectOptions = useMemo(() => {
    const opts = [...unifiedTemplateOptions];
    const current = meetingTypeDraft.trim() || meeting?.meeting_type?.trim() || '';
    if (current && !opts.some((o) => o.value === current)) {
      opts.push({
        value: current,
        label: current,
        is_system: false,
      });
    }
    return opts;
  }, [unifiedTemplateOptions, meetingTypeDraft, meeting?.meeting_type]);

  const saveMeta = async () => {
    if (!meeting || savingMeta) return;
    if (!titleDraft.trim() || !meetingTypeDraft.trim() || !objectiveDraft.trim()) {
      toast.error('Title, type and objective are required');
      return;
    }
    setSavingMeta(true);
    try {
      const typeChanged = meetingTypeDraft.trim() !== meeting.meeting_type.trim();
      const selectedOpt = unifiedTemplateOptions.find((o) => o.value === meetingTypeDraft.trim());

      const patchPayload: MeetingPartialUpdateRequest = {
        title: titleDraft.trim(),
        objective: objectiveDraft.trim(),
        meeting_type: meetingTypeDraft.trim(),
        scheduled_date: schedDateDraft.trim() || null,
        scheduled_time: schedTimeDraft.trim() ? normalizeTimeForApi(schedTimeDraft) : null,
        external_reference: extRefDraft.trim() || null,
      };

      if (typeChanged) {
        if (!selectedOpt) {
          toast.error('Select a valid meeting type or template from the list');
          return;
        }
        const { meeting_type: nextMeetingType, layout_config: lc } =
          layoutConfigForNewMeetingFromSelection(selectedOpt);
        const layoutSynced = await replaceAgendaAndLayoutFromNested(
          projectId,
          meetingId,
          lc.blocks,
          lc.nestedSections,
        );
        patchPayload.meeting_type = nextMeetingType;
        patchPayload.layout_config = layoutSynced;
      }

      const updated = await MeetingsAPI.patchMeeting(projectId, meetingId, patchPayload);
      setMeeting(updated);
      onMeetingUpdated?.(updated);
      toast.success(typeChanged ? 'Meeting saved with new template layout' : 'Meeting saved');
    } catch (e: unknown) {
      console.error(e);
      toast.error('Failed to save meeting');
    } finally {
      setSavingMeta(false);
    }
  };

  const copyRef = async () => {
    if (!extRefDraft.trim()) return;
    try {
      await navigator.clipboard.writeText(extRefDraft.trim());
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy');
    }
  };

  const openRef = () => {
    const u = extRefDraft.trim();
    if (!u) return;
    const href = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const participantLabel = (userId: number) => {
    const row = projectMembers.find((m) => m.user.id === userId);
    return row ? formatProjectMemberLabel(row) : `User #${userId}`;
  };

  const excludeUserIds = participants.map((p) => p.user);

  const addParticipant = async (userId: number) => {
    try {
      const link = await MeetingsAPI.addParticipant(projectId, meetingId, { user: userId });
      setParticipants((prev) => [...prev, link]);
      toast.success('Participant added');
    } catch {
      toast.error('Could not add participant');
    }
  };

  const removeParticipant = async (linkId: number) => {
    if (removingPid != null) return;
    setRemovingPid(linkId);
    try {
      await MeetingsAPI.removeParticipant(projectId, meetingId, linkId);
      setParticipants((prev) => prev.filter((p) => p.id !== linkId));
      toast.success('Removed');
    } catch {
      toast.error('Could not remove participant');
    } finally {
      setRemovingPid(null);
    }
  };

  return (
    <div className="flex h-full min-h-[280px] flex-col bg-white">
      <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
            Meeting details
          </p>
          {loading ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              Loading…
            </div>
          ) : error ? (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          ) : meeting ? (
            <p className="mt-1 text-xs text-gray-500">Edit below, then save.</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
          aria-label="Close panel"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!loading && !error && meeting ? (
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Title
              </label>
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Meeting type
              </label>
              <select
                className="mt-1 w-full rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={meetingTypeDraft}
                onChange={(e) => setMeetingTypeDraft(e.target.value)}
                aria-label="Meeting type or template"
              >
                <option value="">Select…</option>
                <optgroup label="System templates">
                  {templateSelectOptions
                    .filter((o) => o.is_system)
                    .map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                </optgroup>
                {templateSelectOptions.some((o) => !o.is_system) ? (
                  <optgroup label="Your templates">
                    {templateSelectOptions
                      .filter((o) => !o.is_system)
                      .map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                  </optgroup>
                ) : null}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Objective
              </label>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={objectiveDraft}
                onChange={(e) => setObjectiveDraft(e.target.value)}
                rows={3}
              />
            </div>
            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Meeting document
              </h3>
              <div className="mt-1.5 rounded-lg border border-gray-200 bg-gray-50/70 p-3">
                <p className="mb-2 text-[11px] text-gray-500">
                  Collaborate in real time and keep notes synced for all participants.
                </p>
                <div className="min-h-[3rem] rounded-md border border-gray-200 bg-white px-2 py-1.5 text-xs leading-5 text-gray-700">
                  {hasVisibleText(documentPreviewHtml) ? (
                    <div
                      className="line-clamp-3 [&_h1]:text-sm [&_h1]:font-semibold [&_h2]:text-sm [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-4 [&_ol]:list-decimal [&_ol]:pl-4 [&_blockquote]:border-l-2 [&_blockquote]:border-gray-300 [&_blockquote]:pl-2"
                      dangerouslySetInnerHTML={{ __html: documentPreviewHtml }}
                    />
                  ) : (
                    <p>No document content yet.</p>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-end">
                  <Link
                    href={`/projects/${projectId}/meetings/${meetingId}/document`}
                    className="inline-flex items-center rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
                  >
                    Open document editor
                  </Link>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Schedule
              </h3>
              <div className="mt-1.5 min-w-0">
                <MeetingDateTimePicker
                  id={`panel-sched-${meetingId}`}
                  dateValue={schedDateDraft}
                  timeValue={schedTimeDraft}
                  disabled={savingMeta}
                  onChange={(d, t) => {
                    setSchedDateDraft(d);
                    setSchedTimeDraft(t);
                  }}
                />
              </div>
            </section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Meeting link
              </h3>
              <input
                type="text"
                className="mt-1.5 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                value={extRefDraft}
                onChange={(e) => setExtRefDraft(e.target.value)}
                placeholder="e.g. Zoom link"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                  disabled={!extRefDraft.trim()}
                  onClick={openRef}
                >
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  Open link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!extRefDraft.trim()}
                  onClick={copyRef}
                >
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                  Copy
                </Button>
              </div>
            </section>


            <section>
  <MeetingLifecyclePanel
    projectId={projectId}
    meetingId={meetingId}
    onStatusChanged={(newStatus) => {
      if (meeting) setMeeting({ ...meeting, status: newStatus });
      onMeetingUpdated?.({ ...meeting!, status: newStatus });
    }}
  />
</section>

            <section>
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Participants
              </h3>
              {loadingPeople ? (
                <p className="mt-2 text-xs text-gray-500">Loading…</p>
              ) : (
                <>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {participants.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-800"
                      >
                        <span className="max-w-[160px] truncate">{participantLabel(p.user)}</span>
                        <button
                          type="button"
                          className="rounded-full p-0.5 text-gray-500 hover:bg-gray-200"
                          disabled={removingPid === p.id}
                          onClick={() => void removeParticipant(p.id)}
                          aria-label="Remove"
                        >
                          {removingPid === p.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="mt-2">
                    <ProjectMemberPicker
                      projectId={projectId}
                      excludeUserIds={excludeUserIds}
                      disabled={savingMeta}
                      onPickUser={(uid) => void addParticipant(uid)}
                    />
                  </div>
                </>
              )}
            </section>

            <Button
              type="button"
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={savingMeta}
              onClick={() => void saveMeta()}
            >
              {savingMeta ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save changes
            </Button>

            <div className="border-t border-gray-100 pt-4">
              <Link
                href={`/projects/${projectId}/meetings/${meetingId}`}
                className="inline-flex w-full items-center justify-center rounded-lg border border-blue-200 bg-blue-50 px-3 py-2.5 text-sm font-medium text-blue-800 transition hover:bg-blue-100"
              >
                Open full meeting workspace
                <span className="ml-1" aria-hidden>
                  →
                </span>
              </Link>
              <p className="mt-2 text-center text-[11px] text-gray-400">
                Agenda, participants &amp; artifacts
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
