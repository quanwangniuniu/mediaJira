import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ProfileAbout from '../../jiraProfile/ProfileAbout';

const meta: Meta<typeof ProfileAbout> = {
  title: 'JiraProfile/ProfileAbout',
  component: ProfileAbout,
  parameters: {
    layout: 'padded',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof ProfileAbout>;

const Demo = () => {
  const [job, setJob] = useState('');
  const [department, setDepartment] = useState('');
  const [organization, setOrganization] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  return (
    <ProfileAbout
      job={job}
      department={department}
      organization={organization}
      location={location}
      email={email}
      onSaveJob={async (next) => setJob(next)}
      onSaveDepartment={async (next) => setDepartment(next)}
      onSaveOrganization={async (next) => setOrganization(next)}
      onSaveLocation={async (next) => setLocation(next)}
      onSaveEmail={async (next) => setEmail(next)}
    />
  );
};

export const Default: Story = {
  render: () => <Demo />,
};

export const Empty: Story = {
  render: () => (
    <ProfileAbout
      job=""
      department=""
      organization=""
      location=""
      email=""
      onSaveJob={async () => {}}
      onSaveDepartment={async () => {}}
      onSaveOrganization={async () => {}}
      onSaveLocation={async () => {}}
      onSaveEmail={async () => {}}
    />
  ),
};
