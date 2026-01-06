import React from 'react';
import { AvatarGroup } from '../components/avatar/AvatarGroup';

export default {
  title: 'UI/AvatarGroup',
  component: AvatarGroup,
  parameters: {
    layout: 'centered',
    // Visual testing: Ensures consistent rendering
    chromatic: {
      disableSnapshot: false,
      viewports: [320, 768, 1024],
    },
    // Documentation: Auto-generates docs
    docs: {
      description: {
        component:
          'AvatarGroup displays multiple avatars in a stacked layout with optional overflow indication. It supports different spacing options and can limit the number of visible avatars.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    spacing: {
      control: 'select',
      options: ['none', 'xs', 'sm', 'md', 'lg', 'xl'],
      description:
        'Spacing between avatars in the group.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'md' },
        category: 'Layout',
      },
    },
    max: {
      control: 'number',
      description: 'Maximum number of avatars to display. Remaining avatars will be shown as a count.',
      table: {
        type: { summary: 'number' },
        category: 'Behavior',
      },
    },
    showMore: {
      control: 'boolean',
      description: 'Whether to show the "+X more" indicator when max is exceeded.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
        category: 'Behavior',
      },
    },
    avatars: {
      control: false,
      description: 'Array of avatar props to display in the group.',
      table: {
        type: { summary: 'AvatarProps[]' },
        category: 'Content',
      },
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the avatar group.',
      table: {
        type: { summary: 'string' },
        category: 'Styling',
      },
    },
  },
};

// Sample avatar data
const sampleAvatars = [
  { src: '/profile-avatar.svg', alt: 'John Doe', fallback: 'JD' },
  { fallback: 'JS' },
  { fallback: 'BJ' },
  { fallback: 'AC' },
  { fallback: 'MK' },
  { fallback: 'RL' },
  { fallback: 'SW' },
  { fallback: 'TB' },
];

const mixedAvatars = [
  { src: '/profile-avatar.svg', alt: 'John Doe', fallback: 'JD' },
  { src: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face', alt: 'Jane Smith', fallback: 'JS' },
  { fallback: 'BJ' },
  { fallback: 'AC' },
  { fallback: 'MK' },
];

// Default avatar group
export const Default = {
  args: {
    avatars: sampleAvatars.slice(0, 4),
    spacing: 'md',
    showMore: true,
  },
};

// Spacing variations
export const SpacingNone = {
  args: {
    avatars: sampleAvatars.slice(0, 4),
    spacing: 'none',
  },
};

export const SpacingXS = {
  args: {
    avatars: sampleAvatars.slice(0, 4),
    spacing: 'xs',
  },
};

export const SpacingSM = {
  args: {
    avatars: sampleAvatars.slice(0, 4),
    spacing: 'sm',
  },
};

export const SpacingMD = {
  args: {
    avatars: sampleAvatars.slice(0, 4),
    spacing: 'md',
  },
};

export const SpacingLG = {
  args: {
    avatars: sampleAvatars.slice(0, 4),
    spacing: 'lg',
  },
};

export const SpacingXL = {
  args: {
    avatars: sampleAvatars.slice(0, 4),
    spacing: 'xl',
  },
};

// Max avatars with overflow
export const WithMaxLimit = {
  args: {
    avatars: sampleAvatars,
    max: 3,
    spacing: 'md',
  },
};

export const WithMaxLimitNoMore = {
  args: {
    avatars: sampleAvatars,
    max: 3,
    spacing: 'md',
    showMore: false,
  },
};

// Different group sizes
export const SmallGroup = {
  args: {
    avatars: sampleAvatars.slice(0, 2),
    spacing: 'sm',
  },
};

export const LargeGroup = {
  args: {
    avatars: sampleAvatars,
    spacing: 'md',
  },
};

// Mixed content types
export const MixedAvatars = {
  args: {
    avatars: mixedAvatars,
    spacing: 'md',
  },
};

// Real-world examples
export const TeamMembers = {
  args: {
    avatars: sampleAvatars.slice(0, 5),
    max: 4,
    spacing: 'sm',
  },
};

export const RecentCollaborators = {
  args: {
    avatars: mixedAvatars.slice(0, 6),
    max: 5,
    spacing: 'md',
  },
};

export const ProjectContributors = {
  args: {
    avatars: sampleAvatars,
    max: 6,
    spacing: 'lg',
  },
};

// Spacing comparison grid
export const SpacingComparison = {
  render: () => (
    <div className="flex flex-col gap-6">
      {[
        { label: 'None', spacing: 'none' as const },
        { label: 'XS', spacing: 'xs' as const },
        { label: 'SM', spacing: 'sm' as const },
        { label: 'MD', spacing: 'md' as const },
        { label: 'LG', spacing: 'lg' as const },
        { label: 'XL', spacing: 'xl' as const },
      ].map(({ label, spacing }) => (
        <div key={spacing} className="flex items-center gap-4">
          <div className="w-12 text-sm font-medium">{label}</div>
          <AvatarGroup
            avatars={sampleAvatars.slice(0, 4)}
            spacing={spacing}
          />
        </div>
      ))}
    </div>
  ),
};

// Overflow examples
export const OverflowExamples = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <div className="w-24 text-sm">Max 2:</div>
        <AvatarGroup avatars={sampleAvatars} max={2} />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-24 text-sm">Max 3:</div>
        <AvatarGroup avatars={sampleAvatars} max={3} />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-24 text-sm">Max 4:</div>
        <AvatarGroup avatars={sampleAvatars} max={4} />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-24 text-sm">No limit:</div>
        <AvatarGroup avatars={sampleAvatars.slice(0, 4)} />
      </div>
    </div>
  ),
};

