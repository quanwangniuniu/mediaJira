'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import NewTaskForm from '@/components/tasks/NewTaskForm';
import NewBudgetRequestForm from '@/components/tasks/NewBudgetRequestForm';
import NewAssetForm from '@/components/tasks/NewAssetForm';
import NewRetrospectiveForm from '@/components/tasks/NewRetrospectiveForm';
import NewReportForm from '@/components/tasks/NewReportForm';
import { useFormValidation } from '@/hooks/useFormValidation';
import useAuth from '@/hooks/useAuth';
import { TaskAPI } from '@/lib/api/taskApi';
import { ProjectAPI } from '@/lib/api/projectApi';
import { BudgetAPI } from '@/lib/api/budgetApi';
import { AssetAPI } from '@/lib/api/assetApi';
import { RetrospectiveAPI } from '@/lib/api/retrospectiveApi';
import { ReportAPI } from '@/lib/api/reportApi';
import type { CreateTaskData } from '@/types/task';

interface DecisionTaskCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  decisionId: number;
  decisionTitle: string;
  decisionSummary?: string | null;
  decisionSeq?: number | null;
  selectedOptionText?: string | null;
  decisionLink: string;
  projectId?: number | null;
  projectName?: string | null;
  onCreated?: () => void;
}

const getDefaultTaskDates = () => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  return {
    start_date: today.toISOString().slice(0, 10),
    due_date: tomorrow.toISOString().slice(0, 10),
  };
};

const DecisionTaskCreateModal = ({
  isOpen,
  onClose,
  decisionId,
  decisionTitle,
  decisionSummary,
  decisionSeq,
  selectedOptionText,
  decisionLink,
  projectId,
  projectName,
  onCreated,
}: DecisionTaskCreateModalProps) => {
  const { user } = useAuth();
  const defaultDates = useMemo(() => getDefaultTaskDates(), []);
  const [taskData, setTaskData] = useState<Partial<CreateTaskData>>({
    project_id: projectId ?? null,
    type: '',
    summary: '',
    description: '',
    current_approver_id: null,
    ...defaultDates,
  });
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
  const [resolvedProjectName, setResolvedProjectName] = useState<string | null>(
    projectName ?? null
  );

  useEffect(() => {
    setResolvedProjectName(projectName ?? null);
  }, [projectName]);

  useEffect(() => {
    const loadProjectName = async () => {
      if (resolvedProjectName || !projectId) return;
      try {
        const project = await ProjectAPI.getProject(projectId);
        setResolvedProjectName(project?.name || null);
      } catch (error) {
        console.warn('Failed to load project name for task modal:', error);
      }
    };

    loadProjectName();
  }, [projectId, resolvedProjectName]);

  useEffect(() => {
    if (!isOpen) return;
    setTaskData((prev) => ({
      ...prev,
      project_id: projectId ?? null,
    }));
  }, [isOpen, projectId]);

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
    amount: (value: any) => (!value || value.trim() === '' ? 'Amount is required' : ''),
    currency: (value: any) =>
      !value || value.trim() === '' ? 'Currency is required' : '',
    ad_channel: (value: any) =>
      !value || value === 0 ? 'Ad channel is required' : '',
    budget_pool: (value: any) =>
      !value || value === 0 ? 'Budget pool is required' : '',
  };

  const assetValidationRules = {};

  const retrospectiveValidationRules = {
    campaign: (value: any) => {
      if (!value || value.toString().trim() === '') {
        return 'Campaign (Project) is required';
      }
      return '';
    },
  };

  const reportValidationRules = {
    title: (value: any) => (!value || value.trim() === '' ? 'Title is required' : ''),
    owner_id: (value: any) =>
      !value || value.trim() === '' ? 'Owner ID is required' : '',
    'slice_config.csv_file_path': () => '',
  };

  const taskValidation = useFormValidation(taskValidationRules);
  const budgetValidation = useFormValidation(budgetValidationRules);
  const assetValidation = useFormValidation(assetValidationRules);
  const retrospectiveValidation = useFormValidation(retrospectiveValidationRules);
  const reportValidation = useFormValidation(reportValidationRules);

  const taskTypeConfig = {
    budget: {
      formData: budgetData,
      validation: budgetValidation,
      api: BudgetAPI.createBudgetRequest,
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
      formData: assetData,
      validation: assetValidation,
      api: AssetAPI.createAsset,
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
      formData: retrospectiveData,
      validation: retrospectiveValidation,
      api: RetrospectiveAPI.createRetrospective,
      requiredFields: ['campaign'],
      getPayload: (createdTask: any) => ({
        campaign: retrospectiveData.campaign || taskData.project_id?.toString(),
        scheduled_at: retrospectiveData.scheduled_at || new Date().toISOString(),
        status: retrospectiveData.status || 'scheduled',
      }),
    },
    report: {
      formData: reportData,
      validation: reportValidation,
      api: ReportAPI.createReport,
      requiredFields: ['title', 'owner_id', 'slice_config.csv_file_path'],
      getPayload: (createdTask: any) => ({
        task: createdTask.id,
        title: reportData.title,
        owner_id: reportData.owner_id,
        report_template_id: reportData.report_template_id,
        slice_config: {
          csv_file_path: reportData.slice_config?.csv_file_path || '',
        },
      }),
    },
  };

  const handleTaskDataChange = (data: Partial<CreateTaskData>) => {
    setTaskData((prev) => ({ ...prev, ...data }));
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

  const resetFormData = () => {
    const nextDates = getDefaultTaskDates();
    setTaskData({
      project_id: projectId ?? null,
      type: '',
      summary: '',
      description: '',
      current_approver_id: null,
      start_date: nextDates.start_date,
      due_date: nextDates.due_date,
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
      slice_config: { csv_file_path: '' },
    });
  };

  const clearAllValidationErrors = () => {
    taskValidation.clearErrors();
    budgetValidation.clearErrors();
    assetValidation.clearErrors();
    retrospectiveValidation.clearErrors();
    reportValidation.clearErrors();
  };

  const createTaskTypeObject = async (taskType: string, createdTask: any) => {
    const config = taskTypeConfig[taskType as keyof typeof taskTypeConfig];
    if (!config || !config.api) {
      return null;
    }
    const payload = config.getPayload(createdTask);
    const response = await config.api(payload);
    return response?.data || response;
  };

  const handleSubmitTask = async () => {
    if (isSubmitting) return;

    const requiredTaskFields =
      taskData.type === 'budget'
        ? ['project_id', 'type', 'summary', 'current_approver_id']
        : ['project_id', 'type', 'summary'];

    if (!taskValidation.validateForm(taskData, requiredTaskFields)) {
      return;
    }

    const config = taskTypeConfig[taskData.type as keyof typeof taskTypeConfig];
    if (config && config.validation && config.requiredFields.length > 0) {
      if (!config.validation.validateForm(config.formData, config.requiredFields)) {
        return;
      }
    }

    try {
      setIsSubmitting(true);

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

      const createdTaskResponse = await TaskAPI.createTask(taskPayload);
      const createdTask = createdTaskResponse?.data || createdTaskResponse;

      await TaskAPI.linkTask(createdTask.id, 'decision', String(decisionId));

      let createdObject: any = null;
      if (config?.api) {
        createdObject = await createTaskTypeObject(taskData.type!, createdTask);
      }

      if (taskData.type === 'asset' && createdObject && assetData.file) {
        try {
          await AssetAPI.createAssetVersion(String(createdObject.id), {
            file: assetData.file,
          });
        } catch (error) {
          toast.error(
            'Asset created, but failed to upload initial version file. You can upload it later.'
          );
        }
      }

      resetFormData();
      clearAllValidationErrors();
      onClose();
      if (onCreated) {
        onCreated();
      }
    } catch (error: any) {
      console.error('Error creating task from decision:', error);
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        error?.message ||
        'Failed to create task';
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="flex max-h-[90vh] flex-col overflow-hidden rounded-md bg-white">
        <div className="flex flex-col gap-2 border-b border-gray-200 px-8 pb-4 pt-8">
          <h2 className="text-lg font-bold">New Task Form</h2>
          <p className="text-sm text-gray-500">
            Required fields are marked with an asterisk *
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-10">
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                Decision Context
              </div>
              <span className="inline-flex items-center rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-semibold text-white">
                #{decisionSeq ?? 'Seq'}
              </span>
            </div>
            <div className="mt-2 grid gap-2 text-xs text-gray-600">
              <div>
                <span className="font-semibold text-gray-700">Title:</span>{' '}
                {decisionTitle || 'Untitled decision'}
              </div>
              <div>
                <span className="font-semibold text-gray-700">Summary:</span>{' '}
                {decisionSummary || '—'}
              </div>
              <div>
                <span className="font-semibold text-gray-700">Selected Option:</span>{' '}
                {selectedOptionText || '—'}
              </div>
            </div>
          </div>

          <NewTaskForm
            onTaskDataChange={handleTaskDataChange}
            taskData={taskData}
            validation={taskValidation}
            lockProject={Boolean(projectId)}
            projectName={resolvedProjectName}
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

        <div className="flex justify-end gap-2 border-t border-gray-200 px-8 py-4">
          <button
            onClick={onClose}
            className="rounded bg-gray-100 px-4 py-2 text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmitTask}
            disabled={isSubmitting}
            className="rounded bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Creating...' : 'Create Task'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DecisionTaskCreateModal;
