import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import EditableField from '../../jiraProfile/ProfileEditableField';

const meta: Meta<typeof EditableField<string>> = {
  title: 'JiraProfile/EditableField',
  component: EditableField,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof EditableField<string>>;

export const SaveSuccess: Story = {
  render: () => {
    const [value, setValue] = useState('Frontend');
    return (
      <EditableField
        value={value}
        onSave={async (next) => setValue(next)}
        renderView={(current) => <p className="text-sm text-gray-600">{current}</p>}
        renderEdit={(current, onChange) => (
          <input
            className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700"
            value={current}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      />
    );
  },
};

export const SaveLoading: Story = {
  render: () => {
    const [value, setValue] = useState('Frontend');
    return (
      <EditableField
        value={value}
        onSave={(next) => new Promise<void>((resolve) => setTimeout(() => {
            setValue(next);
            resolve();
          }, 1200))}
        renderView={(current) => <p className="text-sm text-gray-600">{current}</p>}
        renderEdit={(current, onChange) => (
          <input
            className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700"
            value={current}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      />
    );
  },
};

export const SaveError: Story = {
  render: () => {
    const [value, setValue] = useState('Frontend');
    return (
      <EditableField
        value={value}
        onSave={async () => {
          throw new Error('Unable to save right now');
        }}
        renderView={(current) => <p className="text-sm text-gray-600">{current}</p>}
        renderEdit={(current, onChange) => (
          <input
            className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700"
            value={current}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
      />
    );
  },
};
