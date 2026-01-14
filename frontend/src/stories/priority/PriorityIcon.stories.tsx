import React from 'react';
import PriorityIcon from '../../priority/PriorityIcon';

export default {
  title: 'Priority/PriorityIcon',
  component: PriorityIcon,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export const Critical = {
  args: {
    priority: 'CRITICAL',
    size: 'md',
  },
};

export const High = {
  args: {
    priority: 'HIGH',
    size: 'md',
  },
};

export const Medium = {
  args: {
    priority: 'MEDIUM',
    size: 'md',
  },
};

export const Low = {
  args: {
    priority: 'LOW',
    size: 'md',
  },
};

export const None = {
  args: {
    priority: 'NONE',
    size: 'md',
  },
};

export const WithLabel = {
  args: {
    priority: 'HIGH',
    size: 'md',
    showLabel: true,
  },
};

export const WithTooltip = {
  args: {
    priority: 'CRITICAL',
    size: 'md',
    showTooltip: true,
  },
};

export const Sizes = {
  render: () => (
    <div className="flex items-center gap-4">
      <PriorityIcon priority="HIGH" size="xs" />
      <PriorityIcon priority="HIGH" size="sm" />
      <PriorityIcon priority="HIGH" size="md" />
      <PriorityIcon priority="HIGH" size="lg" />
    </div>
  ),
};

export const AllPriorities = {
  render: () => (
    <div className="flex items-center gap-4">
      <PriorityIcon priority="CRITICAL" size="md" />
      <PriorityIcon priority="HIGH" size="md" />
      <PriorityIcon priority="MEDIUM" size="md" />
      <PriorityIcon priority="LOW" size="md" />
      <PriorityIcon priority="NONE" size="md" />
    </div>
  ),
};
