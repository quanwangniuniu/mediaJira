'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import NewTaskForm from '@/components/tasks/NewTaskForm';
import NewBudgetRequestForm from '@/components/tasks/NewBudgetRequestForm';
import NewAssetForm from '@/components/tasks/NewAssetForm';
import NewRetrospectiveForm from '@/components/tasks/NewRetrospectiveForm';
import { useFormValidation } from '@/hooks/useFormValidation';
import useAuth from '@/hooks/useAuth';
import { TaskAPI } from '@/lib/api/taskApi';
import { ProjectAPI } from '@/lib/api/projectApi';
import { BudgetAPI } from '@/lib/api/budgetApi';
import { AssetAPI } from '@/lib/api/assetApi';
import { RetrospectiveAPI, CreateRetrospectiveData } from '@/lib/api/retrospectiveApi';
import { OptimizationScalingAPI } from '@/lib/api/optimizationScalingApi';
import { AlertingAPI } from '@/lib/api/alertingApi';
import { ExperimentAPI } from '@/lib/api/experimentApi';
import { OptimizationAPI } from '@/lib/api/optimizationApi';
import { ClientCommunicationAPI } from '@/lib/api/clientCommunicationApi';
import type { CreateTaskData } from '@/types/task';
import { ScalingPlanForm } from '@/components/tasks/ScalingPlanForm';
import AlertTaskForm from '@/components/tasks/AlertTaskForm';
import { ExperimentForm } from '@/components/tasks/ExperimentForm';
import { OptimizationForm } from '@/components/tasks/OptimizationForm';
import NewClientCommunicationForm, {
  type ClientCommunicationFormData,
} from '@/components/tasks/NewClientCommunicationForm';

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
    project_id: projectId ?? undefined,
    type: undefined,
    summary: '',
    description: '',
    current_approver_id: undefined,
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
  const [retrospectiveData, setRetrospectiveData] = useState<Partial<CreateRetrospectiveData>>({});
  const [scalingPlanData, setScalingPlanData] = useState<Record<string, any>>({});
  const [alertTaskData, setAlertTaskData] = useState<Record<string, any>>({});
  const [experimentData, setExperimentData] = useState<Record<string, any>>({});
  const [optimizationData, setOptimizationData] = useState<Record<string, any>>({});
  const [communicationData, setCommunicationData] =
    useState<ClientCommunicationFormData>({
      communication_type: '',
      stakeholders: '',
      impacted_areas: [],
      required_actions: '',
      client_deadline: '',
      notes: '',
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
      project_id: projectId ?? undefined,
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

  const scalingValidationRules = {
    strategy: (value: any) => (!value ? 'Scaling strategy is required' : ''),
  };

  const experimentValidationRules = {
    hypothesis: (value: any) =>
      !value || value.trim() === '' ? 'Hypothesis is required' : '',
  };

  const communicationValidationRules = {
    communication_type: (value: any) =>
      !value ? 'Communication type is required' : '',
    impacted_areas: (value: any) =>
      !Array.isArray(value) || value.length === 0
        ? 'Select at least one impacted area'
        : '',
    required_actions: (value: any) =>
      !value || value.trim() === '' ? 'Required actions are required' : '',
  };

  const taskValidation = useFormValidation(taskValidationRules);
  const budgetValidation = useFormValidation(budgetValidationRules);
  const assetValidation = useFormValidation(assetValidationRules);
  const retrospectiveValidation = useFormValidation(retrospectiveValidationRules);
  const scalingValidation = useFormValidation(scalingValidationRules);
  const experimentValidation = useFormValidation(experimentValidationRules);
  const communicationValidation = useFormValidation(communicationValidationRules);

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
    scaling: {
      formData: scalingPlanData,
      validation: scalingValidation,
      api: OptimizationScalingAPI.createScalingPlan,
      requiredFields: ['strategy'],
      getPayload: (createdTask: any) => ({
        task: createdTask.id,
        strategy: scalingPlanData.strategy,
        scaling_target: scalingPlanData.scaling_target,
        risk_considerations: scalingPlanData.risk_considerations,
        max_scaling_limit: scalingPlanData.max_scaling_limit,
        stop_conditions: scalingPlanData.stop_conditions,
        expected_outcomes: scalingPlanData.expected_outcomes,
      }),
    },
    alert: {
      formData: alertTaskData,
      validation: undefined,
      api: AlertingAPI.createAlertTask,
      requiredFields: [],
      getPayload: (createdTask: any) => ({
        task: createdTask.id,
        ...alertTaskData,
      }),
    },
    experiment: {
      formData: experimentData,
      validation: experimentValidation,
      api: ExperimentAPI.createExperiment,
      requiredFields: ['hypothesis'],
      getPayload: (createdTask: any) => ({
        task: createdTask.id,
        name: experimentData.name || taskData.summary || 'Experiment task',
        hypothesis: experimentData.hypothesis,
        expected_outcome: experimentData.expected_outcome,
        description: experimentData.description,
        control_group: experimentData.control_group,
        variant_group: experimentData.variant_group,
        success_metric: experimentData.success_metric,
        constraints: experimentData.constraints,
        status: experimentData.status,
      }),
    },
    optimization: {
      formData: optimizationData,
      validation: undefined,
      api: OptimizationAPI.createOptimization,
      requiredFields: [],
      getPayload: (createdTask: any) => ({
        task: createdTask.id,
        ...optimizationData,
      }),
    },
    communication: {
      formData: communicationData,
      validation: communicationValidation,
      api: ClientCommunicationAPI.create,
      requiredFields: ['communication_type', 'impacted_areas', 'required_actions'],
      getPayload: (createdTask: any) => ({
        task: createdTask.id,
        communication_type: communicationData.communication_type || undefined,
        stakeholders: communicationData.stakeholders || '',
        impacted_areas: communicationData.impacted_areas || [],
        required_actions: communicationData.required_actions || '',
        client_deadline: communicationData.client_deadline || null,
        notes: communicationData.notes || '',
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

  const handleScalingPlanChange = (data: any) => {
    setScalingPlanData((prev) => ({ ...prev, ...data }));
  };

  const handleAlertTaskChange = (data: any) => {
    setAlertTaskData((prev) => ({ ...prev, ...data }));
  };

  const handleExperimentChange = (data: any) => {
    setExperimentData((prev) => ({ ...prev, ...data }));
  };

  const handleOptimizationChange = (data: any) => {
    setOptimizationData((prev) => ({ ...prev, ...data }));
  };

  const handleCommunicationChange = (data: Partial<ClientCommunicationFormData>) => {
    setCommunicationData((prev) => ({ ...prev, ...data }));
  };

  const resetFormData = () => {
    const nextDates = getDefaultTaskDates();
    setTaskData({
      project_id: projectId ?? undefined,
      type: undefined,
      summary: '',
      description: '',
      current_approver_id: undefined,
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
    setScalingPlanData({});
    setAlertTaskData({});
    setExperimentData({});
    setOptimizationData({});
    setCommunicationData({
      communication_type: '',
      stakeholders: '',
      impacted_areas: [],
      required_actions: '',
      client_deadline: '',
      notes: '',
    });
  };

  const clearAllValidationErrors = () => {
    taskValidation.clearErrors();
    budgetValidation.clearErrors();
    assetValidation.clearErrors();
    retrospectiveValidation.clearErrors();
    scalingValidation.clearErrors();
    experimentValidation.clearErrors();
    communicationValidation.clearErrors();
  };

  const createTaskTypeObject = async (taskType: string, createdTask: any) => {
    const config = taskTypeConfig[taskType as keyof typeof taskTypeConfig];
    if (!config || !config.api) {
      return null;
    }
    const payload = config.getPayload(createdTask);
    const response = await config.api(payload);
    // Handle both AxiosResponse (with .data) and direct object responses
    return (response && typeof response === 'object' && 'data' in response) 
      ? (response as any).data 
      : response;
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

      if (taskData.type === 'retrospective' && taskData.project_id) {
        try {
          const existing = await RetrospectiveAPI.getRetrospectives({
            campaign: String(taskData.project_id),
          });
          const items = existing?.data?.results || existing?.data || [];
          if (Array.isArray(items) && items.length > 0) {
            toast.error('Retrospective already exists for this project.');
            return;
          }
        } catch (error) {
          console.warn('Failed to precheck retrospectives:', error);
        }
      }

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
          {taskData.type === 'scaling' && (
            <ScalingPlanForm
              mode="create"
              initialPlan={scalingPlanData}
              onChange={handleScalingPlanChange}
            />
          )}
          {taskData.type === 'alert' && (
            <AlertTaskForm
              initialData={alertTaskData}
              onChange={handleAlertTaskChange}
              projectId={projectId ?? undefined}
            />
          )}
          {taskData.type === 'experiment' && (
            <ExperimentForm
              mode="create"
              initialData={experimentData}
              onChange={handleExperimentChange}
            />
          )}
          {taskData.type === 'optimization' && (
            <OptimizationForm
              mode="create"
              initialData={optimizationData}
              onChange={handleOptimizationChange}
            />
          )}
          {taskData.type === 'communication' && (
            <NewClientCommunicationForm
              communicationData={communicationData}
              onCommunicationDataChange={handleCommunicationChange}
              validation={communicationValidation}
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
