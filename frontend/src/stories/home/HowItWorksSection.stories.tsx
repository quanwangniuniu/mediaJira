import React from 'react';
import HowItWorksSection from '../../components/home/HowItWorksSection';

const meta = {
  title: 'Home/HowItWorksSection',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'How it works section with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => {
    const handleGetStartedClick = () => {};

    return <HowItWorksSection onGetStartedClick={handleGetStartedClick} />;
  },
};
