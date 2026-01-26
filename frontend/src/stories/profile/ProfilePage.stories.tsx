import React from 'react';
import Layout from '@/components/layout/Layout';
import useAuth from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useTaskData } from '@/hooks/useTaskData';
import { TaskData } from '@/types/task';
import { useProjects } from '@/hooks/useProjects';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Briefcase, Building2, Check, Mail, MapPin, Network, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Button from '@/components/button/Button';
import UserAvatar from '@/people/UserAvatar';
import { TextInput } from '@/components/input/InputPrimitives';
import Stack from '@/components/layout/primitives/Stack';
import Inline from '@/components/layout/primitives/Inline';

// Replicate ProfilePageContent for Storybook (without ProtectedRoute)
function ProfilePageContent() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { tasks, fetchTasks } = useTaskData();
  const { projects, fetchProjects } = useProjects();

  const userAny = user as any;
  const layoutUser = user
    ? {
        name: user.username || 'User',
        email: user.email || '',
        roles: user.roles || [],
        avatar: userAny?.avatar || undefined,
        first_name: userAny?.first_name || '',
        last_name: userAny?.last_name || '',
      }
    : undefined;

  const handleUserAction = async (action: string) => {
    if (action === 'settings') {
      router.push('/profile/settings');
    } else if (action === 'logout') {
      await logout();
    }
  };

  const profileUser = user
    ? {
        name:
          userAny?.first_name && userAny?.last_name
            ? `${userAny.first_name} ${userAny.last_name}`
            : user.username || 'User',
        email: user.email,
        role: user.roles?.[0],
        avatar: userAny?.avatar,
      }
    : {
        name: 'User',
        email: undefined,
        role: undefined,
        avatar: undefined,
      };

  const initialFields = user?.organization
    ? {
        organization: user.organization.name,
        job: userAny?.job,
        department: userAny?.department,
        location: userAny?.location,
      }
    : undefined;

  const [fields, setFields] = useState({
    job: initialFields?.job || 'Your job title',
    department: initialFields?.department || 'Your department',
    organization: initialFields?.organization || 'Your organization',
    location: initialFields?.location || 'Your location',
  });

  const [activeField, setActiveField] = useState<keyof typeof fields | null>(null);
  const [cover, setCover] = useState('/bg-gradient.svg');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const aboutSectionRef = useRef<HTMLDivElement>(null);
  const savedRef = useRef(fields);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    if (user?.id) {
      const userId = typeof user.id === 'string' ? Number.parseInt(user.id, 10) : user.id;
      if (!Number.isNaN(userId)) {
        fetchTasks({ all_projects: true }).catch((error) => {
          console.error('[Profile] Failed to fetch tasks:', error);
        });
      }
    }
  }, [user?.id, fetchTasks]);

  type WorkedOnTask = {
    id: number;
    name: string;
    type: 'task' | 'template';
    team: string;
    action: 'created' | 'updated';
    date: string;
    icon?: 'bookmark' | 'checkbox' | 'document';
  };

  const getIconComponent = (icon?: 'bookmark' | 'checkbox' | 'document') => {
    switch (icon) {
      case 'bookmark':
        return (
          <svg className="h-4 w-4" viewBox="0 0 20 20">
            <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" stroke="#10b981" strokeWidth="1.5" fill="none" />
          </svg>
        );
      case 'checkbox':
        return (
          <svg className="h-4 w-4" fill="#3b82f6" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'document':
      default:
        return (
          <svg className="h-4 w-4" fill="#3b82f6" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
  };

  const workedOnTasks = useMemo(() => {
    const today = new Date();
    const formatDateForTest = (daysAgo: number) => {
      const date = new Date(today);
      date.setDate(date.getDate() - daysAgo);
      return date.toISOString().split('T')[0];
    };

    const testData: WorkedOnTask[] = [
      {
        id: 1,
        name: 'Task 2',
        type: 'task',
        team: 'My Software Team',
        action: 'updated',
        date: formatDateForTest(8),
        icon: 'bookmark',
      },
      {
        id: 2,
        name: 'front end design',
        type: 'task',
        team: 'My Software Team',
        action: 'created',
        date: formatDateForTest(11),
        icon: 'checkbox',
      },
      {
        id: 3,
        name: 'metadata system design',
        type: 'task',
        team: 'My Software Team',
        action: 'updated',
        date: formatDateForTest(11),
        icon: 'checkbox',
      },
      {
        id: 4,
        name: 'Template - Decision documentation',
        type: 'template',
        team: 'Software Development',
        action: 'created',
        date: formatDateForTest(11),
        icon: 'document',
      },
      {
        id: 5,
        name: 'Template - Meeting notes',
        type: 'template',
        team: 'Software Development',
        action: 'created',
        date: formatDateForTest(11),
        icon: 'document',
      },
    ];

    if (!tasks || tasks.length === 0) {
      return testData;
    }

    const userId = user?.id ? (typeof user.id === 'string' ? Number.parseInt(user.id, 10) : user.id) : null;
    if (!userId || Number.isNaN(userId)) {
      return testData;
    }

    const userTasks = tasks
      .filter((task: TaskData) => {
        const taskOwnerId = task.owner?.id;
        return (
          taskOwnerId === userId ||
          String(taskOwnerId) === String(userId) ||
          Number(taskOwnerId) === Number(userId)
        );
      })
      .sort((a: TaskData, b: TaskData) => (b.id || 0) - (a.id || 0))
      .slice(0, 10);

    if (userTasks.length === 0 && tasks.length > 0) {
      const allTasksForTesting = tasks
        .sort((a: TaskData, b: TaskData) => (b.id || 0) - (a.id || 0))
        .slice(0, 10);

      const mappedTasks = allTasksForTesting.map((task: TaskData) => {
        let icon: 'bookmark' | 'checkbox' | 'document' = 'document';
        if (task.type === 'asset' || task.type === 'experiment') {
          icon = 'bookmark';
        } else if (task.type === 'budget' || task.type === 'scaling' || task.type === 'optimization') {
          icon = 'checkbox';
        }

        const action: 'created' | 'updated' = task.status === 'DRAFT' ? 'created' : 'updated';
        const team = task.project?.name || 'Unknown Team';
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

      return mappedTasks.length > 0 ? mappedTasks : testData;
    }

    if (userTasks.length === 0) {
      return testData;
    }

    return userTasks.map((task: TaskData) => {
      let icon: 'bookmark' | 'checkbox' | 'document' = 'document';
      if (task.type === 'asset' || task.type === 'experiment') {
        icon = 'bookmark';
      } else if (task.type === 'budget' || task.type === 'scaling' || task.type === 'optimization') {
        icon = 'checkbox';
      }

      const action: 'created' | 'updated' = task.status === 'DRAFT' ? 'created' : 'updated';
      const team = task.project?.name || 'Unknown Team';
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
  }, [tasks, user?.id]);

  const handleViewAllTasks = () => {
    router.push('/tasks');
  };

  const handleShowMore = () => {
    router.push('/tasks');
  };

  const handleProjectClick = (projectId: number) => {
    router.push(`/tasks?project_id=${projectId}`);
  };

  const handleSaveActive = () => {
    if (!activeField) return;
    savedRef.current = { ...savedRef.current, [activeField]: fields[activeField] };
    setActiveField(null);
  };

  const handleCancelActive = () => {
    if (!activeField) return;
    setFields((prev) => ({ ...prev, [activeField]: savedRef.current[activeField] }));
    setActiveField(null);
  };

  const handleSelectField = (field: keyof typeof fields) => {
    if (activeField && activeField !== field) {
      savedRef.current = { ...savedRef.current, [activeField]: fields[activeField] };
    }
    setActiveField(field);
  };

  const handleCoverChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setCover(nextUrl);
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const nextUrl = URL.createObjectURL(file);
    setAvatarUrl(nextUrl);
  };

  useEffect(() => {
    const handlePointerDown = (event: MouseEvent) => {
      if (!activeField) return;
      const target = event.target as Node;
      if (aboutSectionRef.current?.contains(target)) return;
      handleCancelActive();
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [activeField]);

  return (
    <Layout user={layoutUser} onUserAction={handleUserAction}>
      <section className={cn('w-full pb-8')}>
        <Stack spacing="lg" className="px-6 pt-4">
          <section className="rounded-lg border border-gray-200 bg-white">
            <div className="relative group">
              <div className="overflow-hidden rounded-t-lg">
                <div className="h-36 w-full bg-cover bg-center" style={{ backgroundImage: `url(${cover})` }} />
                <div className="pointer-events-none absolute inset-0 rounded-t-lg bg-black/0 transition-colors duration-200 group-hover:bg-black/30" />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => coverInputRef.current?.click()}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-transparent text-white opacity-0 transition-opacity duration-200 hover:bg-white/10 group-hover:opacity-100"
              >
                Change cover
              </Button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                onChange={handleCoverChange}
                className="hidden"
              />

              <div className="absolute left-20 -bottom-12 flex items-end gap-4">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="relative rounded-full border-4 border-white bg-gray-100 shadow-md"
                  aria-label="Change avatar"
                >
                  <UserAvatar
                    user={{ name: profileUser.name, avatar: avatarUrl, email: profileUser.email }}
                    size="xl"
                    className="h-24 w-24 text-4xl"
                  />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="pb-6 pt-16">
              <div className="flex items-start justify-between gap-4 pl-20 pr-6">
                <div className="w-24 text-center">
                  <p className="text-lg font-semibold text-gray-900 truncate">{profileUser.name}</p>
                </div>
              </div>
            </div>
          </section>

          <Inline spacing="lg" align="start" className="items-start w-full">
            <div className="w-[30vw] min-w-[280px] max-w-[420px] flex flex-col gap-4">
              <Button variant="secondary" size="md" className="w-full">
                Manage your account
              </Button>
              
              {/* About Section */}
              <section className="w-full space-y-4 rounded-lg border border-gray-200 bg-white p-4">
              <h3 className="text-lg font-semibold text-gray-900">About</h3>

              <div ref={aboutSectionRef} className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-gray-500" />
                  {activeField === 'job' ? (
                    <div className="flex flex-1 items-center gap-2">
                      <TextInput
                        label=""
                        value={fields.job}
                        placeholder="Your job title"
                        onChange={(event) => setFields((prev) => ({ ...prev, job: event.target.value }))}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" onClick={handleSaveActive} aria-label="Save job title">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelActive} aria-label="Cancel job title">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectField('job')}
                      className="rounded-md px-2 py-1 text-left hover:bg-gray-50"
                      aria-label="Edit job title"
                    >
                      {fields.job || 'Your job title'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Network className="h-4 w-4 text-gray-500" />
                  {activeField === 'department' ? (
                    <div className="flex flex-1 items-center gap-2">
                      <TextInput
                        label=""
                        value={fields.department}
                        placeholder="Your department"
                        onChange={(event) => setFields((prev) => ({ ...prev, department: event.target.value }))}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" onClick={handleSaveActive} aria-label="Save department">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelActive} aria-label="Cancel department">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectField('department')}
                      className="rounded-md px-2 py-1 text-left hover:bg-gray-50"
                      aria-label="Edit department"
                    >
                      {fields.department || 'Your department'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Building2 className="h-4 w-4 text-gray-500" />
                  {activeField === 'organization' ? (
                    <div className="flex flex-1 items-center gap-2">
                      <TextInput
                        label=""
                        value={fields.organization}
                        placeholder="Your organization"
                        onChange={(event) => setFields((prev) => ({ ...prev, organization: event.target.value }))}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" onClick={handleSaveActive} aria-label="Save organization">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelActive} aria-label="Cancel organization">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectField('organization')}
                      className="rounded-md px-2 py-1 text-left hover:bg-gray-50"
                      aria-label="Edit organization"
                    >
                      {fields.organization || 'Your organization'}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  {activeField === 'location' ? (
                    <div className="flex flex-1 items-center gap-2">
                      <TextInput
                        label=""
                        value={fields.location}
                        placeholder="Your location"
                        onChange={(event) => setFields((prev) => ({ ...prev, location: event.target.value }))}
                        className="flex-1"
                      />
                      <Button variant="ghost" size="sm" onClick={handleSaveActive} aria-label="Save location">
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={handleCancelActive} aria-label="Cancel location">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectField('location')}
                      className="rounded-md px-2 py-1 text-left hover:bg-gray-50"
                      aria-label="Edit location"
                    >
                      {fields.location || 'Your location'}
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-900">Contact</h4>
                <div className="mt-2 flex items-center gap-3 text-sm text-gray-700">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>{profileUser.email || 'Your email'}</span>
                </div>
              </div>
              </section>
            </div>

            <section className="w-[30vw] min-w-[280px] max-w-[420px] space-y-4">
              <h3 className="text-lg font-bold text-gray-900">Places you work in</h3>
              <div className="rounded-lg border border-gray-200 bg-white p-4 space-y-3">
                {/* Organization/Platform - Jira */}
                {user?.organization && (
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {/* Jira logo - three overlapping blue arrows */}
                      <svg className="h-5 w-5" viewBox="0 0 20 20" fill="none">
                        <path d="M2 10L6 6L8 8L12 4" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        <path d="M8 10L12 6L14 8L18 4" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                        <path d="M5 10L9 6L11 8L15 4" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">{user.organization.name || 'Jira'}</span>
                  </div>
                )}
                
                {/* Projects */}
                {projects && projects.length > 0 ? (
                  projects.slice(0, 5).map((project) => (
                    <div key={project.id} className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {/* Wrench/screwdriver icon on purple background */}
                        <div className="h-5 w-5 rounded bg-purple-500 flex items-center justify-center">
                          <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
                            <path d="M14.5 2.5L17.5 5.5L13 10L10 7L14.5 2.5Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"/>
                            <path d="M3 12L8 17L6 19L1 14L3 12Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"/>
                            <path d="M12 3L17 8L15 10L10 5L12 3Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"/>
                          </svg>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleProjectClick(project.id)}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer text-left"
                      >
                        {project.name}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      {/* Wrench/screwdriver icon on purple background */}
                      <div className="h-5 w-5 rounded bg-purple-500 flex items-center justify-center">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
                          <path d="M14.5 2.5L17.5 5.5L13 10L10 7L14.5 2.5Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"/>
                          <path d="M3 12L8 17L6 19L1 14L3 12Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"/>
                          <path d="M12 3L17 8L15 10L10 5L12 3Z" fill="#f59e0b" stroke="#f59e0b" strokeWidth="1"/>
                        </svg>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleViewAllTasks}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 cursor-pointer text-left"
                    >
                      My Software Team
                    </button>
                  </div>
                )}
              </div>
            </section>
          </Inline>
        </Stack>
      </section>
    </Layout>
  );
}

export default {
  title: 'Pages/Profile/ProfilePage',
  component: ProfilePageContent,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Complete profile page component that displays user information, editable fields, and places you work in. This Storybook version bypasses ProtectedRoute to avoid loading issues. The page uses real hooks (useAuth, useProjects) to fetch user data and projects, and displays them in a profile view with editable About section and Places you work in section.',
      },
    },
  },
  tags: ['autodocs'],
};

export const Default = {
  name: 'Default Profile Page',
  render: () => <ProfilePageContent />,
  parameters: {
    docs: {
      description: {
        story: 'Default profile page with user information, editable About section, and Places you work in section showing user organization and projects. This version bypasses ProtectedRoute for Storybook compatibility.',
      },
    },
  },
};
