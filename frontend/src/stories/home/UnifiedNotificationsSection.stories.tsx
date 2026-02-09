import React from 'react';
import UnifiedNotificationsSection from '../../components/home/UnifiedNotificationsSection';

const meta = {
  title: 'Home/UnifiedNotificationsSection',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Unified notifications section with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => {
    const redirectToLogin = () => {};

    return <UnifiedNotificationsSection onRedirectToLogin={redirectToLogin} />;
  },
};
