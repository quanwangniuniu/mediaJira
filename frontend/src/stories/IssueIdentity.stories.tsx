import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import IssueKey from '@/components/issue/IssueKey';
import IssueTypeIcon from '@/components/issue/IssueTypeIcon';
import IssueSummary from '@/components/issue/IssueSummary';
import IssueIdentityRowLayout from '@/components/issue/IssueIdentityRow';

const meta: Meta<typeof IssueSummary> = {
  title: 'Issue/Identity',
  component: IssueSummary,
  subcomponents: { IssueKey, IssueTypeIcon },
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    className: { table: { disable: true } },
    onChange: { table: { disable: true } },
    onSave: { table: { disable: true } },
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof IssueSummary>;

function SummaryDemo({ initial }: { initial: string }) {
  const [summary, setSummary] = useState(initial);

  return <IssueSummary value={summary} onChange={setSummary} onSave={setSummary} />;
}

export const IssueKeyExample: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <IssueKey value="MEDIA-241" />
    </div>
  ),
};

export const IssueKeyClickable: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <IssueKey value="OPS-13" href="#" />
    </div>
  ),
};

export const IssueTypeIconExample: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <IssueTypeIcon type="bug" />
      <IssueTypeIcon type="task" />
      <IssueTypeIcon type="story" />
      <IssueTypeIcon type="epic" />
      <IssueTypeIcon type="spike" />
    </div>
  ),
};

export const IssueTypeIconSizes: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-2">
        <IssueTypeIcon type="bug" size="sm" />
        <IssueTypeIcon type="bug" size="md" />
      </div>
      <div className="flex items-center gap-2">
        <IssueTypeIcon type="story" size="sm" />
        <IssueTypeIcon type="story" size="md" />
      </div>
    </div>
  ),
};

export const IssueSummaryReadOnly: Story = {
  render: () => (
    <div className="w-[520px]">
      <IssueSummary
        value="Investigate checkout latency across regions"
        isReadOnly
      />
    </div>
  ),
};

export const IssueSummaryExample: Story = {
  render: () => (
    <div className="w-[520px]">
      <SummaryDemo initial="Investigate checkout latency across regions" />
    </div>
  ),
};

export const IssueSummaryMultiline: Story = {
  render: () => (
    <div className="w-[520px]">
      <IssueSummary
        defaultValue={"Investigate checkout latency across regions\\nReproduce on staging and compare logs"}
        rows={3}
      />
    </div>
  ),
};

export const IssueIdentityRowExample: Story = {
  render: () => (
    <div className="w-[560px]">
      <IssueIdentityRowLayout
        leading={
          <>
            <IssueTypeIcon type="bug" />
            <IssueKey value="MEDIA-241" />
          </>
        }
        summary={<IssueSummary defaultValue="Investigate checkout latency across regions" />}
      />
    </div>
  ),
};
