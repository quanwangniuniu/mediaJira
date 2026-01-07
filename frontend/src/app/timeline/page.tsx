'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useTaskData } from '@/hooks/useTaskData';
import TimelineView from '@/components/tasks/timeline/TimelineView';
import Modal from '@/components/ui/Modal';
import NewTaskForm from '@/components/tasks/NewTaskForm';
import { useFormValidation } from '@/hooks/useFormValidation';
import { CreateTaskData } from '@/types/task';
import { TaskAPI } from '@/lib/api/taskApi';
import toast from 'react-hot-toast';

function TimelinePageContent() {
  const searchParams = useSearchParams();
  const projectIdParam = searchParams.get('project_id');
  const projectId = projectIdParam ? Number(projectIdParam) : null;

  const { tasks, loading, error, fetchTasks, reloadTasks } = useTaskData();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [taskData, setTaskData] = useState<Partial<CreateTaskData>>({
    project_id: null,
    type: '',
    summary: '',
    description: '',
  });
  const taskValidation = useFormValidation<CreateTaskData>(taskData);

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

  const handleCreateTask = (projectId: number | null) => {
    setSelectedProjectId(projectId);
    setTaskData({
      project_id: projectId,
      type: '',
      summary: '',
      description: '',
    });
    setCreateModalOpen(true);
  };

  const handleTaskDataChange = (data: Partial<CreateTaskData>) => {
    setTaskData((prev) => ({ ...prev, ...data }));
  };

  const handleSubmitTask = async () => {
    if (!taskData.project_id || !taskData.type || !taskData.summary) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await TaskAPI.createTask(taskData as CreateTaskData);
      toast.success('Task created successfully');
      setCreateModalOpen(false);
      if (reloadTasks) {
        await reloadTasks();
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.detail || 'Failed to create task');
    }
  };

  return (
    <Layout>
      <div className="px-6 py-6">
        <div className="mb-4">
          <h1 className="text-2xl font-semibold text-gray-900">Timeline</h1>
          <p className="text-sm text-gray-500">Long stories grouped by project.</p>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading tasks...</p>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-red-600">Error loading tasks.</p>
          </div>
        )}

        {!loading && !error && (
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
              className="px-4 py-2 rounded text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Create Task
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

