import React from 'react';
import { Avatar } from '../components/avatar/Avatar';

export default {
  title: 'UI/Avatar',
  component: Avatar,
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
          'Avatar is a component that displays user profile images or initials in a circular container. It supports different sizes and automatically falls back to initials when images fail to load.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'],
      description:
        'Size of the avatar. Controls both width and height.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'md' },
        category: 'Layout',
      },
    },
    src: {
      control: 'text',
      description: 'URL of the avatar image.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    alt: {
      control: 'text',
      description: 'Alt text for the avatar image.',
      table: {
        type: { summary: 'string' },
        category: 'Accessibility',
      },
    },
    fallback: {
      control: 'text',
      description: 'Fallback text to display when image fails to load or no image is provided.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: '?' },
        category: 'Content',
      },
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the avatar.',
      table: {
        type: { summary: 'string' },
        category: 'Styling',
      },
    },
  },
};

// Sample data for demonstration
const sampleUsers = [
  { src: '/profile-avatar.svg', alt: 'John Doe', fallback: 'JD' },
  { src: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face', alt: 'Jane Smith', fallback: 'JS' },
  { src: 'invalid-image-url', alt: 'Bob Johnson', fallback: 'BJ' },
  { fallback: 'AC' },
  { fallback: 'MK' },
];

// Default avatar with image
export const Default = {
  args: {
    src: '/profile-avatar.svg',
    alt: 'Default User',
    fallback: 'DU',
    size: 'md',
  },
};

// Size variations
export const SizeXS = {
  args: {
    src: '/profile-avatar.svg',
    alt: 'Extra Small Avatar',
    fallback: 'XS',
    size: 'xs',
  },
};

export const SizeSM = {
  args: {
    src: '/profile-avatar.svg',
    alt: 'Small Avatar',
    fallback: 'SM',
    size: 'sm',
  },
};

export const SizeMD = {
  args: {
    src: '/profile-avatar.svg',
    alt: 'Medium Avatar',
    fallback: 'MD',
    size: 'md',
  },
};

export const SizeLG = {
  args: {
    src: '/profile-avatar.svg',
    alt: 'Large Avatar',
    fallback: 'LG',
    size: 'lg',
  },
};

export const SizeXL = {
  args: {
    src: '/profile-avatar.svg',
    alt: 'Extra Large Avatar',
    fallback: 'XL',
    size: 'xl',
  },
};

export const Size2XL = {
  args: {
    src: '/profile-avatar.svg',
    alt: '2X Large Avatar',
    fallback: '2XL',
    size: '2xl',
  },
};

// Fallback variations
export const WithFallback = {
  args: {
    fallback: 'JD',
    size: 'md',
  },
};

export const WithInitials = {
  args: {
    fallback: 'AB',
    size: 'lg',
  },
};

export const WithSingleLetter = {
  args: {
    fallback: 'A',
    size: 'md',
  },
};

// Error handling
export const WithInvalidImage = {
  args: {
    src: 'invalid-image-url',
    alt: 'Invalid Image',
    fallback: 'II',
    size: 'md',
  },
};

export const WithNoImage = {
  args: {
    fallback: 'NI',
    size: 'md',
  },
};

// Real-world examples
export const UserProfile = {
  args: {
    src: '/profile-avatar.svg',
    alt: 'User Profile',
    fallback: 'UP',
    size: 'xl',
  },
};

export const CommentAvatar = {
  args: {
    src: '/profile-avatar.svg',
    alt: 'Comment Author',
    fallback: 'CA',
    size: 'sm',
  },
};

export const TeamMember = {
  args: {
    fallback: 'TM',
    size: 'md',
  },
};

// Grid of all sizes
export const SizeGrid = {
  render: () => (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-4">
        <div className="flex flex-col items-center gap-2">
          <Avatar size="xs" src="/profile-avatar.svg" alt="XS" fallback="XS" />
          <span className="text-xs text-gray-600">xs</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Avatar size="sm" src="/profile-avatar.svg" alt="SM" fallback="SM" />
          <span className="text-xs text-gray-600">sm</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Avatar size="md" src="/profile-avatar.svg" alt="MD" fallback="MD" />
          <span className="text-xs text-gray-600">md</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Avatar size="lg" src="/profile-avatar.svg" alt="LG" fallback="LG" />
          <span className="text-xs text-gray-600">lg</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Avatar size="xl" src="/profile-avatar.svg" alt="XL" fallback="XL" />
          <span className="text-xs text-gray-600">xl</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Avatar size="2xl" src="/profile-avatar.svg" alt="2XL" fallback="2XL" />
          <span className="text-xs text-gray-600">2xl</span>
        </div>
      </div>
    </div>
  ),
};

// Fallback examples grid
export const FallbackExamples = {
  render: () => (
    <div className="flex gap-4">
      <div className="flex flex-col items-center gap-2">
        <Avatar fallback="JD" size="md" />
        <span className="text-xs text-gray-600">Initials</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar fallback="A" size="md" />
        <span className="text-xs text-gray-600">Single Letter</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar fallback="?" size="md" />
        <span className="text-xs text-gray-600">Default</span>
      </div>
      <div className="flex flex-col items-center gap-2">
        <Avatar src="invalid-url" fallback="ERR" size="md" />
        <span className="text-xs text-gray-600">Error Fallback</span>
      </div>
    </div>
  ),
};

