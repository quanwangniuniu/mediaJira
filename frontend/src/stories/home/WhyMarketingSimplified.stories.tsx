import React from 'react';
import WhyMarketingSimplifiedSection from '../../components/home/WhyMarketingSimplifiedSection';

const meta = {
  title: 'Home/WhyMarketingSimplified',
  parameters: {
    layout: 'fullscreen',
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024, 1280],
    },
    docs: {
      description: {
        component: 'Why Marketing Simplified section with desktop and mobile layouts.',
      },
    },
  },
  tags: ['autodocs'],
};

export default meta;

export const Default = {
  render: () => (
    <div>
      <WhyMarketingSimplifiedSection />
    </div>
  ),
};
