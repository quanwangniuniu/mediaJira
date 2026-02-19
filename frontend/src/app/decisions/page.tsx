'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  FilePenLine,
  FileText,
  PencilLine,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DecisionAPI } from '@/lib/api/decisionApi';
import { ProjectAPI, type ProjectData } from '@/lib/api/projectApi';
import { useAuthStore } from '@/lib/authStore';
import DecisionTree from '@/components/decisions/DecisionTree';
import DecisionEditModal from '@/components/decisions/DecisionEditModal';
import type { DecisionGraphResponse, DecisionListItem } from '@/types/decision';

const statusColor = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-amber-100 text-amber-800';
    case 'AWAITING_APPROVAL':
      return 'bg-blue-100 text-blue-800';
    case 'COMMITTED':
      return 'bg-emerald-100 text-emerald-800';
    case 'REVIEWED':
      return 'bg-purple-100 text-purple-800';
    case 'ARCHIVED':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString();
};

const ROLE_LEVELS: Record<string, number> = {
  owner: 1,
  'Super Administrator': 1,
  'Organization Admin': 2,
  'Team Leader': 3,
  'Campaign Manager': 4,
  'Budget Controller': 5,
  Approver: 6,
  Reviewer: 7,
  'Data Analyst': 8,
  member: 8,
  'Senior Media Buyer': 9,
  'Specialist Media Buyer': 10,
  'Junior Media Buyer': 11,
  Designer: 12,
  Copywriter: 13,
  viewer: 999,
};

const APPROVAL_REVIEW_MAX_LEVEL = 8;
const EDIT_MAX_LEVEL = 13;
const DEFAULT_PAGE_SIZE = 12;
const DEFAULT_VIEW_MODE = 'cards' as const;
const DEFAULT_SORT_MODE = 'SEQ' as const;
const PAGE_SIZE_BY_VIEW: Record<'cards' | 'grid' | 'compact', number> = {
  cards: DEFAULT_PAGE_SIZE,
  grid: DEFAULT_PAGE_SIZE,
  compact: 24,
};

const DecisionsPage = () => {
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [decisions, setDecisions] = useState<DecisionListItem[]>([]);
  const [graphsByProject, setGraphsByProject] = useState<
    Record<number, DecisionGraphResponse>
  >({});
  const [decisionsByProject, setDecisionsByProject] = useState<Record<number, DecisionListItem[]>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [projectRoles, setProjectRoles] = useState<Record<number, string>>({});
  const [collapsedTrees, setCollapsedTrees] = useState<Record<number, boolean>>({});
  const [collapsedLists, setCollapsedLists] = useState<Record<number, boolean>>({});
  const [creatingProjectId, setCreatingProjectId] = useState<number | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editDecisionId, setEditDecisionId] = useState<number | null>(null);
  const [editProjectId, setEditProjectId] = useState<number | null>(null);
  const [linkEditProjectId, setLinkEditProjectId] = useState<number | null>(null);
  const [linkEditDecisionId, setLinkEditDecisionId] = useState<number | null>(null);
  const [linkEditSelfSeq, setLinkEditSelfSeq] = useState<number | null>(null);
  const [linkEditInitialSeqs, setLinkEditInitialSeqs] = useState<number[]>([]);
  const [linkEditSelectedSeqs, setLinkEditSelectedSeqs] = useState<number[]>([]);
  const [linkEditLoading, setLinkEditLoading] = useState(false);
  const [linkEditSaving, setLinkEditSaving] = useState(false);
  const [linkEditError, setLinkEditError] = useState<string | null>(null);
  const [focusDateByProject, setFocusDateByProject] = useState<Record<number, string>>({});
  const [paginationByProject, setPaginationByProject] = useState<
    Record<number, { pageIndex: number; pageSize: number }>
  >({});
  const [viewModeByProject, setViewModeByProject] = useState<
    Record<number, 'cards' | 'grid' | 'compact'>
  >({});
  const [sortByProject, setSortByProject] = useState<
    Record<number, 'UPDATED' | 'STATUS' | 'RISK' | 'SEQ'>
  >({});
  const [sortDirByProject, setSortDirByProject] = useState<Record<number, 'asc' | 'desc'>>(
    {}
  );
  const fallbackProjectId = useMemo(() => projects[0]?.id ?? null, [projects]);

  const handleCreateDecision = async (project: ProjectData) => {
    setCreatingProjectId(project.id);
    try {
      const draft = await DecisionAPI.createDraft(project.id);
      router.push(`/decisions/${draft.id}?project_id=${project.id}`);
    } catch (error) {
      console.error('Failed to create decision draft:', error);
      toast.error('Failed to create decision draft.');
    } finally {
      setCreatingProjectId(null);
    }
  };

  const handleCreateDecisionModal = async (project: ProjectData) => {
    setCreatingProjectId(project.id);
    try {
      const draft = await DecisionAPI.createDraft(project.id);
      handleOpenEditModal(draft.id, project.id);
    } catch (error) {
      console.error('Failed to create decision draft:', error);
      toast.error('Failed to create decision draft.');
    } finally {
      setCreatingProjectId(null);
    }
  };

  const handleOpenEditModal = (decisionId: number, projectId?: number | null) => {
    setEditDecisionId(decisionId);
    setEditProjectId(projectId ?? null);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setEditDecisionId(null);
    setEditProjectId(null);
  };

  const clearLinkEdit = () => {
    setLinkEditProjectId(null);
    setLinkEditDecisionId(null);
    setLinkEditSelfSeq(null);
    setLinkEditInitialSeqs([]);
    setLinkEditSelectedSeqs([]);
    setLinkEditLoading(false);
    setLinkEditSaving(false);
    setLinkEditError(null);
  };

  const startLinkEdit = async (
    node: DecisionGraphResponse['nodes'][number],
    projectId: number
  ) => {
    if (!node.projectSeq) {
      toast.error('Decision seq unavailable for linking.');
      return;
    }
    if (
      linkEditDecisionId &&
      (linkEditProjectId !== projectId || linkEditDecisionId !== node.id)
    ) {
      toast.error('Finish or cancel the current link edit first.');
      return;
    }
    setLinkEditProjectId(projectId);
    setLinkEditDecisionId(node.id);
    setLinkEditSelfSeq(node.projectSeq ?? null);
    setLinkEditLoading(true);
    setLinkEditError(null);
    try {
      const data = await DecisionAPI.getConnections(node.id, projectId);
      const seqs = (data.connected || []).map((item) => item.project_seq);
      setLinkEditInitialSeqs(seqs);
      setLinkEditSelectedSeqs(seqs);
    } catch (error) {
      console.error('Failed to load connections:', error);
      toast.error('Failed to load connections.');
      setLinkEditError('Failed to load connections.');
    } finally {
      setLinkEditLoading(false);
    }
  };

  const handleToggleLink = (node: DecisionGraphResponse['nodes'][number]) => {
    if (linkEditLoading || linkEditSaving) return;
    const seq = node.projectSeq;
    if (!seq) return;
    if (linkEditSelfSeq && seq === linkEditSelfSeq) {
      toast.error('Cannot link a decision to itself.');
      return;
    }
    setLinkEditSelectedSeqs((prev) =>
      prev.includes(seq) ? prev.filter((value) => value !== seq) : [...prev, seq]
    );
  };

  const handleSaveLinkEdits = async () => {
    if (!linkEditDecisionId || !linkEditProjectId) return;
    setLinkEditSaving(true);
    setLinkEditError(null);
    try {
      await DecisionAPI.updateConnections(
        linkEditDecisionId,
        linkEditSelectedSeqs,
        linkEditProjectId
      );
      await fetchProjectsAndDecisions();
      clearLinkEdit();
      toast.success('Links updated.');
    } catch (error) {
      console.error('Failed to save connections:', error);
      toast.error('Failed to save connections.');
      setLinkEditError('Failed to save connections.');
    } finally {
      setLinkEditSaving(false);
    }
  };

  const handleDeleteFromTree = async (node: DecisionGraphResponse['nodes'][number], projectId: number) => {
    if (!window.confirm(`Are you sure you want to delete decision "${node.title || 'Untitled'}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await DecisionAPI.deleteDecision(node.id, projectId);
      await fetchProjectsAndDecisions();
      toast.success('Decision deleted.');
    } catch (error: any) {
      console.error('Failed to delete decision:', error);
      const message = error?.response?.data?.detail || 'Failed to delete decision.';
      toast.error(message);
    }
  };

  const handleDeleteDecision = async (decision: DecisionListItem, projectId: number) => {
    if (!window.confirm(`Are you sure you want to delete decision "${decision.title || 'Untitled'}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await DecisionAPI.deleteDecision(decision.id, projectId);
      await fetchProjectsAndDecisions();
      toast.success('Decision deleted.');
    } catch (error: any) {
      console.error('Failed to delete decision:', error);
      const message = error?.response?.data?.detail || 'Failed to delete decision.';
      toast.error(message);
    }
  };

  const linkEditRemovedSeqs = useMemo(() => {
    const selected = new Set(linkEditSelectedSeqs);
    return linkEditInitialSeqs.filter((seq) => !selected.has(seq));
  }, [linkEditInitialSeqs, linkEditSelectedSeqs]);

  const fetchProjectsAndDecisions = async () => {
    setLoading(true);
    try {
      const projectList = await ProjectAPI.getProjects();
      setProjects(projectList);
      if (projectList.length === 0) {
        setDecisions([]);
        setDecisionsByProject({});
        setLoading(false);
        return;
      }
      const response = await DecisionAPI.listDecisions(projectList[0].id);
      const items = response.items || [];
      setDecisions(items);
      const graphEntries = await Promise.all(
        projectList.map(async (project) => {
          try {
            const graph = await DecisionAPI.getDecisionGraph(project.id);
            return [project.id, graph] as const;
          } catch (error) {
            console.warn('Failed to load graph for project:', project.id, error);
            return [project.id, { nodes: [], edges: [] }] as const;
          }
        })
      );
      const graphs = graphEntries.reduce<Record<number, DecisionGraphResponse>>(
        (acc, [id, graph]) => {
          acc[id] = graph;
          return acc;
        },
        {}
      );
      setGraphsByProject(graphs);
    } catch (error) {
      console.error('Failed to load decisions:', error);
      toast.error('Failed to load decisions.');
      setProjects([]);
      setDecisions([]);
      setGraphsByProject({});
      setDecisionsByProject({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndDecisions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const loadRoles = async () => {
      if (!currentUserId) return;
      if (projects.length === 0) return;
      try {
        const entries = await Promise.all(
          projects.map(async (project) => {
            const id = project.id;
            const members = await ProjectAPI.getProjectMembers(id);
            const current = members.find((member) => member.user?.id === currentUserId);
            return [id, current?.role || 'member'] as const;
          })
        );
        const next = entries.reduce<Record<number, string>>((acc, [id, role]) => {
          acc[id] = role;
          return acc;
        }, {});
        setProjectRoles(next);
      } catch (error) {
        console.warn('Failed to load project roles:', error);
      }
    };
    loadRoles();
  }, [projects, currentUserId]);

  useEffect(() => {
    const next: Record<number, DecisionListItem[]> = {};
    projects.forEach((project) => {
      next[project.id] = [];
    });
    decisions.forEach((item) => {
      if (!item.projectId) return;
      if (!next[item.projectId]) {
        next[item.projectId] = [];
      }
      next[item.projectId].push(item);
    });
    setDecisionsByProject(next);
  }, [decisions, projects]);

  useEffect(() => {
    if (loading) return;
    const nextPagination: Record<number, { pageIndex: number; pageSize: number }> = {};
    projects.forEach((project) => {
      const items = decisionsByProject[project.id] || [];
      const viewMode = viewModeByProject[project.id] || DEFAULT_VIEW_MODE;
      const pageSize = PAGE_SIZE_BY_VIEW[viewMode];
      const paging = paginationByProject[project.id] || {
        pageIndex: 0,
        pageSize,
      };
      const totalPages = Math.max(1, Math.ceil(items.length / paging.pageSize));
      const clampedIndex = Math.min(paging.pageIndex, totalPages - 1);
      if (
        !paginationByProject[project.id] ||
        clampedIndex !== paging.pageIndex ||
        paging.pageSize !== pageSize
      ) {
        nextPagination[project.id] = {
          pageIndex: clampedIndex,
          pageSize,
        };
      }
    });
    if (Object.keys(nextPagination).length > 0) {
      setPaginationByProject((prev) => ({
        ...prev,
        ...nextPagination,
      }));
    }
  }, [loading, projects, decisionsByProject, paginationByProject, viewModeByProject]);

  const listContent = useMemo(() => {
    if (loading) {
      return (
        <div className="text-sm text-gray-500">Loading decisions...</div>
      );
    }

    if (projects.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          No projects found for your account.
        </div>
      );
    }

    return (
      <div className="space-y-8">
        {projects.map((project) => {
          const groupKey = `project-${project.id}`;
          const isTreeCollapsed = collapsedTrees[project.id] ?? false;
          const isListCollapsed = collapsedLists[project.id] ?? false;
          const roleLabel = projectRoles[project.id] || 'member';
          const roleLevel = ROLE_LEVELS[roleLabel] ?? ROLE_LEVELS.member;
          const canReview = roleLevel <= APPROVAL_REVIEW_MAX_LEVEL;
          const canDelete = roleLevel <= EDIT_MAX_LEVEL;
          const decisions = decisionsByProject[project.id] || [];
          const graph = graphsByProject[project.id] || { nodes: [], edges: [] };
          const isEditingLinks =
            linkEditProjectId === project.id && linkEditDecisionId !== null;
          return (
          <div
            key={groupKey}
            className="rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <div
              className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4"
              data-project-header={project.id}
            >
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{project.name}</h2>
                <p className="text-xs text-gray-500">
                  {decisions.length} decision{decisions.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCreateDecision(project)}
                  disabled={creatingProjectId === project.id}
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <FilePenLine className="h-3.5 w-3.5" />
                  {creatingProjectId === project.id ? 'Creating...' : 'Create Decision'}
                </button>
                <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-600">
                  {roleLabel}
                </span>
              </div>
            </div>
            <div className="space-y-4 px-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-900">Decision Tree</h3>
                  <input
                    type="date"
                    value={focusDateByProject[project.id] || ''}
                    onChange={(event) =>
                      setFocusDateByProject((prev) => ({
                        ...prev,
                        [project.id]: event.target.value,
                      }))
                    }
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700"
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedTrees((prev) => ({
                      ...prev,
                      [project.id]: !isTreeCollapsed,
                    }))
                  }
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:border-gray-300"
                >
                  {isTreeCollapsed ? 'Expand' : 'Collapse'}
                </button>
              </div>
              {isEditingLinks ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      Editing links for #{linkEditSelfSeq ?? '—'}
                    </span>
                    <span className="text-emerald-700">Green = keep/add</span>
                    <span className="text-red-600">Red = remove</span>
                    {linkEditLoading ? (
                      <span className="text-emerald-700">Loading...</span>
                    ) : null}
                    {linkEditError ? (
                      <span className="text-red-600">{linkEditError}</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={clearLinkEdit}
                      disabled={linkEditLoading || linkEditSaving}
                      className="rounded-md border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-700 hover:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveLinkEdits}
                      disabled={linkEditLoading || linkEditSaving}
                      className="rounded-md bg-emerald-700 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {linkEditSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>
              ) : null}
              {!isTreeCollapsed ? (
                <DecisionTree
                  nodes={graph.nodes}
                  edges={graph.edges}
                  projectId={project.id}
                  onEditDecision={(node) => handleOpenEditModal(node.id, project.id)}
                  onEditLinks={(node) => startLinkEdit(node, project.id)}
                  onCreateDecision={() => handleCreateDecisionModal(project)}
                  autoFocusToday
                  focusDateKey={focusDateByProject[project.id] || null}
                  canReview={canReview}
                  canDelete={canDelete}
                  onDelete={(node) => handleDeleteFromTree(node, project.id)}
                  mode={isEditingLinks ? 'link-editor' : 'viewer'}
                  selectedSeqs={isEditingLinks ? linkEditSelectedSeqs : undefined}
                  removedSeqs={isEditingLinks ? linkEditRemovedSeqs : undefined}
                  onToggleLink={isEditingLinks ? handleToggleLink : undefined}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
                  Decision tree collapsed.
                </div>
              )}

              <div className="h-px bg-gray-200" />

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-semibold text-gray-900">Decision List</h3>
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                    <span className="text-gray-500">View</span>
                    <div className="inline-flex rounded-md border border-gray-200 bg-white p-0.5">
                      {(['cards', 'grid', 'compact'] as const).map((mode) => {
                        const isActive =
                          (viewModeByProject[project.id] || DEFAULT_VIEW_MODE) === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => {
                              const pageSize = PAGE_SIZE_BY_VIEW[mode];
                              setViewModeByProject((prev) => ({
                                ...prev,
                                [project.id]: mode,
                              }));
                              setPaginationByProject((prev) => ({
                                ...prev,
                                [project.id]: { pageIndex: 0, pageSize },
                              }));
                            }}
                            className={`rounded-md px-2 py-1 text-xs font-semibold ${
                              isActive
                                ? 'bg-gray-900 text-white'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            {mode === 'cards'
                              ? 'Cards'
                              : mode === 'grid'
                                ? 'Grid'
                                : 'Compact'}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-600">
                      <ArrowUpDown className="h-3.5 w-3.5 text-gray-400" />
                      <select
                        value={sortByProject[project.id] || DEFAULT_SORT_MODE}
                        onChange={(event) =>
                          setSortByProject((prev) => ({
                            ...prev,
                            [project.id]: event.target.value as
                              | 'UPDATED'
                              | 'STATUS'
                              | 'RISK'
                              | 'SEQ',
                          }))
                        }
                        className="bg-transparent text-xs font-semibold text-gray-700 focus:outline-none"
                      >
                        <option value="UPDATED">Updated</option>
                        <option value="STATUS">Status</option>
                        <option value="RISK">Risk</option>
                        <option value="SEQ">Seq</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          setSortDirByProject((prev) => {
                            const current = prev[project.id] || 'desc';
                            const next = current === 'asc' ? 'desc' : 'asc';
                            return { ...prev, [project.id]: next };
                          })
                        }
                        className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-gray-200 text-gray-500 hover:border-gray-300"
                        title="Toggle sort direction"
                      >
                        {(sortDirByProject[project.id] || 'desc') === 'asc' ? (
                          <ArrowUp className="h-3.5 w-3.5" />
                        ) : (
                          <ArrowDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCollapsedLists((prev) => ({
                        ...prev,
                        [project.id]: !isListCollapsed,
                      }))
                    }
                    className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:border-gray-300"
                  >
                    {isListCollapsed ? 'Expand' : 'Collapse'}
                  </button>
                </div>
              </div>

              {!isListCollapsed ? (
                <>
                  {decisions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
                      No decisions for this project yet.
                    </div>
                  ) : null}
                  {(() => {
                    const sortMode = sortByProject[project.id] || DEFAULT_SORT_MODE;
                    const sortDir =
                      sortDirByProject[project.id] ||
                      (sortMode === 'UPDATED' || sortMode === 'SEQ' ? 'desc' : 'asc');
                    const statusRank: Record<string, number> = {
                      DRAFT: 1,
                      AWAITING_APPROVAL: 2,
                      COMMITTED: 3,
                      REVIEWED: 4,
                      ARCHIVED: 5,
                    };
                    const riskRank: Record<string, number> = {
                      HIGH: 1,
                      MEDIUM: 2,
                      LOW: 3,
                    };
                    const sorted = [...decisions].sort((a, b) => {
                      let diff = 0;
                      if (sortMode === 'STATUS') {
                        const aRank = statusRank[a.status] ?? 999;
                        const bRank = statusRank[b.status] ?? 999;
                        diff = aRank - bRank;
                      }
                      if (sortMode === 'RISK') {
                        const aRisk =
                          'riskLevel' in a && (a as any).riskLevel
                            ? (a as any).riskLevel
                            : undefined;
                        const bRisk =
                          'riskLevel' in b && (b as any).riskLevel
                            ? (b as any).riskLevel
                            : undefined;
                        const aRank = aRisk ? riskRank[aRisk] ?? 999 : 999;
                        const bRank = bRisk ? riskRank[bRisk] ?? 999 : 999;
                        diff = aRank - bRank;
                      }
                      if (sortMode === 'SEQ') {
                        const aSeq = a.projectSeq ?? seqByDecisionId.get(a.id) ?? 999999;
                        const bSeq = b.projectSeq ?? seqByDecisionId.get(b.id) ?? 999999;
                        diff = aSeq - bSeq;
                      }
                      if (sortMode === 'UPDATED') {
                        const aTime = new Date(
                          a.updatedAt || a.createdAt || 0
                        ).getTime();
                        const bTime = new Date(
                          b.updatedAt || b.createdAt || 0
                        ).getTime();
                        diff = aTime - bTime;
                      }
                      if (diff !== 0) {
                        return sortDir === 'asc' ? diff : -diff;
                      }
                      const aTime = new Date(
                        a.updatedAt || a.createdAt || 0
                      ).getTime();
                      const bTime = new Date(
                        b.updatedAt || b.createdAt || 0
                      ).getTime();
                      return bTime - aTime;
                    });
                    const viewMode = viewModeByProject[project.id] || DEFAULT_VIEW_MODE;
                    const pageSize = PAGE_SIZE_BY_VIEW[viewMode];
                    const paging =
                      paginationByProject[project.id] || {
                        pageIndex: 0,
                        pageSize,
                      };
                    const totalPages = Math.max(
                      1,
                      Math.ceil(sorted.length / paging.pageSize)
                    );
                    const pageIndex = Math.min(paging.pageIndex, totalPages - 1);
                    const start = pageIndex * paging.pageSize;
                    const end = start + paging.pageSize;
                    const visible = sorted.slice(start, end);
                    const setPageIndex = (nextIndex: number) => {
                      setPaginationByProject((prev) => ({
                        ...prev,
                        [project.id]: { ...paging, pageIndex: nextIndex },
                      }));
                    };

                    return (
                      <>
                        {viewMode === 'cards' ? (
                          visible.map((decision) => {
                            const seq = decision.projectSeq ?? seqByDecisionId.get(decision.id);
                            return (
                            <div
                              key={decision.id}
                              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  {typeof seq === 'number' ? (
                                    <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                      #{seq}
                                    </span>
                                  ) : null}
                                  <span
                                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor(
                                      decision.status
                                    )}`}
                                  >
                                    {decision.status}
                                  </span>
                                  <h3 className="truncate text-sm font-semibold text-gray-900">
                                    {decision.title || 'Untitled'}
                                  </h3>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">
                                  Last update:{' '}
                                  {formatDate(
                                    decision.updatedAt ||
                                      decision.committedAt ||
                                      decision.createdAt
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {decision.status === 'COMMITTED' && canReview ? (
                                  <Link
                                    href={`/decisions/${decision.id}/review${
                                      (decision.projectId ?? fallbackProjectId)
                                        ? `?project_id=${decision.projectId ?? fallbackProjectId}`
                                        : ''
                                    }`}
                            className="inline-flex w-[80px] items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:border-blue-300"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Review
                          </Link>
                        ) : null}
                        {decision.status === 'DRAFT' ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenEditModal(
                                        decision.id,
                                        decision.projectId ?? fallbackProjectId
                                      )
                                    }
                            className="inline-flex w-[80px] items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:border-amber-300"
                          >
                            <PencilLine className="h-3.5 w-3.5" />
                            Edit
                          </button>
                                ) : null}
                                <Link
                                  href={`/decisions/${decision.id}${
                                    (decision.projectId ?? fallbackProjectId)
                                      ? `?project_id=${decision.projectId ?? fallbackProjectId}`
                                      : ''
                                  }`}
                                  className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
                                >
                                  <FileText className="h-3.5 w-3.5" />
                                  Details
                                </Link>
                                {canDelete ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteDecision(
                                        decision,
                                        decision.projectId ?? fallbackProjectId ?? project.id
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:border-red-300"
                                    title="Delete decision"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            );
                          })
                        ) : viewMode === 'grid' ? (
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                            {visible.map((decision) => (
                              <div
                                key={decision.id}
                                className="flex h-full flex-col justify-between rounded-xl border border-gray-200 bg-gray-50 p-4"
                              >
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between gap-2">
                                    {(() => {
                                      const seq =
                                        decision.projectSeq ?? seqByDecisionId.get(decision.id);
                                      return typeof seq === 'number' ? (
                                      <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                                        #{seq}
                                      </span>
                                      ) : (
                                      <span className="text-[10px] font-semibold text-gray-400">
                                        —
                                      </span>
                                      );
                                    })()}
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(
                                          decision.status
                                        )}`}
                                      >
                                        {decision.status}
                                      </span>
                                      {'riskLevel' in decision && (decision as any).riskLevel ? (
                                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                          {(decision as any).riskLevel}
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                  <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">
                                    {decision.title || 'Untitled'}
                                  </h3>
                                  <p className="text-xs text-gray-500">
                                    Updated:{' '}
                                    {formatDate(
                                      decision.updatedAt ||
                                        decision.committedAt ||
                                        decision.createdAt
                                    )}
                                  </p>
                                </div>
                                <div className="mt-4 flex items-center gap-2">
                                  {decision.status === 'COMMITTED' && canReview ? (
                                    <Link
                                      href={`/decisions/${decision.id}/review${
                                        (decision.projectId ?? fallbackProjectId)
                                          ? `?project_id=${decision.projectId ?? fallbackProjectId}`
                                          : ''
                                      }`}
                                      className="inline-flex w-[80px] items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:border-blue-300"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Review
                                    </Link>
                                  ) : null}
                                  {decision.status === 'DRAFT' ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleOpenEditModal(
                                          decision.id,
                                          decision.projectId ?? fallbackProjectId
                                        )
                                      }
                                      className="inline-flex w-[80px] items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:border-amber-300"
                                    >
                                      <PencilLine className="h-3.5 w-3.5" />
                                      Edit
                                    </button>
                                  ) : null}
                                  <Link
                                    href={`/decisions/${decision.id}${
                                      (decision.projectId ?? fallbackProjectId)
                                        ? `?project_id=${decision.projectId ?? fallbackProjectId}`
                                        : ''
                                    }`}
                                    className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
                                  >
                                    <FileText className="h-3.5 w-3.5" />
                                    Details
                                  </Link>
                                  {canDelete ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteDecision(
                                          decision,
                                          decision.projectId ?? fallbackProjectId ?? project.id
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:border-red-300"
                                      title="Delete decision"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="overflow-hidden rounded-xl border border-gray-200">
                            <div className="grid grid-cols-[70px_minmax(220px,1fr)_105px_105px_130px_auto] gap-2 border-b border-gray-200 bg-gray-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                              <div>#Seq</div>
                              <div>Title</div>
                              <div className="-ml-10">Status</div>
                              <div className="-ml-7">Risk</div>
                              <div className="-ml-10">Updated</div>
                              <div className="-ml-10 text-right">Actions</div>
                            </div>
                            <div className="divide-y divide-gray-200 bg-white">
                              {visible.map((decision) => {
                                const seq = decision.projectSeq ?? seqByDecisionId.get(decision.id);
                                return (
                                <div
                                  key={decision.id}
                                  className="grid grid-cols-[70px_minmax(220px,1fr)_105px_105px_130px_auto] items-center gap-2 px-4 py-2 text-xs text-gray-700"
                                >
                                  <div className="text-[11px] font-semibold text-gray-500">
                                    {typeof seq === 'number' ? `#${seq}` : '—'}
                                  </div>
                                  <Link
                                    href={`/decisions/${decision.id}${
                                      (decision.projectId ?? fallbackProjectId)
                                        ? `?project_id=${decision.projectId ?? fallbackProjectId}`
                                        : ''
                                    }`}
                                    className="truncate font-semibold text-gray-900 hover:text-blue-600"
                                  >
                                    {decision.title || 'Untitled'}
                                  </Link>
                                  <div className="flex justify-center">
                                    <span
                                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor(
                                        decision.status
                                      )}`}
                                    >
                                      {decision.status}
                                    </span>
                                  </div>
                                  <div className="text-center text-[11px] font-semibold text-slate-600">
                                    {'riskLevel' in decision && (decision as any).riskLevel
                                      ? (decision as any).riskLevel
                                      : '—'}
                                  </div>
                                  <div className="text-[11px] text-gray-500">
                                    {formatDate(
                                      decision.updatedAt ||
                                        decision.committedAt ||
                                        decision.createdAt
                                    )}
                                  </div>
                                  <div className="flex items-center justify-end gap-2">
                                    {decision.status === 'COMMITTED' && canReview ? (
                                      <Link
                                        href={`/decisions/${decision.id}/review${
                                          (decision.projectId ?? fallbackProjectId)
                                            ? `?project_id=${decision.projectId ?? fallbackProjectId}`
                                            : ''
                                        }`}
                                        className="inline-flex w-[80px] items-center justify-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:border-blue-300"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        Review
                                      </Link>
                                    ) : null}
                                    {decision.status === 'DRAFT' ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleOpenEditModal(
                                            decision.id,
                                            decision.projectId ?? fallbackProjectId
                                          )
                                        }
                                        className="inline-flex w-[80px] items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700 hover:border-amber-300"
                                      >
                                        <PencilLine className="h-3 w-3" />
                                        Edit
                                      </button>
                                    ) : null}
                                    {canDelete ? (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteDecision(
                                            decision,
                                            decision.projectId ?? fallbackProjectId ?? project.id
                                          )
                                        }
                                        className="inline-flex items-center justify-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:border-red-300"
                                        title="Delete decision"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </button>
                                    ) : null}
                                    {decision.status !== 'COMMITTED' && decision.status !== 'DRAFT' ? (
                                      <span className="inline-flex w-[80px] items-center justify-center rounded-md border border-transparent px-2.5 py-1 text-[11px] font-semibold text-gray-300">
                                        —
                                      </span>
                                    ) : decision.status === 'COMMITTED' && !canReview ? (
                                      <span className="inline-flex w-[80px] items-center justify-center rounded-md border border-transparent px-2.5 py-1 text-[11px] font-semibold text-gray-300">
                                        —
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs text-gray-600">
                          <button
                            type="button"
                            onClick={() =>
                              document
                                .querySelector(`[data-project-header='${project.id}']`)
                                ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            }
                            className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:border-gray-300"
                          >
                            Back to header
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setPageIndex(Math.max(0, pageIndex - 1))}
                              disabled={pageIndex === 0}
                              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                                pageIndex === 0
                                  ? 'cursor-not-allowed border-gray-200 text-gray-300'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              &lt;
                            </button>
                            <div className="flex items-center gap-1 text-xs font-semibold text-gray-700">
                              <input
                                type="number"
                                min={1}
                                max={totalPages}
                                value={pageIndex + 1}
                                onChange={(event) => {
                                  const raw = Number(event.target.value);
                                  if (!Number.isFinite(raw)) return;
                                  const clamped = Math.min(
                                    Math.max(1, Math.floor(raw)),
                                    totalPages
                                  );
                                  setPageIndex(clamped - 1);
                                }}
                                className="w-12 rounded-md border border-gray-200 px-2 py-1 text-right text-xs font-semibold text-gray-700 focus:border-blue-500 focus:outline-none"
                              />
                              <span>/</span>
                              <span>{totalPages}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setPageIndex(Math.min(totalPages - 1, pageIndex + 1))
                              }
                              disabled={pageIndex >= totalPages - 1}
                              className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                                pageIndex >= totalPages - 1
                                  ? 'cursor-not-allowed border-gray-200 text-gray-300'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}
                            >
                              &gt;
                            </button>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </>
              ) : (
                <div className="text-sm text-gray-500">
                  {decisions.length} decision{decisions.length === 1 ? '' : 's'} hidden.
                </div>
              )}
            </div>
          </div>
        );
        })}
      </div>
    );
  }, [
    decisionsByProject,
    loading,
    projectRoles,
    collapsedTrees,
    collapsedLists,
    fallbackProjectId,
    currentUserId,
    projects,
    focusDateByProject,
    paginationByProject,
    viewModeByProject,
    sortByProject,
    sortDirByProject,
    linkEditProjectId,
    linkEditDecisionId,
    linkEditSelfSeq,
    linkEditLoading,
    linkEditSaving,
    linkEditError,
    linkEditSelectedSeqs,
    linkEditRemovedSeqs,
  ]);

  return (
    <Layout>
      <ProtectedRoute>
        <div className="flex h-full flex-col gap-6 bg-gray-50 px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Decisions</h1>
              <p className="mt-1 text-sm text-gray-500">
                Review and open decisions across your projects.
              </p>
            </div>
                <div />
          </div>

          {listContent}
        </div>
      </ProtectedRoute>
      <DecisionEditModal
        decisionId={editDecisionId}
        projectId={editProjectId}
        isOpen={editModalOpen}
        onClose={handleCloseEditModal}
        onSaved={fetchProjectsAndDecisions}
      />
    </Layout>
  );
};

export default DecisionsPage;
