'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SpreadsheetAPI } from '@/lib/api/spreadsheetApi';
import { ProjectAPI, ProjectData } from '@/lib/api/projectApi';
import { SpreadsheetData, CreateSpreadsheetRequest } from '@/types/spreadsheet';
import { AlertCircle, ArrowLeft, FileSpreadsheet, Loader2, Plus, Search, Trash2, Eye, MoreVertical } from 'lucide-react';
import CreateSpreadsheetModal from '@/components/spreadsheets/CreateSpreadsheetModal';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

export default function SpreadsheetsListPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const [spreadsheets, setSpreadsheets] = useState<SpreadsheetData[]>([]);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) {
        setError('Project ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch project info
        const projects = await ProjectAPI.getProjects();
        const currentProject = projects.find(p => p.id === Number(projectId));
        setProject(currentProject || null);

        // Fetch spreadsheets
        const response = await SpreadsheetAPI.listSpreadsheets(Number(projectId));
        setSpreadsheets(response.results || []);
      } catch (err: any) {
        console.error('Failed to load data:', err);
        const errorMessage =
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to load spreadsheets';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  const handleCreateSpreadsheet = async (data: CreateSpreadsheetRequest) => {
    if (!projectId) {
      toast.error('Project ID is required');
      return;
    }

    setCreating(true);
    try {
      const newSpreadsheet = await SpreadsheetAPI.createSpreadsheet(Number(projectId), data);
      toast.success('Spreadsheet created successfully');
      
      // Refresh the list
      const response = await SpreadsheetAPI.listSpreadsheets(Number(projectId));
      setSpreadsheets(response.results || []);
      
      // Close modal and navigate to the new spreadsheet
      setCreateModalOpen(false);
      router.push(`/projects/${projectId}/spreadsheets/${newSpreadsheet.id}`);
    } catch (err: any) {
      console.error('Failed to create spreadsheet:', err);
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to create spreadsheet';
      toast.error(errorMessage);
      throw err;
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteSpreadsheet = async (spreadsheetId: number, spreadsheetName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${spreadsheetName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(spreadsheetId);
    try {
      await SpreadsheetAPI.deleteSpreadsheet(spreadsheetId);
      toast.success('Spreadsheet deleted successfully');
      
      // Refresh the list
      const response = await SpreadsheetAPI.listSpreadsheets(Number(projectId));
      setSpreadsheets(response.results || []);
    } catch (err: any) {
      console.error('Failed to delete spreadsheet:', err);
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to delete spreadsheet';
      toast.error(errorMessage);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    
    if (dateOnly.getTime() === today.getTime()) {
      // Today - show time
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
      // Earlier - show date
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    }
  };

  const groupSpreadsheetsByDate = (spreadsheets: SpreadsheetData[]) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const todayItems: SpreadsheetData[] = [];
    const earlierItems: SpreadsheetData[] = [];
    
    spreadsheets.forEach(spreadsheet => {
      const updatedDate = new Date(spreadsheet.updated_at);
      updatedDate.setHours(0, 0, 0, 0);
      
      if (updatedDate.getTime() === today.getTime()) {
        todayItems.push(spreadsheet);
      } else {
        earlierItems.push(spreadsheet);
      }
    });
    
    return { todayItems, earlierItems };
  };

  const filteredSpreadsheets = useMemo(() => {
    if (!searchQuery.trim()) return spreadsheets;
    
    const query = searchQuery.toLowerCase();
    return spreadsheets.filter(spreadsheet =>
      spreadsheet.name.toLowerCase().includes(query)
    );
  }, [spreadsheets, searchQuery]);

  const { todayItems, earlierItems } = useMemo(() => {
    return groupSpreadsheetsByDate(filteredSpreadsheets);
  }, [filteredSpreadsheets]);

  const renderEmptyState = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <p className="mt-3 font-medium text-gray-900">Loading spreadsheets…</p>
          <p className="text-sm text-gray-600">Fetching spreadsheets from the backend.</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-white p-10 text-center text-red-600">
          <AlertCircle className="h-6 w-6" />
          <p className="mt-3 font-semibold">Could not load spreadsheets</p>
          <p className="text-sm text-red-500">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              const fetchSpreadsheets = async () => {
                try {
                  const response = await SpreadsheetAPI.listSpreadsheets(Number(projectId));
                  setSpreadsheets(response.results || []);
                } catch (err: any) {
                  setError(
                    err?.response?.data?.error ||
                      err?.response?.data?.detail ||
                      err?.message ||
                      'Failed to load spreadsheets'
                  );
                } finally {
                  setLoading(false);
                }
              };
              fetchSpreadsheets();
            }}
            className="mt-4 rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-600">
        <FileSpreadsheet className="h-7 w-7 text-gray-400 mb-4" />
        <p className="mt-3 font-semibold text-gray-900">No spreadsheets yet</p>
        <p className="text-sm text-gray-500 mb-8">Create a spreadsheet to get started.</p>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="inline-flex flex-col items-center gap-3 rounded-full bg-blue-600 text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg hover:shadow-xl"
          disabled={creating}
        >
          {creating ? (
            <div className="flex items-center justify-center h-16 w-16">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition">
                <Plus className="h-8 w-8" strokeWidth={2.5} />
              </div>
              <span className="px-6 pb-4 text-sm font-semibold">Create spreadsheet</span>
            </>
          )}
        </button>
      </div>
    );
  };

  const renderSpreadsheetRow = (spreadsheet: SpreadsheetData) => {
    const isDeleting = deletingId === spreadsheet.id;
    
    return (
      <tr
        key={spreadsheet.id}
        className="border-b border-gray-200 hover:bg-gray-50 transition-colors group"
      >
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-700 flex-shrink-0">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-gray-900 truncate">{spreadsheet.name}</div>
              <div className="text-sm text-gray-500 truncate">{project?.name || 'Project'}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-sm text-gray-600">
          {formatDate(spreadsheet.updated_at)}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2 justify-end">
            <Link
              href={`/projects/${projectId}/spreadsheets/${spreadsheet.id}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Eye className="h-4 w-4" />
              View
            </Link>
            <button
              onClick={() => handleDeleteSpreadsheet(spreadsheet.id, spreadsheet.name)}
              disabled={isDeleting}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Delete
            </button>
          </div>
        </td>
      </tr>
    );
  };

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <div className="mx-auto max-w-6xl w-full px-4 py-6 flex flex-col flex-1">
            {/* Header */}
            <div className="flex flex-col gap-2 mb-6">
              <div className="flex items-center gap-3">
                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Projects
                </Link>
              </div>
              <div className="flex items-center gap-3 text-sm uppercase tracking-wide text-blue-700">
                <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                Spreadsheets
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-bold text-gray-900">Project Spreadsheets</h1>
                    <button
                      onClick={() => setCreateModalOpen(true)}
                      disabled={creating}
                      className="px-3 py-1.5 rounded text-white bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {creating ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creating...
                        </span>
                      ) : (
                        'Create Spreadsheet'
                      )}
                    </button>
                  </div>
                  <p className="text-gray-600">Manage and view spreadsheets for this project.</p>
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search spreadsheets..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Spreadsheet List */}
            <div className="flex-1 overflow-y-auto">
              {filteredSpreadsheets.length === 0 ? (
                renderEmptyState()
              ) : (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Name
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Updated
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {todayItems.length > 0 && (
                        <>
                          <tr>
                            <td colSpan={3} className="px-4 py-2 bg-gray-50">
                              <span className="text-xs font-semibold text-gray-700 uppercase">Today</span>
                            </td>
                          </tr>
                          {todayItems.map(renderSpreadsheetRow)}
                        </>
                      )}
                      {earlierItems.length > 0 && (
                        <>
                          <tr>
                            <td colSpan={3} className="px-4 py-2 bg-gray-50">
                              <span className="text-xs font-semibold text-gray-700 uppercase">Earlier</span>
                            </td>
                          </tr>
                          {earlierItems.map(renderSpreadsheetRow)}
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </Layout>
      <CreateSpreadsheetModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onSubmit={handleCreateSpreadsheet}
        loading={creating}
      />
    </ProtectedRoute>
  );
}
