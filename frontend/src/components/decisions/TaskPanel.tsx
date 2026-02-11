'use client';

import { useCallback, useEffect, useState } from 'react';
import DecisionTaskCreateModal from '@/components/decisions/DecisionTaskCreateModal';
import { TaskAPI } from '@/lib/api/taskApi';
import type { TaskData } from '@/types/task';

interface TaskPanelProps {
  decisionId: number;
  decisionTitle: string;
  selectedOptionText?: string | null;
  decisionLink: string;
  canCreate?: boolean;
  projectId?: number | null;
  projectName?: string | null;
}

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString();
};

const formatOwner = (task: TaskData) => {
  if (!task.owner) return '—';
  return task.owner.username || task.owner.email || `User #${task.owner.id}`;
};

const parseTasksResponse = (response: any): TaskData[] => {
  if (!response) return [];
  const data = response.data ?? response;
  const items = Array.isArray(data) ? data : data.results || data.items || [];
  return Array.isArray(items) ? (items as TaskData[]) : [];
};

const TaskPanel = ({
  decisionId,
  decisionTitle,
  selectedOptionText,
  decisionLink,
  canCreate = false,
  projectId,
  projectName,
}: TaskPanelProps) => {
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchTasks = useCallback(async () => {
    if (!decisionId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await TaskAPI.getTasks({
        content_type: 'decision',
        object_id: String(decisionId),
        ...(projectId ? { project_id: projectId } : {}),
      });
      const items = parseTasksResponse(response);
      setTasks(items);
    } catch (err) {
      console.error('Failed to load decision tasks:', err);
      setError('Failed to load tasks.');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [decisionId, projectId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  return (
    <div className="h-full overflow-y-auto border-l border-gray-200 bg-gray-50 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Tasks</h3>
          <p className="mt-1 text-xs text-gray-500">Linked tasks for this decision.</p>
        </div>
        {canCreate ? (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Create Task
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-4 text-xs text-gray-500">Loading tasks...</div>
      ) : null}

      {!loading && error ? (
        <div className="mt-4 text-xs text-rose-600">{error}</div>
      ) : null}

      {!loading && !error && tasks.length === 0 ? (
        <div className="mt-4 text-xs text-gray-500">No tasks linked yet.</div>
      ) : null}

      {!loading && !error && tasks.length > 0 ? (
        <div className="mt-4 space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-gray-700">
                  {task.status || '—'}
                </span>
                <span className="text-gray-500">Due {formatDate(task.due_date)}</span>
              </div>
              <div className="mt-1 text-gray-500">Owner: {formatOwner(task)}</div>
            </div>
          ))}
        </div>
      ) : null}
      {canCreate ? (
        <DecisionTaskCreateModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          decisionId={decisionId}
          decisionTitle={decisionTitle}
          selectedOptionText={selectedOptionText}
          decisionLink={decisionLink}
          projectId={projectId}
          projectName={projectName}
          onCreated={fetchTasks}
        />
      ) : null}
    </div>
  );
};

export default TaskPanel;
