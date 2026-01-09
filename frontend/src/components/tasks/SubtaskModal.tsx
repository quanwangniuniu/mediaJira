'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { TaskAPI } from '@/lib/api/taskApi';
import { TaskData, CreateTaskData } from '@/types/task';

interface SubtaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubtaskAdded: () => void;
  parentTaskId: number;
  parentTaskProjectId?: number;
  parentTaskIsSubtask?: boolean;
}

const TASK_TYPES = [
  { value: 'budget', label: 'Budget' },
  { value: 'asset', label: 'Asset' },
  { value: 'retrospective', label: 'Retrospective' },
  { value: 'report', label: 'Report' },
] as const;

export default function SubtaskModal({
  isOpen,
  onClose,
  onSubtaskAdded,
  parentTaskId,
  parentTaskProjectId,
  parentTaskIsSubtask,
}: SubtaskModalProps) {
  const [mode, setMode] = useState<'create' | 'choose'>('create');
  const [summary, setSummary] = useState('');
  const [taskType, setTaskType] = useState<string>('budget');
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setMode('create');
      setSummary('');
      setTaskType('budget');
      setSearchQuery('');
      setSelectedTaskId(null);
      setTasks([]);
      setError(null);
    }
  }, [isOpen]);

  // Search tasks when query changes (in choose mode)
  useEffect(() => {
    if (!isOpen || mode !== 'choose') return;

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if query is too short
    if (searchQuery.trim().length < 2) {
      setTasks([]);
      setSelectedTaskId(null);
      return;
    }

    // Debounce search
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearching(true);
        setError(null);
        // Get all tasks including subtasks - pass include_subtasks=true to get all tasks
        const response = await TaskAPI.getTasks({ include_subtasks: true });
        const allTasks = response.data.results || response.data || [];
        
        // Filter tasks: exclude only the current parent task itself
        // Allow selecting all other tasks, including subtasks of other parents
        const filtered = allTasks.filter((task: TaskData) => {
          if (task.id === parentTaskId) return false;
          const query = searchQuery.toLowerCase();
          const taskSummary = (task.summary || '').toLowerCase();
          const taskId = task.id?.toString() || '';
          return taskSummary.includes(query) || taskId.includes(query);
        });
        
        setTasks(filtered);
      } catch (e: any) {
        console.error('Failed to search tasks:', e);
        setError('Failed to search tasks. Please try again.');
        setTasks([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, isOpen, mode, parentTaskId]);

  const handleCreateSubmit = async () => {
    if (!summary.trim()) {
      setError('Please enter a task summary.');
      return;
    }

    if (!parentTaskProjectId) {
      setError('Parent task project ID is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Create new task
      const taskData: CreateTaskData = {
        project_id: parentTaskProjectId,
        type: taskType as 'budget' | 'asset' | 'retrospective' | 'report',
        summary: summary.trim(),
      };

      const createResponse = await TaskAPI.createTask(taskData);
      const newTask = createResponse.data as TaskData;

      if (!newTask.id) {
        throw new Error('Failed to create task: no ID returned');
      }

      // Add as subtask
      await TaskAPI.addSubtask(parentTaskId, newTask.id);
      onSubtaskAdded();
    } catch (e: any) {
      console.error('Failed to create and add subtask:', e);
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Failed to create subtask. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChooseSubmit = async () => {
    if (!selectedTaskId) {
      setError('Please select a task to add as subtask.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      await TaskAPI.addSubtask(parentTaskId, selectedTaskId);
      onSubtaskAdded();
    } catch (e: any) {
      console.error('Failed to add subtask:', e);
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Failed to add subtask. Please try again.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleTaskSelect = (taskId: number) => {
    setSelectedTaskId(taskId);
    setError(null);
  };

  if (!isOpen) return null;

  // Check if parent task is a subtask - if so, show error and disable functionality
  if (parentTaskIsSubtask) {
    return (
      <Modal isOpen={isOpen} onClose={onClose}>
        <div 
          className="bg-white rounded-lg shadow-xl w-[500px] max-w-[90vw] mx-auto max-h-[90vh] flex flex-col overflow-hidden" 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="p-6 flex-1 overflow-y-auto min-h-0">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Subtasks
            </h2>
            <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded border border-red-200">
              A subtask cannot have subtasks. Only 1 level of nesting is allowed.
            </div>
            <div className="flex items-center justify-end mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-[500px] max-w-[90vw] mx-auto max-h-[90vh] flex flex-col overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex-1 overflow-y-auto min-h-0">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Subtasks
          </h2>

          {mode === 'create' ? (
            <>
              {/* Create Mode: Input with type selector and submit button */}
              <div className="mb-4">
                <div className="flex items-center border-2 border-indigo-500 rounded-md focus-within:ring-2 focus-within:ring-indigo-500">
                  <input
                    type="text"
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && summary.trim() && !submitting) {
                        handleCreateSubmit();
                      }
                    }}
                    placeholder="What needs to be done?"
                    className="flex-1 px-3 py-2 border-0 rounded-l-md focus:outline-none text-sm"
                  />
                  <div className="flex items-center border-l border-gray-300">
                    <select
                      value={taskType}
                      onChange={(e) => setTaskType(e.target.value)}
                      className="px-3 py-2 border-0 bg-transparent focus:outline-none text-sm text-gray-700 cursor-pointer"
                    >
                      {TASK_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <svg
                      className="w-4 h-4 text-gray-500 mr-2 pointer-events-none"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>
                  <button
                    onClick={handleCreateSubmit}
                    disabled={!summary.trim() || submitting}
                    className="px-3 py-2 text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Create subtask"
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
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded break-words overflow-wrap-anywhere">
                  {error}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setMode('choose')}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none"
                >
                  <svg
                    className="w-4 h-4 mr-1"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Choose existing
                </button>
                <button
                  onClick={onClose}
                  className="text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Choose Mode: Search and select */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Task
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Type, search or paste URL"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm box-border"
                />
                {searching && (
                  <div className="mt-2 text-sm text-gray-500">Searching...</div>
                )}
              </div>

              {searchQuery.trim().length >= 2 && !searching && tasks.length > 0 && (
                <div className="mb-4 max-h-48 overflow-y-auto border border-gray-200 rounded-md">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleTaskSelect(task.id!)}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 border-b border-gray-200 last:border-b-0 transition-colors ${
                        selectedTaskId === task.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {task.summary || `Task #${task.id}`}
                          </div>
                          {task.id && (
                            <div className="text-xs text-gray-500">#{task.id}</div>
                          )}
                        </div>
                        {selectedTaskId === task.id && (
                          <svg
                            className="w-5 h-5 text-indigo-600 flex-shrink-0 ml-2"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery.trim().length >= 2 && !searching && tasks.length === 0 && (
                <div className="mb-4 text-sm text-gray-500">
                  No tasks found matching your search.
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 text-sm text-red-600 bg-red-50 p-2 rounded break-words overflow-wrap-anywhere">
                  {error}
                </div>
              )}

              {/* Selected Task Display */}
              {selectedTaskId && (
                <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-md">
                  <div className="text-sm font-medium text-indigo-900 truncate">
                    Selected: Task #{selectedTaskId}
                  </div>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center justify-between mt-4">
                <button
                  onClick={() => setMode('create')}
                  className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 focus:outline-none"
                >
                  <svg
                    className="w-4 h-4 mr-1"
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
                  Create new
                </button>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={onClose}
                    className="text-sm text-gray-600 hover:text-gray-800 focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleChooseSubmit}
                    disabled={!selectedTaskId || submitting}
                    className={`px-4 py-2 text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${
                      !selectedTaskId || submitting
                        ? 'bg-indigo-300 cursor-not-allowed'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    {submitting ? 'Adding...' : 'Add'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

