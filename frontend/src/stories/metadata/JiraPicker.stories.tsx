import React, { useState } from 'react';
import JiraPicker from '../../metadata/JiraPicker';
import { LabelData } from '../../metadata/JiraLabel';

const mockLabels: LabelData[] = [
  { id: '1', name: 'Bug' },
  { id: '2', name: 'Feature' },
  { id: '3', name: 'Documentation' },
  { id: '4', name: 'Enhancement' },
  { id: '5', name: 'Question' },
  { id: '6', name: 'Help Wanted' },
];

export default {
  title: 'Metadata/JiraPicker',
  component: JiraPicker,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

const DefaultStory = () => {
  const [value, setValue] = useState<LabelData[]>([]);
  return (
    <JiraPicker
      value={value}
      onChange={setValue}
      availableLabels={mockLabels}
      placeholder="Add label"
    />
  );
};

export const Default = {
  render: () => <DefaultStory />,
};

const WithSelectionStory = () => {
  const [value, setValue] = useState<LabelData[]>([mockLabels[0], mockLabels[1]]);
  return (
    <JiraPicker
      value={value}
      onChange={setValue}
      availableLabels={mockLabels}
      placeholder="Add label"
    />
  );
};

export const WithSelection = {
  render: () => <WithSelectionStory />,
};

const SingleSelectStory = () => {
  const [value, setValue] = useState<LabelData[]>([]);
  return (
    <JiraPicker
      value={value}
      onChange={setValue}
      availableLabels={mockLabels}
      placeholder="Add label"
      multiple={false}
    />
  );
};

export const SingleSelect = {
  render: () => <SingleSelectStory />,
};

const WithCreateStory = () => {
  const [value, setValue] = useState<LabelData[]>([]);
  const [availableLabels, setAvailableLabels] = useState<LabelData[]>(mockLabels);

  const handleCreateLabel = async (name: string): Promise<LabelData> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const newLabel: LabelData = { id: String(Date.now()), name };
    setAvailableLabels([...availableLabels, newLabel]);
    return newLabel;
  };

  return (
    <JiraPicker
      value={value}
      onChange={setValue}
      availableLabels={availableLabels}
      placeholder="Add label"
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
    placeholder: 'Add label',
    loading: true,
    onChange: () => {},
  },
};

export const Disabled = {
  args: {
    value: [mockLabels[0], mockLabels[1]],
    availableLabels: mockLabels,
    placeholder: 'Add label',
    disabled: true,
    onChange: () => {},
  },
};

export const EmptyState = {
  args: {
    value: [],
    availableLabels: [],
    placeholder: 'Add label',
    emptyMessage: 'No labels found',
    allowCreate: false,
    onChange: () => {},
  },
};

const ManyLabelsStory = () => {
  const [value, setValue] = useState<LabelData[]>([]);
  const manyLabels: LabelData[] = Array.from({ length: 20 }, (_, i) => ({
    id: String(i + 1),
    name: `Label ${i + 1}`,
  }));

  return (
    <JiraPicker
      value={value}
      onChange={setValue}
      availableLabels={manyLabels}
      placeholder="Add label"
      maxDisplayed={2}
    />
  );
};

export const ManyLabels = {
  render: () => <ManyLabelsStory />,
};
