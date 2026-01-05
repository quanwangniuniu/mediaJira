'use client';

import { useState, useEffect, useRef } from 'react';
import Modal from '@/components/ui/Modal';
import { TaskAPI } from '@/lib/api/taskApi';
import { TaskData } from '@/types/task';

interface LinkTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLinkAdded: () => void;
  sourceTaskId: number;
}

const RELATIONSHIP_TYPES = [
  { value: 'causes', label: 'Causes' },
  { value: 'is_caused_by', label: 'Is Caused By' },
  { value: 'blocks', label: 'Blocks' },
  { value: 'is_blocked_by', label: 'Is Blocked By' },
  { value: 'clones', label: 'Clones' },
  { value: 'is_cloned_by', label: 'Is Cloned By' },
  { value: 'relates_to', label: 'Relates To' },
] as const;

// Map reverse relationships to forward relationships for API
const REVERSE_RELATIONSHIP_MAP: Record<string, string> = {
  'is_caused_by': 'causes',
  'is_blocked_by': 'blocks',
  'is_cloned_by': 'clones',
};

export default function LinkTaskModal({
  isOpen,
  onClose,
  onLinkAdded,
  sourceTaskId,
}: LinkTaskModalProps) {
  const [relationshipType, setRelationshipType] = useState<string>('blocks');
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
      setSearchQuery('');
      setSelectedTaskId(null);
      setTasks([]);
      setError(null);
      setRelationshipType('blocks');
    }
  }, [isOpen]);

  // Search tasks when query changes
  useEffect(() => {
    if (!isOpen) return;

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
        const response = await TaskAPI.getTasks();
        const allTasks = response.data.results || response.data || [];
        
        // Filter tasks: exclude current task and match search query
        const filtered = allTasks.filter((task: TaskData) => {
          if (task.id === sourceTaskId) return false;
          const query = searchQuery.toLowerCase();
          const summary = (task.summary || '').toLowerCase();
          const taskId = task.id?.toString() || '';
          return summary.includes(query) || taskId.includes(query);
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
  }, [searchQuery, isOpen, sourceTaskId]);

  const handleSubmit = async () => {
    if (!selectedTaskId) {
      setError('Please select a task to link.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      // Handle reverse relationships: swap source and target, use forward relationship type
      const isReverse = relationshipType.startsWith('is_');
      let actualSourceTaskId = sourceTaskId;
      let actualTargetTaskId = selectedTaskId;
      let actualRelationshipType = relationshipType;
      
      if (isReverse) {
        // For reverse relationships, swap source and target
        actualSourceTaskId = selectedTaskId;
        actualTargetTaskId = sourceTaskId;
        // Map reverse relationship to forward relationship
        actualRelationshipType = REVERSE_RELATIONSHIP_MAP[relationshipType] || relationshipType;
      }
      
      await TaskAPI.addRelation(actualSourceTaskId, {
        target_task_id: actualTargetTaskId,
        relationship_type: actualRelationshipType as 'causes' | 'blocks' | 'clones' | 'relates_to',
      });
      onLinkAdded();
    } catch (e: any) {
      console.error('Failed to add relation:', e);
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Failed to link task. Please try again.';
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

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div 
        className="bg-white rounded-lg shadow-xl w-[500px] max-w-[90vw] mx-auto max-h-[90vh] flex flex-col overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 flex-1 overflow-y-auto min-h-0">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Link Work Item
          </h2>

          {/* Relationship Type Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship Type
            </label>
            <select
              value={relationshipType}
              onChange={(e) => setRelationshipType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
            >
              {RELATIONSHIP_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Search Input */}
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
        </div>

        {/* Actions - 固定在底部 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedTaskId || submitting}
            className={`px-4 py-2 text-sm font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors ${
              !selectedTaskId || submitting
                ? 'bg-indigo-300 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {submitting ? 'Linking...' : 'Link'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

