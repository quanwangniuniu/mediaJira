import React, { useState } from 'react';
import LabelPicker from '../../metadata/LabelPicker';
import { LabelData } from '../../metadata/Label';

const mockLabels: LabelData[] = [
  { id: '1', name: 'Bug', color: '#ef4444' },
  { id: '2', name: 'Feature', color: '#10b981' },
  { id: '3', name: 'Documentation', color: '#3b82f6' },
  { id: '4', name: 'Enhancement', color: '#8b5cf6' },
  { id: '5', name: 'Question', color: '#f59e0b' },
  { id: '6', name: 'Help Wanted', color: '#ec4899' },
  { id: '7', name: 'Good First Issue', color: '#14b8a6' },
  { id: '8', name: 'Priority', color: '#f97316' },
];

const jiraLabels: LabelData[] = [
  { id: 'jira-1', name: 'backend', color: '#4c9aff' },
  { id: 'jira-2', name: 'frontend', color: '#2684ff' },
  { id: 'jira-3', name: 'bug', color: '#de350b' },
  { id: 'jira-4', name: 'needs-review', color: '#6554c0' },
  { id: 'jira-5', name: 'blocked', color: '#ff5630' },
  { id: 'jira-6', name: 'refactor', color: '#36b37e' },
  { id: 'jira-7', name: 'customer', color: '#00b8d9' },
  { id: 'jira-8', name: 'performance', color: '#ffab00' },
  { id: 'jira-9', name: 'low-risk', color: '#36b37e' },
  { id: 'jira-10', name: 'needs-design', color: '#8777d9' },
];

export default {
  title: 'Metadata/LabelPicker',
  component: LabelPicker,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

const DefaultStory = () => {
  const [value, setValue] = useState<LabelData[]>([]);
  return (
    <LabelPicker
      value={value}
      onChange={setValue}
      availableLabels={mockLabels}
      placeholder="Select labels..."
    />
  );
};

export const Default = {
  render: () => <DefaultStory />,
};

const WithSelectionStory = () => {
  const [value, setValue] = useState<LabelData[]>([
    mockLabels[0],
    mockLabels[1],
  ]);
  return (
    <LabelPicker
      value={value}
      onChange={setValue}
      availableLabels={mockLabels}
      placeholder="Select labels..."
    />
  );
};

export const WithSelection = {
  render: () => <WithSelectionStory />,
};



const WithCreateStory = () => {
  const [value, setValue] = useState<LabelData[]>([]);
  const [availableLabels, setAvailableLabels] = useState<LabelData[]>(mockLabels);

  const handleCreateLabel = async (name: string): Promise<LabelData> => {
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    const newLabel: LabelData = {
      id: String(Date.now()),
      name,
      color: '#6b7280',
    };
    setAvailableLabels([...availableLabels, newLabel]);
    return newLabel;
  };

  return (
    <LabelPicker
      value={value}
      onChange={setValue}
      availableLabels={availableLabels}
      placeholder="Select or create labels..."
      allowCreate={true}
      createLabelPlaceholder="Create label"
      onCreateLabel={handleCreateLabel}
    />
  );
};

export const WithCreate = {
  render: () => <WithCreateStory />,
};

export const Loading = {
  args: {
    value: [],
    availableLabels: mockLabels,
    placeholder: 'Select labels...',
    loading: true,
    onChange: () => {},
  },
};

export const Disabled = {
  args: {
    value: [mockLabels[0], mockLabels[1]],
    availableLabels: mockLabels,
    placeholder: 'Select labels...',
    disabled: true,
    onChange: () => {},
  },
};

export const EmptyState = {
  args: {
    value: [],
    availableLabels: [],
    placeholder: 'Select labels...',
    emptyMessage: 'No labels found',
    allowCreate: false,
    onChange: () => {},
  },
};


