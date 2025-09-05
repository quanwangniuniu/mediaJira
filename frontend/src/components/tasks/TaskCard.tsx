'use client';

import React from 'react';
import { TaskData } from '@/types/task';

interface TaskCardProps {
  task: TaskData;
  onClick?: (task: TaskData) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick }) => {
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

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString();
  };

  const handleClick = () => {
    if (onClick) {
      onClick(task);
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 cursor-pointer hover:shadow-md transition-shadow ${
        onClick ? 'hover:border-indigo-300' : ''
      }`}
      onClick={handleClick}
    >
      {/* Task Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {task.summary}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            #{task.id} • {task.project?.name || 'Unknown Project'}
          </p>
        </div>
        <div className="flex flex-col items-end space-y-1 ml-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
            {task.status?.replace('_', ' ')}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(task.type)}`}>
            {task.type}
          </span>
        </div>
      </div>

      {/* Task Description */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Task Details */}
      <div className="space-y-2 text-xs text-gray-500">
        <div className="flex justify-between">
          <span>Owner:</span>
          <span className="font-medium">{task.owner?.username || 'Unassigned'}</span>
        </div>
        <div className="flex justify-between">
            <span>Current Approver:</span>
            <span className="font-medium">{task.current_approver?.username || 'Unassigned'}</span>
          </div> 
        <div className="flex justify-between">
          <span>Due:</span>
          <span className="font-medium">{formatDate(task.due_date)}</span>
        </div>
      </div>

      {/* Linked Object Info */}
      {task.content_type && task.object_id && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Linked:</span>
            <span className="font-medium text-gray-700">
              {task.content_type} #{task.object_id}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCard;
