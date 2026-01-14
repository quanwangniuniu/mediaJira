'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import useAuth from '@/hooks/useAuth';
import { useTaskData } from '@/hooks/useTaskData';
import { useBudgetData } from '@/hooks/useBudgetData';
import { TaskData, TaskComment } from '@/types/task';
import { BudgetRequestData } from '@/lib/api/budgetApi';
import { RetrospectiveAPI } from '@/lib/api/retrospectiveApi';
import RetrospectiveDetail from '@/components/tasks/RetrospectiveDetail';
import AssetDetail from '@/components/tasks/AssetDetail';
import ScalingDetail from '@/components/tasks/ScalingDetail';
import ExperimentDetail from '@/components/tasks/ExperimentDetail';
import AlertDetail from '@/components/tasks/AlertDetail';
import OptimizationDetail from '@/components/tasks/OptimizationDetail';
import LinkedWorkItems from '@/components/tasks/LinkedWorkItems';
import Subtasks from '@/components/tasks/Subtasks';
import Attachments from '@/components/tasks/Attachments';
import ProjectSummaryPanel from '@/components/dashboard/ProjectSummaryPanel';
import Link from 'next/link';
import { TaskAPI } from '@/lib/api/taskApi';
import { OptimizationScalingAPI, ScalingPlan } from '@/lib/api/optimizationScalingApi';
import { ExperimentAPI, Experiment } from '@/lib/api/experimentApi';
import { AlertingAPI, AlertTask } from '@/lib/api/alertingApi';
import { OptimizationAPI, Optimization } from '@/lib/api/optimizationApi';

// Task Detail Components
interface TaskDetailProps {
  task: TaskData;
  linkedObject: any;
  linkedObjectLoading: boolean;
  onRefreshLinkedObject?: () => void;
}

// Budget Request Detail Component
const BudgetRequestDetail = ({ budgetRequest }: { budgetRequest: BudgetRequestData }) => {
  if (!budgetRequest) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Budget Request Details</h3>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
          budgetRequest.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
          budgetRequest.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
          budgetRequest.status === 'UNDER_REVIEW' ? 'bg-yellow-100 text-yellow-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {budgetRequest.status?.replace('_', ' ')}
        </span>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <p className="mt-1 text-lg font-semibold text-gray-900">
              {budgetRequest.amount} {budgetRequest.currency}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Ad Channel</label>
            <p className="mt-1 text-gray-900">#{budgetRequest.ad_channel}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Requested By</label>
            <p className="mt-1 text-gray-900">User #{budgetRequest.requested_by}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Submitted At</label>
            <p className="mt-1 text-gray-900">
              {budgetRequest.submitted_at ? new Date(budgetRequest.submitted_at).toLocaleDateString() : 'Not submitted'}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Budget Pool</label>
            <p className="mt-1 text-gray-900">#{budgetRequest.budget_pool}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Escalated</label>
            <p className="mt-1 text-gray-900">
              {budgetRequest.is_escalated ? 'Yes' : 'No'}
            </p>
          </div>
        </div>
      </div>
      
      {budgetRequest.notes && (
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <p className="mt-1 text-gray-900 bg-gray-50 p-3 rounded-md">
            {budgetRequest.notes}
          </p>
        </div>
      )}
    </div>
  );
};

// Generic Linked Object Detail Component
const LinkedObjectDetail = ({ task, linkedObject, linkedObjectLoading, onRefreshLinkedObject }: TaskDetailProps) => {
  if (linkedObjectLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading linked object...</span>
        </div>
      </div>
    );
  }

  if (!linkedObject) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">No linked object found for this task.</p>
        </div>
      </div>
    );
  }

  // Render different components based on task type
  switch (task.type) {
    case 'budget':
      return <BudgetRequestDetail budgetRequest={linkedObject} />;
    case 'asset':
      return (
        <AssetDetail 
          taskId={task.id}
          assetId={linkedObject?.id || task.object_id || null}
          hideComments={true}
        />
      );
    case 'retrospective':
      return <RetrospectiveDetail retrospective={linkedObject} loading={linkedObjectLoading} onRefresh={onRefreshLinkedObject} />;
    case 'scaling':
      return (
        <ScalingDetail
          plan={linkedObject as ScalingPlan}
          loading={linkedObjectLoading}
          onRefresh={onRefreshLinkedObject}
        />
      );
    case 'experiment':
      return (
        <ExperimentDetail
          experiment={linkedObject as Experiment}
          loading={linkedObjectLoading}
          onRefresh={onRefreshLinkedObject}
        />
      );
    case 'alert':
      return (
        <AlertDetail
          alert={linkedObject as AlertTask}
          projectId={task.project?.id ?? task.project_id}
          onRefresh={onRefreshLinkedObject}
        />
      );
    case 'optimization':
      return (
        <OptimizationDetail
          optimization={linkedObject as Optimization}
          taskId={task.id!}
          loading={linkedObjectLoading}
          onRefresh={onRefreshLinkedObject}
        />
      );
    default:
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Unknown Task Type</h3>
          <p className="text-gray-500">Task type "{task.type}" is not supported.</p>
        </div>
      );
  }
};

// Task-level comments section (applies to all task types)
const TaskCommentsSection = ({ taskId }: { taskId: number }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const currentUserId = user?.id ? Number(user.id) : null;

  const loadComments = async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await TaskAPI.getComments(taskId);
      setComments(list);
    } catch (e: any) {
      console.error('Failed to load task comments:', e);
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        'Failed to load comments.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!taskId) return;
    loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const formatAuthor = (comment: TaskComment) => {
    const author = comment.user;
    if (!author) {
      return `User #${comment.id}`;
    }
    if (currentUserId && author.id === currentUserId) {
      // Prefer current authenticated user's fields if available
      return (
        (user as any)?.username ||
        (user as any)?.email ||
        author.username ||
        author.email ||
        `User #${author.id}`
      );
    }
    return author.username || author.email || `User #${author.id}`;
  };

  const handleAddComment = async () => {
    const body = newComment.trim();
    if (!body || submitting) return;
    try {
      setSubmitting(true);
      const created = await TaskAPI.createComment(taskId, { body });
      setNewComment('');
      // Prepend new comment to the list
      setComments((prev) => [created, ...prev]);
    } catch (e: any) {
      console.error('Failed to add task comment:', e);
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        'Failed to add comment.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Comments</h3>

      {/* Add comment input */}
      <div className="mb-4">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          placeholder="Add a comment about this task..."
        />
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            onClick={handleAddComment}
            disabled={!newComment.trim() || submitting}
            className={`px-4 py-2 text-sm font-medium rounded-md text-white ${
              submitting || !newComment.trim()
                ? 'bg-indigo-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {submitting ? 'Adding...' : 'Add Comment'}
          </button>
        </div>
      </div>

      {/* Comments list */}
      {loading && (
        <div className="text-sm text-gray-500">Loading comments...</div>
      )}
      {error && !loading && (
        <div className="text-sm text-red-600 mb-2">{error}</div>
      )}
      {!loading && !error && comments.length === 0 && (
        <div className="text-sm text-gray-500">No comments yet.</div>
      )}
      {!loading && !error && comments.length > 0 && (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div
              key={comment.id}
              className="border border-gray-200 rounded-md p-3 text-sm text-gray-900"
            >
              <div className="font-medium">{formatAuthor(comment)}</div>
              <div className="mt-1 text-gray-800 whitespace-pre-wrap break-words">
                {comment.body}
              </div>
              <div className="mt-1 text-xs text-gray-500">
                {comment.created_at
                  ? new Date(comment.created_at).toLocaleString()
                  : ''}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

// Main Task Detail Component
const TaskDetail = ({ task, onTaskUpdate }: { task: TaskData; onTaskUpdate?: (updatedTask: TaskData) => void }) => {
  const [summaryDraft, setSummaryDraft] = useState(task.summary || '');
  const [descriptionDraft, setDescriptionDraft] = useState(task.description || '');
  const [editingSummary, setEditingSummary] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [savingSummary, setSavingSummary] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);

  useEffect(() => {
    setSummaryDraft(task.summary || '');
    setDescriptionDraft(task.description || '');
  }, [task.summary, task.description]);

  const handleSaveSummary = async () => {
    if (!task.id) return;
    try {
      setSavingSummary(true);
      const response = await TaskAPI.updateTask(task.id, {
        summary: summaryDraft,
      });
      const updatedTask = response.data;
      Object.assign(task, updatedTask);
      onTaskUpdate?.(updatedTask);
      setEditingSummary(false);
    } catch (error) {
      console.error('Error updating task name:', error);
    } finally {
      setSavingSummary(false);
    }
  };

  const handleSaveDescription = async () => {
    if (!task.id) return;
    try {
      setSavingDescription(true);
      const response = await TaskAPI.updateTask(task.id, {
        description: descriptionDraft,
      });
      const updatedTask = response.data;
      Object.assign(task, updatedTask);
      onTaskUpdate?.(updatedTask);
      setEditingDescription(false);
    } catch (error) {
      console.error('Error updating task description:', error);
    } finally {
      setSavingDescription(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'UNDER_REVIEW':
        return 'bg-yellow-100 text-yellow-800';
      case 'SUBMITTED':
        return 'bg-blue-100 text-blue-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type?: string) => {
    switch (type) {
      case 'budget':
        return 'bg-purple-100 text-purple-800';
      case 'asset':
        return 'bg-indigo-100 text-indigo-800';
      case 'retrospective':
        return 'bg-orange-100 text-orange-800';
      case 'scaling':
        return 'bg-teal-100 text-teal-800';
      case 'optimization':
        return 'bg-cyan-100 text-cyan-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          {!editingSummary ? (
            <div className="flex items-start justify-between gap-4">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{task.summary}</h1>
              <button
                type="button"
                onClick={() => setEditingSummary(true)}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Edit Name
              </button>
            </div>
          ) : (
            <div className="space-y-3 mb-2 w-full">
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                placeholder="Optional if not mentioned above."
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveSummary}
                  disabled={savingSummary}
                  className={`px-3 py-1.5 text-sm rounded-md text-white ${
                    savingSummary ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {savingSummary ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingSummary(false);
                    setSummaryDraft(task.summary || '');
                  }}
                  className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          <p className="text-sm text-gray-500">Task #{task.id}</p>
        </div>
        <div className="flex flex-col items-end space-y-2">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(task.status)}`}>
            {task.status?.replace('_', ' ')}
          </span>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(task.type)}`}>
            {task.type}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Project</label>
            <p className="mt-1 text-gray-900">{task.project?.name || 'Unknown Project'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Owner</label>
            <p className="mt-1 text-gray-900">{task.owner?.username || 'Unassigned'}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Current Approver</label>
            <p className="mt-1 text-gray-900">{task.current_approver?.username || 'No approver assigned'}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Due Date</label>
            <p className="mt-1 text-gray-900">
              {task.due_date ? new Date(task.due_date).toLocaleDateString() : 'No due date'}
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700">Linked Object</label>
            <p className="mt-1 text-gray-900">
              {task.content_type && task.object_id ? 
                `${task.content_type} #${task.object_id}` : 
                'No linked object'
              }
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        {!editingDescription ? (
          <div className="space-y-3">
            <p className="text-gray-900 bg-gray-50 p-4 rounded-md">
              {task.description || 'Empty description'}
            </p>
            <button
              type="button"
              onClick={() => setEditingDescription(true)}
              className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Edit Description
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              rows={4}
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              placeholder="Optional if not mentioned above."
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSaveDescription}
                disabled={savingDescription}
                className={`px-3 py-1.5 text-sm rounded-md text-white ${
                  savingDescription ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {savingDescription ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingDescription(false);
                  setDescriptionDraft(task.description || '');
                }}
                className="px-3 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Page Component
export default function TaskPage() {
  const params = useParams();
  const taskId = params?.taskId ? Number(params.taskId) : null;
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const { fetchTask, loading: taskLoading, error: taskError } = useTaskData();
  const { getBudgetRequest, loading: budgetLoading, error: budgetError } = useBudgetData();
  
  const [task, setTask] = useState<TaskData | null>(null);
  const [linkedObject, setLinkedObject] = useState<any>(null);
  const [linkedObjectLoading, setLinkedObjectLoading] = useState(false);

  // Fetch task data
  useEffect(() => {
    if (!taskId) return;

    const loadTask = async () => {
      try {
        const taskData = await fetchTask(taskId);
        setTask(taskData);
        
        // Load linked object if task is linked
        if (taskData.content_type && taskData.object_id) {
          await loadLinkedObject(taskData);
        } else if (taskData.type === 'experiment' || taskData.type === 'scaling' || taskData.type === 'alert' || taskData.type === 'optimization') {
          // For experiment, scaling, alert, and optimization tasks, try to load even without content_type/object_id
          // They have fallback logic using task.id
          await loadLinkedObject(taskData);
        }
      } catch (error) {
        console.error('Error loading task:', error);
      }
    };

    loadTask();
  }, [taskId, fetchTask]);

  // Load linked object based on task type
  const loadLinkedObject = async (taskData: TaskData) => {
    setLinkedObjectLoading(true);
    try {
      switch (taskData.type) {
        case 'budget':
          if (!taskData.object_id) {
            setLinkedObject(null);
            break;
          }
          const budgetRequest = await getBudgetRequest(Number(taskData.object_id));
          setLinkedObject(budgetRequest);
          break;
        case 'asset':
          // TODO: Implement asset loading
          setLinkedObject(null);
          break;
        case 'retrospective':
          if (!taskData.object_id) {
            setLinkedObject(null);
            break;
          }
          const retrospectiveResponse = await RetrospectiveAPI.getRetrospective(taskData.object_id);
          setLinkedObject(retrospectiveResponse.data);
          break;
        case 'scaling':
          try {
            let plan: ScalingPlan | null = null;
            if (taskData.content_type === 'scalingplan' && taskData.object_id) {
              const planId = Number(taskData.object_id);
              if (!Number.isNaN(planId)) {
                const resp = await OptimizationScalingAPI.getScalingPlan(planId);
                plan = resp.data as any;
              }
            }
            if (!plan && taskData.id) {
              const resp = await OptimizationScalingAPI.listScalingPlans({
                task_id: taskData.id,
              });
              const plans = resp.data || [];
              plan = (plans[0] as any) || null;
            }
            setLinkedObject(plan);
          } catch (e) {
            console.error('Error loading scaling plan:', e);
            setLinkedObject(null);
          }
          break;
        case 'experiment':
          try {
            let experiment: Experiment | null = null;
            // Try to get experiment via task.experiment relationship (via object_id)
            if (taskData.object_id) {
              const experimentId = Number(taskData.object_id);
              if (!Number.isNaN(experimentId)) {
                const resp = await ExperimentAPI.getExperiment(experimentId);
                experiment = resp.data as any;
              }
            }
            // Fallback: lookup by fetching all experiments and filtering by task
            if (!experiment && taskData.id) {
              const resp = await ExperimentAPI.listExperiments({});
              const data: any = resp.data;
              const experiments: Experiment[] = Array.isArray(data) ? data : (data?.results || []);
              experiment = experiments.find((e: Experiment) => e.task === taskData.id) || null;
            }
            setLinkedObject(experiment);
          } catch (e) {
            console.error('Error loading experiment:', e);
            setLinkedObject(null);
          }
          break;
        case 'alert':
          try {
            if (!taskData.id) {
              setLinkedObject(null);
              break;
            }
            let detail: AlertTask | null = null;
            if (taskData.content_type === 'alerttask' && taskData.object_id) {
              const alertId = Number(taskData.object_id);
              if (!Number.isNaN(alertId)) {
                const resp = await AlertingAPI.getAlertTask(alertId);
                detail = resp.data as any;
              }
            }
            if (!detail) {
              const resp = await AlertingAPI.listAlertTasks({ task_id: taskData.id });
              const items = resp.data || [];
              const score = (item: AlertTask) => {
                let value = 0;
                if (item.affected_entities && item.affected_entities.length > 0) value += 3;
                if (item.related_references && item.related_references.length > 0) value += 2;
                if (item.investigation_notes) value += 2;
                if (item.resolution_steps) value += 2;
                if (item.postmortem_root_cause) value += 1;
                if (item.postmortem_prevention) value += 1;
                return value;
              };
              const sorted = [...items].sort((a, b) => {
                const scoreDiff = score(b) - score(a);
                if (scoreDiff !== 0) return scoreDiff;
                const aTime = Date.parse(a.updated_at || a.created_at || "");
                const bTime = Date.parse(b.updated_at || b.created_at || "");
                return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
              });
              detail = (sorted[0] as any) || null;
            }
            if (!detail) {
              try {
                const created = await AlertingAPI.createAlertTask({
                  task: taskData.id,
                  alert_type: 'spend_spike',
                  severity: 'medium',
                  status: 'open',
                } as any);
                detail = created.data as any;
              } catch (createError) {
                const fallback = await AlertingAPI.listAlertTasks({ task_id: taskData.id });
                const items = fallback.data || [];
                const score = (item: AlertTask) => {
                  let value = 0;
                  if (item.affected_entities && item.affected_entities.length > 0) value += 3;
                  if (item.related_references && item.related_references.length > 0) value += 2;
                  if (item.investigation_notes) value += 2;
                  if (item.resolution_steps) value += 2;
                  if (item.postmortem_root_cause) value += 1;
                  if (item.postmortem_prevention) value += 1;
                  return value;
                };
                const sorted = [...items].sort((a, b) => {
                  const scoreDiff = score(b) - score(a);
                  if (scoreDiff !== 0) return scoreDiff;
                  const aTime = Date.parse(a.updated_at || a.created_at || "");
                  const bTime = Date.parse(b.updated_at || b.created_at || "");
                  return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
                });
                detail = (sorted[0] as any) || null;
              }
            }
            setLinkedObject(detail);
          } catch (e) {
            console.error('Error loading alert task:', e);
            setLinkedObject(null);
          }
          break;
        case 'optimization':
          try {
            let opt: Optimization | null = null;
            // Try to get optimization via task.object_id
            if (taskData.object_id) {
              const optId = Number(taskData.object_id);
              if (!Number.isNaN(optId)) {
                const resp = await OptimizationAPI.getOptimization(optId);
                opt = resp.data as any;
              }
            }
            // Fallback: lookup by fetching all optimizations and filtering by task
            if (!opt && taskData.id) {
              const resp = await OptimizationAPI.listOptimizations({ task_id: taskData.id });
              const data: any = resp.data;
              const optimizations: Optimization[] = Array.isArray(data) ? data : (data?.results || []);
              opt = optimizations[0] || null;
            }
            setLinkedObject(opt);
          } catch (e) {
            console.error('Error loading optimization:', e);
            setLinkedObject(null);
          }
          break;
        default:
          setLinkedObject(null);
      }
    } catch (error) {
      console.error('Error loading linked object:', error);
      setLinkedObject(null);
    } finally {
      setLinkedObjectLoading(false);
    }
  };

  // Refresh linked object (for retrospective refresh after actions)
  const refreshLinkedObject = async () => {
    if (!task) return;
    // For experiment, scaling, alert, and optimization, we can refresh even without content_type/object_id
    // as they use task.id for lookup
    if (task.type === 'experiment' || task.type === 'scaling' || task.type === 'alert' || task.type === 'optimization') {
      await loadLinkedObject(task);
    } else if (task.content_type && task.object_id) {
      await loadLinkedObject(task);
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

  return (
    <ProtectedRoute>
      <Layout user={layoutUser} onUserAction={handleUserAction}>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-4">
                <Link 
                  href="/tasks"
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  ← Back to Tasks
                </Link>
                <h1 className="text-2xl font-bold text-gray-900">Task Details</h1>
              </div>
            </div>

            {/* Loading State */}
            {taskLoading && (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading task details...</p>
              </div>
            )}

            {/* Error State */}
            {taskError && (
              <div className="text-center py-12">
                <p className="text-red-600 mb-4">Error loading task: {taskError.message}</p>
                <button 
                  onClick={() => router.push('/tasks')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Back to Tasks
                </button>
              </div>
            )}

            {/* Task Content */}
            {!taskLoading && !taskError && task && (
              <div className="space-y-6">
                {/* Task Details */}
                <TaskDetail task={task} onTaskUpdate={(updatedTask) => setTask(updatedTask)} />

                <ProjectSummaryPanel
                  projectId={task.project?.id ?? task.project_id}
                  projectName={task.project?.name}
                />
                
                {/* Linked Object Details */}
                <LinkedObjectDetail 
                  task={task}
                  linkedObject={linkedObject}
                  linkedObjectLoading={linkedObjectLoading}
                  onRefreshLinkedObject={refreshLinkedObject}
                />

                {/* Attachments */}
                {task.id && <Attachments taskId={task.id} />}

                {/* Subtasks - Only show if task is not a subtask */}
                {task.id && !task.is_subtask && <Subtasks taskId={task.id} taskProjectId={task.project_id || task.project?.id} parentTaskIsSubtask={task.is_subtask} />}

                {/* Linked Work Items */}
                {task.id && <LinkedWorkItems taskId={task.id} />}

                {/* Task-level Comments (all task types) */}
                {task.id && <TaskCommentsSection taskId={task.id} />}
              </div>
            )}

            {/* Not Found State */}
            {!taskLoading && !taskError && !task && (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">Task not found</p>
                <button 
                  onClick={() => router.push('/tasks')}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Back to Tasks
                </button>
              </div>
            )}
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}
