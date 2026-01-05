'use client';

import { useState, useEffect } from 'react';
import { TaskAPI } from '@/lib/api/taskApi';
import { TaskRelationsResponse, TaskRelationItem } from '@/types/task';
import LinkTaskModal from './LinkTaskModal';

interface LinkedWorkItemsProps {
  taskId: number;
}

// Relationship type labels for display
const RELATIONSHIP_LABELS: Record<string, string> = {
  causes: 'Causes',
  is_caused_by: 'Is Caused By',
  blocks: 'Blocks',
  is_blocked_by: 'Is Blocked By',
  clones: 'Clones',
  is_cloned_by: 'Is Cloned By',
  relates_to: 'Relates To',
};

export default function LinkedWorkItems({ taskId }: LinkedWorkItemsProps) {
  const [relations, setRelations] = useState<TaskRelationsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deletingRelationId, setDeletingRelationId] = useState<number | null>(null);

  const loadRelations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await TaskAPI.getRelations(taskId);
      setRelations(data);
    } catch (e: any) {
      console.error('Failed to load task relations:', e);
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        'Failed to load linked work items.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!taskId) return;
    loadRelations();
  }, [taskId]);

  const handleDelete = async (relationId: number) => {
    if (!confirm('Are you sure you want to remove this link?')) {
      return;
    }

    try {
      setDeletingRelationId(relationId);
      await TaskAPI.deleteRelation(taskId, relationId);
      await loadRelations(); // Reload relations after deletion
    } catch (e: any) {
      console.error('Failed to delete relation:', e);
      const message =
        e?.response?.data?.detail ||
        e?.response?.data?.message ||
        e?.message ||
        'Failed to delete link.';
      alert(message);
    } finally {
      setDeletingRelationId(null);
    }
  };

  const handleLinkAdded = () => {
    loadRelations();
    setIsModalOpen(false);
  };

  // Get all non-empty relationship groups
  const getRelationshipGroups = () => {
    if (!relations) return [];
    
    return Object.entries(relations).filter(([_, items]) => items.length > 0);
  };

  const relationshipGroups = getRelationshipGroups();

  return (
    <section className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Linked Work Items</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
          aria-label="Add linked work item"
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

      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Loading linked work items...</span>
        </div>
      )}

      {error && !loading && (
        <div className="text-sm text-red-600 py-4">{error}</div>
      )}

      {!loading && !error && relationshipGroups.length === 0 && (
        <div className="text-sm text-gray-500 py-4">No linked work items yet.</div>
      )}

      {!loading && !error && relationshipGroups.length > 0 && (
        <div className="space-y-6">
          {relationshipGroups.map(([relationshipType, items]) => (
            <div key={relationshipType}>
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                {RELATIONSHIP_LABELS[relationshipType] || relationshipType}
              </h4>
              <div className="space-y-2">
                {items.map((item: TaskRelationItem) => {
                  const task = item.task;
                  return (
                    <div
                      key={item.relation_id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors"
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
                              {task.summary || `Task #${task.id}`}
                            </span>
                            {task.id && (
                              <span className="text-xs text-gray-500">
                                #{task.id}
                              </span>
                            )}
                          </div>
                          {task.owner && (
                            <div className="mt-1 flex items-center space-x-1">
                              <div className="w-5 h-5 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-xs text-gray-600">
                                  {task.owner.username?.[0]?.toUpperCase() || '?'}
                                </span>
                              </div>
                              <span className="text-xs text-gray-500">
                                {task.owner.username || task.owner.email || `User #${task.owner.id}`}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(item.relation_id)}
                        disabled={deletingRelationId === item.relation_id}
                        className="ml-4 flex-shrink-0 p-1 text-gray-400 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 rounded transition-colors disabled:opacity-50"
                        aria-label="Delete link"
                      >
                        {deletingRelationId === item.relation_id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <LinkTaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onLinkAdded={handleLinkAdded}
        sourceTaskId={taskId}
      />
    </section>
  );
}

