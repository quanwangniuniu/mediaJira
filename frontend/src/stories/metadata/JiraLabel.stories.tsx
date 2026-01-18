import React from 'react';
import JiraLabel from '../../metadata/JiraLabel';

export default {
  title: 'Metadata/JiraLabel',
  component: JiraLabel,
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
      <JiraLabel label={{ id: '1', name: 'XS' }} size="xs" />
      <JiraLabel label={{ id: '2', name: 'SM' }} size="sm" />
      <JiraLabel label={{ id: '3', name: 'MD' }} size="md" />
      <JiraLabel label={{ id: '4', name: 'LG' }} size="lg" />
    </div>
  ),
};
