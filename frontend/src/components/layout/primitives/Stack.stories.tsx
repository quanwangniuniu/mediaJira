import React from 'react';
import Stack from './Stack';

export default {
  title: 'Layout/Primitives/Stack',
  component: Stack,
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
          'Stack is a component that arranges its children vertically (in a column) with consistent spacing between them. It provides vertical layout with automatic spacing, essentially a wrapper around `flex flex-col` with a `gap-*` utility.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    spacing: {
      control: 'select',
      options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'],
      description:
        'Vertical spacing between children. Controls the gap between stacked items.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'md' },
        category: 'Layout',
      },
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end', 'stretch'],
      description:
        'Horizontal alignment of children. Controls how items are aligned horizontally within the stack.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'stretch' },
        category: 'Layout',
      },
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the stack container.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
        category: 'Styling',
      },
    },
    children: {
      control: false,
      description: 'Child elements to stack vertically.',
      table: {
        type: { summary: 'ReactNode' },
        category: 'Content',
      },
    },
  },
};

// Sample items for demonstration
const SampleItem = ({
  label,
  color = 'bg-blue-100',
  className = '',
}: {
  label: string;
  color?: string;
  className?: string;
}) => (
  <div
    className={`${color} border border-blue-300 rounded p-4 text-center min-w-[200px] ${className}`}
  >
    {label}
  </div>
);

// Default story
export const Default = {
  args: {
    spacing: 'md',
    align: 'stretch',
    children: (
      <>
        <SampleItem label="Item 1" />
        <SampleItem label="Item 2" />
        <SampleItem label="Item 3" />
      </>
    ),
  },
};

// Spacing variations
export const SpacingNone = {
  args: {
    spacing: 'none',
    children: (
      <>
        <SampleItem label="No spacing" />
        <SampleItem label="Between items" />
        <SampleItem label="Very tight" />
      </>
    ),
  },
};

export const SpacingXS = {
  args: {
    spacing: 'xs',
    children: (
      <>
        <SampleItem label="Extra small spacing" />
        <SampleItem label="4px gap" />
        <SampleItem label="Tight layout" />
      </>
    ),
  },
};

export const SpacingSM = {
  args: {
    spacing: 'sm',
    children: (
      <>
        <SampleItem label="Small spacing" />
        <SampleItem label="8px gap" />
        <SampleItem label="Compact layout" />
      </>
    ),
  },
};

export const SpacingMD = {
  args: {
    spacing: 'md',
    children: (
      <>
        <SampleItem label="Medium spacing" />
        <SampleItem label="16px gap (default)" />
        <SampleItem label="Standard layout" />
      </>
    ),
  },
};

export const SpacingLG = {
  args: {
    spacing: 'lg',
    children: (
      <>
        <SampleItem label="Large spacing" />
        <SampleItem label="24px gap" />
        <SampleItem label="Spacious layout" />
      </>
    ),
  },
};

export const SpacingXL = {
  args: {
    spacing: 'xl',
    children: (
      <>
        <SampleItem label="Extra large spacing" />
        <SampleItem label="32px gap" />
        <SampleItem label="Very spacious" />
      </>
    ),
  },
};

// Alignment variations
export const AlignStart = {
  args: {
    spacing: 'md',
    align: 'start',
    children: (
      <>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 text-center w-32">
          Left aligned
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 text-center w-40">
          All items
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 text-center w-24">
          Start position
        </div>
      </>
    ),
  },
};

export const AlignCenter = {
  args: {
    spacing: 'md',
    align: 'center',
    children: (
      <>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 text-center w-32">
          Center aligned
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 text-center w-40">
          All items
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 text-center w-24">
          Centered
        </div>
      </>
    ),
  },
};

export const AlignEnd = {
  args: {
    spacing: 'md',
    align: 'end',
    children: (
      <>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 text-center w-32">
          Right aligned
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 text-center w-40">
          All items
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-4 text-center w-24">
          End position
        </div>
      </>
    ),
  },
};

export const AlignStretch = {
  args: {
    spacing: 'md',
    align: 'stretch',
    children: (
      <>
        <SampleItem label="Stretched to full width" />
        <SampleItem label="All items stretch" />
        <SampleItem label="Default behavior" />
      </>
    ),
  },
};

// Real-world examples
export const FormLayout = {
  args: {
    spacing: 'lg',
    children: (
      <>
        <div>
          <label htmlFor="name-input" className="block text-sm font-medium mb-1">
            Name
          </label>
          <input
            id="name-input"
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="Enter your name"
          />
        </div>
        <div>
          <label
            htmlFor="email-input"
            className="block text-sm font-medium mb-1"
          >
            Email
          </label>
          <input
            id="email-input"
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="Enter your email"
          />
        </div>
        <div>
          <label
            htmlFor="message-input"
            className="block text-sm font-medium mb-1"
          >
            Message
          </label>
          <textarea
            id="message-input"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="Enter your message"
            rows={4}
          />
        </div>
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Submit
        </button>
      </>
    ),
  },
};

export const CardList = {
  args: {
    spacing: 'md',
    children: (
      <>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold mb-2">Card 1</h3>
          <p className="text-gray-600 text-sm">
            This is the first card in the stack.
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold mb-2">Card 2</h3>
          <p className="text-gray-600 text-sm">
            This is the second card in the stack.
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <h3 className="font-semibold mb-2">Card 3</h3>
          <p className="text-gray-600 text-sm">
            This is the third card in the stack.
          </p>
        </div>
      </>
    ),
  },
};

export const CenteredContent = {
  args: {
    spacing: 'sm',
    align: 'center',
    children: (
      <>
        <h2 className="text-2xl font-bold">Centered Title</h2>
        <p className="text-gray-600 max-w-md text-center">
          This content is centered both horizontally and has consistent vertical
          spacing.
        </p>
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Action Button
        </button>
      </>
    ),
  },
};

export const WithCustomClassName = {
  args: {
    spacing: 'md',
    className: 'bg-gray-50 p-6 rounded-lg border border-gray-200',
    children: (
      <>
        <SampleItem label="Custom background" />
        <SampleItem label="With padding" />
        <SampleItem label="And border" />
      </>
    ),
  },
};

export const NestedStacks = {
  args: {
    spacing: 'lg',
    children: (
      <>
        <div className="bg-blue-50 p-4 rounded border border-blue-200">
          <h3 className="font-semibold mb-2">Section 1</h3>
          <Stack spacing="sm">
            <div className="text-sm">Nested item 1</div>
            <div className="text-sm">Nested item 2</div>
          </Stack>
        </div>
        <div className="bg-green-50 p-4 rounded border border-green-200">
          <h3 className="font-semibold mb-2">Section 2</h3>
          <Stack spacing="sm">
            <div className="text-sm">Nested item 1</div>
            <div className="text-sm">Nested item 2</div>
          </Stack>
        </div>
      </>
    ),
  },
};

