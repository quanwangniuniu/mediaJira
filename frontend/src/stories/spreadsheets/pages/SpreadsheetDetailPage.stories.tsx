import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import SpreadsheetGrid from '@/components/spreadsheets/SpreadsheetGrid';
import PatternAgentPanel from '@/components/spreadsheets/PatternAgentPanel';
import type { TimelineItem, WorkflowPatternSummary } from '@/types/patterns';

const sampleStep: TimelineItem = {
  id: 'step-1',
  type: 'APPLY_FORMULA',
  target: { row: 0, col: 0 },
  a1: 'A1',
  formula: '=1+1',
  disabled: false,
  createdAt: new Date().toISOString(),
};

const samplePatterns: WorkflowPatternSummary[] = [
  {
    id: 'pat-1',
    name: 'Sample Pattern',
    description: 'A sample workflow',
    version: 1,
    createdAt: new Date().toISOString(),
  },
];

function SpreadsheetDetailPageContent() {
  return (
    <div className="h-[600px] flex flex-col bg-gray-50">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 bg-white">
        <span className="text-sm font-semibold text-gray-700">Sheet1</span>
      </div>
      <div className="flex-1 min-h-0 flex overflow-hidden">
        <div className="flex-1 min-h-0 overflow-hidden">
          <SpreadsheetGrid
            spreadsheetId={1}
            sheetId={1}
            spreadsheetName="Sheet"
            sheetName="Sheet1"
          />
        </div>
        <div className="w-[320px] border-l border-gray-200 bg-white overflow-y-auto">
          <PatternAgentPanel
            items={[sampleStep]}
            patterns={samplePatterns}
            selectedPatternId={null}
            applySteps={[]}
            applyError={null}
            applyFailedIndex={null}
            isApplying={false}
            exporting={false}
            applyJobStatus={null}
            applyJobProgress={0}
            applyJobError={null}
            onReorder={() => {}}
            onUpdateStep={() => {}}
            onDeleteStep={() => {}}
            onHoverStep={() => {}}
            onClearHover={() => {}}
            onExportPattern={async () => true}
            onSelectPattern={() => {}}
            onDeletePattern={() => {}}
            onApplyPattern={() => {}}
            onRetryApply={() => {}}
          />
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof SpreadsheetDetailPageContent> = {
  title: 'Spreadsheets/Pages/SpreadsheetDetailPage',
  component: SpreadsheetDetailPageContent,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof SpreadsheetDetailPageContent>;

export const Default: Story = {
  render: () => <SpreadsheetDetailPageContent />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Sheet1')).toBeInTheDocument();
    await expect(canvas.getByTestId('select-all-cell')).toBeInTheDocument();
    await expect(canvas.getByText(/A1 = 1\+1/)).toBeInTheDocument();
  },
};
