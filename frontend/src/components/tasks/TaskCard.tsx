'use client';

import React, { useState, useEffect } from 'react';
import { TaskData, TaskAttachment } from '@/types/task';
import { ReportData } from '@/types/report';
import ReportActions from '@/components/tasks/ReportActions';
import RetrospectiveDetail from '@/components/tasks/RetrospectiveDetail';
import AssetDetail from '@/components/tasks/AssetDetail';
import { RetrospectiveAPI, RetrospectiveTaskData } from '@/lib/api/retrospectiveApi';
import { TaskAPI } from '@/lib/api/taskApi';


interface TaskCardProps {
  task: TaskData & { report?: ReportData };
  onClick?: (task: TaskData) => void;
  onDelete?: (taskId: number) => void; // Callback when task is deleted
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onDelete }) => {
  const [retrospective, setRetrospective] = useState<RetrospectiveTaskData | null>(null);
  const [retrospectiveLoading, setRetrospectiveLoading] = useState(false);
  const [retrospectiveError, setRetrospectiveError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [attachmentsLoading, setAttachmentsLoading] = useState(false);

  // Function to fetch retrospective data
  const fetchRetrospective = async () => {
    if (task.type === 'retrospective' && task.object_id) {
      setRetrospectiveLoading(true);
      setRetrospectiveError(false);
      try {
        const response = await RetrospectiveAPI.getRetrospective(task.object_id);
        setRetrospective(response.data);
      } catch (error) {
        console.error('Failed to fetch retrospective:', error);
        setRetrospectiveError(true);
      } finally {
        setRetrospectiveLoading(false);
      }
    }
  };

  // Fetch retrospective data if task type is retrospective
  useEffect(() => {
    fetchRetrospective();
  }, [task.type, task.object_id]);

  // Fetch attachments for the task
  useEffect(() => {
    const fetchAttachments = async () => {
      if (!task.id) return;
      try {
        setAttachmentsLoading(true);
        const data = await TaskAPI.getAttachments(task.id);
        setAttachments(data);
      } catch (error) {
        console.error('Failed to fetch attachments:', error);
        // Don't show error in card view, just fail silently
      } finally {
        setAttachmentsLoading(false);
      }
    };
    fetchAttachments();
  }, [task.id]);

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
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString();
  };

  // Format UUID for display (show first 8 characters for readability)
  const formatObjectId = (objectId?: string) => {
    if (!objectId) return '';
    if (objectId.length >= 36) {
      return objectId.substring(0, 8) + '...';
    }
    return objectId;
  };

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on action buttons
    const target = e.target as HTMLElement;
    if (target.closest('[data-action]')) {
      return;
    }
    
    if (onClick) {
      onClick(task);
    }
  };

  // Handle delete task (for retrospective and asset tasks)
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!task.id) {
      alert('Cannot delete task: Task ID is missing');
      return;
    }
    
    const taskTypeLabel = task.type === 'retrospective' ? 'retrospective task' : 'asset task';
    const linkedObjectLabel = task.type === 'retrospective' ? 'retrospective object' : 'asset object';

    const confirmed = window.confirm(
      `Are you sure you want to delete ${taskTypeLabel} #${task.id} "${task.summary}"?\n\n` +
      `This will also delete the linked ${linkedObjectLabel} if it exists.\n` +
      `This action cannot be undone.`
    );
    
    if (!confirmed) return;

    try {
      setDeleting(true);
      await TaskAPI.deleteTask(task.id);
      console.log('Task deleted successfully:', task.id);
      
      // Call onDelete callback if provided
      if (onDelete) {
        onDelete(task.id);
      } else {
        // If no callback, reload the page
        window.location.reload();
      }
    } catch (error: any) {
      console.error('Failed to delete task:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Failed to delete task';
      alert(`Failed to delete task: ${errorMessage}`);
    } finally {
      setDeleting(false);
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
          {/* Delete button - for retrospective and asset tasks */}
          {(task.type === 'retrospective' || task.type === 'asset') && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`px-2 py-1 text-xs rounded ${
                deleting 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              title={`Delete ${task.type} task`}
              data-action
            >
              {deleting ? 'Deleting...' : '×'}
            </button>
          )}
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

      {/* Attachments Info */}
      {attachments.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Attachments:</span>
            <div className="flex items-center space-x-1">
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
              <span className="font-medium text-gray-700">{attachments.length}</span>
            </div>
          </div>
          {/* Show first attachment preview if it's an image */}
          {attachments.length > 0 && attachments[0] && (
            <div className="mt-2 flex items-center space-x-2">
              {attachments[0].content_type?.startsWith('image/') && (
                <div className="w-12 h-12 rounded border border-gray-300 overflow-hidden bg-gray-100 flex-shrink-0">
                  <img
                    src={attachments[0].file}
                    alt={attachments[0].original_filename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-gray-600 truncate">
                  {attachments[0].original_filename}
                </div>
                {attachments.length > 1 && (
                  <div className="text-xs text-gray-500">
                    +{attachments.length - 1} more
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Linked Object Info */}
      {task.content_type && task.object_id && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Linked:</span>
            <span className="font-medium text-gray-700">
              {task.content_type} #{formatObjectId(task.object_id)}
            </span>
          </div>
        </div>
      )}

      {task.type === 'report' && (
        <ReportActions reportId={String(task.object_id || task.linked_object?.id || '1')} />
      )}

      {/* Retrospective Metadata */}
      {task.type === 'retrospective' && (
        <RetrospectiveDetail 
          retrospective={retrospective || undefined} 
          loading={retrospectiveLoading}
          compact={true}
          onRefresh={fetchRetrospective}
        />
      )}

      {/* Asset Metadata */}
      {task.type === 'asset' && task.id && (
        <AssetDetail 
          taskId={task.id}
          assetId={task.object_id || null}
          compact={true}
          hideComments={true}
        />
      )}

    </div>
  );
};

export default TaskCard;
