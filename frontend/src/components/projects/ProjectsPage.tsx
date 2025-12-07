'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Layout from '@/components/layout/Layout';
import { DerivedProjectStatus, ProjectFilter, useProjects } from '@/hooks/useProjects';
import { ProjectData } from '@/lib/api/projectApi';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FolderOpen,
  Loader2,
  Trash2,
  Users,
} from 'lucide-react';

type ProjectWithStatus = ProjectData & {
  derivedStatus: DerivedProjectStatus;
  isActiveResolved?: boolean;
  isCompletedResolved?: boolean;
};

interface ProjectsPageProps {
  title: string;
  description: string;
  filter: ProjectFilter;
}

const formatRelativeDate = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return formatDistanceToNow(parsed, { addSuffix: true });
};

const ProjectCard = ({
  project,
  onToggleActive,
  onDelete,
  onToggleCompleted,
  updating,
  deleting,
}: {
  project: ProjectWithStatus;
  onToggleActive: (projectId: number, isActive: boolean) => void;
  onDelete: (projectId: number) => void;
  onToggleCompleted: (projectId: number) => void;
  updating: boolean;
  deleting: boolean;
}) => {
  return (
    <div className="flex h-full flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-gray-900">{project.name}</h3>
              {project.is_active && (
                <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Active project" />
              )}
            </div>
            <p className="text-sm text-gray-500">
              {project.organization?.name || 'No organization'} ·{' '}
              {project.owner?.name || project.owner?.email || 'Unassigned owner'}
            </p>
          </div>
        </div>
        <button
          onClick={() => onDelete(project.id)}
          disabled={deleting}
          className="inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-100 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
          Delete project
        </button>
      </div>

      <p className="mt-3 min-h-[48px] text-sm text-gray-600">
        {project.description || 'No description provided for this project yet.'}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-gray-400" />
          <span className="font-semibold text-gray-900">
            {typeof project.member_count === 'number' ? project.member_count : 0}
          </span>
          members
        </div>
        <div className="flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-gray-400" />
          Updated {formatRelativeDate(project.updated_at || project.created_at)}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          <button
            onClick={() => onToggleCompleted(project.id)}
            className={`rounded-full px-3 py-1 font-semibold transition ${
              project.isCompletedResolved
                ? 'bg-slate-800 text-white hover:bg-slate-900'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {project.isCompletedResolved ? 'Completed' : 'Completed'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/tasks?project_id=${project.id}`}
            className="inline-flex items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-50"
          >
            View tasks
          </a>
          <button
            onClick={() => onToggleActive(project.id, !!project.isActiveResolved)}
            disabled={updating}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
              project.isActiveResolved
                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100'
                : 'bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70'
            }`}
          >
            {updating && <Loader2 className="h-4 w-4 animate-spin" />}
            {project.isActiveResolved ? 'Active' : 'Mark active'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProjectsPage = ({ title, description, filter }: ProjectsPageProps) => {
  const {
    projects,
    loading,
    error,
    fetchProjects,
    setActiveProject,
    updatingProjectId,
    activeProjectIds,
    deleteProject,
    deletingProjectId,
    toggleCompletedProjectId,
  } = useProjects();
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const decoratedProjects: ProjectWithStatus[] = useMemo(
    () =>
      projects.map((project) => ({
        ...project,
        derivedStatus: project.derivedStatus || 'open',
        isActiveResolved: project.isActiveResolved,
      })),
    [projects]
  );

  const filteredProjects = useMemo(() => {
    let list = decoratedProjects;

    if (filter === 'active') {
      list = list.filter((item) => item.derivedStatus === 'active');
    } else if (filter === 'completed') {
      list = list.filter((item) => item.derivedStatus === 'completed');
    }

    if (!search.trim()) return list;

    const term = search.toLowerCase();
    return list.filter((item) => {
      const name = item.name?.toLowerCase() || '';
      const descriptionMatch = (item.description || '').toLowerCase();
      const ownerMatch = (item.owner?.name || item.owner?.email || '').toLowerCase();
      return name.includes(term) || descriptionMatch.includes(term) || ownerMatch.includes(term);
    });
  }, [decoratedProjects, filter, search]);

  const totals = useMemo(() => {
    const activeCount = decoratedProjects.filter((item) => item.derivedStatus === 'active').length;
    const completedCount = decoratedProjects.filter((item) => item.derivedStatus === 'completed').length;
    return {
      total: decoratedProjects.length,
      active: activeCount,
      completed: completedCount,
      open: decoratedProjects.length - activeCount - completedCount,
    };
  }, [decoratedProjects]);

  const renderEmptyState = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="mt-3 font-medium text-gray-900">Loading projects…</p>
          <p className="text-sm text-gray-600">Fetching your projects from the backend.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-white p-10 text-center text-red-600">
          <AlertCircle className="h-6 w-6" />
          <p className="mt-3 font-semibold">Could not load projects</p>
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => fetchProjects()}
            className="mt-4 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      );
    }

    if (filter === 'completed') {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-600">
          <FolderOpen className="h-7 w-7 text-gray-400" />
          <p className="mt-3 font-semibold text-gray-900">No completed projects yet</p>
          <p className="text-sm text-gray-500">
            Projects will show up here once the backend marks them as completed or archived.
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-600">
        <FolderOpen className="h-7 w-7 text-gray-400" />
        <p className="mt-3 font-semibold text-gray-900">No projects to show</p>
        <p className="text-sm text-gray-500">Create or import a project to get started.</p>
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 py-10">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 text-sm uppercase tracking-wide text-blue-700">
                <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <FolderOpen className="h-4 w-4" />
                </div>
                Projects
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                  <p className="text-gray-600">{description}</p>
                </div>
                <div className="flex gap-2 text-sm text-gray-600">
                  <div className="rounded-lg bg-white px-4 py-2 shadow-sm ring-1 ring-gray-200">
                    <span className="text-xs uppercase text-gray-500">Total</span>
                    <div className="text-base font-semibold text-gray-900">{totals.total}</div>
                  </div>
                  <div className="rounded-lg bg-white px-4 py-2 shadow-sm ring-1 ring-gray-200">
                    <span className="text-xs uppercase text-gray-500">Active</span>
                    <div className="text-base font-semibold text-gray-900">{totals.active}</div>
                  </div>
                  <div className="rounded-lg bg-white px-4 py-2 shadow-sm ring-1 ring-gray-200">
                    <span className="text-xs uppercase text-gray-500">Completed</span>
                    <div className="text-base font-semibold text-gray-900">{totals.completed}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-1 items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by name, owner, or description"
                  className="w-full bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchProjects()}
                  className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                >
                  <Loader2 className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : 'text-gray-400'}`} />
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
              {filteredProjects.length === 0 ? (
                <div className="sm:col-span-2">{renderEmptyState()}</div>
              ) : (
                filteredProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onToggleActive={setActiveProject}
                    onDelete={(id) => {
                      const name = project.name || 'this project';
                      const confirmed = window.confirm(`Delete ${name}? This cannot be undone.`);
                      if (confirmed) deleteProject(id);
                    }}
                    onToggleCompleted={toggleCompletedProjectId}
                    updating={updatingProjectId === project.id}
                    deleting={deletingProjectId === project.id}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
};

export default ProjectsPage;
