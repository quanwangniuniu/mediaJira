import React, { useState } from 'react';
import IssueField from '../../issue_field_pattern/IssueField';

export default {
  title: 'IssueFieldPattern/IssueField',
  component: IssueField,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

const EditableStory = () => {
  const [value, setValue] = useState('In Progress');
  const [editing, setEditing] = useState(false);
  return (
    <IssueField
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
