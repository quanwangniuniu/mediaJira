'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Layout from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SpreadsheetAPI } from '@/lib/api/spreadsheetApi';
import { SpreadsheetData, SheetData, CreateSheetRequest, UpdateSheetRequest } from '@/types/spreadsheet';
import { AlertCircle, ArrowLeft, FileSpreadsheet, Loader2, Plus, X } from 'lucide-react';
import CreateSheetModal from '@/components/spreadsheets/CreateSheetModal';
import SpreadsheetGrid from '@/components/spreadsheets/SpreadsheetGrid';
import toast from 'react-hot-toast';

export default function SpreadsheetDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const spreadsheetId = params?.spreadsheetId as string;
  const [spreadsheet, setSpreadsheet] = useState<SpreadsheetData | null>(null);
  const [sheets, setSheets] = useState<SheetData[]>([]);
  const [activeSheetId, setActiveSheetId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createSheetModalOpen, setCreateSheetModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createSheetDefaultName, setCreateSheetDefaultName] = useState('Sheet1');
  const [renamingSheetId, setRenamingSheetId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);

  const getNextSheetName = (existingSheets: SheetData[]) => {
    const sheetNumberRegex = /^sheet(\d+)$/i;
    let maxNumber = 0;
    existingSheets.forEach((sheet) => {
      const match = sheet.name.trim().match(sheetNumberRegex);
      if (match) {
        const num = Number(match[1]);
        if (!Number.isNaN(num)) {
          maxNumber = Math.max(maxNumber, num);
        }
      }
    });
    return `Sheet${maxNumber + 1}`;
  };

  const createFirstSheetIfNeeded = async (existingSheets: SheetData[]) => {
    if (!spreadsheetId || existingSheets.length > 0) {
      return null;
    }

    // Always try to create Sheet1 for the first sheet.
    try {
      return await SpreadsheetAPI.createSheet(Number(spreadsheetId), { name: 'Sheet1' });
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 400) {
        // If Sheet1 already exists server-side (race/auto-create), fetch it.
        const retryResponse = await SpreadsheetAPI.listSheets(Number(spreadsheetId));
        const retrySheets = retryResponse.results || [];
        if (retrySheets.length > 0) {
          return retrySheets[0];
        }
      }
      throw err;
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!spreadsheetId) {
        setError('Spreadsheet ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        // Fetch spreadsheet
        const spreadsheetData = await SpreadsheetAPI.getSpreadsheet(Number(spreadsheetId));
        setSpreadsheet(spreadsheetData);

        // Fetch sheets
        const sheetsResponse = await SpreadsheetAPI.listSheets(Number(spreadsheetId));
        const sheetsList = sheetsResponse.results || [];

        // Auto-create the first sheet if none exist yet
        if (sheetsList.length === 0) {
          const newSheet = await createFirstSheetIfNeeded(sheetsList);
          if (newSheet) {
            setSheets([newSheet]);
            setActiveSheetId(newSheet.id);
          }
        } else {
          setSheets(sheetsList);
          setCreateSheetDefaultName(getNextSheetName(sheetsList));
          
          // Set first sheet as active if available
          if (sheetsList.length > 0 && !activeSheetId) {
            setActiveSheetId(sheetsList[0].id);
          }
        }
      } catch (err: any) {
        console.error('Failed to load data:', err);
        const errorMessage =
          err?.response?.data?.error ||
          err?.response?.data?.detail ||
          err?.message ||
          'Failed to load spreadsheet';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [spreadsheetId]);

  const handleCreateSheet = async (data: CreateSheetRequest) => {
    if (!spreadsheetId) {
      toast.error('Spreadsheet ID is required');
      return;
    }

    setCreating(true);
    try {
      const newSheet = await SpreadsheetAPI.createSheet(Number(spreadsheetId), data);
      toast.success('Sheet created successfully');
      
      // Refresh the sheets list
      const sheetsResponse = await SpreadsheetAPI.listSheets(Number(spreadsheetId));
      const sheetsList = sheetsResponse.results || [];
      setSheets(sheetsList);
      setCreateSheetDefaultName(getNextSheetName(sheetsList));
      
      // Set the new sheet as active
      setActiveSheetId(newSheet.id);
      
      // Close modal
      setCreateSheetModalOpen(false);
    } catch (err: any) {
      console.error('Failed to create sheet:', err);
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to create sheet';
      toast.error(errorMessage);
      throw err;
    } finally {
      setCreating(false);
    }
  };

  const handleRenameSheet = async (sheetId: number, data: UpdateSheetRequest) => {
    if (!spreadsheetId) {
      toast.error('Spreadsheet ID is required');
      return;
    }

    const trimmedName = data.name.trim();
    if (!trimmedName) {
      toast.error('Sheet name is required');
      return;
    }

    if (trimmedName.length > 200) {
      toast.error('Sheet name cannot exceed 200 characters');
      return;
    }

    setRenaming(true);
    try {
      const updatedSheet = await SpreadsheetAPI.updateSheet(Number(spreadsheetId), sheetId, {
        name: trimmedName,
      });

      setSheets((prev) =>
        prev.map((sheet) => (sheet.id === sheetId ? { ...sheet, name: updatedSheet.name } : sheet))
      );

      toast.success('Sheet renamed');
      setRenamingSheetId(null);
      setRenameValue('');
    } catch (err: any) {
      console.error('Failed to rename sheet:', err);
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        err?.message ||
        'Failed to rename sheet';
      toast.error(errorMessage);
    } finally {
      setRenaming(false);
    }
  };

  const beginRenameSheet = (sheet: SheetData) => {
    setRenamingSheetId(sheet.id);
    setRenameValue(sheet.name);
  };

  const cancelRenameSheet = () => {
    setRenamingSheetId(null);
    setRenameValue('');
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 py-10">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-500">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                <p className="mt-3 font-medium text-gray-900">Loading spreadsheet…</p>
                <p className="text-sm text-gray-600">Fetching spreadsheet details from the backend.</p>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (error) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 py-10">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-white p-10 text-center text-red-600">
                <AlertCircle className="h-6 w-6" />
                <p className="mt-3 font-semibold">Could not load spreadsheet</p>
                <p className="text-sm text-red-500">{error}</p>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setError(null);
                      setLoading(true);
                      const fetchData = async () => {
                        try {
                          const spreadsheetData = await SpreadsheetAPI.getSpreadsheet(Number(spreadsheetId));
                          setSpreadsheet(spreadsheetData);
                          const sheetsResponse = await SpreadsheetAPI.listSheets(Number(spreadsheetId));
                          setSheets(sheetsResponse.results || []);
                        } catch (err: any) {
                          setError(
                            err?.response?.data?.error ||
                              err?.response?.data?.detail ||
                              err?.message ||
                              'Failed to load spreadsheet'
                          );
                        } finally {
                          setLoading(false);
                        }
                      };
                      fetchData();
                    }}
                    className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Retry
                  </button>
                  <Link
                    href={`/projects/${projectId}/spreadsheets`}
                    className="rounded-full bg-gray-600 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-700"
                  >
                    Back to Spreadsheets
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  if (!spreadsheet) {
    return (
      <ProtectedRoute>
        <Layout>
          <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-7xl px-4 py-10">
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center text-gray-600">
                <FileSpreadsheet className="h-7 w-7 text-gray-400" />
                <p className="mt-3 font-semibold text-gray-900">Spreadsheet not found</p>
                <p className="text-sm text-gray-500">The spreadsheet you're looking for doesn't exist.</p>
                <Link
                  href={`/projects/${projectId}/spreadsheets`}
                  className="mt-4 rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Back to Spreadsheets
                </Link>
              </div>
            </div>
          </div>
        </Layout>
      </ProtectedRoute>
    );
  }

  const activeSheet = sheets.find(s => s.id === activeSheetId);

  return (
    <ProtectedRoute>
      <Layout>
        <div className="min-h-screen bg-white flex flex-col">
          {/* Header */}
          <div className="border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4 py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/projects/${projectId}/spreadsheets`}
                    className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Link>
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-green-50 text-green-700">
                      <FileSpreadsheet className="h-5 w-5" />
                    </div>
                    <h1 className="text-lg font-medium text-gray-900">{spreadsheet.name}</h1>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sheet Tabs */}
          <div className="border-b border-gray-200 bg-white">
            <div className="mx-auto max-w-7xl px-4">
              <div className="flex items-center gap-1 overflow-x-auto">
                {sheets.map((sheet) => {
                  const isRenaming = renamingSheetId === sheet.id;
                  const isActive = activeSheetId === sheet.id;

                  return (
                    <div
                      key={sheet.id}
                      className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                        isActive
                          ? 'border-blue-500 text-blue-600 bg-blue-50/50'
                          : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        if (!isRenaming) {
                          setActiveSheetId(sheet.id);
                        }
                      }}
                      onDoubleClick={() => beginRenameSheet(sheet)}
                    >
                      {isRenaming ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleRenameSheet(sheet.id, { name: renameValue });
                              } else if (e.key === 'Escape') {
                                e.preventDefault();
                                cancelRenameSheet();
                              }
                            }}
                            className="h-7 w-32 rounded border border-gray-300 px-2 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            autoFocus
                            disabled={renaming}
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameSheet(sheet.id, { name: renameValue })}
                            className="rounded bg-blue-600 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                            disabled={renaming}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={cancelRenameSheet}
                            className="rounded border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                            disabled={renaming}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <span>{sheet.name}</span>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => {
                    setCreateSheetDefaultName(getNextSheetName(sheets));
                    setCreateSheetModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                  title="Create new sheet"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">New Sheet</span>
                </button>
              </div>
            </div>
          </div>

          {/* Spreadsheet Content Area */}
          <div className="flex-1 overflow-hidden bg-gray-50 flex flex-col">
            {activeSheet ? (
              <div className="flex-1 flex flex-col h-full">
                <div className="px-4 py-2 bg-white border-b border-gray-200">
                  <h2 className="text-sm font-medium text-gray-700">{activeSheet.name}</h2>
                </div>
                <div className="flex-1 overflow-hidden">
                  <SpreadsheetGrid
                    spreadsheetId={Number(spreadsheetId)}
                    sheetId={activeSheet.id}
                  />
                </div>
              </div>
            ) : sheets.length === 0 ? (
              <div className="flex items-center justify-center flex-1">
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-white p-12 text-center">
                  <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-lg font-semibold text-gray-900 mb-2">No sheets yet</p>
                  <p className="text-sm text-gray-500 mb-6">Create your first sheet to get started.</p>
                  <button
                    onClick={() => {
                      setCreateSheetDefaultName(getNextSheetName(sheets));
                      setCreateSheetModalOpen(true);
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                  >
                    <Plus className="h-4 w-4" />
                    Create Sheet
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Layout>
      <CreateSheetModal
        isOpen={createSheetModalOpen}
        onClose={() => setCreateSheetModalOpen(false)}
        onSubmit={handleCreateSheet}
        loading={creating}
        defaultName={createSheetDefaultName}
      />
    </ProtectedRoute>
  );
}
