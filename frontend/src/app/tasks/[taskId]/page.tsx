'use client';

import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import useAuth from '@/hooks/useAuth';
import Link from 'next/link';

// Lazy load the decoupled Asset tab implementation from the assets folder
const TaskAssets = dynamic(() => import('./assets/task-assets'));

export default function TaskPage() {
  const params = useParams();
  const taskId = params?.taskId ? String(params.taskId) : '';
  const { user, logout } = useAuth();
  const router = useRouter();

  const layoutUser = user
    ? {
        name: user.username || user.email,
        email: user.email,
        role: user.roles && user.roles.length > 0 ? user.roles[0] : undefined,
      }
    : undefined;

  return (
    <ProtectedRoute>
      <Layout user={layoutUser} onUserAction={async (action) => { if (action === 'logout') await logout(); }}>
        <div className="min-h-screen bg-gray-50 overflow-hidden">
          {/* Floating overlay modal ala Jira */}
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => router.push('/tasks')}
          />
          <div className="fixed inset-0 z-50 flex items-start justify-center p-6">
            <div
              className="relative w-full max-w-5xl bg-white rounded-lg shadow-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal header */}
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
                <div className="text-sm text-gray-500">Task</div>
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-gray-900">#{taskId}</div>
                  <button
                    onClick={() => router.push('/tasks')}
                    className="ml-2 inline-flex items-center justify-center h-8 w-8 rounded hover:bg-gray-100 text-gray-500"
                    aria-label="Close"
                  >
                    ×
                  </button>
                </div>
              </div>
              {/* Modal body: assets UI */}
              <div className="max-h-[85vh] overflow-y-auto px-4 py-4">
                <TaskAssets />
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
}


