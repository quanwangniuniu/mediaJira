import React from 'react';
import HeroSection from '../../components/home/HeroSection';

const meta = {
  title: 'Home/HeroSection',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Hero section for the home page with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => {
    const handleGetStartedClick = () => {};

    return (
      <div
        onClickCapture={(event) => {
          const target = event.target as HTMLElement | null;
          const clickable = target?.closest?.('a, button');
          if (clickable) {
            event.preventDefault();
            event.stopPropagation();
          }
        }}
      >
        <HeroSection onGetStartedClick={handleGetStartedClick} />
      </div>
    );
  },
};
