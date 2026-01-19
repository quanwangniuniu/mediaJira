import React, { useMemo, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import JiraAssigneeField from '../../jira_field_implementation/JiraAssigneeField';
import JiraDescriptionField from '../../jira_field_implementation/JiraDescriptionField';
import JiraLabelsField from '../../jira_field_implementation/JiraLabelsField';
import JiraPriorityField from '../../jira_field_implementation/JiraPriorityField';
import JiraStatusField from '../../jira_field_implementation/JiraStatusField';
import type { AssigneeValue, RecentUser, User } from '../../people/AssigneeSelector';
import type { PriorityValue } from '../../priority/PriorityIcon';
import { useJiraFieldController } from '../../jira_field_controller/useJiraFieldController';

type IssueFields = {
  status: string | null;
  assignee: AssigneeValue;
  priority: PriorityValue;
  labels: string[];
  description: string;
};

const users: User[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Designer' },
  { id: '2', name: 'Leo Park', email: 'leo@example.com', role: 'Engineer' },
  { id: '3', name: 'Mina Xu', email: 'mina@example.com', role: 'PM' },
];

const recentUsers: RecentUser[] = [
  {
    id: '2',
    name: 'Leo Park',
    email: 'leo@example.com',
    role: 'Engineer',
    lastUsedAt: new Date().toISOString(),
    lastAssignedAt: new Date().toISOString(),
    assignmentCount: 3,
  },
];

const meta: Meta = {
  title: 'JiraFieldPattern/JiraFieldController',
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

const ControllerDemo = () => {
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  const controller = useJiraFieldController<IssueFields>({
    initialValues: {
      status: 'in_review',
      assignee: '2',
      priority: 'HIGH',
      labels: ['frontend', 'jira'],
      description: 'Add Jira-like field behaviors.',
    },
    updateFieldApi: async (fieldKey, value) => {
<<<<<<< Updated upstream
      
=======
      // Simulate network latency and occasional failure to demonstrate rollback.
>>>>>>> Stashed changes
      await new Promise((resolve) => setTimeout(resolve, 700));
      if (fieldKey === 'priority' && value === 'LOWEST') {
        throw new Error('Priority update failed');
      }
      return value;
    },
    fieldConfigs: {
      status: { commit: 'immediate' },
      assignee: { commit: 'immediate' },
      priority: { commit: 'immediate' },
      labels: { commit: 'blur' },
      description: { commit: 'explicit', preserveDraftOnError: true },
    },
  });

  const statusState = controller.getFieldState('status');
  const assigneeState = controller.getFieldState('assignee');
  const priorityState = controller.getFieldState('priority');
  const labelsState = controller.getFieldState('labels');
  const descriptionState = controller.getFieldState('description');

  const labelsValue = useMemo(() => {
    return labelsState.optimisticValue ?? labelsState.draftValue ?? labelsState.committedValue;
  }, [labelsState]);

  return (
    <div className="flex w-[560px] flex-col gap-4">
      <JiraStatusField
        value={statusState.value}
        isLoading={statusState.isSaving}
        error={statusState.error ?? undefined}
        onChange={(next) => controller.updateField('status', next)}
      />
      <JiraAssigneeField
        users={users}
        recentUsers={recentUsers}
        value={assigneeState.value}
        isLoading={assigneeState.isSaving}
        error={assigneeState.error ?? undefined}
        onChange={(next) => controller.updateField('assignee', next)}
      />
      <JiraPriorityField
        value={priorityState.value}
        isLoading={priorityState.isSaving}
        error={priorityState.error ?? undefined}
        onChange={(next) => controller.updateField('priority', next)}
      />
      <JiraLabelsField
        labels={labelsValue}
        isLoading={labelsState.isSaving}
        error={labelsState.error ?? undefined}
        onChange={(next) => controller.setFieldDraft('labels', next)}
        onCommit={(next) => controller.updateField('labels', next)}
      />
      <JiraDescriptionField
        value={descriptionState.committedValue}
        isEditing={isEditingDescription}
        isLoading={descriptionState.isSaving}
        error={descriptionState.error ?? undefined}
        onEditStart={() => setIsEditingDescription(true)}
        onCancel={() => setIsEditingDescription(false)}
        onSave={async (nextValue) => {
          const success = await controller.updateField('description', nextValue);
          if (success) {
            setIsEditingDescription(false);
          }
        }}
      />
    </div>
  );
};

export const Default: Story = {
  render: () => <ControllerDemo />,
};
