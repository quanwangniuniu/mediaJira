import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within, screen, waitFor } from '@storybook/test';
import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, FileSpreadsheet, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import CreateSpreadsheetModal from '@/components/spreadsheets/CreateSpreadsheetModal';
import type { SpreadsheetData } from '@/types/spreadsheet';
import type { ProjectData } from '@/lib/api/projectApi';

const mockSpreadsheets: SpreadsheetData[] = [
  {
    id: 1,
    project: 1,
    name: 'Campaign Data',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false,
  },
  {
    id: 2,
    project: 1,
    name: 'Budget Tracker',
    created_at: new Date().toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    is_deleted: false,
  },
];

function SpreadsheetsListPageContent({
  spreadsheets,
  project,
  loading,
  error,
  searchQuery,
  onSearchChange,
  onCreateClick,
  onSpreadsheetClick,
  onDeleteClick,
}: {
  spreadsheets: SpreadsheetData[];
  project: ProjectData | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  onSearchChange: (s: string) => void;
  onCreateClick: () => void;
  onSpreadsheetClick: (id: number) => void;
  onDeleteClick: (id: number, e: React.MouseEvent) => void;
}) {
  const filtered = spreadsheets.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="mx-auto max-w-6xl w-full px-4 py-6 flex flex-col flex-1">
        <div className="flex flex-col gap-2 mb-6">
          <Link href="/projects" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>
          <div className="flex items-center justify-between gap-3 text-sm uppercase tracking-wide text-blue-700">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              Spreadsheets
            </div>
            <button
              onClick={onCreateClick}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              Create Spreadsheet
            </button>
          </div>
        </div>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search spreadsheets..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <p className="mt-3 font-medium text-gray-900">Loading spreadsheets…</p>
            </div>
          )}
          {!loading && error && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-red-200 bg-white p-10 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <p className="mt-3 font-semibold">Could not load spreadsheets</p>
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Updated</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((s) => (
                    <tr
                      key={s.id}
                      className="border-b border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => onSpreadsheetClick(s.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-700 flex-shrink-0">
                            <FileSpreadsheet className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 truncate">{s.name}</div>
                            <div className="text-sm text-gray-500 truncate">{project?.name || 'Project'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {new Date(s.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteClick(s.id, e);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {!loading && !error && filtered.length === 0 && spreadsheets.length === 0 && (
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-gray-600">
              <p className="text-sm font-semibold text-gray-900">No spreadsheet yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof SpreadsheetsListPageContent> = {
  title: 'Spreadsheets/Pages/SpreadsheetsListPage',
  component: SpreadsheetsListPageContent,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'List of spreadsheets for the selected project. Includes search, Create Spreadsheet button, and table with name, updated date, and delete action. Click a row to open the spreadsheet.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div data-modal-root style={{ position: 'relative', minHeight: '100vh', width: '100%' }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SpreadsheetsListPageContent>;

const project = { id: 1, name: 'Project Alpha', organization: { id: 1, name: 'Org A' } } as ProjectData;

export const Loading: Story = {
  parameters: {
    docs: { description: { story: 'Loading state while fetching spreadsheets.' } },
  },
  render: () => (
    <SpreadsheetsListPageContent
      spreadsheets={[]}
      project={project}
      loading={true}
      error={null}
      searchQuery=""
      onSearchChange={() => {}}
      onCreateClick={() => {}}
      onSpreadsheetClick={() => {}}
      onDeleteClick={() => {}}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Loading spreadsheets…')).toBeInTheDocument();
  },
};

export const WithSpreadsheets: Story = {
  parameters: {
    chromatic: { disableSnapshot: true },
    docs: {
      description: {
        story: 'Table of spreadsheets; Create opens modal; search filters by name.',
      },
    },
  },
  render: () => {
    const [search, setSearch] = useState('');
    const [createOpen, setCreateOpen] = useState(false);
    return (
      <>
        <SpreadsheetsListPageContent
          spreadsheets={mockSpreadsheets}
          project={project}
          loading={false}
          error={null}
          searchQuery={search}
          onSearchChange={setSearch}
          onCreateClick={() => setCreateOpen(true)}
          onSpreadsheetClick={() => {}}
          onDeleteClick={() => {}}
        />
        <CreateSpreadsheetModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          onSubmit={async () => setCreateOpen(false)}
        />
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Campaign Data')).toBeInTheDocument();
    await expect(canvas.getByText('Budget Tracker')).toBeInTheDocument();
    await userEvent.click(canvas.getByRole('button', { name: /Create Spreadsheet/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: /Create Spreadsheet/i })).toBeInTheDocument());
    await userEvent.type(canvas.getByPlaceholderText(/Search spreadsheets/), 'Campaign');
    await expect(canvas.getByText('Campaign Data')).toBeInTheDocument();
    expect(canvas.queryByText('Budget Tracker')).toBeNull();
  },
};

export const Empty: Story = {
  parameters: {
    docs: { description: { story: 'Empty state when no spreadsheets exist yet.' } },
  },
  render: () => (
    <SpreadsheetsListPageContent
      spreadsheets={[]}
      project={project}
      loading={false}
      error={null}
      searchQuery=""
      onSearchChange={() => {}}
      onCreateClick={() => {}}
      onSpreadsheetClick={() => {}}
      onDeleteClick={() => {}}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/No spreadsheet yet/)).toBeInTheDocument();
  },
};
