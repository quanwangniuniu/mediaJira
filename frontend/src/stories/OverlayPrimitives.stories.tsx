import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';
import {
  Dropdown,
  Menu,
  MenuItem,
  Popover,
  Tooltip,
} from '@/components/overlay/OverlayPrimitives';

const meta: Meta<typeof Tooltip> = {
  title: 'Overlay/Primitives',
  component: Tooltip,
  subcomponents: { 
    Popover: Popover as any, 
    Menu: Menu as any, 
    MenuItem: MenuItem as any, 
    Dropdown: Dropdown as any 
  },
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj<typeof Tooltip>;

export const TooltipExample: Story = {
  render: () => (
    <div className="flex items-center gap-6">
      <Tooltip content="Quick action details" side="top">
        <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
          Hover me
        </button>
      </Tooltip>
      <Tooltip content="Inline hint" side="right">
        <span className="rounded-md bg-slate-900 px-3 py-1 text-xs uppercase tracking-wide text-white">
          Tip
        </span>
      </Tooltip>
    </div>
  ),
};

export const PopoverExample: Story = {
  render: () => (
    <Popover
      trigger={
        <button className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
          Open popover
        </button>
      }
      title="Quick settings"
    >
      This panel can hold short forms, toggles, or summaries. Click outside to dismiss.
    </Popover>
  ),
};

export const MenuExample: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <div className="text-xs uppercase tracking-wide text-slate-400">Command menu</div>
      <Menu>
        <MenuItem description="Create a new board">New workspace</MenuItem>
        <MenuItem description="Invite teammates">Share link</MenuItem>
        <MenuItem description="Opens in a new tab">Open docs</MenuItem>
        <MenuItem disabled description="Admins only">
          Delete project
        </MenuItem>
      </Menu>
    </div>
  ),
};

export const MenuItemStates: Story = {
  render: () => (
    <Menu>
      <MenuItem description="Standard state">Default item</MenuItem>
      <MenuItem disabled description="Disabled state">
        Disabled item
      </MenuItem>
    </Menu>
  ),
};

function DropdownStory() {
  const [selection, setSelection] = useState('All updates');

  return (
    <div className="flex flex-col items-start gap-3">
      <Dropdown
        label={selection}
        items={[
          {
            label: 'All updates',
            description: 'Everything from your workspace',
            onSelect: () => setSelection('All updates'),
          },
          {
            label: 'Mentions',
            description: 'Only direct mentions',
            onSelect: () => setSelection('Mentions'),
          },
          {
            label: 'Assigned to me',
            description: 'Tasks you own',
            onSelect: () => setSelection('Assigned to me'),
          },
          {
            label: 'Muted',
            description: 'Hidden updates',
            disabled: true,
          },
        ]}
      />
      <div className="text-sm text-slate-500">Current filter: {selection}</div>
    </div>
  );
}

export const DropdownExample: Story = {
  render: () => <DropdownStory />,
};
