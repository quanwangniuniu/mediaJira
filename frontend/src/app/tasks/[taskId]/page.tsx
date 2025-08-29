'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import useAuth from '@/hooks/useAuth';
import { useTaskData } from '@/hooks/useTaskData';
import { useBudgetData } from '@/hooks/useBudgetData';
import { TaskData } from '@/types/task';
import { BudgetRequestData } from '@/lib/api/budgetApi';
import Link from 'next/link';

// Task Detail Components
interface TaskDetailProps {
  task: TaskData;
  linkedObject: any;
  linkedObjectLoading: boolean;
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
const LinkedObjectDetail = ({ task, linkedObject, linkedObjectLoading }: TaskDetailProps) => {
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Asset Details</h3>
          <p className="text-gray-500">Asset detail component not implemented yet.</p>
        </div>
      );
    case 'retrospective':
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Retrospective Details</h3>
          <p className="text-gray-500">Retrospective detail component not implemented yet.</p>
        </div>
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

// Main Task Detail Component
const TaskDetail = ({ task }: { task: TaskData }) => {
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
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{task.summary}</h1>
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

      {task.description && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <p className="text-gray-900 bg-gray-50 p-4 rounded-md">
            {task.description}
          </p>
        </div>
      )}
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
        }
      } catch (error) {
        console.error('Error loading task:', error);
      }
    };

    loadTask();
  }, [taskId, fetchTask]);

  // Load linked object based on task type
  const loadLinkedObject = async (taskData: TaskData) => {
    if (!taskData.content_type || !taskData.object_id) return;

    setLinkedObjectLoading(true);
    try {
      switch (taskData.type) {
        case 'budget':
          const budgetRequest = await getBudgetRequest(Number(taskData.object_id));
          setLinkedObject(budgetRequest);
          break;
        case 'asset':
          // TODO: Implement asset loading
          setLinkedObject(null);
          break;
        case 'retrospective':
          // TODO: Implement retrospective loading
          setLinkedObject(null);
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
                <TaskDetail task={task} />
                
                {/* Linked Object Details */}
                <LinkedObjectDetail 
                  task={task}
                  linkedObject={linkedObject}
                  linkedObjectLoading={linkedObjectLoading}
                />
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


