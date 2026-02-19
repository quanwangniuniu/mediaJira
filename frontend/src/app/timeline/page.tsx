'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useTaskData } from '@/hooks/useTaskData';
import TimelineView from '@/components/tasks/timeline/TimelineView';
import Modal from '@/components/ui/Modal';
import NewTaskForm from '@/components/tasks/NewTaskForm';
import NewBudgetRequestForm from '@/components/tasks/NewBudgetRequestForm';
import NewAssetForm from '@/components/tasks/NewAssetForm';
import NewRetrospectiveForm from '@/components/tasks/NewRetrospectiveForm';
import NewReportForm from '@/components/tasks/NewReportForm';
import { useFormValidation } from '@/hooks/useFormValidation';
import { CreateTaskData } from '@/types/task';
import { TaskAPI } from '@/lib/api/taskApi';
import { BudgetAPI } from '@/lib/api/budgetApi';
import { AssetAPI } from '@/lib/api/assetApi';
import { RetrospectiveAPI, CreateRetrospectiveData } from '@/lib/api/retrospectiveApi';
import { ReportAPI } from '@/lib/api/reportApi';
import useAuth from '@/hooks/useAuth';
import toast from 'react-hot-toast';
import { ProjectAPI } from '@/lib/api/projectApi';
import { useProjectStore } from '@/lib/projectStore';

function TimelinePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectIdParam = searchParams.get('project_id');
  const { activeProject } = useProjectStore();
  const projectId = projectIdParam
    ? Number(projectIdParam)
    : activeProject?.id ?? null;

  useEffect(() => {
    if (projectIdParam || !activeProject?.id) return;
    const params = new URLSearchParams(searchParams.toString());
    params.set('project_id', String(activeProject.id));
    router.replace(`/timeline?${params.toString()}`);
  }, [projectIdParam, activeProject?.id, router, searchParams]);

  const { user } = useAuth();
  const { tasks, loading, error, fetchTasks, reloadTasks, createTask, updateTask } = useTaskData();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [projectOptions, setProjectOptions] = useState<any[]>([]);
  const [projectOptionsLoading, setProjectOptionsLoading] = useState(false);
  const [projectOptionsError, setProjectOptionsError] = useState<string | null>(null);
  const [projectPickerOpen, setProjectPickerOpen] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const [recentProjectIds, setRecentProjectIds] = useState<number[]>([]);

  const getDefaultTaskDates = () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return {
      start_date: today.toISOString().slice(0, 10),
      due_date: tomorrow.toISOString().slice(0, 10),
    };
  };

  const [taskData, setTaskData] = useState<Partial<CreateTaskData>>({
    project_id: undefined,
    type: undefined,
    summary: '',
    description: '',
    current_approver_id: undefined,
    ...getDefaultTaskDates(),
  });
  const [taskType, setTaskType] = useState('');
  const [contentType, setContentType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [budgetData, setBudgetData] = useState({
    amount: '',
    currency: '',
    ad_channel: null,
    notes: '',
    budget_pool: null,
  });
  const [assetData, setAssetData] = useState({
    tags: '',
    team: '',
    notes: '',
    file: null,
  });
  const [retrospectiveData, setRetrospectiveData] = useState<Partial<CreateRetrospectiveData>>({});
  const [reportData, setReportData] = useState({
    title: '',
    owner_id: '',
    report_template_id: '',
    slice_config: { csv_file_path: '' },
  });

  const loadProjectOptions = useCallback(async () => {
    try {
      setProjectOptionsLoading(true);
      setProjectOptionsError(null);
      const projects = await ProjectAPI.getProjects();
      setProjectOptions(projects || []);
    } catch (error) {
      console.error('Failed to load projects:', error);
      setProjectOptionsError('Failed to load projects.');
    } finally {
      setProjectOptionsLoading(false);
    }
  }, []);

  const openProjectPicker = useCallback(async () => {
    setProjectPickerOpen(true);
    setProjectSearchQuery('');
    if (projectOptions.length === 0) {
      await loadProjectOptions();
    }
  }, [loadProjectOptions, projectOptions.length]);

  useEffect(() => {
    if (projectOptions.length === 0 && !projectOptionsLoading) {
      loadProjectOptions();
    }
  }, [projectOptions.length, projectOptionsLoading, loadProjectOptions]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('recentProjectIds');
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentProjectIds(parsed.filter((id) => Number.isFinite(id)));
      }
    } catch (error) {
      console.warn('Failed to parse recent projects:', error);
    }
  }, []);

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      await fetchTasks({ project_id: projectId, include_subtasks: true });
    };
    load();
  }, [projectId, fetchTasks]);

  useEffect(() => {
    if (!projectId) return;
    setTaskData((prev) => ({
      ...prev,
      project_id: prev.project_id || projectId,
    }));
  }, [projectId]);

  const visibleTasks = useMemo(() => {
    if (!projectId) return [];
    if (!Array.isArray(tasks)) return [];
    return tasks;
  }, [projectId, tasks]);

  const hasTasks = visibleTasks.length > 0;

  // Form validation rules
  const taskValidationRules = {
    project_id: (value: any) => (!value || value == 0 ? 'Project is required' : ''),
    type: (value: any) => (!value ? 'Task type is required' : ''),
    summary: (value: any) => (!value ? 'Task summary is required' : ''),
    current_approver_id: (value: any) =>
      taskData.type === 'budget' && !value
        ? 'Approver is required for budget'
        : '',
  };

  const budgetValidationRules = {
    amount: (value: any) => {
      if (!value || value.trim() === '') return 'Amount is required';
      return '';
    },
    currency: (value: any) => {
      if (!value || value.trim() === '') return 'Currency is required';
      return '';
    },
    ad_channel: (value: any) =>
      !value || value === 0 ? 'Ad channel is required' : '',
    budget_pool: (value: any) =>
      !value || value === 0 ? 'Budget pool is required' : '',
  };

  const assetValidationRules = {};

  const retrospectiveValidationRules = {
    campaign: (value: any) => {
      if (!value || value.toString().trim() === '')
        return 'Campaign (Project) is required';
      return '';
    },
  };

  const reportValidationRules = {
    title: (value: any) => {
      if (!value || value.trim() === '') return 'Title is required';
      return '';
    },
    owner_id: (value: any) => {
      if (!value || value.trim() === '') return 'Owner ID is required';
      return '';
    },
    'slice_config.csv_file_path': (value: any) => {
      return '';
    },
  };

  // Initialize validation hooks
  const taskValidation = useFormValidation(taskValidationRules);
  const budgetValidation = useFormValidation(budgetValidationRules);
  const assetValidation = useFormValidation(assetValidationRules);
  const retrospectiveValidation = useFormValidation(retrospectiveValidationRules);
  const reportValidation = useFormValidation(reportValidationRules);

  // Task type configuration
  const taskTypeConfig = {
    budget: {
      contentType: 'budgetrequest',
      formData: budgetData,
      setFormData: setBudgetData,
      validation: budgetValidation,
      api: BudgetAPI.createBudgetRequest,
      formComponent: NewBudgetRequestForm,
      requiredFields: ['amount', 'currency', 'ad_channel', 'budget_pool'],
      getPayload: (createdTask: any) => {
        if (!taskData.current_approver_id) {
          throw new Error('Approver is required for budget request');
        }
        if (!budgetData.budget_pool) {
          throw new Error('Budget pool is required for budget request');
        }
        return {
          task: createdTask.id,
          amount: budgetData.amount,
          currency: budgetData.currency,
          ad_channel: budgetData.ad_channel,
          budget_pool_id: budgetData.budget_pool,
          notes: budgetData.notes || '',
          current_approver: taskData.current_approver_id,
        };
      },
    },
    asset: {
      contentType: 'asset',
      formData: assetData,
      setFormData: setAssetData,
      validation: assetValidation,
      api: AssetAPI.createAsset,
      formComponent: NewAssetForm,
      requiredFields: ['tags'],
      getPayload: (createdTask: any) => {
        const tagsArray = (assetData.tags || '')
          .split(',')
          .map((t: string) => t.trim())
          .filter(Boolean);
        const payload: any = {
          task: createdTask.id,
          tags: tagsArray,
        };
        if (assetData.team) {
          const teamNum = Number(assetData.team);
          if (!Number.isNaN(teamNum)) {
            payload.team = teamNum;
          }
        }
        return payload;
      },
    },
    retrospective: {
      contentType: 'retrospectivetask',
      formData: retrospectiveData,
      setFormData: setRetrospectiveData,
      validation: retrospectiveValidation,
      api: RetrospectiveAPI.createRetrospective,
      formComponent: NewRetrospectiveForm,
      requiredFields: ['campaign'],
      getPayload: (createdTask: any) => ({
        campaign: retrospectiveData.campaign || taskData.project_id?.toString(),
        scheduled_at:
          retrospectiveData.scheduled_at || new Date().toISOString(),
        status: retrospectiveData.status || 'scheduled',
      }),
    },
    report: {
      contentType: 'report',
      formData: reportData,
      setFormData: setReportData,
      validation: reportValidation,
      api: ReportAPI.createReport,
      formComponent: NewReportForm,
      requiredFields: ['title', 'owner_id', 'slice_config.csv_file_path'],
      getPayload: (createdTask: any) => {
        return {
          task: createdTask.id,
          title: reportData.title,
          owner_id: reportData.owner_id,
          report_template_id: reportData.report_template_id,
          slice_config: {
            csv_file_path: reportData.slice_config?.csv_file_path || '',
          },
        };
      },
    },
  };

  // Generic function to create task type specific object
  const createTaskTypeObject = async (taskType: string, createdTask: any) => {
    const config = taskTypeConfig[taskType as keyof typeof taskTypeConfig];
    if (!config || !config.api) {
      console.warn(`No API configured for task type: ${taskType}`);
      return null;
    }

    const payload = config.getPayload(createdTask);
    console.log(`Creating ${taskType} with payload:`, payload);

    try {
      const response = await config.api(payload);
      const createdObject = (response && typeof response === 'object' && 'data' in response) 
        ? (response as any).data 
        : response;
      console.log(`${taskType} created:`, createdObject);
      return createdObject;
    } catch (error: any) {
      if (taskType === 'retrospective' && error.response?.status === 400) {
        const errorData = error.response.data;
        if (
          (errorData.campaign &&
            Array.isArray(errorData.campaign) &&
            errorData.campaign[0]?.includes('already exists')) ||
          (typeof errorData.campaign === 'string' &&
            errorData.campaign.includes('already exists'))
        ) {
          console.warn(
            'Retrospective already exists, attempting to find existing one...'
          );
          try {
            const campaignId = payload.campaign;
            const retrospectivesResponse =
              await RetrospectiveAPI.getRetrospectives({
                campaign: campaignId,
              });
            if (
              retrospectivesResponse.data &&
              retrospectivesResponse.data.length > 0
            ) {
              console.log(
                'Found existing retrospective:',
                retrospectivesResponse.data[0]
              );
              return retrospectivesResponse.data[0];
            }
          } catch (findError) {
            console.error('Failed to find existing retrospective:', findError);
          }
        }
      }
      throw error;
    }
  };

  // Generic function to reset form data
  const resetFormData = () => {
    const defaultDates = getDefaultTaskDates();
    setTaskData({
      project_id: undefined,
      type: undefined,
      summary: '',
      description: '',
      current_approver_id: undefined,
      start_date: defaultDates.start_date,
      due_date: defaultDates.due_date,
    });
    setBudgetData({
      amount: '',
      currency: '',
      ad_channel: null,
      notes: '',
      budget_pool: null,
    });
    setAssetData({
      tags: '',
      team: '',
      notes: '',
      file: null,
    });
    setRetrospectiveData({});
    setReportData({
      title: '',
      owner_id: '',
      report_template_id: '',
      slice_config: {
        csv_file_path: '',
      },
    });
    setTaskType('');
    setContentType('');
  };

  // Generic function to clear validation errors
  const clearAllValidationErrors = () => {
    taskValidation.clearErrors();
    budgetValidation.clearErrors();
    assetValidation.clearErrors();
    retrospectiveValidation.clearErrors();
    reportValidation.clearErrors();
  };

  const handleCreateTask = (projectId: number | null) => {
    setSelectedProjectId(projectId);
    resetFormData();
    clearAllValidationErrors();
    setTaskData((prev) => ({
      ...prev,
      project_id: projectId ?? undefined,
    }));
    setCreateModalOpen(true);
  };

  const handlePickProject = (selectedProjectId: number | null) => {
    if (!selectedProjectId) return;
    setRecentProjectIds((prev) => {
      const next = [
        selectedProjectId,
        ...prev.filter((id) => id !== selectedProjectId),
      ].slice(0, 5);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('recentProjectIds', JSON.stringify(next));
      }
      return next;
    });
    const params = new URLSearchParams(searchParams.toString());
    params.set('project_id', String(selectedProjectId));
    router.push(`/timeline?${params.toString()}`);
  };

  const filteredProjects = useMemo(() => {
    if (!projectSearchQuery.trim()) return projectOptions;
    const query = projectSearchQuery.trim().toLowerCase();
    return projectOptions.filter((project) => {
      const name = (project.name || '').toLowerCase();
      const idText = project.id ? String(project.id) : '';
      return name.includes(query) || idText.includes(query);
    });
  }, [projectOptions, projectSearchQuery]);

  const recentProjects = useMemo(() => {
    if (!recentProjectIds.length) return [];
    const byId = new Map(
      filteredProjects
        .filter((project) => project?.id)
        .map((project) => [project.id, project])
    );
    return recentProjectIds
      .map((id) => byId.get(id))
      .filter(Boolean);
  }, [filteredProjects, recentProjectIds]);

  const otherProjects = useMemo(() => {
    const recentSet = new Set(recentProjectIds);
    return filteredProjects.filter(
      (project) => !recentSet.has(project?.id)
    );
  }, [filteredProjects, recentProjectIds]);

  const handleTaskDataChange = (data: Partial<CreateTaskData>) => {
    setTaskData((prev) => ({ ...prev, ...data }));
    if (data.type && data.type !== taskData.type) {
      setTaskType(data.type);
    }
  };

  const handleBudgetDataChange = (newBudgetData: any) => {
    setBudgetData((prev) => ({ ...prev, ...newBudgetData }));
  };

  const handleAssetDataChange = (newAssetData: any) => {
    setAssetData((prev) => ({ ...prev, ...newAssetData }));
  };

  const handleRetrospectiveDataChange = (newRetrospectiveData: any) => {
    setRetrospectiveData((prev) => ({ ...prev, ...newRetrospectiveData }));
  };

  const handleReportDataChange = (newReportData: any) => {
    setReportData((prev) => ({ ...prev, ...newReportData }));
  };

  // Submit method to create task and related objects
  const handleSubmitTask = async () => {
    console.log('Submitting task creation form with data:', isSubmitting, taskData);
    if (isSubmitting) return;

    // Validate task form first
    const requiredTaskFields =
      taskData.type === 'budget'
        ? ['project_id', 'type', 'summary', 'current_approver_id']
        : ['project_id', 'type', 'summary'];
    if (!taskValidation.validateForm(taskData as any, requiredTaskFields as any)) {
      return;
    }

    // Validate task type specific form if config exists
    const config = taskTypeConfig[taskData.type as keyof typeof taskTypeConfig];
    if (config && config.validation && config.requiredFields.length > 0) {
      if (
        !config.validation.validateForm(config.formData as any, config.requiredFields as any)
      ) {
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Step 1: Create the task
      // Ensure required fields are present (should be validated already)
      if (!taskData.project_id || !taskData.type || !taskData.summary) {
        console.error('Missing required task fields');
        return;
      }

      const taskPayload: CreateTaskData = {
        project_id: taskData.project_id,
        type: taskData.type,
        summary: taskData.summary,
        description: taskData.description || '',
        current_approver_id:
          taskData.type === 'report' 
            ? (typeof user?.id === 'number' ? user.id : typeof user?.id === 'string' ? Number(user.id) : undefined)
            : taskData.current_approver_id,
        start_date: taskData.start_date || null,
        due_date: taskData.due_date || undefined,
      };

      console.log('Creating task with payload:', taskPayload);
      const createdTask = await createTask(taskPayload);
      console.log('Task created:', createdTask);

      // Step 2: Create the specific type object
      setContentType(config?.contentType || '');

      const createdObject = await createTaskTypeObject(
        taskData.type!,
        createdTask
      );

      // Step 3: Link the task to the specific type object
      if (createdObject && config?.contentType) {
        console.log(`Linking task to ${taskData.type}`, {
          taskId: createdTask.id,
          contentType: config.contentType,
          objectId: createdObject.id,
          createdObject: createdObject,
        });

        try {
          const linkResponse = await TaskAPI.linkTask(
            createdTask.id,
            config.contentType,
            createdObject.id.toString()
          );

          console.log('Link task response:', linkResponse);

          const updatedTask = {
            ...createdTask,
            content_type: config.contentType,
            object_id: createdObject.id.toString(),
            linked_object: createdObject,
          };

          updateTask(createdTask.id, updatedTask);

          console.log('Task linked to task type object successfully');
        } catch (linkError: any) {
          console.error('Error linking task to object:', linkError);
          const errorMsg =
            linkError.response?.data?.error ||
            linkError.response?.data?.message ||
            linkError.message ||
            'Unknown error';
          toast.error(`Asset created, but failed to link to task: ${errorMsg}`);
        }
      } else {
        console.warn('Cannot link task: missing createdObject or contentType', {
          createdObject: !!createdObject,
          contentType: config?.contentType,
        });
      }

      // Step 4: For asset tasks, upload initial version file if provided
      if (taskData.type === 'asset' && createdObject && assetData.file) {
        try {
          console.log(
            'Uploading initial version file for asset:',
            createdObject.id
          );
          await AssetAPI.createAssetVersion(String(createdObject.id), {
            file: assetData.file,
          });
          console.log('Initial version file uploaded successfully');
        } catch (error) {
          console.error('Error uploading initial version file:', error);
          toast.error(
            'Asset created, but failed to upload initial version file. You can upload it later.'
          );
        }
      }

      // Reset form and close modal
      resetFormData();
      setCreateModalOpen(false);
      clearAllValidationErrors();

      // Refresh tasks list
      if (reloadTasks) {
        await reloadTasks();
      }

      console.log('Task creation completed successfully');
    } catch (error: any) {
      console.error('Error creating task:', error);
      console.error('Error details:', {
        response: error.response,
        data: error.response?.data,
        status: error.response?.status,
        message: error.message,
      });

      // Show more detailed error message
      let errorMessage = 'Failed to create task';
      if (error.response?.data) {
        if (error.response.data.campaign) {
          errorMessage = `Campaign error: ${
            Array.isArray(error.response.data.campaign)
              ? error.response.data.campaign[0]
              : error.response.data.campaign
          }`;
        } else if (error.response.data.scheduled_at) {
          errorMessage = `Scheduled at error: ${
            Array.isArray(error.response.data.scheduled_at)
              ? error.response.data.scheduled_at[0]
              : error.response.data.scheduled_at
          }`;
        } else if (error.response.data.status) {
          errorMessage = `Status error: ${
            Array.isArray(error.response.data.status)
              ? error.response.data.status[0]
              : error.response.data.status
          }`;
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === 'object') {
          const firstError = Object.values(error.response.data)[0];
          errorMessage = Array.isArray(firstError) ? firstError[0] : String(firstError);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);
      
      // Try to reload tasks even on error to ensure list is visible
      if (reloadTasks) {
        try {
          await reloadTasks();
        } catch (reloadError) {
          console.error('Failed to reload tasks after error:', reloadError);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Layout>
      <div className="px-6 py-6">
        <div className="mb-4">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-2xl font-semibold text-gray-900">Timeline</h1>
            <button
              onClick={() =>
                router.push(projectId ? `/tasks?project_id=${projectId}` : '/tasks')
              }
              className="px-3 py-1.5 rounded text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 transition-colors"
            >
              Return to Tasks
            </button>
          </div>
          <p className="text-sm text-gray-500">Long stories grouped by project.</p>
        </div>

        <div className="mb-6 rounded-xl border border-gray-200 bg-gradient-to-r from-white via-white to-indigo-50/60 p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                {projectId ? 'Project selected' : "You haven't selected a project yet."}
              </div>
              <p className="mt-1 text-sm text-gray-600">
                {projectId
                  ? 'Switch projects to see a different timeline.'
                  : 'Choose a project to view its timeline.'}
              </p>
            </div>
            <div className="w-full sm:max-w-xs">
              <label
                htmlFor="timeline-project-selector"
                className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2"
              >
                Select project
              </label>
              <button
                type="button"
                onClick={openProjectPicker}
                id="timeline-project-selector"
                className={`flex w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-sm text-gray-900 shadow-sm transition ${
                  projectId
                    ? 'border-indigo-400 ring-2 ring-indigo-100'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <span className="truncate">
                  {projectId
                    ? `#${projectId} ${
                        projectOptions.find((project) => project.id === projectId)
                          ?.name || 'Unknown'
                      }`
                    : 'Select project'}
                </span>
                <svg
                  className="h-4 w-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>
              {projectOptionsError && (
                <p className="mt-2 text-sm text-red-600">{projectOptionsError}</p>
              )}
            </div>
          </div>
        </div>

        {projectId && loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        )}

        {projectId && error && !hasTasks && (
          <div className="text-center py-8">
            <p className="text-red-600">Error loading tasks.</p>
          </div>
        )}

        {projectId && !loading && (hasTasks || !error) && (
          <TimelineView
            tasks={visibleTasks}
            reloadTasks={reloadTasks}
            onCreateTask={handleCreateTask}
          />
        )}
      </div>

      {/* Project Picker Modal */}
      <Modal isOpen={projectPickerOpen} onClose={() => setProjectPickerOpen(false)}>
        <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-2xl">
          <div className="relative border-b border-slate-100 px-6 py-5">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-sky-50" />
            <div className="absolute -left-10 -top-14 h-32 w-32 rounded-full bg-indigo-100/70 blur-2xl" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-100 bg-white text-indigo-600 shadow-sm">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 6h16M4 12h16M4 18h7"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Select project</h2>
                  <p className="text-sm text-gray-500">
                    Choose a project to load its timeline.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setProjectPickerOpen(false)}
                className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 transition hover:border-gray-300 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>

          <div className="border-b border-slate-100 px-6 py-4">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-indigo-300">
                <svg
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={projectSearchQuery}
                onChange={(event) => setProjectSearchQuery(event.target.value)}
                placeholder="Search by project name or ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-gray-900 transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {projectOptionsLoading && (
              <div className="py-8 text-center text-sm text-gray-500">
                Loading projects...
              </div>
            )}
            {!projectOptionsLoading && projectOptionsError && (
              <div className="py-8 text-center text-sm text-red-600">
                {projectOptionsError}
              </div>
            )}
            {!projectOptionsLoading &&
              !projectOptionsError &&
              filteredProjects.length === 0 && (
                <div className="py-8 text-center text-sm text-gray-500">
                  No projects found.
                </div>
              )}
            {!projectOptionsLoading &&
              !projectOptionsError &&
              recentProjects.length > 0 && (
                <div className="mb-4">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Recent
                  </div>
                  {recentProjects.map((project) => (
                    <button
                      key={`recent-${project.id}`}
                      onClick={() => {
                        handlePickProject(project.id);
                        setProjectPickerOpen(false);
                      }}
                      className={`group mb-3 w-full rounded-2xl border px-4 py-3 text-left transition ${
                        project.id === projectId
                          ? 'border-indigo-200 bg-gradient-to-r from-indigo-50 to-white'
                          : 'border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900">
                          #{project.id} {project.name || 'Untitled Project'}
                        </div>
                        {project.id === projectId && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {project.description || 'No description'}
                      </div>
                      <div className="mt-3 h-[1px] w-full bg-gradient-to-r from-transparent via-indigo-100 to-transparent opacity-0 transition group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            {!projectOptionsLoading &&
              !projectOptionsError &&
              otherProjects.length > 0 && (
                <div>
                  {recentProjects.length > 0 && (
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                      All projects
                    </div>
                  )}
                  {otherProjects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => {
                        handlePickProject(project.id);
                        setProjectPickerOpen(false);
                      }}
                      className={`group mb-3 w-full rounded-2xl border px-4 py-3 text-left transition ${
                        project.id === projectId
                          ? 'border-indigo-200 bg-gradient-to-r from-indigo-50 to-white'
                          : 'border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-gray-900">
                          #{project.id} {project.name || 'Untitled Project'}
                        </div>
                        {project.id === projectId && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {project.description || 'No description'}
                      </div>
                      <div className="mt-3 h-[1px] w-full bg-gradient-to-r from-transparent via-indigo-100 to-transparent opacity-0 transition group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
          </div>
        </div>
      </Modal>

      {/* Create Task Modal */}
      <Modal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)}>
        <div className="flex flex-col bg-white rounded-md max-h-[90vh] overflow-hidden">
          <div className="flex flex-col gap-2 px-8 pt-8 pb-4 border-b border-gray-200">
            <h2 className="text-lg font-bold">New Task Form</h2>
            <p className="text-sm text-gray-500">
              Required fields are marked with an asterisk *
            </p>
          </div>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-10">
            <NewTaskForm
              onTaskDataChange={handleTaskDataChange}
              taskData={taskData}
              validation={taskValidation}
            />
            
            {taskData.type === 'budget' && (
              <NewBudgetRequestForm
                onBudgetDataChange={handleBudgetDataChange}
                budgetData={budgetData}
                taskData={taskData}
                validation={budgetValidation}
              />
            )}
            {taskData.type === 'asset' && (
              <NewAssetForm
                onAssetDataChange={handleAssetDataChange}
                assetData={assetData}
                taskData={taskData}
                validation={assetValidation}
              />
            )}
            {taskData.type === 'retrospective' && (
              <NewRetrospectiveForm
                onRetrospectiveDataChange={handleRetrospectiveDataChange}
                retrospectiveData={retrospectiveData}
                taskData={taskData}
                validation={retrospectiveValidation}
              />
            )}
            {taskData.type === 'report' && (
              <NewReportForm
                onReportDataChange={handleReportDataChange}
                reportData={reportData}
                taskData={taskData}
                validation={reportValidation}
              />
            )}
          </div>

          <div className="flex justify-end gap-2 px-8 py-4 border-t border-gray-200">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 rounded text-gray-700 bg-gray-100 hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitTask}
              disabled={isSubmitting}
              className="px-4 py-2 rounded text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}

export default function TimelinePage() {
  return (
    <ProtectedRoute>
      <TimelinePageContent />
    </ProtectedRoute>
  );
}
