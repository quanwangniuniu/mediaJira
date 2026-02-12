import React from 'react';
import InsightfulAnalyticsSection from '../../components/home/InsightfulAnalyticsSection';

const meta = {
  title: 'Home/InsightfulAnalyticsSection',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Insightful analytics section with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => {
    const redirectToLogin = () => {};

    return <InsightfulAnalyticsSection onRedirectToLogin={redirectToLogin} />;
  },
};
