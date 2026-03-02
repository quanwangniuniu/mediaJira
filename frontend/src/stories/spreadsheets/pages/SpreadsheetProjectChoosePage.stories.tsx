import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useEffect, useState } from 'react';
import { FileSpreadsheet, FolderOpen, Loader2, AlertCircle } from 'lucide-react';
import type { ProjectData } from '@/lib/api/projectApi';

const mockProjects: ProjectData[] = [
  { id: 1, name: 'Project Alpha', organization: { id: 1, name: 'Org A' } } as ProjectData,
  { id: 2, name: 'Project Beta', organization: { id: 1, name: 'Org A' } } as ProjectData,
];

function SpreadsheetProjectChoosePageContent({
  projects,
  loading,
  error,
  onSelectProject,
}: {
  projects: ProjectData[];
  loading: boolean;
  error: string | null;
  onSelectProject: (id: number) => void;
}) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Spreadsheet</h1>
          <p className="text-sm text-gray-500">Choose a project to open its spreadsheets</p>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-50 py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
          <span className="text-sm text-gray-600">Loading projects…</span>
        </div>
      )}

      {!loading && error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && projects.length === 0 && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-8 text-center text-gray-600">
          No projects available. Create or join a project first.
        </div>
      )}

      {!loading && !error && projects.length > 0 && (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => onSelectProject(project.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:bg-blue-50/50 hover:shadow"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 truncate">{project.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {project.organization?.name ?? 'No organization'}
                  </div>
                </div>
                <FileSpreadsheet className="h-4 w-4 shrink-0 text-gray-400" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const meta: Meta<typeof SpreadsheetProjectChoosePageContent> = {
  title: 'Spreadsheets/Pages/SpreadsheetProjectChoosePage',
  component: SpreadsheetProjectChoosePageContent,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Landing page for spreadsheets. User selects a project to view its spreadsheets. Shows loading, error, empty, or project list states.',
      },
    },
  },
};

export default meta;

type Story = StoryObj<typeof SpreadsheetProjectChoosePageContent>;

export const Loading: Story = {
  parameters: {
    docs: { description: { story: 'Loading state while fetching projects.' } },
  },
  render: () => (
    <SpreadsheetProjectChoosePageContent
      projects={[]}
      loading={true}
      error={null}
      onSelectProject={() => {}}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Loading projects…')).toBeInTheDocument();
  },
};

export const Error: Story = {
  parameters: {
    docs: { description: { story: 'Error state when fetching projects fails.' } },
  },
  render: () => (
    <SpreadsheetProjectChoosePageContent
      projects={[]}
      loading={false}
      error="Failed to load projects"
      onSelectProject={() => {}}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Failed to load projects')).toBeInTheDocument();
  },
};

export const Empty: Story = {
  parameters: {
    docs: { description: { story: 'Empty state when no projects available.' } },
  },
  render: () => (
    <SpreadsheetProjectChoosePageContent
      projects={[]}
      loading={false}
      error={null}
      onSelectProject={() => {}}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/No projects available/)).toBeInTheDocument();
  },
};

export const WithProjects: Story = {
  parameters: {
    chromatic: { disableSnapshot: true },
    docs: { description: { story: 'Project cards; click to select and navigate to spreadsheets list.' } },
  },
  render: () => {
    const [selected, setSelected] = useState<number | null>(null);
    return (
      <SpreadsheetProjectChoosePageContent
        projects={mockProjects}
        loading={false}
        error={null}
        onSelectProject={(id) => setSelected(id)}
      />
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const projectAlphaBtn = canvas.getByRole('button', { name: /Project Alpha/i });
    await expect(projectAlphaBtn).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Project Beta/i })).toBeInTheDocument();
    await userEvent.click(projectAlphaBtn);
  },
};
