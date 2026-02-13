'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ProjectAPI } from '@/lib/api/projectApi';

const ROLE_CACHE_TTL_MS = 120_000;

type RoleByUserId = Record<number, string>;

interface RoleCacheEntry {
  roleByUserId: RoleByUserId;
  expiresAt: number;
}

const roleCacheByProject = new Map<number, RoleCacheEntry>();
const inFlightRoleRequests = new Map<number, Promise<RoleByUserId>>();

const buildRoleByUserId = (members: Array<{ user?: { id?: number }; role?: string }>): RoleByUserId => {
  return members.reduce<RoleByUserId>((acc, member) => {
    const userId = member.user?.id;
    const role = member.role?.trim();

    if (typeof userId === 'number' && userId > 0 && role) {
      acc[userId] = role;
    }

    return acc;
  }, {});
};

const getProjectMemberRoles = async (projectId: number, forceRefresh = false): Promise<RoleByUserId> => {
  if (!forceRefresh) {
    const cached = roleCacheByProject.get(projectId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.roleByUserId;
    }

    const existingRequest = inFlightRoleRequests.get(projectId);
    if (existingRequest) {
      return existingRequest;
    }
  } else {
    roleCacheByProject.delete(projectId);
  }

  const request = ProjectAPI.getAllProjectMembers(projectId)
    .then((members) => {
      const roleByUserId = buildRoleByUserId(members);
      roleCacheByProject.set(projectId, {
        roleByUserId,
        expiresAt: Date.now() + ROLE_CACHE_TTL_MS,
      });
      return roleByUserId;
    })
    .finally(() => {
      inFlightRoleRequests.delete(projectId);
    });

  inFlightRoleRequests.set(projectId, request);
  return request;
};

export function useProjectMemberRoles(projectId: number | null | undefined) {
  const [roleByUserId, setRoleByUserId] = useState<RoleByUserId>({});
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const latestProjectIdRef = useRef<number | null>(null);

  useEffect(() => {
    latestProjectIdRef.current = typeof projectId === 'number' ? projectId : null;
  }, [projectId]);

  const loadRoles = useCallback(
    async (forceRefresh = false) => {
      if (typeof projectId !== 'number' || projectId <= 0) {
        setRoleByUserId({});
        setIsLoadingRoles(false);
        return;
      }

      const targetProjectId = projectId;
      setIsLoadingRoles(true);

      try {
        const roles = await getProjectMemberRoles(targetProjectId, forceRefresh);
        if (latestProjectIdRef.current === targetProjectId) {
          setRoleByUserId(roles);
        }
      } catch (error) {
        console.error('[useProjectMemberRoles] Failed to load project member roles:', error);
        if (latestProjectIdRef.current === targetProjectId) {
          setRoleByUserId({});
        }
      } finally {
        if (latestProjectIdRef.current === targetProjectId) {
          setIsLoadingRoles(false);
        }
      }
    },
    [projectId]
  );

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  const refreshRoles = useCallback(() => {
    return loadRoles(true);
  }, [loadRoles]);

  return {
    roleByUserId,
    isLoadingRoles,
    refreshRoles,
  };
}

