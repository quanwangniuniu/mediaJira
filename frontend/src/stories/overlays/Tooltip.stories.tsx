import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../overlays/tooltip/Tooltip';

const meta: Meta<typeof Tooltip> = {
  title: 'UI/Overlays/Tooltip',
  component: Tooltip,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: 'A tooltip component that displays brief information when hovering over or focusing on an element.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    delayDuration: {
      control: { type: 'number', min: 0, max: 2000, step: 100 },
      description: 'Delay in milliseconds before showing the tooltip',
      table: {
        type: { summary: 'number' },
        defaultValue: { summary: '700' },
      },
    },
  },
  decorators: [
    (Story) => (
      <TooltipProvider>
        <Story />
      </TooltipProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    delayDuration: 700,
  },
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Hover me</button>
      </TooltipTrigger>
      <TooltipContent>
        <p>This is a tooltip!</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const WithDelay: Story = {
  args: {
    delayDuration: 100,
  },
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Quick tooltip</button>
      </TooltipTrigger>
      <TooltipContent>
        <p>This appears quickly!</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const WithLongDelay: Story = {
  args: {
    delayDuration: 2000,
  },
  render: (args) => (
    <Tooltip {...args}>
      <TooltipTrigger asChild>
        <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Slow tooltip</button>
      </TooltipTrigger>
      <TooltipContent>
        <p>This takes longer to appear!</p>
      </TooltipContent>
    </Tooltip>
  ),
};

export const Positions: Story = {
  render: () => (
    <div className="flex flex-wrap gap-8 p-8">
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Top</button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>Tooltip on top</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Right</button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Tooltip on right</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Bottom</button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>Tooltip on bottom</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Left</button>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p>Tooltip on left</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};

export const WithRichContent: Story = {
  render: () => (
    <Tooltip>
      <TooltipTrigger asChild>
        <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Rich tooltip</button>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-2">
          <h4 className="font-semibold">Rich Content Tooltip</h4>
          <p className="text-sm">
            This tooltip contains rich content with multiple lines and formatting.
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Press</span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-xs">⌘</kbd>
            <span>+</span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-xs">K</kbd>
            <span>to search</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="space-y-4">
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50">Enabled tooltip</button>
        </TooltipTrigger>
        <TooltipContent>
          <p>This tooltip is enabled</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip open={false}>
        <TooltipTrigger asChild>
        <button className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 opacity-50 cursor-not-allowed" disabled>
          Disabled tooltip
        </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>This tooltip won&apos;t show</p>
        </TooltipContent>
      </Tooltip>
    </div>
  ),
};
