import React, { useState } from 'react';
import JiraField from '../../jira_field_pattern/JiraField';

export default {
  title: 'JiraFieldPattern/JiraField',
  component: JiraField,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

const EditableStory = () => {
  const [value, setValue] = useState('In Progress');
  const [editing, setEditing] = useState(false);
  return (
    <JiraField
      label="Status"
      value={value}
      valueText={value}
      editable
      isEditing={editing}
      onEditStart={() => setEditing(true)}
      onEditCancel={() => setEditing(false)}
      onEditSave={(next) => {
        setValue(next);
        setEditing(false);
      }}
    />
  );
};

export const Default = {
  render: () => <EditableStory />,
};

export const Empty = {
  args: {
    label: 'Assignee',
    value: '',
    valueText: '',
    editable: true,
    emptyText: 'Unassigned',
  },
};

export const Loading = {
  args: {
    label: 'Priority',
    value: 'High',
    isLoading: true,
  },
};

export const Error = {
  args: {
    label: 'Summary',
    value: 'Cannot save',
    editable: true,
    error: 'Permission denied',
  },
};
