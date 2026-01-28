'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DecisionAPI } from '@/lib/api/decisionApi';
import { ProjectAPI } from '@/lib/api/projectApi';
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

const DecisionsPage = () => {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project_id');
  const projectId = projectIdParam ? Number(projectIdParam) : null;
  const currentUserId = useAuthStore((state) => state.user?.id);

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [items, setItems] = useState<DecisionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectIds, setProjectIds] = useState<number[]>([]);
  const [projectRoles, setProjectRoles] = useState<Record<number, string>>({});
  const [collapsedProjects, setCollapsedProjects] = useState<Record<string, boolean>>({});
  const fallbackProjectId = useMemo(() => projectId ?? projectIds[0] ?? null, [
    projectId,
    projectIds,
  ]);

  const fetchDecisions = async () => {
    setLoading(true);
    try {
      let ids = projectId ? [projectId] : projectIds;
      if (!projectId) {
        const projects = await ProjectAPI.getProjects();
        ids = projects.map((project) => project.id);
        setProjectIds(ids);
      }
      if (ids.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }
      const responses = await Promise.all(
        ids.map((id) =>
          DecisionAPI.listDecisions(id, {
            status: statusFilter === 'ALL' ? undefined : statusFilter,
          })
        )
      );
      const merged = responses.flatMap((response) => response.items || []);
      const unique = Array.from(
        new Map(merged.map((item) => [item.id, item])).values()
      );
      setItems(unique);
    } catch (error) {
      console.error('Failed to load decisions:', error);
      toast.error('Failed to load decisions.');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDecisions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, statusFilter]);

  useEffect(() => {
    const loadRoles = async () => {
      if (!currentUserId) return;
      const uniqueProjectIds = Array.from(
        new Set(items.map((item) => item.projectId).filter(Boolean) as number[])
      );
      if (uniqueProjectIds.length === 0) return;
      try {
        const entries = await Promise.all(
          uniqueProjectIds.map(async (id) => {
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
  }, [items, currentUserId]);

  const listContent = useMemo(() => {
    if (loading) {
      return (
        <div className="text-sm text-gray-500">Loading decisions...</div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          {statusFilter === 'DRAFT' || statusFilter === 'AWAITING_APPROVAL'
            ? 'Current API list only returns committed/reviewed/archived decisions.'
            : 'No decisions found for your projects.'}
        </div>
      );
    }

    const grouped = items.reduce<
      Record<string, { label: string; projectId: number | null; items: DecisionListItem[] }>
    >((acc, item) => {
      const label =
        item.projectName ||
        (item.projectId ? `Project ${item.projectId}` : 'Unassigned Project');
      const key = `${label}-${item.projectId ?? 'none'}`;
      if (!acc[key]) {
        acc[key] = { label, projectId: item.projectId ?? null, items: [] };
      }
      acc[key].items.push(item);
      return acc;
    }, {});

    return (
      <div className="space-y-8">
        {Object.entries(grouped).map(([groupKey, group]) => {
          const isCollapsed = collapsedProjects[groupKey] ?? false;
          const roleLabel =
            group.projectId && projectRoles[group.projectId]
              ? projectRoles[group.projectId]
              : 'member';
          return (
          <div
            key={groupKey}
            className="rounded-2xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{group.label}</h2>
                <p className="text-xs text-gray-500">
                  {group.items.length} decision{group.items.length === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex items-center gap-2">
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
                {group.items.map((decision) => (
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
                ))}
              </div>
            </div>
            {isCollapsed ? (
              <div className="px-6 py-4 text-sm text-gray-500">
                {group.items.length} decision{group.items.length === 1 ? '' : 's'} hidden.
              </div>
            ) : null}
          </div>
        );
        })}
      </div>
    );
  }, [items, loading, projectId, projectRoles, collapsedProjects, fallbackProjectId, statusFilter, currentUserId]);

  return (
    <Layout>
      <ProtectedRoute>
        <div className="flex h-full flex-col gap-6 bg-gray-50 px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Decisions</h1>
              <p className="mt-1 text-sm text-gray-500">
                Review and open decisions for the current project.
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
