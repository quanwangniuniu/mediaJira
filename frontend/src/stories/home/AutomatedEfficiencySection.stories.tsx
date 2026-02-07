import React from 'react';
import AutomatedEfficiencySection from '../../components/home/AutomatedEfficiencySection';

const meta = {
  title: 'Home/AutomatedEfficiencySection',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Automated efficiency section with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => (
    <div>
      <AutomatedEfficiencySection />
    </div>
  ),
};
