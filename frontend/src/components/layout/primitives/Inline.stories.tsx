import React from 'react';
import Inline from './Inline';

export default {
  title: 'Layout/Primitives/Inline',
  component: Inline,
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
          'Inline is a component that arranges its children horizontally (in a row) with consistent spacing between them. It provides horizontal layout with automatic spacing, essentially a wrapper around `flex flex-row` with a `gap-*` utility.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    spacing: {
      control: 'select',
      options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'],
      description:
        'Horizontal spacing between children. Controls the gap between inline items.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'md' },
        category: 'Layout',
      },
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end', 'baseline', 'stretch'],
      description:
        'Vertical alignment of children. Controls how items are aligned vertically within the inline container.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'center' },
        category: 'Layout',
      },
    },
    justify: {
      control: 'select',
      options: ['start', 'center', 'end', 'between', 'around', 'evenly'],
      description:
        'Horizontal justification of children. Controls how items are distributed horizontally within the inline container.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'start' },
        category: 'Layout',
      },
    },
    wrap: {
      control: 'boolean',
      description:
        'Whether items should wrap to the next line when they exceed the container width.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'Layout',
      },
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the inline container.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
        category: 'Styling',
      },
    },
    children: {
      control: false,
      description: 'Child elements to arrange horizontally.',
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
  height = 'h-16',
}: {
  label: string;
  color?: string;
  className?: string;
  height?: string;
}) => (
  <div
    className={`${color} border border-blue-300 rounded p-4 text-center min-w-[100px] ${height} flex items-center justify-center ${className}`}
  >
    {label}
  </div>
);

// Default story
export const Default = {
  args: {
    spacing: 'md',
    align: 'center',
    justify: 'start',
    wrap: false,
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
        <SampleItem label="Extra small" />
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
        <SampleItem label="Compact" />
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
        <SampleItem label="Standard" />
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
        <SampleItem label="Spacious" />
      </>
    ),
  },
};

export const SpacingXL = {
  args: {
    spacing: 'xl',
    children: (
      <>
        <SampleItem label="Extra large" />
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
        <SampleItem label="Top" height="h-12" />
        <SampleItem label="Middle" height="h-20" />
        <SampleItem label="Bottom" height="h-16" />
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
        <SampleItem label="Top" height="h-12" />
        <SampleItem label="Middle" height="h-20" />
        <SampleItem label="Bottom" height="h-16" />
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
        <SampleItem label="Top" height="h-12" />
        <SampleItem label="Middle" height="h-20" />
        <SampleItem label="Bottom" height="h-16" />
      </>
    ),
  },
};

export const AlignBaseline = {
  args: {
    spacing: 'md',
    align: 'baseline',
    children: (
      <>
        <div className="bg-blue-100 border border-blue-300 rounded p-2 text-lg">
          Large Text
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-2 text-sm">
          Small Text
        </div>
        <div className="bg-blue-100 border border-blue-300 rounded p-2 text-base">
          Normal Text
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
        <SampleItem label="Stretched" height="h-auto" />
        <SampleItem label="Same height" height="h-auto" />
        <SampleItem label="All items" height="h-auto" />
      </>
    ),
  },
};

// Justify variations
export const JustifyStart = {
  args: {
    spacing: 'md',
    justify: 'start',
    children: (
      <>
        <SampleItem label="Left" />
        <SampleItem label="Aligned" />
        <SampleItem label="Start" />
      </>
    ),
  },
};

export const JustifyCenter = {
  args: {
    spacing: 'md',
    justify: 'center',
    children: (
      <>
        <SampleItem label="Centered" />
        <SampleItem label="Items" />
        <SampleItem label="Here" />
      </>
    ),
  },
};

export const JustifyEnd = {
  args: {
    spacing: 'md',
    justify: 'end',
    children: (
      <>
        <SampleItem label="Right" />
        <SampleItem label="Aligned" />
        <SampleItem label="End" />
      </>
    ),
  },
};

export const JustifyBetween = {
  args: {
    spacing: 'md',
    justify: 'between',
    children: (
      <>
        <SampleItem label="Start" />
        <SampleItem label="Middle" />
        <SampleItem label="End" />
      </>
    ),
  },
};

export const JustifyAround = {
  args: {
    spacing: 'md',
    justify: 'around',
    children: (
      <>
        <SampleItem label="Item 1" />
        <SampleItem label="Item 2" />
        <SampleItem label="Item 3" />
      </>
    ),
  },
};

export const JustifyEvenly = {
  args: {
    spacing: 'md',
    justify: 'evenly',
    children: (
      <>
        <SampleItem label="Item 1" />
        <SampleItem label="Item 2" />
        <SampleItem label="Item 3" />
      </>
    ),
  },
};

// Wrap variations
export const WithWrap = {
  args: {
    spacing: 'md',
    wrap: true,
    children: (
      <>
        <SampleItem label="Item 1" className="w-48" />
        <SampleItem label="Item 2" className="w-48" />
        <SampleItem label="Item 3" className="w-48" />
        <SampleItem label="Item 4" className="w-48" />
        <SampleItem label="Item 5" className="w-48" />
        <SampleItem label="Item 6" className="w-48" />
      </>
    ),
  },
};

export const WithoutWrap = {
  args: {
    spacing: 'md',
    wrap: false,
    children: (
      <>
        <SampleItem label="Item 1" className="w-48" />
        <SampleItem label="Item 2" className="w-48" />
        <SampleItem label="Item 3" className="w-48" />
        <SampleItem label="Item 4" className="w-48" />
        <SampleItem label="Item 5" className="w-48" />
        <SampleItem label="Item 6" className="w-48" />
      </>
    ),
  },
};

// Real-world examples
export const ButtonGroup = {
  args: {
    spacing: 'sm',
    align: 'center',
    justify: 'start',
    children: (
      <>
        <button className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
          Primary
        </button>
        <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300">
          Secondary
        </button>
        <button className="px-4 py-2 border border-gray-300 text-gray-800 rounded hover:bg-gray-50">
          Cancel
        </button>
      </>
    ),
  },
};

export const NavigationBar = {
  args: {
    spacing: 'lg',
    align: 'center',
    justify: 'between',
    children: (
      <>
        <div className="font-bold text-lg">Logo</div>
        <Inline spacing="md" align="center">
          <a href="#" className="text-gray-700 hover:text-blue-600">
            Home
          </a>
          <a href="#" className="text-gray-700 hover:text-blue-600">
            About
          </a>
          <a href="#" className="text-gray-700 hover:text-blue-600">
            Contact
          </a>
        </Inline>
        <button className="px-4 py-2 bg-blue-500 text-white rounded">
          Sign In
        </button>
      </>
    ),
  },
};

export const CardActions = {
  args: {
    spacing: 'sm',
    align: 'center',
    justify: 'end',
    children: (
      <>
        <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800">
          Edit
        </button>
        <button className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800">
          Share
        </button>
        <button className="px-3 py-1 text-sm text-red-600 hover:text-red-800">
          Delete
        </button>
      </>
    ),
  },
};

export const TagList = {
  args: {
    spacing: 'xs',
    align: 'center',
    wrap: true,
    children: (
      <>
        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
          React
        </span>
        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
          TypeScript
        </span>
        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
          Tailwind
        </span>
        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
          Storybook
        </span>
        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
          Testing
        </span>
        <span className="px-2 py-1 bg-indigo-100 text-indigo-800 text-xs rounded">
          CI/CD
        </span>
      </>
    ),
  },
};

export const FormRow = {
  args: {
    spacing: 'md',
    align: 'end',
    justify: 'start',
    children: (
      <>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">First Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="John"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Last Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="Doe"
          />
        </div>
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

export const NestedInlines = {
  args: {
    spacing: 'lg',
    justify: 'between',
    align: 'center',
    children: (
      <>
        <Inline spacing="sm" align="center">
          <div className="font-bold">Logo</div>
          <span className="text-gray-500">|</span>
          <span className="text-sm text-gray-600">Company Name</span>
        </Inline>
        <Inline spacing="md" align="center">
          <button className="px-3 py-1 text-sm border rounded">Menu</button>
          <button className="px-3 py-1 text-sm border rounded">Settings</button>
        </Inline>
      </>
    ),
  },
};



