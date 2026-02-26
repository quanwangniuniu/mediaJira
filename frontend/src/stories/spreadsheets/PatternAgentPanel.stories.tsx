import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within } from '@storybook/test';
import { useState } from 'react';
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
    description: 'A sample workflow pattern',
    version: 1,
    createdAt: new Date().toISOString(),
  },
];

const sampleApplySteps = [
  {
    id: 'step-1',
    seq: 1,
    type: 'APPLY_FORMULA',
    params: { target: { row: 0, col: 0 }, formula: '=1+1' },
    disabled: false,
    status: 'pending' as const,
  },
];

const meta: Meta<typeof PatternAgentPanel> = {
  title: 'Spreadsheets/PatternAgentPanel',
  component: PatternAgentPanel,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
};

export default meta;

type Story = StoryObj<typeof PatternAgentPanel>;

function PatternAgentPanelDemo() {
  const [items, setItems] = useState<TimelineItem[]>([sampleStep]);
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  const [applySteps, setApplySteps] = useState(sampleApplySteps);

  return (
    <div className="w-[400px]">
      <PatternAgentPanel
        items={items}
        patterns={samplePatterns}
        selectedPatternId={selectedPatternId}
        applySteps={applySteps}
        applyError={null}
        applyFailedIndex={null}
        isApplying={false}
        exporting={false}
        applyJobStatus={null}
        applyJobProgress={0}
        applyJobError={null}
        onReorder={(next) => setItems(next)}
        onUpdateStep={() => {}}
        onDeleteStep={(id) => setItems((prev) => prev.filter((i) => (i as { id: string }).id !== id))}
        onHoverStep={() => {}}
        onClearHover={() => {}}
        onExportPattern={async () => true}
        onSelectPattern={(id) => setSelectedPatternId(id)}
        onDeletePattern={() => {}}
        onApplyPattern={() => {}}
        onRetryApply={() => {}}
      />
    </div>
  );
}

export const WithSteps: Story = {
  render: () => <PatternAgentPanelDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/A1 = 1\+1/)).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Delete step/i })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Drag to reorder/i })).toBeInTheDocument();
  },
};

export const EmptyTimeline: Story = {
  render: () => {
    const [items, setItems] = useState<TimelineItem[]>([]);
    return (
      <div className="w-[400px]">
        <PatternAgentPanel
          items={items}
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
          onReorder={setItems}
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
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Sample Pattern/)).toBeInTheDocument();
  },
};

export const DeleteStepInteraction: Story = {
  render: () => <PatternAgentPanelDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const deleteBtn = canvas.getByRole('button', { name: /Delete step/i });
    await userEvent.click(deleteBtn);
    await expect(canvas.queryByText(/A1 = 1\+1/)).toBeNull();
  },
};
