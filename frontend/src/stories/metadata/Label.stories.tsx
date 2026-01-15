import React from 'react';
import Label from '../../metadata/Label';

export default {
  title: 'Metadata/Label',
  component: Label,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export const Default = {
  args: {
    label: { id: '1', name: 'Bug', color: '#000000' },
    size: 'md',
    variant: 'outline',
  },
};

export const StringLabel = {
  args: {
    label: { id: 'feature', name: 'Feature', color: '#000000' },
    size: 'md',
    variant: 'outline',
  },
};

export const WithRemove = {
  args: {
    label: { id: '3', name: 'Removable Label', color: '#000000' },
    size: 'md',
    variant: 'outline',
    showRemove: true,
    onRemove: () => console.log('Label removed'),
  },
};

export const Outline = {
  args: {
    label: { id: '4', name: 'Outline Label', color: '#000000' },
    size: 'md',
    variant: 'outline',
  },
};

export const Subtle = {
  args: {
    label: { id: '5', name: 'Subtle Label', color: '#000000' },
    size: 'md',
    variant: 'outline',
  },
};


export const JiraLongNames = {
  args: {
    label: { id: 'jira-long', name: 'this-is-a-very-long-label-name', color: '#000000' },
    size: 'sm',
    variant: 'outline',
    maxWidth: '140px',
  },
};

export const Sizes = {
  render: () => (
    <div className="flex items-center gap-4">
      <Label label={{ id: '1', name: 'XS', color: '#000000' }} size="xs" variant="outline" />
      <Label label={{ id: '2', name: 'SM', color: '#000000' }} size="sm" variant="outline" />
      <Label label={{ id: '3', name: 'MD', color: '#000000' }} size="md" variant="outline" />
      <Label label={{ id: '4', name: 'LG', color: '#000000' }} size="lg" variant="outline" />
    </div>
  ),
};

export const AllVariants = {
  render: () => (
    <div className="flex flex-wrap items-center gap-4">
      <Label label={{ id: '1', name: 'Default', color: '#000000' }} variant="outline" />
      <Label label={{ id: '2', name: 'Outline', color: '#000000' }} variant="outline" />
      <Label label={{ id: '3', name: 'Subtle', color: '#000000' }} variant="outline" />
    </div>
  ),
};
