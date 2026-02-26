import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within, waitFor, screen } from '@storybook/test';
import SpreadsheetGrid from '@/components/spreadsheets/SpreadsheetGrid';

const meta: Meta<typeof SpreadsheetGrid> = {
  title: 'Spreadsheets/SpreadsheetGrid',
  component: SpreadsheetGrid,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    chromatic: { delay: 500 },
    docs: {
      description: {
        component:
          'Editable spreadsheet grid with cells, formulas, export (CSV/XLSX), import, undo, and cell highlighting. Uses mock API in Storybook. Supports A1-style references and formula evaluation.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="h-[600px] w-full p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof SpreadsheetGrid>;

export const Default: Story = {
  parameters: {
    docs: { description: { story: 'Grid with toolbar (Export, Undo, Import, Highlight) and select-all.' } },
  },
  render: () => (
    <SpreadsheetGrid
      spreadsheetId={1}
      sheetId={1}
      spreadsheetName="Sheet"
      sheetName="Sheet1"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole('button', { name: /Export/i })).toBeInTheDocument());
    await expect(canvas.getByRole('button', { name: /Undo/i })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Import/i })).toBeInTheDocument();
    await expect(canvas.getByTestId('highlight-button')).toBeInTheDocument();
    await expect(canvas.getByTestId('select-all-cell')).toBeInTheDocument();
  },
};

export const ToolbarInteractions: Story = {
  parameters: {
    chromatic: { disableSnapshot: true },
    docs: { description: { story: 'Export button opens menu with CSV and XLSX options.' } },
  },
  render: () => (
    <SpreadsheetGrid
      spreadsheetId={1}
      sheetId={1}
      spreadsheetName="Sheet"
      sheetName="Sheet1"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole('button', { name: /Export/i })).toBeInTheDocument());
    const exportBtn = canvas.getByRole('button', { name: /Export/i });
    await userEvent.click(exportBtn);
    await expect(screen.getByRole('menuitem', { name: /Export as CSV/i })).toBeInTheDocument();
    await expect(screen.getByRole('menuitem', { name: /Export as XLSX/i })).toBeInTheDocument();
  },
};

export const ImportButtonVisible: Story = {
  parameters: {
    docs: { description: { story: 'Import button is visible and enabled for file upload.' } },
  },
  render: () => (
    <SpreadsheetGrid
      spreadsheetId={1}
      sheetId={1}
      spreadsheetName="Sheet"
      sheetName="Sheet1"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole('button', { name: /Import/i })).toBeInTheDocument());
    const importBtn = canvas.getByRole('button', { name: /Import/i });
    await expect(importBtn).toBeEnabled();
  },
};

export const HighlightToolbarInteraction: Story = {
  parameters: {
    chromatic: { disableSnapshot: true },
    docs: { description: { story: 'Select cell, click Highlight, and color picker menu appears.' } },
  },
  render: () => (
    <SpreadsheetGrid
      spreadsheetId={1}
      sheetId={1}
      spreadsheetName="Sheet"
      sheetName="Sheet1"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('cell-0-0')).toBeInTheDocument());
    const cell = canvas.getByTestId('cell-0-0');
    await userEvent.click(cell);
    const highlightBtn = canvas.getByTestId('highlight-button');
    await userEvent.click(highlightBtn);
    await waitFor(() => expect(screen.getByRole('menu')).toBeInTheDocument());
    await expect(screen.getByTestId('highlight-color-yellow')).toBeInTheDocument();
    await expect(screen.getByTestId('highlight-clear')).toBeInTheDocument();
  },
};

export const CellSelectionInteraction: Story = {
  parameters: {
    chromatic: { disableSnapshot: true },
    docs: { description: { story: 'Click a cell to select it.' } },
  },
  render: () => (
    <SpreadsheetGrid
      spreadsheetId={1}
      sheetId={1}
      spreadsheetName="Sheet"
      sheetName="Sheet1"
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByTestId('cell-0-0')).toBeInTheDocument());
    const cell = canvas.getByTestId('cell-0-0');
    await userEvent.click(cell);
    await expect(cell).toBeInTheDocument();
  },
};
