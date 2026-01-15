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
    label: { id: '1', name: 'Bug' },
    size: 'md',
  },
};

export const WithRemove = {
  args: {
    label: { id: '3', name: 'Removable Label' },
    size: 'md',
    showRemove: true,
    onRemove: () => console.log('Label removed'),
  },
};

export const Outline = {
  args: {
    label: { id: '4', name: 'Outline Label' },
    size: 'md',
    variant: 'outline',
  },
};

export const Subtle = {
  args: {
    label: { id: '5', name: 'Subtle Label' },
    size: 'md',
    variant: 'subtle',
  },
};

export const Sizes = {
  render: () => (
    <div className="flex items-center gap-4">
      <Label label={{ id: '1', name: 'XS' }} size="xs" />
      <Label label={{ id: '2', name: 'SM' }} size="sm" />
      <Label label={{ id: '3', name: 'MD' }} size="md" />
      <Label label={{ id: '4', name: 'LG' }} size="lg" />
    </div>
  ),
};
