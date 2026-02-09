import React from 'react';
import WhyMediaJiraSection from '../../components/home/WhyMediaJiraSection';

const meta = {
  title: 'Home/WhyMediaJira',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Why MediaJira section with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => (
    <div>
      <WhyMediaJiraSection />
    </div>
  ),
};
