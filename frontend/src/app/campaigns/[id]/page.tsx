'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import useAuth from '@/hooks/useAuth';
import { ProjectAPI, ProjectData } from '@/lib/api/projectApi';
import { TaskAPI } from '@/lib/api/taskApi';
import { TaskData } from '@/types/task';
import TaskCard from '@/components/tasks/TaskCard';
import api from '@/lib/api';
import { toast } from 'react-hot-toast';

interface CampaignTask {
  campaign_task_id: string;
  title: string;
  channel: string;
  status: string;
  roi_threshold?: number | null;
  platform_status?: string | null;
  task?: {
    id: number;
    project_id: number;
  };
}

function CampaignDetailPageContent() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const campaignId = params?.id ? Number(params.id) : null;

  const [campaign, setCampaign] = useState<ProjectData | null>(null);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [campaignTasks, setCampaignTasks] = useState<CampaignTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaign = async () => {
    if (!campaignId) {
      setError('Campaign ID is required');
      setLoading(false);
      return;
    }

    try {

      try {
        const response = await api.get<ProjectData>(`/api/core/projects/${campaignId}/`);
        setCampaign(response.data);
      } catch (apiError: any) {
        if (apiError.response?.status === 404) {
          const projects = await ProjectAPI.getProjects();
          const foundCampaign = projects.find(p => p.id === campaignId);
          if (foundCampaign) {
            setCampaign(foundCampaign);
          } else {
            throw new Error('Campaign not found');
          }
        } else {
          throw apiError;
        }
      }
    } catch (err: any) {
      console.error('Error fetching campaign:', err);
      setError(err.response?.data?.error || err.message || 'Failed to load campaign');
    }
  };



  const fetchTasks = useCallback(async () => {
    if (!campaignId) return;

    try {
      console.log(' Fetching tasks for campaign:', campaignId);
      const response = await TaskAPI.getTasks({ project_id: campaignId });
      console.log('Task API response:', response);

      let tasksData;
      if (response.data) {
        tasksData = response.data.results || response.data;
      } else {
        tasksData = response;
      }


      const tasksArray = Array.isArray(tasksData) ? tasksData : [];
      console.log('Parsed tasks:', tasksArray.length, tasksArray);
      setTasks(tasksArray);
    } catch (err: any) {
      console.error(' Error fetching tasks:', err);
      console.error('Error details:', err.response?.data || err.message);
      toast.error('Failed to load tasks');
      setTasks([]);
    }
  }, [campaignId]);


  const fetchCampaignTasks = async (tasksList: TaskData[]) => {
    if (!campaignId) return;

    try {
      const response = await api.get<{ results?: CampaignTask[]; items?: CampaignTask[] }>('/api/campaigns/tasks/');
      const allCampaignTasks = response.data.results || response.data.items || [];

      const campaignTaskIds = tasksList
        .filter(task => {
          const taskType = task.type as string;
          return taskType === 'execution' && task.id != null;
        })
        .map(task => task.id!)
        .filter((id): id is number => id !== undefined);

      const filteredCampaignTasks = allCampaignTasks.filter((ct: CampaignTask) =>
        ct.task && ct.task.id && campaignTaskIds.includes(ct.task.id)
      );

      setCampaignTasks(filteredCampaignTasks);
    } catch (err: any) {
      console.error('Error fetching campaign tasks:', err);
    }
  };


  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        await fetchCampaign();
        await fetchTasks();
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (campaignId) {
      loadData();
    } else {
      setError('Invalid campaign ID');
      setLoading(false);
    }
  }, [campaignId, fetchTasks]);


  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && campaignId && !loading) {
        fetchTasks();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [campaignId, loading, fetchTasks]);


  useEffect(() => {
    const handleFocus = () => {
      if (campaignId && !loading) {
        setTimeout(() => {
          fetchTasks();
        }, 100);
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [campaignId, loading, fetchTasks]);



  useEffect(() => {
    if (tasks.length > 0 && campaignId) {
      fetchCampaignTasks(tasks);
    }
  }, [tasks, campaignId]);

  useEffect(() => {
    if (pathname === `/campaigns/${campaignId}` && campaignId && !loading) {
      const timer = setTimeout(() => {
        fetchTasks();
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [pathname, campaignId, loading, fetchTasks]);


  const handleTaskClick = (task: TaskData) => {
    if (task.id) {
      router.push(`/tasks/${task.id}`);
    }
  };

  const getChannels = (): string[] => {
    const channels = campaignTasks
      .map(ct => ct.channel)
      .filter((channel, index, self) => self.indexOf(channel) === index);
    return channels;
  };

  const hasROIAlerts = (): boolean => {
    return campaignTasks.some(ct => ct.roi_threshold != null && ct.roi_threshold > 0);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'paused':
      case 'UNDER_REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const layoutUser = user
    ? {
      name: user.username || user.email,
      email: user.email,
      role: user.roles && user.roles.length > 0 ? user.roles[0] : undefined,
    }
    : undefined;

  const handleUserAction = async (action: string) => {
    if (action === 'logout') {
      await logout();
    }
  };

  const handleBack = () => {
    router.push('/campaigns');
  };

  return (
    <Layout user={layoutUser} onUserAction={handleUserAction}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* return button */}
          <button
            onClick={handleBack}
            className="mb-4 text-indigo-600 hover:text-indigo-800 flex items-center gap-2"
          >
            <span>←</span> Back to Campaigns
          </button>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading campaign details...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
              <p className="font-semibold">Error loading campaign</p>
              <p className="mt-1">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}

          {/* Campaign Content */}
          {!loading && !error && campaign && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                      {campaign.name}
                    </h1>
                    <p className="text-sm text-gray-500">Campaign #{campaign.id}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push(`/campaigns/${campaign.id}/variations`)}
                      className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
                    >
                      Ad Variations
                    </button>
                    {campaign.status && (
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                          campaign.status
                        )}`}
                      >
                        {campaign.status}
                      </span>
                    )}
                  </div>
                </div>

                {/* Campaign Description */}
                {campaign.description && (
                  <div className="mb-6">
                    <p className="text-gray-700">{campaign.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Channel info */}
                  {getChannels().length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Advertising Channels
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {getChannels().map((channel) => (
                          <span
                            key={channel}
                            className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full"
                          >
                            {channel}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Budget info */}
                  {campaign.total_monthly_budget && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Monthly Budget
                      </label>
                      <p className="text-lg font-semibold text-gray-900">
                        ${campaign.total_monthly_budget}
                      </p>
                    </div>
                  )}

                  {/* Project Type */}
                  {campaign.project_type && campaign.project_type.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Project Type
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {campaign.project_type.map((type) => (
                          <span
                            key={type}
                            className="px-3 py-1 bg-gray-100 text-gray-800 text-sm rounded-full"
                          >
                            {type}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* ROI Alert */}
                {hasROIAlerts() && (
                  <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-yellow-400"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-yellow-800">
                          ROI Alert Active
                        </h3>
                        <p className="mt-1 text-sm text-yellow-700">
                          This campaign has ROI threshold monitoring enabled. Alerts will trigger when thresholds are breached.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Linked Tasks region */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Linked Tasks
                  </h2>
                  <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-medium rounded-full">
                    {tasks.length}
                  </span>
                </div>

                {/* Tasks List */}
                {tasks.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-lg mb-2">No tasks linked to this campaign</p>
                    <p className="text-gray-400 text-sm">
                      Create tasks to track budget requests, assets, retrospectives, and reports for this campaign.
                    </p>
                    <button
                      onClick={() => router.push(`/tasks?project_id=${campaignId}`)}
                      className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                    >
                      Create Task
                    </button>
                  </div>
                ) : (

                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div key={task.id} className="relative">
                        <TaskCard
                          task={task}
                          onClick={handleTaskClick}
                        />
                      </div>
                    ))}
                  </div>

                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function CampaignDetailPage() {
  return (
    <ProtectedRoute>
      <CampaignDetailPageContent />
    </ProtectedRoute>
  );
}
