import React, { useState } from 'react';
import PrioritySelector from '../../priority/PrioritySelector';
import { PriorityValue } from '../../priority/PriorityIcon';

export default {
  title: 'Priority/PrioritySelector',
  component: PrioritySelector,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

const DefaultStory = () => {
  const [value, setValue] = useState<PriorityValue>(null);
  return (
    <PrioritySelector
      value={value}
      onChange={setValue}
      placeholder="Select priority..."
    />
  );
};

export const Default = {
  render: () => <DefaultStory />,
};

const WithSelectionStory = () => {
  const [value, setValue] = useState<PriorityValue>('HIGH');
  return (
    <PrioritySelector
      value={value}
      onChange={setValue}
      placeholder="Select priority..."
    />
  );
};

export const WithSelection = {
  render: () => <WithSelectionStory />,
};

const HighestStory = () => {
  const [value, setValue] = useState<PriorityValue>('HIGHEST');
  return (
    <PrioritySelector
      value={value}
      onChange={setValue}
      placeholder="Select priority..."
    />
  );
};

export const Highest = {
  render: () => <HighestStory />,
};

const MediumStory = () => {
  const [value, setValue] = useState<PriorityValue>('MEDIUM');
  return (
    <PrioritySelector
      value={value}
      onChange={setValue}
      placeholder="Select priority..."
    />
  );
};

export const Medium = {
  render: () => <MediumStory />,
};

const LowStory = () => {
  const [value, setValue] = useState<PriorityValue>('LOW');
  return (
    <PrioritySelector
      value={value}
      onChange={setValue}
      placeholder="Select priority..."
    />
  );
};

export const Low = {
  render: () => <LowStory />,
};

const LowestStory = () => {
  const [value, setValue] = useState<PriorityValue>('LOWEST');
  return (
    <PrioritySelector
      value={value}
      onChange={setValue}
      placeholder="Select priority..."
    />
  );
};

export const Lowest = {
  render: () => <LowestStory />,
};

export const Loading = {
  args: {
    value: null,
    placeholder: 'Select priority...',
    loading: true,
    onChange: () => {},
  },
};

export const Disabled = {
  args: {
    value: 'HIGH',
    placeholder: 'Select priority...',
    disabled: true,
    onChange: () => {},
  },
};

const WithoutIconStory = () => {
  const [value, setValue] = useState<PriorityValue>('HIGH');
  return (
    <PrioritySelector
      value={value}
      onChange={setValue}
      placeholder="Select priority..."
      showIcon={false}
    />
  );
};

export const WithoutIcon = {
  render: () => <WithoutIconStory />,
};
