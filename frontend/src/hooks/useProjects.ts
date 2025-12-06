'use client';

import { useCallback, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ProjectAPI, ProjectData } from '@/lib/api/projectApi';
import { useProjectStore } from '@/lib/projectStore';

export type ProjectFilter = 'all' | 'active' | 'completed';
export type DerivedProjectStatus = 'active' | 'completed' | 'open';

const getErrorMessage = (error: any): string => {
  return (
    error?.response?.data?.error ||
    error?.response?.data?.message ||
    error?.message ||
    'Failed to load projects'
  );
};

export const deriveProjectStatus = (
  project: ProjectData,
  activeProjectIds: number[] = [],
  inactiveProjectIds: number[] = []
): DerivedProjectStatus => {
  const isManuallyInactive = inactiveProjectIds.includes(project.id);
  const isActiveLocal = activeProjectIds.includes(project.id);

  if (isManuallyInactive) {
    if (project.status === 'completed' || project.status === 'archived' || (project as any)?.is_deleted) {
      return 'completed';
    }
    return 'open';
  }

  if (isActiveLocal || project.is_active) {
    return 'active';
  }

  if (project.status === 'completed' || project.status === 'archived' || (project as any)?.is_deleted) {
    return 'completed';
  }
  return 'open';
};

export const useProjects = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingProjectId, setUpdatingProjectId] = useState<number | null>(null);
  const {
    activeProjectIds,
    inactiveProjectIds,
    setActiveProjectIds,
    toggleActiveProjectId,
    addInactiveProjectId,
    setInactiveProjectIds,
  } = useProjectStore();

  const fetchProjects = useCallback(
    async (options?: { activeOnly?: boolean }) => {
      setLoading(true);
      try {
        const data = await ProjectAPI.getProjects(options);
        const list = Array.isArray(data) ? data : [];
        setProjects(list);

        // Use current store state to merge active IDs without causing dependency loops
        const { inactiveProjectIds: inactiveIds, activeProjectIds: activeIds } = useProjectStore.getState();
        const apiActiveIds = list
          .filter((item) => item.is_active && !inactiveIds.includes(item.id))
          .map((item) => item.id);

        if (apiActiveIds.length > 0) {
          setActiveProjectIds((prev) => Array.from(new Set([...prev, ...apiActiveIds, ...activeIds])));
        }
        setError(null);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [setActiveProjectIds]
  );

  const setActiveProject = useCallback(
    async (projectId: number, isCurrentlyActive: boolean) => {
      // Toggle off locally if already active
      if (isCurrentlyActive) {
        toggleActiveProjectId(projectId);
        addInactiveProjectId(projectId);
        setProjects((prev) =>
          prev.map((project) =>
            project.id === projectId
              ? { ...project, is_active: false, isActiveResolved: false, derivedStatus: 'open' }
              : project
          )
        );
        return;
      }

      setUpdatingProjectId(projectId);
      try {
        await ProjectAPI.setActiveProject(projectId);
        toast.success('Active project updated');
        // Keep local list multi-select friendly
        setActiveProjectIds((prev) => Array.from(new Set([...prev, projectId])));
        setInactiveProjectIds(inactiveProjectIds.filter((id) => id !== projectId));
        await fetchProjects();
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(message);
      } finally {
        setUpdatingProjectId(null);
      }
    },
    [
      activeProjectIds,
      fetchProjects,
      setActiveProjectIds,
      toggleActiveProjectId,
      addInactiveProjectId,
      inactiveProjectIds,
      setInactiveProjectIds,
    ]
  );

  const derivedProjects = useMemo(
    () =>
      projects.map((project) => ({
        ...project,
        derivedStatus: deriveProjectStatus(project, activeProjectIds, inactiveProjectIds),
        isActiveResolved:
          (!inactiveProjectIds.includes(project.id) && (activeProjectIds.includes(project.id) || !!project.is_active)) ||
          false,
      })),
    [projects, activeProjectIds, inactiveProjectIds]
  );

  return {
    projects: derivedProjects,
    loading,
    error,
    updatingProjectId,
    activeProjectIds,
    inactiveProjectIds,
    fetchProjects,
    setActiveProject,
  };
};
