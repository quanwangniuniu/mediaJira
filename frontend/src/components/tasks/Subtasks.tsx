'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TaskAPI } from '@/lib/api/taskApi';
import { TaskData } from '@/types/task';
import SubtaskModal from './SubtaskModal';

interface SubtasksProps {
  taskId: number;
  taskProjectId?: number;
  parentTaskIsSubtask?: boolean;
}

export default function Subtasks({ taskId, taskProjectId, parentTaskIsSubtask }: SubtasksProps) {
  const router = useRouter();
  const [subtasks, setSubtasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadSubtasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TaskAPI.getSubtasks(taskId);
      setSubtasks(data);
    } catch (e: any) {
      console.error('Failed to load subtasks:', e);
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        'Failed to load subtasks.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!taskId) return;
    loadSubtasks();
  }, [taskId]);

  const handleSubtaskAdded = () => {
    loadSubtasks();
    setIsModalOpen(false);
  };

  const handleTaskClick = (subtaskId: number) => {
    router.push(`/tasks/${subtaskId}`);
  };

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Subtasks</h3>
        {!parentTaskIsSubtask && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            aria-label="Add subtask"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </button>
        )}
        {parentTaskIsSubtask && (
          <div className="text-xs text-gray-500 italic">
            Subtasks cannot have subtasks
          </div>
        )}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading subtasks...</span>
        </div>
      )}

      {error && !loading && (
        <div className="text-sm text-red-600 py-4">{error}</div>
      )}

      {!loading && !error && subtasks.length === 0 && (
        <div className="text-sm text-gray-500 py-4">No subtasks yet.</div>
      )}

      {!loading && !error && subtasks.length > 0 && (
        <div className="space-y-2">
          {subtasks.map((subtask) => (
            <div
              key={subtask.id}
              onClick={() => subtask.id && handleTaskClick(subtask.id)}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center space-x-3 flex-1">
                <div className="flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={true}
                    readOnly
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900">
                      {subtask.summary || `Task #${subtask.id}`}
                    </span>
                    {subtask.id && (
                      <span className="text-xs text-gray-500">
                        #{subtask.id}
                      </span>
                    )}
                  </div>
                  {subtask.owner && (
                    <div className="mt-1 flex items-center space-x-1">
                      <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                        <span className="text-xs text-gray-600">
                          {subtask.owner.username?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {subtask.owner.username || subtask.owner.email || `User #${subtask.owner.id}`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Only render SubtaskModal if parent task is not a subtask */}
      {!parentTaskIsSubtask && (
        <SubtaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubtaskAdded={handleSubtaskAdded}
          parentTaskId={taskId}
          parentTaskProjectId={taskProjectId}
          parentTaskIsSubtask={parentTaskIsSubtask}
        />
      )}
    </section>
  );
}

