import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within, waitFor } from '@storybook/test';
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
    docs: {
      description: {
        component:
          'Side panel for the spreadsheet detail page. Shows a timeline of formula steps (apply, reorder, delete), workflow patterns to apply, and export. Used alongside SpreadsheetGrid.',
      },
    },
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
  parameters: {
    docs: { description: { story: 'Timeline with formula steps (e.g. A1 = 1+1), delete and reorder controls.' } },
  },
  render: () => <PatternAgentPanelDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/A1 = 1\+1/)).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Delete step/i })).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: /Drag to reorder/i })).toBeInTheDocument();
  },
};

export const EmptyTimeline: Story = {
  parameters: {
    docs: { description: { story: 'Empty state when no formula steps exist yet.' } },
  },
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
    await waitFor(() => expect(canvas.getByText(/No formula steps yet/)).toBeInTheDocument());
  },
};

export const DeleteStepInteraction: Story = {
  parameters: {
    chromatic: { disableSnapshot: true },
    docs: { description: { story: 'Click Delete step to remove a formula from the timeline.' } },
  },
  render: () => <PatternAgentPanelDemo />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByRole('button', { name: /Delete step/i })).toBeInTheDocument());
    const deleteBtn = canvas.getByRole('button', { name: /Delete step/i });
    await userEvent.click(deleteBtn);
    await waitFor(() => expect(canvas.queryByText(/A1 = 1\+1/)).toBeNull());
  },
};

function PatternAgentPanelWithPatterns() {
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null);
  return (
    <div className="w-[400px]">
      <PatternAgentPanel
        items={[]}
        patterns={samplePatterns}
        selectedPatternId={selectedPatternId}
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
        onSelectPattern={(id) => setSelectedPatternId(id)}
        onDeletePattern={() => {}}
        onApplyPattern={() => {}}
        onRetryApply={() => {}}
      />
    </div>
  );
}

export const SelectPatternInteraction: Story = {
  parameters: {
    chromatic: { disableSnapshot: true },
    docs: { description: { story: 'Open Patterns tab and select a workflow pattern to apply.' } },
  },
  render: () => <PatternAgentPanelWithPatterns />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Patterns/i }));
    await waitFor(() => expect(canvas.getByText('Sample Pattern')).toBeInTheDocument());
    const patternText = canvas.getByText('Sample Pattern');
    const patternButton = patternText.closest('button');
    expect(patternButton).toBeTruthy();
    await userEvent.click(patternButton!);
    await waitFor(() => {
      const container = patternButton!.closest('div');
      expect(container?.className).toContain('border-blue-500');
    });
  },
};
