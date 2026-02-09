import React from 'react';
import FooterSection from '../../components/home/FooterSection';

const meta = {
  title: 'Home/Footer',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Footer section with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => (
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
      <FooterSection />
    </div>
  ),
};
