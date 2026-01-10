import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
  PopoverFooter,
  PopoverTrigger,
  PopoverClose
} from '../../components/ui/overlays/popover/Popover';

const meta: Meta<typeof Popover> = {
  title: 'UI/Overlays/Popover',
  component: Popover,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A popover component that displays content in a floating overlay.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    side: {
      control: 'select',
      options: ['top', 'right', 'bottom', 'left'],
      description: 'The side of the trigger to place the popover.',
    },
    align: {
      control: 'select',
      options: ['start', 'center', 'end'],
      description: 'The alignment of the popover relative to its trigger.',
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    side: 'bottom',
    align: 'center',
  },
  render: (args) => (
    <Popover>
      <PopoverTrigger asChild>
        <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
          Open Popover
        </button>
      </PopoverTrigger>
      <PopoverContent {...args} className="w-80">
        <p>This is a basic popover content.</p>
      </PopoverContent>
    </Popover>
  ),
};

export const WithHeader: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
          Open Popover
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <PopoverHeader>
          <PopoverTitle>Popover Title</PopoverTitle>
          <PopoverDescription>
            This is a description of the popover content.
          </PopoverDescription>
        </PopoverHeader>
        <div className="space-y-2">
          <p>Main content goes here.</p>
          <p>You can put any content you want in the popover.</p>
        </div>
      </PopoverContent>
    </Popover>
  ),
};

export const WithFooter: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
          Open Popover
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <PopoverHeader>
          <PopoverTitle>Confirm Action</PopoverTitle>
          <PopoverDescription>
            Are you sure you want to perform this action?
          </PopoverDescription>
        </PopoverHeader>
        <PopoverFooter className="flex justify-between">
          <PopoverClose asChild>
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
              Cancel
            </button>
          </PopoverClose>
          <button className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Confirm
          </button>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  ),
};

export const Positions: Story = {
  render: () => (
    <div className="flex flex-wrap gap-8 p-8">
      <Popover>
        <PopoverTrigger asChild>
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Top</button>
        </PopoverTrigger>
        <PopoverContent side="top">
          <p>Popover on top</p>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Right</button>
        </PopoverTrigger>
        <PopoverContent side="right">
          <p>Popover on right</p>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Bottom</button>
        </PopoverTrigger>
        <PopoverContent side="bottom">
          <p>Popover on bottom</p>
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger asChild>
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Left</button>
        </PopoverTrigger>
        <PopoverContent side="left">
          <p>Popover on left</p>
        </PopoverContent>
      </Popover>
    </div>
  ),
};

export const Alignments: Story = {
  render: () => (
    <div className="space-y-8 p-8">
      <div className="flex justify-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Start</button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <p>Aligned to start</p>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex justify-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Center</button>
          </PopoverTrigger>
          <PopoverContent align="center">
            <p>Aligned to center</p>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex justify-center">
        <Popover>
          <PopoverTrigger asChild>
            <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">End</button>
          </PopoverTrigger>
          <PopoverContent align="end">
            <p>Aligned to end</p>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  ),
};

export const RichContent: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
          Rich Content
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96">
        <PopoverHeader>
          <PopoverTitle>Rich Popover Content</PopoverTitle>
          <PopoverDescription>
            This popover contains rich content with various elements.
          </PopoverDescription>
        </PopoverHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Features</h4>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Rich text formatting</li>
              <li>Interactive elements</li>
              <li>Custom styling</li>
              <li>Accessibility support</li>
            </ul>
          </div>

          <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm">Status: Active</span>
          </div>
        </div>

        <PopoverFooter>
          <PopoverClose asChild>
            <button className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 w-full">
              Close
            </button>
          </PopoverClose>
        </PopoverFooter>
      </PopoverContent>
    </Popover>
  ),
};
