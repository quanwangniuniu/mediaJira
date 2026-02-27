import type { Meta, StoryObj } from '@storybook/react';
import { expect, userEvent, within, waitFor } from '@storybook/test';
import { useState } from 'react';
import PatternAgentPanel from '@/components/spreadsheets/PatternAgentPanel';
import type { TimelineItem, WorkflowPatternSummary, OperationGroup, PatternStep } from '@/types/patterns';
import { isOperationGroup } from '@/types/patterns';

const sampleStep: TimelineItem = {
  id: 'step-1',
  type: 'APPLY_FORMULA',
  target: { row: 0, col: 0 },
  a1: 'A1',
  formula: '=1+1',
  disabled: false,
  createdAt: new Date().toISOString(),
};

const sampleStep2: TimelineItem = {
  id: 'step-2',
  type: 'APPLY_FORMULA',
  target: { row: 1, col: 0 },
  a1: 'A2',
  formula: '=2*2',
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
  {
    id: 'pat-2',
    name: 'Second Pattern',
    description: 'Another pattern',
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

function updateItem(
  items: TimelineItem[],
  id: string,
  updates: Partial<{ type: string; name: string; collapsed: boolean; items: unknown[]; disabled: boolean }>
): TimelineItem[] {
  return items.map((item) => {
    if (item.id !== id) return item;
    if (isOperationGroup(item)) {
      return { ...item, ...updates } as OperationGroup;
    }
    return { ...item, ...updates } as TimelineItem;
  });
}

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
        onUpdateStep={(id, updates) => setItems((prev) => updateItem(prev, id, updates as Record<string, unknown>))}
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

export const DeleteTimelineInteraction: Story = {
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

const sampleGroup: OperationGroup = {
  id: 'group-1',
  type: 'GROUP',
  name: 'Grouped Operation',
  items: [sampleStep, sampleStep2] as PatternStep[],
  collapsed: false,
  createdAt: new Date().toISOString(),
};

function PatternAgentPanelWithGroup() {
  const [items, setItems] = useState<TimelineItem[]>([sampleGroup]);
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
        onReorder={(next) => setItems(next)}
        onUpdateStep={(id, updates) => setItems((prev) => updateItem(prev, id, updates as Record<string, unknown>))}
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
}

export const CollapseGroupInteraction: Story = {
  parameters: {
    chromatic: { disableSnapshot: true },
    docs: { description: { story: 'Collapse and expand a grouped operation.' } },
  },
  render: () => <PatternAgentPanelWithGroup />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText(/A1 = 1\+1/)).toBeInTheDocument());
    const collapseBtn = canvas.getByRole('button', { name: /Collapse panel/i });
    await userEvent.click(collapseBtn);
    await waitFor(() => expect(canvas.queryByText(/A1 = 1\+1/)).not.toBeInTheDocument());
    const expandBtn = canvas.getByRole('button', { name: /Expand panel/i });
    await userEvent.click(expandBtn);
    await waitFor(() => expect(canvas.getByText(/A1 = 1\+1/)).toBeInTheDocument());
  },
};

function PatternAgentPanelWithDeletePattern() {
  const [patterns, setPatterns] = useState<WorkflowPatternSummary[]>(samplePatterns);
  return (
    <div className="w-[400px]">
      <PatternAgentPanel
        items={[]}
        patterns={patterns}
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
        onDeletePattern={(id) => setPatterns((prev) => prev.filter((p) => p.id !== id))}
        onApplyPattern={() => {}}
        onRetryApply={() => {}}
      />
    </div>
  );
}

export const DeletePatternInteraction: Story = {
  parameters: {
    chromatic: { disableSnapshot: true },
    docs: { description: { story: 'Delete a workflow pattern from the Patterns tab.' } },
  },
  render: () => <PatternAgentPanelWithDeletePattern />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole('button', { name: /Patterns/i }));
    await waitFor(() => expect(canvas.getByText('Sample Pattern')).toBeInTheDocument());
    const deleteBtns = canvas.getAllByRole('button', { name: /Delete pattern/i });
    await userEvent.click(deleteBtns[0]);
    await waitFor(() => expect(canvas.queryByText('Sample Pattern')).not.toBeInTheDocument());
  },
};

function PatternAgentPanelWithMerge() {
  const [items, setItems] = useState<TimelineItem[]>([sampleStep, sampleStep2]);
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
        onReorder={(next) => setItems(next)}
        onUpdateStep={(id, updates) => setItems((prev) => updateItem(prev, id, updates as Record<string, unknown>))}
        onDeleteStep={(id) => setItems((prev) => prev.filter((i) => (i as { id: string }).id !== id))}
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
}

export const MergePatternsInteraction: Story = {
  parameters: {
    chromatic: { disableSnapshot: true },
    docs: { description: { story: 'Select multiple steps and merge them into a group.' } },
  },
  render: () => <PatternAgentPanelWithMerge />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText(/A1 = 1\+1/)).toBeInTheDocument());
    const selectCheckboxes = canvas.getAllByRole('checkbox', { name: /Select/i });
    await userEvent.click(selectCheckboxes[0]);
    await userEvent.click(selectCheckboxes[1]);
    const mergeBtn = canvas.getByRole('button', { name: /Merge/i });
    await userEvent.click(mergeBtn);
    await waitFor(() => expect(canvas.getByText(/Grouped Operation/i)).toBeInTheDocument());
    await expect(canvas.getByText(/A1 = 1\+1/)).toBeInTheDocument();
    await expect(canvas.getByText(/A2 = 2\*2/)).toBeInTheDocument();
  },
};
