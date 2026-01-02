'use client';

import React, { FC, MouseEvent } from 'react';
import { TaskData } from '@/types/task';
import { useRouter } from 'next/navigation';

interface TaskListViewProps {
  tasks: TaskData[];
  onTaskClick?: (task: TaskData) => void;
  onDelete?: (taskId: number) => void;
}

const TaskListView: FC<TaskListViewProps> = ({ tasks, onTaskClick, onDelete }) => {
  const router = useRouter();

  // Sort tasks by type, then by ID
  const sortedTasks = [...tasks].sort((a, b) => {
    // First sort by type
    const typeOrder = ['budget', 'asset', 'retrospective', 'report'];
    const typeA = typeOrder.indexOf(a.type || '');
    const typeB = typeOrder.indexOf(b.type || '');
    
    if (typeA !== typeB) {
      return typeA - typeB;
    }
    
    // Then sort by ID
    return (a.id || 0) - (b.id || 0);
  });

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
      case 'report':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleRowClick = (task: TaskData) => {
    if (onTaskClick) {
      onTaskClick(task);
    } else {
      router.push(`/tasks/${task.id}`);
    }
  };

  const handleDelete = async (e: MouseEvent, task: TaskData) => {
    e.stopPropagation();
    
    if (!task.id) return;
    
    const confirmed = window.confirm(
      `Are you sure you want to delete task #${task.id} "${task.summary}"?\n\nThis action cannot be undone.`
    );
    
    if (!confirmed || !onDelete) return;

    try {
      await onDelete(task.id);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  if (sortedTasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>No tasks found</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Key
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Summary
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Assignee
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Due Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                Project
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedTasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => handleRowClick(task)}
                className="hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                  {task.id ? `TASK-${task.id}` : '-'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900 max-w-md">
                  <div className="truncate" title={task.summary}>
                    {task.summary || '-'}
                  </div>
                  {task.description && (
                    <div className="text-xs text-gray-500 mt-1 truncate" title={task.description}>
                      {task.description}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(task.type)}`}>
                    {task.type || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status?.replace('_', ' ') || '-'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {task.owner?.username || 'Unassigned'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(task.due_date)}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                  {task.project?.name || '-'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                  {task.type === 'retrospective' && onDelete && (
                    <button
                      onClick={(e) => handleDelete(e, task)}
                      className="text-red-600 hover:text-red-900 px-2 py-1 rounded hover:bg-red-50"
                      title="Delete task"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TaskListView;

