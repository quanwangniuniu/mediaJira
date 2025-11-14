import { useMemo } from 'react';
import { useAuthStore } from '@/lib/authStore';
import { Organization, SelectOption } from '@/types/permission';

/**
 * Hook to filter organizations based on user's access level
 * - Level 1 (rank = 1) users can see all organizations
 * - Other users can only see their own organization
 * 
 * @param organizations - List of all organizations
 * @param hasSystemAccess - Whether user has system-level access (rank = 1)
 * @returns Filtered list of organizations and organization options
 */
export const useOrganizationFilter = (
  organizations: Organization[],
  hasSystemAccess: boolean
) => {
  // Get current user from authStore
  const currentUser = useAuthStore((state) => state.user);
  
  // Get current user's organization ID
  const currentUserOrganization = useMemo(() => {
    if (currentUser?.organization) {
      // Handle both number and string IDs
      const orgId = currentUser.organization.id;
      return orgId ? orgId.toString() : null;
    }
    return null;
  }, [currentUser]);

  // Filter organizations based on user's access level
  const filteredOrganizations = useMemo(() => {
    if (hasSystemAccess) {
      // Level 1 users can see all organizations
      return organizations;
    } else if (currentUserOrganization) {
      // Other users can only see their own organization
      return organizations.filter(org => org.id === currentUserOrganization);
    } else {
      // User has no organization - return empty array
      return [];
    }
  }, [organizations, hasSystemAccess, currentUserOrganization]);

  // Transform to SelectOption format
  const organizationOptions: SelectOption[] = useMemo(() => {
    return filteredOrganizations.map(org => ({
      id: org.id,
      name: org.name,
    }));
  }, [filteredOrganizations]);

  return {
    currentUserOrganization,
    filteredOrganizations,
    organizationOptions,
  };
};

