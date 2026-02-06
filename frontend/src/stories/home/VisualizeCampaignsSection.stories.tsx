import React from 'react';
import VisualizeCampaignsSection from '../../components/home/VisualizeCampaignsSection';

const meta = {
  title: 'Home/VisualizeCampaignsSection',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Visualize campaigns section with desktop and mobile layouts.',
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
        <VisualizeCampaignsSection onRedirectToLogin={redirectToLogin} />
      </div>
    );
  },
};
