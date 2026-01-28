'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { DecisionAPI } from '@/lib/api/decisionApi';
import { ProjectAPI } from '@/lib/api/projectApi';
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

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [items, setItems] = useState<DecisionListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectIds, setProjectIds] = useState<number[]>([]);
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

    return (
      <div className="space-y-3">
        {items.map((decision) => (
          <div
            key={decision.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3"
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
                Last update: {formatDate(decision.updatedAt || decision.committedAt || decision.createdAt)}
              </p>
            </div>
            <Link
              href={`/decisions/${decision.id}${
                fallbackProjectId ? `?project_id=${fallbackProjectId}` : ''
              }`}
              className="inline-flex items-center rounded-md bg-gray-900 px-3 py-2 text-xs font-semibold text-white"
            >
              Open
            </Link>
          </div>
        ))}
      </div>
    );
  }, [items, loading, projectId]);

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
