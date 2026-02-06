'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FilePenLine, FileText, PencilLine } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DecisionAPI } from '@/lib/api/decisionApi';
import { ProjectAPI, type ProjectData } from '@/lib/api/projectApi';
import { useAuthStore } from '@/lib/authStore';
import DecisionTree from '@/components/decisions/DecisionTree';
import DecisionEditModal from '@/components/decisions/DecisionEditModal';
import type { DecisionGraphResponse, DecisionListItem } from '@/types/decision';

const statusOptions = [
  { label: 'All status', value: 'ALL' },
  { label: 'DRAFT', value: 'DRAFT' },
  { label: 'AWAITING_APPROVAL', value: 'AWAITING_APPROVAL' },
  { label: 'COMMITTED', value: 'COMMITTED' },
  { label: 'REVIEWED', value: 'REVIEWED' },
  { label: 'ARCHIVED', value: 'ARCHIVED' },
];

const riskOptions = [
  { label: 'All risk levels', value: 'ALL' },
  { label: 'LOW', value: 'LOW' },
  { label: 'MEDIUM', value: 'MEDIUM' },
  { label: 'HIGH', value: 'HIGH' },
];

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

const DecisionsPage = () => {
  const router = useRouter();
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [riskFilter, setRiskFilter] = useState('ALL');
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
  const [focusDateByProject, setFocusDateByProject] = useState<Record<number, string>>({});
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
      const response = await DecisionAPI.listDecisions(
        projectList[0].id,
        {
          status: statusFilter === 'ALL' ? undefined : statusFilter,
          riskLevel: riskFilter === 'ALL' ? undefined : riskFilter,
        }
      );
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
  }, [statusFilter, riskFilter]);

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
          const decisions = decisionsByProject[project.id] || [];
          const graph = graphsByProject[project.id] || { nodes: [], edges: [] };
          return (
          <div
            key={groupKey}
            className="rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
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
              {!isTreeCollapsed ? (
                <DecisionTree
                  nodes={graph.nodes}
                  edges={graph.edges}
                  projectId={project.id}
                  onEditDecision={(node) => handleOpenEditModal(node.id, project.id)}
                  onCreateDecision={() => handleCreateDecisionModal(project)}
                  autoFocusToday
                  focusDateKey={focusDateByProject[project.id] || null}
                />
              ) : (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
                  Decision tree collapsed.
                </div>
              )}

              <div className="h-px bg-gray-200" />

              <div className="flex items-center justify-between gap-4">
                <h3 className="text-sm font-semibold text-gray-900">Decision List</h3>
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

              {!isListCollapsed ? (
                <>
                  {decisions.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
                      No decisions for this project yet.
                    </div>
                  ) : null}
                  {decisions.map((decision) => (
                    <div
                      key={decision.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
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
                            decision.updatedAt || decision.committedAt || decision.createdAt
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
                            className="inline-flex items-center rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 hover:border-blue-300"
                          >
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
                            className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 hover:border-amber-300"
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
                      </div>
                    </div>
                  ))}
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
    statusFilter,
    currentUserId,
    projects,
    focusDateByProject,
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
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select
                value={riskFilter}
                onChange={(event) => setRiskFilter(event.target.value)}
                className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700"
              >
                {riskOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
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
