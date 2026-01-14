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

export const Default = {
  render: () => {
    const [value, setValue] = useState<PriorityValue>(null);
    return (
      <PrioritySelector
        value={value}
        onChange={setValue}
        placeholder="Select priority..."
      />
    );
  },
};

export const WithSelection = {
  render: () => {
    const [value, setValue] = useState<PriorityValue>('HIGH');
    return (
      <PrioritySelector
        value={value}
        onChange={setValue}
        placeholder="Select priority..."
      />
    );
  },
};

export const Critical = {
  render: () => {
    const [value, setValue] = useState<PriorityValue>('CRITICAL');
    return (
      <PrioritySelector
        value={value}
        onChange={setValue}
        placeholder="Select priority..."
      />
    );
  },
};

export const Medium = {
  render: () => {
    const [value, setValue] = useState<PriorityValue>('MEDIUM');
    return (
      <PrioritySelector
        value={value}
        onChange={setValue}
        placeholder="Select priority..."
      />
    );
  },
};

export const Low = {
  render: () => {
    const [value, setValue] = useState<PriorityValue>('LOW');
    return (
      <PrioritySelector
        value={value}
        onChange={setValue}
        placeholder="Select priority..."
      />
    );
  },
};

export const None = {
  render: () => {
    const [value, setValue] = useState<PriorityValue>('NONE');
    return (
      <PrioritySelector
        value={value}
        onChange={setValue}
        placeholder="Select priority..."
      />
    );
  },
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

export const WithoutIcon = {
  render: () => {
    const [value, setValue] = useState<PriorityValue>('HIGH');
    return (
      <PrioritySelector
        value={value}
        onChange={setValue}
        placeholder="Select priority..."
        showIcon={false}
      />
    );
  },
};
