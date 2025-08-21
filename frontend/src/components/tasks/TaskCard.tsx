// src/components/tasks/TaskCard.tsx - Task Card Component
'use client';

import React, { useState } from 'react';
import { useAssetData } from '@/hooks/useAssetData';

interface TaskCardProps {
  task: {
    id: string;
    title: string;
    description: string;
    status: string;
    assignee: string;
    due_date: string;
    priority: string;
  };
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isExpanded, setIsExpanded] = useState(false);

  // Asset data management
  const {
    assets,
    assetsLoading,
    assetsError,
    asset,
    assetLoading,
    versions,
    comments,
    assignments,
    history,
    fetchAssets,
    fetchAsset,
    fetchAssetDetails,
  } = useAssetData({ taskId: task.id });

  const handleTabClick = (tabName: string) => {
    setActiveTab(tabName);
    if (tabName === 'assets' && !isExpanded) {
      setIsExpanded(true);
      fetchAssets();
    }
  };

  const handleAssetSelect = (assetId: string) => {
    fetchAsset(assetId);
    fetchAssetDetails(assetId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-green-100 text-green-800';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Task Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ')}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          </div>
        </div>
        <p className="text-gray-600 text-sm mb-3">{task.description}</p>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Assignee: {task.assignee}</span>
          <span>Due: {task.due_date}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {['overview', 'details', 'progress', 'assets'].map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabClick(tab)}
              className={`flex-1 px-4 py-2 text-sm font-medium border-b-2 ${
                activeTab === tab
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {activeTab === 'overview' && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Task Overview</h4>
            <p className="text-gray-600 text-sm">
              This is a brief overview of the task. Here you can see the main information and status.
            </p>
          </div>
        )}

        {activeTab === 'details' && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Task Details</h4>
            <div className="space-y-2 text-sm">
              <div><span className="font-medium">ID:</span> {task.id}</div>
              <div><span className="font-medium">Status:</span> {task.status}</div>
              <div><span className="font-medium">Priority:</span> {task.priority}</div>
              <div><span className="font-medium">Assignee:</span> {task.assignee}</div>
              <div><span className="font-medium">Due Date:</span> {task.due_date}</div>
            </div>
          </div>
        )}

        {activeTab === 'progress' && (
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Progress</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Task Completion</span>
                <span className="font-medium">75%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assets' && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Asset Review</h4>
            {!isExpanded ? (
              <p className="text-gray-600 text-sm">
                Click to load assets for this task.
              </p>
            ) : assetsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading assets...</p>
              </div>
            ) : assetsError ? (
              <div className="text-center py-4">
                <p className="text-red-600 text-sm">Error: {assetsError}</p>
                <button 
                  onClick={() => fetchAssets()}
                  className="mt-2 px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                >
                  Retry
                </button>
              </div>
            ) : assets.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-600 text-sm">No assets found for this task.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Asset List */}
                <div className="space-y-2">
                  <h5 className="text-sm font-medium text-gray-700">Assets ({assets.length})</h5>
                  {assets.map((asset) => (
                    <div 
                      key={asset.id} 
                      className="bg-gray-50 p-3 rounded border cursor-pointer hover:bg-gray-100 transition-colors"
                      onClick={() => handleAssetSelect(asset.id.toString())}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h6 className="font-medium text-sm">Asset #{asset.id}</h6>
                          <p className="text-xs text-gray-500">Task: {asset.task}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          asset.status === 'Approved' ? 'bg-green-100 text-green-800' :
                          asset.status === 'UnderReview' ? 'bg-yellow-100 text-yellow-800' :
                          asset.status === 'PendingReview' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {asset.status}
                        </span>
                      </div>
                      {asset.tags && asset.tags.length > 0 && (
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-1">
                            {asset.tags.slice(0, 3).map((tag, index) => (
                              <span key={index} className="px-1 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                                {tag}
                              </span>
                            ))}
                            {asset.tags.length > 3 && (
                              <span className="px-1 py-0.5 bg-gray-200 text-gray-600 text-xs rounded">
                                +{asset.tags.length - 3}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Selected Asset Details */}
                {asset && (
                  <div className="border-t pt-4 space-y-4">
                    <h5 className="text-sm font-medium text-gray-700">Asset #{asset.id} Details</h5>
                    
                    {/* Asset Information */}
                    <div>
                      <h6 className="text-xs font-medium text-gray-600 mb-2">Asset Information</h6>
                      <div className="bg-white p-3 rounded border text-xs space-y-1">
                        <div><span className="font-medium">Status:</span> {asset.status}</div>
                        <div><span className="font-medium">Created:</span> {new Date(asset.created_at).toLocaleDateString()}</div>
                        <div><span className="font-medium">Updated:</span> {new Date(asset.updated_at).toLocaleDateString()}</div>
                        <div><span className="font-medium">Tags:</span> {asset.tags?.join(', ') || 'None'}</div>
                      </div>
                    </div>

                    {/* Versions */}
                    <div>
                      <h6 className="text-xs font-medium text-gray-600 mb-2">Versions ({versions.length})</h6>
                      <div className="bg-white p-3 rounded border">
                        {versions.length === 0 ? (
                          <p className="text-xs text-gray-500">No versions found</p>
                        ) : (
                          <div className="space-y-2">
                            {versions.map((version) => (
                              <div key={version.id} className="flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-medium">v{version.version_number}</span>
                                  <span className="text-gray-500 ml-2">{version.version_status}</span>
                                </div>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  version.scan_status === 'clean' ? 'bg-green-100 text-green-800' :
                                  version.scan_status === 'infected' ? 'bg-red-100 text-red-800' :
                                  version.scan_status === 'scanning' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {version.scan_status}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Comments */}
                    <div>
                      <h6 className="text-xs font-medium text-gray-600 mb-2">Comments ({comments.length})</h6>
                      <div className="bg-white p-3 rounded border">
                        {comments.length === 0 ? (
                          <p className="text-xs text-gray-500">No comments found</p>
                        ) : (
                          <div className="space-y-2">
                            {comments.map((comment) => (
                              <div key={comment.id} className="text-xs">
                                <div className="font-medium">User {comment.user}</div>
                                <div className="text-gray-600">{comment.body}</div>
                                <div className="text-gray-400 text-xs">{new Date(comment.created_at).toLocaleDateString()}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assignments */}
                    <div>
                      <h6 className="text-xs font-medium text-gray-600 mb-2">Assignments ({assignments.length})</h6>
                      <div className="bg-white p-3 rounded border">
                        {assignments.length === 0 ? (
                          <p className="text-xs text-gray-500">No assignments found</p>
                        ) : (
                          <div className="space-y-2">
                            {assignments.map((assignment) => (
                              <div key={assignment.id} className="flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-medium">User {assignment.user}</span>
                                  <span className="text-gray-500 ml-2">({assignment.role})</span>
                                </div>
                                <div className="text-gray-400">
                                  {new Date(assignment.assigned_at).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* History */}
                    <div>
                      <h6 className="text-xs font-medium text-gray-600 mb-2">History ({history.length})</h6>
                      <div className="bg-white p-3 rounded border">
                        {history.length === 0 ? (
                          <p className="text-xs text-gray-500">No history found</p>
                        ) : (
                          <div className="space-y-2">
                            {history.slice(0, 5).map((item, index) => (
                              <div key={index} className="text-xs">
                                <div className="font-medium">{item.type.replace('_', ' ')}</div>
                                <div className="text-gray-600">{new Date(item.timestamp).toLocaleString()}</div>
                                {item.user_id && <div className="text-gray-400">User {item.user_id}</div>}
                              </div>
                            ))}
                            {history.length > 5 && (
                              <div className="text-xs text-gray-500">+{history.length - 5} more events</div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
