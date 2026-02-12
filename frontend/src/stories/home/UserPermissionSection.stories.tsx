import React from 'react';
import UserPermissionSection from '../../components/home/UserPermissionSection';

const meta = {
  title: 'Home/UserPermissionSection',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'User and permission management section with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => {
    const redirectToLogin = () => {};

    return (
      <div>
        <UserPermissionSection onRedirectToLogin={redirectToLogin} />
      </div>
    );
  },
};
