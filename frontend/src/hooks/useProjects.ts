'use client';

import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { ProjectAPI, ProjectData } from '@/lib/api/projectApi';

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

export const deriveProjectStatus = (project: ProjectData): DerivedProjectStatus => {
  if (project.status === 'completed' || project.status === 'archived' || (project as any)?.is_deleted) {
    return 'completed';
  }
  if (project.is_active) {
    return 'active';
  }
  return 'open';
};

export const useProjects = () => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingProjectId, setUpdatingProjectId] = useState<number | null>(null);

  const fetchProjects = useCallback(async (options?: { activeOnly?: boolean }) => {
    setLoading(true);
    try {
      const data = await ProjectAPI.getProjects(options);
      setProjects(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const setActiveProject = useCallback(
    async (projectId: number) => {
      setUpdatingProjectId(projectId);
      try {
        await ProjectAPI.setActiveProject(projectId);
        toast.success('Active project updated');
        await fetchProjects();
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(message);
      } finally {
        setUpdatingProjectId(null);
      }
    },
    [fetchProjects]
  );

  return {
    projects,
    loading,
    error,
    updatingProjectId,
    fetchProjects,
    setActiveProject,
  };
};
