import React from 'react';
import JiraPickerTrigger from '../../metadata/JiraPickerTrigger';
import { LabelData } from '../../metadata/JiraLabel';

const mockLabels: LabelData[] = [
  { id: '1', name: 'Bug' },
  { id: '2', name: 'Feature' },
  { id: '3', name: 'Documentation' },
];

export default {
  title: 'Metadata/JiraPickerTrigger',
  component: JiraPickerTrigger,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export const Empty = {
  args: {
    selectedLabels: [],
    placeholder: 'Add label',
  },
};

export const WithSelection = {
  args: {
    selectedLabels: [mockLabels[0], mockLabels[1]],
    placeholder: 'Add label',
  },
};

export const Loading = {
  args: {
    selectedLabels: [],
    placeholder: 'Add label',
    loading: true,
  },
};

export const Disabled = {
  args: {
    selectedLabels: [mockLabels[2]],
    placeholder: 'Add label',
    disabled: true,
  },
};
