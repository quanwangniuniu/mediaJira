'use client';

import React, { useState, useEffect } from 'react';
import { TaskData } from '@/types/task';
import { ReportData } from '@/types/report';
import RetrospectiveDetail from '@/components/tasks/RetrospectiveDetail';
import AssetDetail from '@/components/tasks/AssetDetail';
import { RetrospectiveAPI, RetrospectiveTaskData } from '@/lib/api/retrospectiveApi';
import { TaskAPI } from '@/lib/api/taskApi';
import { Clock, Calendar, FileText, Lock } from 'lucide-react';


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
        setRetrospectiveError(false);
        setRetrospective({
          id: task.object_id || `mock-${task.id}`,
          campaign: task.project_id?.toString?.() || '',
          campaign_name: task.project?.name || '',
          status: 'scheduled',
          status_display: 'Scheduled',
          scheduled_at: task.due_date || new Date().toISOString(),
          created_by: task.owner?.username || 'Demo',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          insight_count: 0,
          kpi_count: 0,
        } as RetrospectiveTaskData);
      } finally {
        setRetrospectiveLoading(false);
      }
    }
  };

  // Fetch retrospective data if task type is retrospective
  useEffect(() => {
    fetchRetrospective();
  }, [task.type, task.object_id]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'UNDER_REVIEW':
        return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
      case 'SUBMITTED':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'REJECTED':
        return 'bg-red-50 text-red-700 border border-red-200';
      case 'DRAFT':
        return 'bg-gray-50 text-gray-700 border border-gray-200';
      case 'LOCKED':
        return 'bg-gray-50 text-gray-700 border border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'UNDER_REVIEW':
        return 'Pending';
      default:
        return status?.replace('_', ' ') || 'Unknown';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'LOCKED':
        return <Lock className="w-3 h-3" />;
      case 'UNDER_REVIEW':
        return <Clock className="w-3 h-3" />;
      default:
        return <FileText className="w-3 h-3" />;
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
    const date = new Date(dateString);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    return `${day} ${month}`;
  };

  const formatDateShort = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.getDate();
  };

  const formatMonthShort = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  const AssigneeIcon = () => (
    <svg
      className="w-5 h-5 text-gray-800"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8"></circle>
      <path d="M7.5 11l2.5 2.5L14.5 9"></path>
      <path d="M17 13v4"></path>
      <path d="M15 15h4"></path>
    </svg>
  );

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

  // Handle delete task (only for retrospective tasks)
  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!task.id) {
      alert('Cannot delete task: Task ID is missing');
      return;
    }
    
    const confirmed = window.confirm(
      `Are you sure you want to delete retrospective task #${task.id} "${task.summary}"?\n\n` +
      `This will also delete the linked retrospective object if it exists.\n` +
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

  const cardClassName = [
    'bg-white rounded-2xl shadow-sm border border-gray-200 px-3.5 py-3.5 cursor-pointer hover:shadow-md transition-shadow relative flex flex-col',
    onClick ? 'hover:border-indigo-300' : '',
  ].join(' ').trim();

  return (
    <div 
      className={cardClassName}
      style={{ minHeight: '190px' }}
      onClick={handleClick}
    >
      {/* Avatar and Name - Top Left */}
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-semibold text-blue-700">
            {(task.owner?.username || task.current_approver?.username || 'U').charAt(0).toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-medium text-gray-900">
          {task.owner?.username || task.current_approver?.username || 'Unassigned'}
        </span>
      </div>

      {/* Status Badge - Top Right */}
      {task.type !== 'report' && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(task.status)}`}>
            {getStatusIcon(task.status)}
            {getStatusLabel(task.status)}
          </span>
        </div>
      )}

      {/* Task Description */}
      <div className="pr-12 mb-1">
        <h3 className="text-sm font-normal text-gray-900 leading-tight">
          {task.summary}
        </h3>
      </div>

      {/* Horizontal Line - Above Description */}
      <div className="border-t border-gray-100 my-0.5"></div>

      {/* Calculation Info (if available) */}
      {task.description && (
        <p className="text-xs text-gray-600 mb-1 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Bottom Info Row */}
      <div className="flex flex-col gap-1.5 mt-auto pt-0">
        <div className="flex items-center gap-1.5">
          <AssigneeIcon />
          <span className="text-[11px] text-gray-700 font-medium">
            {task.owner?.username || task.current_approver?.username || 'Unassigned'}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 pl-0.5">
            {task.due_date && (
              <div className="flex items-center gap-1 text-gray-900">
                <Clock className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span className="text-xs font-medium">
                  {(() => {
                    const dueDate = new Date(task.due_date);
                    const startDate = new Date(dueDate);
                    startDate.setDate(startDate.getDate() - 7);
                    return formatDate(startDate.toISOString());
                  })()}
                </span>
              </div>
            )}

            {task.due_date && (
              <div className="flex items-center gap-1 text-gray-900">
                <Calendar className="w-3.5 h-3.5" strokeWidth={1.8} />
                <span className="text-xs font-medium">{formatDate(task.due_date)}</span>
              </div>
            )}
          </div>

          {task.type === 'budget' && (
            <button
              className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[11px] rounded-md hover:bg-gray-200 transition-colors border border-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick(task);
              }}
              data-action
            >
              Budgetrequest
            </button>
          )}
          {task.type === 'asset' && (
            <button
              className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[11px] rounded-md hover:bg-gray-200 transition-colors border border-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick(task);
              }}
              data-action
            >
              Asset Request
            </button>
          )}
          {task.type === 'retrospective' && (
            <button
              className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[11px] rounded-md hover:bg-gray-200 transition-colors border border-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick(task);
              }}
              data-action
            >
              Retrospective
            </button>
          )}
          {task.type === 'report' && (
            <button
              className="px-2 py-0.5 bg-gray-100 text-gray-700 text-[11px] rounded-md hover:bg-gray-200 transition-colors border border-gray-300"
              onClick={(e) => {
                e.stopPropagation();
                if (onClick) onClick(task);
              }}
              data-action
            >
              Report Task
            </button>
          )}
        </div>
      </div>

      {/* Delete button - only for retrospective tasks */}
      {task.type === 'retrospective' && false && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`absolute top-2 left-2 px-2 py-1 text-xs rounded ${
            deleting 
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
          title="Delete retrospective task"
          data-action
        >
          {deleting ? 'Deleting...' : '×'}
        </button>
      )}

      {/* Linked Object Info - Hidden in new design */}
      {task.content_type && task.object_id && false && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between text-xs">
            <span className="text-gray-500">Linked:</span>
            <span className="font-medium text-gray-700">
              {task.content_type} #{formatObjectId(task.object_id)}
            </span>
          </div>
        </div>
      )}

      {/* Retrospective Metadata */}
      {task.type === 'retrospective' && false && (
        <div className="mt-3">
          <RetrospectiveDetail 
            retrospective={retrospective || undefined} 
            loading={retrospectiveLoading}
            compact={true}
            onRefresh={fetchRetrospective}
          />
        </div>
      )}

      {/* Asset Metadata */}
      {task.type === 'asset' && task.id && (
        <AssetDetail 
          taskId={task.id}
          assetId={task.object_id || null}
          compact={true}
        />
      )}

    </div>
  );
};

export default TaskCard;
