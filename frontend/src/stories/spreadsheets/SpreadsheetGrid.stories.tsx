import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import SpreadsheetGrid from '@/components/spreadsheets/SpreadsheetGrid';

const meta: Meta<typeof SpreadsheetGrid> = {
  title: 'Spreadsheets/SpreadsheetGrid',
  component: SpreadsheetGrid,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
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
    await expect(canvas.getByRole('button', { name: /Undo/i })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Import/i })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Export/i })).toBeInTheDocument();
    await expect(canvas.getByTestId('highlight-button')).toBeInTheDocument();
    await expect(canvas.getByTestId('select-all-cell')).toBeInTheDocument();
  },
};

export const ToolbarInteractions: Story = {
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
    const exportBtn = canvas.getByRole('button', { name: /Export/i });
    await userEvent.click(exportBtn);
    await expect(canvas.getByRole('menuitem', { name: /Export as CSV/i })).toBeInTheDocument();
    await expect(canvas.getByRole('menuitem', { name: /Export as XLSX/i })).toBeInTheDocument();
  },
};
