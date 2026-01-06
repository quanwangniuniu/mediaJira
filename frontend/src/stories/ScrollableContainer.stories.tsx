import React from 'react';
import ScrollableContainer from '../components/layout/primitives/ScrollableContainer';

export default {
  title: 'Layout/Primitives/ScrollableContainer',
  component: ScrollableContainer,
  parameters: {
    layout: 'padded',
    // Visual testing: Ensures consistent rendering
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024],
    },
    // Documentation: Auto-generates docs
    docs: {
      description: {
        component:
          'ScrollableContainer is a component that makes its content scrollable when it exceeds the container\'s dimensions.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    direction: {
      control: 'select',
      options: ['vertical', 'horizontal', 'both'],
      description:
        'Scroll direction. Controls which direction(s) the content can scroll.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'vertical' },
        category: 'Layout',
      },
    },
    maxHeight: {
      control: 'text',
      description:
        'Maximum height of the container. When exceeded, content becomes scrollable. Accepts CSS values like "400px", "50vh", etc.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'undefined' },
        category: 'Layout',
      },
    },
    maxWidth: {
      control: 'text',
      description:
        'Maximum width of the container. When exceeded, content becomes scrollable. Accepts CSS values like "300px", "50vw", etc.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'undefined' },
        category: 'Layout',
      },
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the scrollable container.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
        category: 'Styling',
      },
    },
    children: {
      control: false,
      description: 'Content to make scrollable.',
      table: {
        type: { summary: 'ReactNode' },
        category: 'Content',
      },
    },
  },
};

// Default Story
export const Default = {
  args: {
    direction: 'vertical',
    maxHeight: '400px',
    children: (
      <>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 1
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 2
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 3
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 4
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 5
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 6
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 7
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 8
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 9
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 10
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 11
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 12
        </div>
      </>
    ),
  },
};

// VerticalScroll
export const VerticalScroll = {
  args: {
    direction: 'vertical',
    maxHeight: '300px',
    children: (
      <>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 1 - Scroll down to see more
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 2
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 3
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 4
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 5
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 6
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 7
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 8
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 9
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 mb-2">
          Item 10
        </div>
      </>
    ),
  },
};

// HorizontalScroll
export const HorizontalScroll = {
  args: {
    direction: 'horizontal',
    maxWidth: '400px',
    children: (
      <div className="flex" style={{ width: '800px' }}>
        <div
          className="bg-green-100 border border-green-300 rounded p-4 mr-2 flex-shrink-0"
          style={{ width: '150px' }}
        >
          Item 1
        </div>
        <div
          className="bg-green-100 border border-green-300 rounded p-4 mr-2 flex-shrink-0"
          style={{ width: '150px' }}
        >
          Item 2
        </div>
        <div
          className="bg-green-100 border border-green-300 rounded p-4 mr-2 flex-shrink-0"
          style={{ width: '150px' }}
        >
          Item 3
        </div>
        <div
          className="bg-green-100 border border-green-300 rounded p-4 mr-2 flex-shrink-0"
          style={{ width: '150px' }}
        >
          Item 4
        </div>
        <div
          className="bg-green-100 border border-green-300 rounded p-4 mr-2 flex-shrink-0"
          style={{ width: '150px' }}
        >
          Item 5
        </div>
        <div
          className="bg-green-100 border border-green-300 rounded p-4 mr-2 flex-shrink-0"
          style={{ width: '150px' }}
        >
          Item 6
        </div>
      </div>
    ),
  },
};

// WithMaxHeight
export const WithMaxHeight = {
  args: {
    direction: 'vertical',
    maxHeight: '250px',
    children: (
      <>
        <div className="bg-purple-100 border border-purple-300 rounded p-4 mb-2">
          Content 1 - Max height is 250px
        </div>
        <div className="bg-purple-100 border border-purple-300 rounded p-4 mb-2">
          Content 2
        </div>
        <div className="bg-purple-100 border border-purple-300 rounded p-4 mb-2">
          Content 3
        </div>
        <div className="bg-purple-100 border border-purple-300 rounded p-4 mb-2">
          Content 4
        </div>
        <div className="bg-purple-100 border border-purple-300 rounded p-4 mb-2">
          Content 5
        </div>
        <div className="bg-purple-100 border border-purple-300 rounded p-4 mb-2">
          Content 6
        </div>
        <div className="bg-purple-100 border border-purple-300 rounded p-4 mb-2">
          Content 7
        </div>
        <div className="bg-purple-100 border border-purple-300 rounded p-4 mb-2">
          Content 8
        </div>
      </>
    ),
  },
};

// WithMaxWidth
export const WithMaxWidth = {
  args: {
    direction: 'horizontal',
    maxWidth: '300px',
    children: (
      <div className="flex" style={{ width: '600px' }}>
        <div
          className="bg-orange-100 border border-orange-300 rounded p-4 mr-2 flex-shrink-0"
          style={{ width: '120px' }}
        >
          Card 1
        </div>
        <div
          className="bg-orange-100 border border-orange-300 rounded p-4 mr-2 flex-shrink-0"
          style={{ width: '120px' }}
        >
          Card 2
        </div>
        <div
          className="bg-orange-100 border border-orange-300 rounded p-4 mr-2 flex-shrink-0"
          style={{ width: '120px' }}
        >
          Card 3
        </div>
        <div
          className="bg-orange-100 border border-orange-300 rounded p-4 mr-2 flex-shrink-0"
          style={{ width: '120px' }}
        >
          Card 4
        </div>
        <div
          className="bg-orange-100 border border-orange-300 rounded p-4 mr-2 flex-shrink-0"
          style={{ width: '120px' }}
        >
          Card 5
        </div>
      </div>
    ),
  },
};
