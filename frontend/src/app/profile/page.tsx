'use client';

import { useEffect, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import ProfilePageView from '@/components/jiraProfile/ProfilePageView';
import { useTaskData } from '@/hooks/useTaskData';
import { TaskData } from '@/types/task';

function ProfilePageContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { tasks, fetchTasks, loading: tasksLoading, error: tasksError } = useTaskData();

  const layoutUser = user
    ? {
        name: user.username || 'User',
        email: user.email || '',
        roles: user.roles || [],
        avatar: user.avatar || undefined,
        first_name: user.first_name || '',
        last_name: user.last_name || '',
      }
    : undefined;

  const handleUserAction = async (action: string) => {
    if (action === 'settings') {
      router.push('/profile/settings');
    } else if (action === 'logout') {
      await logout();
    }
  };

  // Convert user data to ProfilePageView format
  const profileUser = user
    ? {
        name: user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : user.username || 'User',
        email: user.email,
        role: user.roles?.[0],
        avatar: user.avatar,
      }
    : {
        name: 'User',
        email: undefined,
        role: undefined,
        avatar: undefined,
      };

  // Map organization data to initialFields
  const initialFields = user?.organization
    ? {
        organization: user.organization.name,
      }
    : undefined;

  // Fetch user's tasks when component mounts or user changes
  useEffect(() => {
    if (user?.id) {
      // Convert user.id to number if it's a string
      const userId = typeof user.id === 'string' ? Number.parseInt(user.id, 10) : user.id;
      if (!Number.isNaN(userId)) {
        // Fetch all tasks and filter client-side (more reliable)
        console.log('[Profile] Fetching tasks for user:', userId);
        fetchTasks({ all_projects: true })
          .then((fetchedTasks) => {
            console.log('[Profile] Tasks fetched successfully:', fetchedTasks?.length || 0);
          })
          .catch((error) => {
            console.error('[Profile] Failed to fetch tasks:', error);
          });
      }
    }
  }, [user?.id, fetchTasks]);

  // Convert TaskData to WorkedOnTask format
  const workedOnTasks = useMemo(() => {
    console.log('[Profile] Converting tasks. Tasks array length:', tasks?.length || 0, 'User ID:', user?.id);
    
    if (!tasks || tasks.length === 0) {
      console.log('[Profile] No tasks found. This could mean:');
      console.log('  1. Backend returned empty array');
      console.log('  2. User has no tasks');
      console.log('  3. API call failed or is still loading');
      
      // DEVELOPMENT MODE: Use test data if no tasks found (for testing UI)
      // Remove this in production or make it configurable
      if (process.env.NODE_ENV === 'development') {
        console.log('[Profile] DEVELOPMENT MODE: Using test data for Worked on section');
        const today = new Date();
        const formatDate = (daysAgo: number) => {
          const date = new Date(today);
          date.setDate(date.getDate() - daysAgo);
          return date.toISOString().split('T')[0];
        };
        
        return [
          {
            id: 1,
            name: 'Q4 Budget Request',
            type: 'task' as const,
            team: 'Finance Team',
            action: 'updated' as const,
            date: formatDate(1),
            icon: 'checkbox' as const,
          },
          {
            id: 2,
            name: 'Marketing Campaign Asset',
            type: 'task' as const,
            team: 'Marketing Team',
            action: 'created' as const,
            date: formatDate(2),
            icon: 'bookmark' as const,
          },
          {
            id: 3,
            name: 'Product Retrospective',
            type: 'task' as const,
            team: 'Product Team',
            action: 'updated' as const,
            date: formatDate(3),
            icon: 'document' as const,
          },
          {
            id: 4,
            name: 'System Scaling Plan',
            type: 'task' as const,
            team: 'Engineering',
            action: 'created' as const,
            date: formatDate(5),
            icon: 'checkbox' as const,
          },
          {
            id: 5,
            name: 'Performance Optimization',
            type: 'task' as const,
            team: 'Engineering',
            action: 'updated' as const,
            date: formatDate(6),
            icon: 'checkbox' as const,
          },
        ];
      }
      
      // Return empty array - component will handle this gracefully
      return [];
    }

    // Convert user.id to number for comparison
    let userId: number | null = null;
    if (user?.id) {
      userId = typeof user.id === 'string' ? Number.parseInt(user.id, 10) : user.id;
    }
    
    console.log('[Profile] Filtering tasks. Total tasks:', tasks.length, 'User ID:', userId);
    console.log('[Profile] Sample task owner IDs:', tasks.slice(0, 3).map((t: TaskData) => ({ 
      taskId: t.id, 
      ownerId: t.owner?.id, 
      ownerUsername: t.owner?.username 
    })));
    
    // Filter tasks owned by current user and sort by most recent activity
    const userTasks = tasks
      .filter((task: TaskData) => {
        const taskOwnerId = task.owner?.id;
        // Try multiple matching strategies
        const matches = 
          taskOwnerId === userId || 
          String(taskOwnerId) === String(userId) ||
          Number(taskOwnerId) === Number(userId);
        
        if (matches) {
          console.log('[Profile] Found matching task:', task.id, task.summary, 'Owner:', taskOwnerId);
        }
        return matches;
      })
      .sort((a: TaskData, b: TaskData) => {
        // Sort by ID (higher ID = newer task) as proxy for creation/update time
        return (b.id || 0) - (a.id || 0);
      })
      .slice(0, 10); // Limit to 10 most recent tasks

    console.log('[Profile] User tasks found:', userTasks.length, 'out of', tasks.length);
    
    // If no matching tasks found, log all tasks for debugging
    if (userTasks.length === 0 && tasks.length > 0) {
      console.warn('[Profile] No matching tasks found. All task owners:', 
        tasks.map((t: TaskData) => ({ id: t.id, ownerId: t.owner?.id, owner: t.owner }))
      );
      // TEMPORARY: Show all tasks if no user-specific tasks found (for testing)
      // Remove this after confirming the component works
      console.log('[Profile] TEMPORARY: Showing all tasks for testing');
      const allTasksForTesting = tasks
        .sort((a: TaskData, b: TaskData) => (b.id || 0) - (a.id || 0))
        .slice(0, 10);
      
      return allTasksForTesting.map((task: TaskData) => {
        // Determine icon based on task type
        let icon: 'bookmark' | 'checkbox' | 'document' = 'document';
        if (task.type === 'asset' || task.type === 'experiment') {
          icon = 'bookmark';
        } else if (task.type === 'budget' || task.type === 'scaling' || task.type === 'optimization') {
          icon = 'checkbox';
        }

        // Determine action (created or updated)
        const action: 'created' | 'updated' = task.status === 'DRAFT' ? 'created' : 'updated';

        // Get team/project name
        const team = task.project?.name || 'Unknown Team';

        // Use current date as fallback, or parse from task if available
        const taskDate = (task as any).updated_at || (task as any).created_at || new Date().toISOString();
        const date = new Date(taskDate).toISOString().split('T')[0];

        return {
          id: task.id || 0,
          name: task.summary || 'Untitled Task',
          type: 'task' as const,
          team,
          action,
          date,
          icon,
        };
      });
    }

    return userTasks.map((task: TaskData) => {
      // Determine icon based on task type
      let icon: 'bookmark' | 'checkbox' | 'document' = 'document';
      if (task.type === 'asset' || task.type === 'experiment') {
        icon = 'bookmark';
      } else if (task.type === 'budget' || task.type === 'scaling' || task.type === 'optimization') {
        icon = 'checkbox';
      }

      // Determine action (created or updated) - simplified: assume created if status is DRAFT
      const action: 'created' | 'updated' = task.status === 'DRAFT' ? 'created' : 'updated';

      // Get team/project name
      const team = task.project?.name || 'Unknown Team';

      // Use current date as fallback, or parse from task if available
      // Note: TaskData doesn't have created_at/updated_at in type, but backend may return it
      const taskDate = (task as any).updated_at || (task as any).created_at || new Date().toISOString();
      const date = new Date(taskDate).toISOString().split('T')[0]; // Format as YYYY-MM-DD

      return {
        id: task.id || 0,
        name: task.summary || 'Untitled Task',
        type: 'task' as const,
        team,
        action,
        date,
        icon,
      };
    });
  }, [tasks, user?.id]);

  const handleViewAllTasks = () => {
    router.push('/tasks');
  };

  const handleShowMore = () => {
    // Could implement pagination or expand to show more tasks
    router.push('/tasks');
  };

  return (
    <Layout user={layoutUser} onUserAction={handleUserAction}>
      <ProfilePageView 
        user={profileUser}
        initialFields={initialFields}
        workedOnTasks={workedOnTasks}
        onViewAllTasks={handleViewAllTasks}
        onShowMore={handleShowMore}
      />
    </Layout>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfilePageContent />
    </ProtectedRoute>
  );
}
