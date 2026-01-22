import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Info } from 'lucide-react';
import ProfileAboutField from '../../jiraProfile/ProfileAboutField';

const meta: Meta<typeof ProfileAboutField> = {
  title: 'JiraProfile/ProfileAboutField',
  component: ProfileAboutField,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ProfileAboutField>;

const Demo = () => {
  const [about, setAbout] = useState('Frontend engineer who loves clean UI.');
  return (
    <ProfileAboutField
      icon={<Info className="h-4 w-4" />}
      value={about}
      onSave={async (next) => setAbout(next)}
    />
  );
};

export const Default: Story = {
  render: () => <Demo />,
};

export const Empty: Story = {
  render: () => (
    <ProfileAboutField
      icon={<Info className="h-4 w-4" />}
      value=""
      onSave={async () => {}}
      placeholder="Tell others about yourself"
    />
  ),
};
