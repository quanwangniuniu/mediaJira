'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { FilePenLine } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DecisionAPI } from '@/lib/api/decisionApi';
import { ProjectAPI, type ProjectData } from '@/lib/api/projectApi';
import { useAuthStore } from '@/lib/authStore';
import type { DecisionListItem } from '@/types/decision';

const statusOptions = [
  { label: 'All', value: 'ALL' },
  { label: 'DRAFT', value: 'DRAFT' },
  { label: 'AWAITING_APPROVAL', value: 'AWAITING_APPROVAL' },
  { label: 'COMMITTED', value: 'COMMITTED' },
  { label: 'REVIEWED', value: 'REVIEWED' },
  { label: 'ARCHIVED', value: 'ARCHIVED' },
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
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [decisions, setDecisions] = useState<DecisionListItem[]>([]);
  const [decisionsByProject, setDecisionsByProject] = useState<Record<number, DecisionListItem[]>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [projectRoles, setProjectRoles] = useState<Record<number, string>>({});
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const [creatingProjectId, setCreatingProjectId] = useState<number | null>(null);
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
        statusFilter === 'ALL' ? undefined : { status: statusFilter }
      );
      const items = response.items || [];
      setDecisions(items);
    } catch (error) {
      console.error('Failed to load decisions:', error);
      toast.error('Failed to load decisions.');
      setProjects([]);
      setDecisions([]);
      setDecisionsByProject({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectsAndDecisions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

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
          const isCollapsed = collapsedProjects[groupKey] ?? false;
          const roleLabel = projectRoles[project.id] || 'member';
          const roleLevel = ROLE_LEVELS[roleLabel] ?? ROLE_LEVELS.member;
          const canReview = roleLevel <= APPROVAL_REVIEW_MAX_LEVEL;
          const decisions = decisionsByProject[project.id] || [];
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
                <button
                  type="button"
                  onClick={() =>
                    setCollapsedProjects((prev) => ({
                      ...prev,
                      [groupKey]: !isCollapsed,
                    }))
                  }
                  className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:border-gray-300"
                >
                  {isCollapsed ? 'Expand' : 'Collapse'}
                </button>
              </div>
            </div>
            <div
              className={`overflow-hidden transition-[max-height] duration-250 ease-in-out ${
                isCollapsed ? 'max-h-0' : 'max-h-[2000px]'
              }`}
            >
              <div className="space-y-3 px-6 py-4">
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
                      <Link
                        href={`/decisions/${decision.id}${
                          (decision.projectId ?? fallbackProjectId)
                            ? `?project_id=${decision.projectId ?? fallbackProjectId}`
                            : ''
                        }`}
                        className="inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
                      >
                        Open
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {isCollapsed ? (
              <div className="px-6 py-4 text-sm text-gray-500">
                {decisions.length} decision{decisions.length === 1 ? '' : 's'} hidden.
              </div>
            ) : null}
          </div>
        );
        })}
      </div>
    );
  }, [
    decisionsByProject,
    loading,
    projectRoles,
    collapsedProjects,
    fallbackProjectId,
    statusFilter,
    currentUserId,
    projects,
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
            <div className="flex flex-wrap gap-2">
              {statusOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setStatusFilter(option.value)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    statusFilter === option.value
                      ? 'border-gray-900 bg-gray-900 text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {listContent}
        </div>
      </ProtectedRoute>
    </Layout>
  );
};

export default DecisionsPage;
