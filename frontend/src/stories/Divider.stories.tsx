import Divider from './Divider';
import React from 'react';

export default {
    title: 'Layout/Primitives/Divider',
    component: Divider,
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
                  'Divider is a component that creates a visual separator line between content sections. It can be horizontal (separating vertical content) or vertical (separating horizontal content).',
            },
        },
    },
    tags: ['autodocs'],
    argTypes: {
        orientation: {
            control: 'select',
            options: ['horizontal', 'vertical'],
            description:
              'Orientation of the divider. Controls whether it appears as a horizontal line or vertical line.',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: 'horizontal' },
                category: 'Layout',
            },
        },
        variant: {
            control: 'select',
            options: ['solid', 'dashed', 'dotted'],
            description:
              'Border style variant. Controls the visual style of the divider line.',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: 'solid' },
                category: 'Styling',
            },
        },
        spacing: {
            control: 'select',
            options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'],
            description:
              'Spacing around the divider. Controls the margin above and below (horizontal) or left and right (vertical).',
            table: {
                type: { summary: 'string' },
                defaultvalue:{ summary: 'md' },
                category: 'Layout',
            },
        },
        color: {
            control: 'select',
            options: ['gray-100', 'gray-200', 'gray-300'],
            description:
              'Color of the divider. Controls the border color of the divider line.',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: 'gray-200' },
                category: 'Styling',
            },
        },
        className: {
            control: 'text',
            description: 'Additional CSS classes to apply to the divider.',
            table: {
                type: { summary: 'string' },
                defaultValue: { summary: "''"},
                category: 'Styling',
            },
        },
    },
};

// Default story - 默认水平分隔线
export const Default = {
    args: {
      orientation: 'horizontal',
      variant: 'solid',
      spacing: 'md',
      color: 'gray-200',
    },
    render: (args: any) => (
      <div className="w-full">
        <div className="bg-blue-50 p-4 rounded mb-4">
          <p className="text-gray-700">Content above the divider</p>
        </div>
        <Divider {...args} />
        <div className="bg-green-50 p-4 rounded mt-4">
          <p className="text-gray-700">Content below the divider</p>
        </div>
      </div>
    ),
  };
  
  // Horizontal - 水平分隔线
  export const Horizontal = {
    args: {
      orientation: 'horizontal',
      variant: 'solid',
      spacing: 'md',
      color: 'gray-200',
    },
    render: (args: any) => (
      <div className="w-full">
        <div className="p-4">Section 1</div>
        <Divider {...args} />
        <div className="p-4">Section 2</div>
      </div>
    ),
  };
  
  // Vertical - 垂直分隔线
  export const Vertical = {
    args: {
      orientation: 'vertical',
      variant: 'solid',
      spacing: 'md',
      color: 'gray-200',
    },
    render: (args: any) => (
      <div className="flex items-center h-32">
        <div className="p-4">Left content</div>
        <Divider {...args} />
        <div className="p-4">Right content</div>
      </div>
    ),
  };
  
  // Variant variations - 样式变体
  export const VariantSolid = {
    args: {
      variant: 'solid',
      spacing: 'md',
    },
    render: (args: any) => (
      <div className="w-full">
        <div className="p-4">Above</div>
        <Divider {...args} />
        <div className="p-4">Below</div>
      </div>
    ),
  };
  
  export const VariantDashed = {
    args: {
      variant: 'dashed',
      spacing: 'md',
    },
    render: (args: any) => (
      <div className="w-full">
        <div className="p-4">Above</div>
        <Divider {...args} />
        <div className="p-4">Below</div>
      </div>
    ),
  };
  
  export const VariantDotted = {
    args: {
      variant: 'dotted',
      spacing: 'md',
    },
    render: (args: any) => (
      <div className="w-full">
        <div className="p-4">Above</div>
        <Divider {...args} />
        <div className="p-4">Below</div>
      </div>
    ),
  };
  
  // Spacing variations - 间距变体
  export const SpacingNone = {
    args: {
      spacing: 'none',
    },
    render: (args: any) => (
      <div className="w-full">
        <div className="p-4 bg-blue-50">Tight spacing above</div>
        <Divider {...args} />
        <div className="p-4 bg-green-50">Tight spacing below</div>
      </div>
    ),
  };
  
  export const SpacingXS = {
    args: {
      spacing: 'xs',
    },
    render: (args: any) => (
      <div className="w-full">
        <div className="p-4">Above</div>
        <Divider {...args} />
        <div className="p-4">Below</div>
      </div>
    ),
  };
  
  export const SpacingSM = {
    args: {
      spacing: 'sm',
    },
    render: (args: any) => (
      <div className="w-full">
        <div className="p-4">Above</div>
        <Divider {...args} />
        <div className="p-4">Below</div>
      </div>
    ),
  };
  
  export const SpacingMD = {
    args: {
      spacing: 'md',
    },
    render: (args: any) => (
      <div className="w-full">
        <div className="p-4">Above</div>
        <Divider {...args} />
        <div className="p-4">Below</div>
      </div>
    ),
  };
  
  export const SpacingLG = {
    args: {
      spacing: 'lg',
    },
    render: (args: any) => (
      <div className="w-full">
        <div className="p-4">Above</div>
        <Divider {...args} />
        <div className="p-4">Below</div>
      </div>
    ),
  };
  
  export const SpacingXL = {
    args: {
      spacing: 'xl',
    },
    render: (args: any) => (
      <div className="w-full">
        <div className="p-4">Above</div>
        <Divider {...args} />
        <div className="p-4">Below</div>
      </div>
    ),
  };
  
  // Color variations - 颜色变体
  export const ColorGray100 = {
    args: {
      color: 'gray-100',
      spacing: 'md',
    },
    render: (args: any) => (
      <div className="w-full bg-gray-50 p-4">
        <div className="p-4 bg-white rounded mb-4">Above</div>
        <Divider {...args} />
        <div className="p-4 bg-white rounded mt-4">Below</div>
      </div>
    ),
  };
  
  export const ColorGray200 = {
    args: {
      color: 'gray-200',
      spacing: 'md',
    },
    render: (args: any) => (
      <div className="w-full">
        <div className="p-4">Above</div>
        <Divider {...args} />
        <div className="p-4">Below</div>
      </div>
    ),
  };
  
  export const ColorGray300 = {
    args: {
      color: 'gray-300',
      spacing: 'md',
    },
    render: (args: any) => (
      <div className="w-full">
        <div className="p-4">Above</div>
        <Divider {...args} />
        <div className="p-4">Below</div>
      </div>
    ),
  };
  
  // Real-world examples - 实际用例
  export const InList = {
    render: () => (
      <div className="w-full max-w-md">
        <div className="p-4 bg-white border border-gray-200 rounded-t">
          <h3 className="font-semibold">Item 1</h3>
          <p className="text-sm text-gray-600">Description</p>
        </div>
        <Divider spacing="none" />
        <div className="p-4 bg-white border-x border-gray-200">
          <h3 className="font-semibold">Item 2</h3>
          <p className="text-sm text-gray-600">Description</p>
        </div>
        <Divider spacing="none" />
        <div className="p-4 bg-white border border-gray-200 rounded-b">
          <h3 className="font-semibold">Item 3</h3>
          <p className="text-sm text-gray-600">Description</p>
        </div>
      </div>
    ),
  };
  
  export const InForm = {
    render: () => (
      <div className="w-full max-w-md">
        <div className="p-4">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="Enter name"
          />
        </div>
        <Divider spacing="md" />
        <div className="p-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            type="email"
            className="w-full px-3 py-2 border border-gray-300 rounded"
            placeholder="Enter email"
          />
        </div>
      </div>
    ),
  };
  
  export const InButtonGroup = {
    render: () => (
      <div className="flex items-center">
        <button className="px-4 py-2 bg-blue-500 text-white rounded-l">
          Save
        </button>
        <Divider orientation="vertical" spacing="none" />
        <button className="px-4 py-2 bg-gray-200 text-gray-800">
          Cancel
        </button>
        <Divider orientation="vertical" spacing="none" />
        <button className="px-4 py-2 bg-gray-200 text-gray-800 rounded-r">
          Delete
        </button>
      </div>
    ),
  };