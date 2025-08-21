'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import useAuth from '@/hooks/useAuth';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { AssetAPI } from '@/lib/api/assetApi';
// No tasks API yet; provide a direct navigator to a specific task detail

function TasksPageContent() {
  const { user, loading: userLoading, logout } = useAuth();
  const router = useRouter();
  const [assetsByTask, setAssetsByTask] = useState({});
  const [loading, setLoading] = useState(false);
  const [creatingTaskIds, setCreatingTaskIds] = useState({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createTaskId, setCreateTaskId] = useState(null);
  const [formTeam, setFormTeam] = useState('');
  const [formTags, setFormTags] = useState('');

  const handleUserAction = async (action) => {
    if (action === 'settings') {
      // Handle settings
    } else if (action === 'logout') {
      await logout();
    }
  };

  const layoutUser = user
    ? {
        name: user.username || user.email,
        email: user.email,
        role: user.roles && user.roles.length > 0 ? user.roles[0] : undefined,
      }
    : undefined;

  // Mock tasks: 1..20 with simple description
  const tasks = useMemo(() =>
    Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      title: `Task #${i + 1}`,
      description: `This is a mock description for task ${i + 1}.`,
    })),
  []);

  // Load all assets once and map by task id
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const resp = await AssetAPI.getAssets();
        const results = (resp && resp.results) ? resp.results : [];
        const map = {};
        for (const a of results) {
          if (a && typeof a.task !== 'undefined' && a.task !== null) {
            if (!map[a.task]) map[a.task] = a; // assume 1:1
          }
        }
        if (mounted) setAssetsByTask(map);
      } catch (e) {
        if (mounted) setAssetsByTask({});
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleCreateAsset = async (taskId) => {
    try {
      setCreatingTaskIds((prev) => ({ ...prev, [taskId]: true }));
      const payload = { task: Number(taskId) };
      if (formTeam && String(formTeam).trim() !== '') {
        const num = Number(String(formTeam).trim());
        if (!Number.isNaN(num)) {
          payload.team = num;
        }
      }
      if (formTags && String(formTags).trim() !== '') {
        const tags = String(formTags)
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean);
        if (tags.length > 0) payload.tags = tags;
      }
      const created = await AssetAPI.createAsset(payload);
      setAssetsByTask((prev) => ({ ...prev, [taskId]: created }));
      setCreateModalOpen(false);
      setCreateTaskId(null);
      setFormTeam('');
      setFormTags('');
    } finally {
      setCreatingTaskIds((prev) => {
        const copy = { ...prev };
        delete copy[taskId];
        return copy;
      });
    }
  };
  
  const openCreateModal = (taskId) => {
    setCreateTaskId(taskId);
    setFormTeam('');
    setFormTags('');
    setCreateModalOpen(true);
  };
  const closeCreateModal = () => {
    setCreateModalOpen(false);
    setCreateTaskId(null);
    setFormTeam('');
    setFormTags('');
  };

  return (
    <Layout user={layoutUser} onUserAction={handleUserAction}>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
            <p className="text-gray-600 mt-2">Mocked task list (1–20). Create or view assets per task.</p>
          </div>

          {/* Mock tasks grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {tasks.map((t) => {
              const asset = assetsByTask[t.id];
              return (
                <div key={t.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold text-gray-900">{t.title}</div>
                      <div className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</div>
                    </div>
                    <button
                      onClick={() => router.push(`/tasks/${t.id}`)}
                      className="ml-3 text-indigo-600 hover:text-indigo-700 text-xs"
                    >
                      Open
                    </button>
                  </div>

                  <div className="mt-4">
                    {asset ? (
                      <div className="text-xs">
                        <div className="text-gray-500">Asset Status</div>
                        <div className="text-gray-900 mt-0.5"><span className="font-mono uppercase tracking-wide">{asset.status}</span></div>
                      </div>
                    ) : (
                      <div className="text-xs">
                        <div className="text-gray-500 mb-2">No asset</div>
                        <button
                          onClick={() => openCreateModal(t.id)}
                          className="px-3 py-1.5 rounded text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                          Create Asset
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {createModalOpen && (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl w-11/12 sm:w-2/3 md:w-1/2 lg:w-1/3 max-h-[85vh] overflow-y-auto relative">
                <button onClick={closeCreateModal} className="absolute top-3 right-3 text-gray-500 hover:text-gray-700">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                <div className="p-6">
                  <h2 className="text-lg font-semibold text-gray-900">Create Asset for Task #{createTaskId}</h2>
                  <div className="mt-4 space-y-3">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Team (optional)</label>
                      <input
                        type="text"
                        value={formTeam}
                        onChange={(e) => setFormTeam(e.target.value)}
                        placeholder="e.g. 5"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Tags (comma separated, optional)</label>
                      <input
                        type="text"
                        value={formTags}
                        onChange={(e) => setFormTags(e.target.value)}
                        placeholder="e.g. video,draft"
                        className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="pt-2 flex gap-2 justify-end">
                      <button onClick={closeCreateModal} className="px-4 py-2 rounded bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm">Cancel</button>
                      <button
                        onClick={() => createTaskId && handleCreateAsset(createTaskId)}
                        disabled={!!creatingTaskIds[createTaskId]}
                        className={`px-4 py-2 rounded text-white text-sm ${creatingTaskIds[createTaskId] ? 'bg-indigo-300' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                      >
                        {creatingTaskIds[createTaskId] ? 'Creating...' : 'Create'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function TasksPage() {
  return (
    <ProtectedRoute>
      <TasksPageContent />
    </ProtectedRoute>
  );
}
