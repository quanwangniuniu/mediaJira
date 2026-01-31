import React, { useState } from 'react';
import InlineEditTrigger from '../../inline-edit/InlineEditTrigger';

export default {
  title: 'Inline Edit/InlineEditTrigger',
  component: InlineEditTrigger,
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
          'InlineEditTrigger is a component that displays content in non-editing mode and triggers edit mode when clicked. It provides a clickable interface for starting inline editing.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'The value to display in the trigger.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    onStartEdit: {
      action: 'startEdit',
      description: 'Callback function called when the trigger is clicked to start editing.',
      table: {
        type: { summary: '() => void' },
        category: 'Events',
      },
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text shown when value is empty.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'Click to edit' },
        category: 'Content',
      },
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the trigger.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
        category: 'Styling',
      },
    },
    renderTrigger: {
      control: false,
      description: 'Custom render function for the trigger content.',
      table: {
        type: { summary: '(value: string) => ReactNode' },
        category: 'Content',
      },
    },
  },
};

// Default story
export const Default = {
  args: {
    value: 'John Doe',
    onStartEdit: () => {
      console.log('Edit started');
    },
    placeholder: 'Click to edit',
  },
};

// Empty value with placeholder
export const EmptyValue = {
  args: {
    value: '',
    onStartEdit: () => {
      console.log('Edit started');
    },
    placeholder: 'Click to edit',
  },
};

// Long text
export const LongText = {
  args: {
    value: 'This is a very long text that demonstrates how the trigger handles longer content that might wrap or overflow.',
    onStartEdit: () => {
      console.log('Edit started');
    },
    placeholder: 'Click to edit',
  },
};

// With custom className
export const WithCustomClassName = {
  args: {
    value: 'Custom styled trigger',
    onStartEdit: () => {
      console.log('Edit started');
    },
    className: 'bg-blue-50 border border-blue-200 rounded-lg px-4 py-2',
    placeholder: 'Click to edit',
  },
};

// Custom render function
export const CustomRender = {
  args: {
    value: 'Custom Rendered Content',
    onStartEdit: () => {
      console.log('Edit started');
    },
    renderTrigger: (value: string) => (
      <div className="flex items-center space-x-2">
        <span className="text-lg font-semibold text-blue-600">{value}</span>
        <span className="text-sm text-gray-500">(Click to edit)</span>
      </div>
    ),
  },
};

function InteractiveStory() {
  const [isEditing, setIsEditing] = useState(false);
  const [value] = useState('Interactive Example');
  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-600 mb-2">
          Click the trigger below to see the onStartEdit callback fire.
        </p>
        <InlineEditTrigger
          value={value}
          onStartEdit={() => {
            setIsEditing(true);
            console.log('Edit mode started');
          }}
          placeholder="Click to edit"
        />
      </div>
        {isEditing && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            ✓ Edit mode activated! (Check console for callback)
          </div>
        )}
      </div>
    );
}
export const Interactive = { render: () => <InteractiveStory /> };

// Keyboard accessible
export const KeyboardAccessible = {
  args: {
    value: 'Press Enter or Space to edit',
    onStartEdit: () => {
      console.log('Edit started via keyboard');
    },
    placeholder: 'Click to edit',
  },
  render: (args: any) => (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gray-600 mb-2">
          This trigger is keyboard accessible. Try:
        </p>
        <ul className="text-sm text-gray-600 list-disc list-inside mb-4">
          <li>Tab to focus the trigger</li>
          <li>Press Enter or Space to start editing</li>
        </ul>
        <InlineEditTrigger {...args} />
      </div>
    </div>
  ),
};

// Different placeholder styles
export const PlaceholderVariations = {
  render: () => {
    const handleStartEdit = () => {
      console.log('Edit started');
    };

    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Default placeholder:</p>
          <InlineEditTrigger
            value=""
            onStartEdit={handleStartEdit}
            placeholder="Click to edit"
          />
        </div>
        <div>
          <p className="text-sm font-medium mb-2">Custom placeholder:</p>
          <InlineEditTrigger
            value=""
            onStartEdit={handleStartEdit}
            placeholder="Tap here to modify"
          />
        </div>
        <div>
          <p className="text-sm font-medium mb-2">With value:</p>
          <InlineEditTrigger
            value="Has value"
            onStartEdit={handleStartEdit}
            placeholder="Click to edit"
          />
        </div>
      </div>
    );
  },
};

