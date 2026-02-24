import type { Meta, StoryObj } from '@storybook/react';
import type { ComponentProps } from 'react';
import SpreadsheetStatusIndicators from '@/components/spreadsheets/SpreadsheetStatusIndicators';

const meta: Meta<typeof SpreadsheetStatusIndicators> = {
  title: 'Spreadsheets/SpreadsheetStatusIndicators',
  component: SpreadsheetStatusIndicators,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof SpreadsheetStatusIndicators>;

const BaseWrapper = (args: ComponentProps<typeof SpreadsheetStatusIndicators>) => (
  <div className="relative h-24 w-full border border-gray-200 bg-white p-2">
    <SpreadsheetStatusIndicators {...args} />
  </div>
);

export const SaveError: Story = {
  render: BaseWrapper,
  args: {
    saveError: 'Failed to save highlights',
    isSaving: false,
    pendingOpsSize: 0,
    isImporting: false,
    importProgress: null,
    hydrationStatus: 'ready',
  },
};

export const Saving: Story = {
  render: BaseWrapper,
  args: {
    saveError: null,
    isSaving: true,
    pendingOpsSize: 3,
    isImporting: false,
    importProgress: null,
    hydrationStatus: 'ready',
  },
};

export const Hydrating: Story = {
  render: BaseWrapper,
  args: {
    saveError: null,
    isSaving: false,
    pendingOpsSize: 0,
    isImporting: false,
    importProgress: null,
    hydrationStatus: 'hydrating',
  },
};
