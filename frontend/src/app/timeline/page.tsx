'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { RetrospectiveAPI } from '@/lib/api/retrospectiveApi';
import { ReportAPI } from '@/lib/api/reportApi';
import useAuth from '@/hooks/useAuth';
import toast from 'react-hot-toast';

function TimelinePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const projectIdParam = searchParams.get('project_id');
  const projectId = projectIdParam ? Number(projectIdParam) : null;

  const { user } = useAuth();
  const { tasks, loading, error, fetchTasks, reloadTasks, createTask, updateTask } = useTaskData();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  const [taskData, setTaskData] = useState<Partial<CreateTaskData>>({
    project_id: null,
    type: '',
    summary: '',
    description: '',
    current_approver_id: null,
    due_date: '',
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
  const [retrospectiveData, setRetrospectiveData] = useState({});
  const [reportData, setReportData] = useState({
    title: '',
    owner_id: '',
    report_template_id: '',
    slice_config: { csv_file_path: '' },
  });

  useEffect(() => {
    const load = async () => {
      if (projectId) {
        await fetchTasks({ project_id: projectId, include_subtasks: true });
      } else {
        await fetchTasks({ all_projects: true, include_subtasks: true });
      }
    };
    load();
  }, [projectId, fetchTasks]);

  const visibleTasks = useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    return tasks;
  }, [tasks]);

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
      const createdObject = response?.data || response;
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
    setTaskData({
      project_id: null,
      type: '',
      summary: '',
      description: '',
      current_approver_id: null,
      start_date: '',
      due_date: '',
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
      project_id: projectId,
    }));
    setCreateModalOpen(true);
  };

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
    if (!taskValidation.validateForm(taskData, requiredTaskFields)) {
      return;
    }

    // Validate task type specific form if config exists
    const config = taskTypeConfig[taskData.type as keyof typeof taskTypeConfig];
    if (config && config.validation && config.requiredFields.length > 0) {
      if (
        !config.validation.validateForm(config.formData, config.requiredFields)
      ) {
        return;
      }
    }

    try {
      setIsSubmitting(true);

      // Step 1: Create the task
      const taskPayload = {
        project_id: taskData.project_id,
        type: taskData.type,
        summary: taskData.summary,
        description: taskData.description || '',
        current_approver_id:
          taskData.type === 'report' ? user?.id : taskData.current_approver_id,
        start_date: taskData.start_date || null,
        due_date: taskData.due_date || null,
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
              onClick={() => router.push('/tasks')}
              className="px-3 py-1.5 rounded text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 transition-colors"
            >
              Return to Tasks
            </button>
          </div>
          <p className="text-sm text-gray-500">Long stories grouped by project.</p>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        )}

        {error && !hasTasks && (
          <div className="text-center py-8">
            <p className="text-red-600">Error loading tasks.</p>
          </div>
        )}

        {!loading && (hasTasks || !error) && (
          <TimelineView
            tasks={visibleTasks}
            reloadTasks={reloadTasks}
            onCreateTask={handleCreateTask}
          />
        )}
      </div>

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

