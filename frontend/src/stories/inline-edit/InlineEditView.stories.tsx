import React, { useState } from 'react';
import InlineEditView from '../../inline-edit/InlineEditView';

export default {
  title: 'Inline Edit/InlineEditView',
  component: InlineEditView,
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
          'InlineEditView is a component that displays the input field in edit mode. It handles user input, keyboard events, and displays loading and error states.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'The current value of the input field.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    onChange: {
      action: 'change',
      description: 'Callback function called when the input value changes.',
      table: {
        type: { summary: '(value: string) => void' },
        category: 'Events',
      },
    },
    onSave: {
      action: 'save',
      description: 'Callback function called when save is triggered (Enter key or blur).',
      table: {
        type: { summary: '() => void' },
        category: 'Events',
      },
    },
    onCancel: {
      action: 'cancel',
      description: 'Callback function called when cancel is triggered (Esc key).',
      table: {
        type: { summary: '() => void' },
        category: 'Events',
      },
    },
    onKeyDown: {
      action: 'keyDown',
      description: 'Callback function called when a key is pressed.',
      table: {
        type: { summary: '(e: KeyboardEvent) => void' },
        category: 'Events',
      },
    },
    onBlur: {
      action: 'blur',
      description: 'Callback function called when the input loses focus.',
      table: {
        type: { summary: '() => void' },
        category: 'Events',
      },
    },
    isLoading: {
      control: 'boolean',
      description: 'Whether the component is in a loading state.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'false' },
        category: 'State',
      },
    },
    error: {
      control: 'text',
      description: 'Error message to display below the input.',
      table: {
        type: { summary: 'string | null' },
        defaultValue: { summary: 'null' },
        category: 'State',
      },
    },
    inputType: {
      control: 'select',
      options: ['input', 'textarea'],
      description: 'Type of input element to render.',
      table: {
        type: { summary: 'input | textarea' },
        defaultValue: { summary: 'input' },
        category: 'Layout',
      },
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text for the input field.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
        category: 'Content',
      },
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply to the input.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: "''" },
        category: 'Styling',
      },
    },
    autoFocus: {
      control: 'boolean',
      description: 'Whether to automatically focus and select the input when mounted.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
        category: 'Behavior',
      },
    },
  },
};

// Default story - Input type
export const Default = {
  args: {
    value: 'Edit this text',
    onChange: (value: string) => {
      console.log('Value changed:', value);
    },
    onSave: () => {
      console.log('Save triggered');
    },
    onCancel: () => {
      console.log('Cancel triggered');
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      console.log('Key pressed:', e.key);
    },
    onBlur: () => {
      console.log('Blur triggered');
    },
    isLoading: false,
    error: null,
    inputType: 'input',
    placeholder: 'Enter text here',
    autoFocus: true,
  },
};

// Textarea type
export const Textarea = {
  args: {
    value: 'This is a multi-line text area.\nYou can enter multiple lines here.',
    onChange: (value: string) => {
      console.log('Value changed:', value);
    },
    onSave: () => {
      console.log('Save triggered');
    },
    onCancel: () => {
      console.log('Cancel triggered');
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      console.log('Key pressed:', e.key);
    },
    onBlur: () => {
      console.log('Blur triggered');
    },
    isLoading: false,
    error: null,
    inputType: 'textarea',
    placeholder: 'Enter multi-line text',
    autoFocus: true,
  },
};

// Loading state
export const Loading = {
  args: {
    value: 'Saving...',
    onChange: () => {},
    onSave: () => {},
    onCancel: () => {},
    onKeyDown: () => {},
    onBlur: () => {},
    isLoading: true,
    error: null,
    inputType: 'input',
    placeholder: 'Enter text',
  },
};

// Error state
export const WithError = {
  args: {
    value: 'Invalid value',
    onChange: () => {},
    onSave: () => {},
    onCancel: () => {},
    onKeyDown: () => {},
    onBlur: () => {},
    isLoading: false,
    error: 'This value is not valid. Please enter a different value.',
    inputType: 'input',
    placeholder: 'Enter text',
  },
};

// Loading with error
export const LoadingWithError = {
  args: {
    value: 'Error occurred',
    onChange: () => {},
    onSave: () => {},
    onCancel: () => {},
    onKeyDown: () => {},
    onBlur: () => {},
    isLoading: true,
    error: 'An error occurred while saving',
    inputType: 'input',
    placeholder: 'Enter text',
  },
};

// Empty value
export const EmptyValue = {
  args: {
    value: '',
    onChange: () => {},
    onSave: () => {},
    onCancel: () => {},
    onKeyDown: () => {},
    onBlur: () => {},
    isLoading: false,
    error: null,
    inputType: 'input',
    placeholder: 'Start typing...',
  },
};

// With custom className
export const WithCustomClassName = {
  args: {
    value: 'Custom styled input',
    onChange: () => {},
    onSave: () => {},
    onCancel: () => {},
    onKeyDown: () => {},
    onBlur: () => {},
    isLoading: false,
    error: null,
    inputType: 'input',
    placeholder: 'Enter text',
    className: 'bg-yellow-50 border-yellow-300',
  },
};

// Interactive example
export const Interactive = {
  render: () => {
    const [value, setValue] = useState('Try editing this');
    const [lastAction, setLastAction] = useState<string>('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        setLastAction('Enter pressed - Save');
      } else if (e.key === 'Escape') {
        setLastAction('Escape pressed - Cancel');
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Try editing the value and using keyboard shortcuts:
          </p>
          <InlineEditView
            value={value}
            onChange={setValue}
            onSave={() => setLastAction('Save triggered')}
            onCancel={() => setLastAction('Cancel triggered')}
            onKeyDown={handleKeyDown}
            onBlur={() => setLastAction('Blur triggered')}
            isLoading={false}
            error={null}
            inputType="input"
            placeholder="Enter text"
          />
        </div>
        {lastAction && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            Last action: {lastAction}
          </div>
        )}
        <div className="p-3 bg-gray-50 rounded text-sm">
          <p className="font-medium mb-1">Current value:</p>
          <p className="text-gray-700">"{value}"</p>
        </div>
      </div>
    );
  },
};

// Keyboard shortcuts demo
export const KeyboardShortcuts = {
  render: () => {
    const [value, setValue] = useState('Press Enter to save, Esc to cancel');
    const [message, setMessage] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && inputType === 'input') {
        e.preventDefault();
        setMessage('✓ Enter pressed - Would save');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMessage('✓ Escape pressed - Would cancel');
      }
    };

    const inputType = 'input';

    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">Keyboard shortcuts:</p>
          <ul className="text-sm text-gray-600 list-disc list-inside mb-4">
            <li>
              <kbd className="px-2 py-1 bg-white border rounded">Enter</kbd> - Save (for input)
            </li>
            <li>
              <kbd className="px-2 py-1 bg-white border rounded">Ctrl/Cmd + Enter</kbd> - Save (for textarea)
            </li>
            <li>
              <kbd className="px-2 py-1 bg-white border rounded">Esc</kbd> - Cancel
            </li>
          </ul>
          <InlineEditView
            value={value}
            onChange={setValue}
            onSave={() => setMessage('Save triggered')}
            onCancel={() => setMessage('Cancel triggered')}
            onKeyDown={handleKeyDown}
            onBlur={() => setMessage('Blur triggered')}
            isLoading={false}
            error={null}
            inputType={inputType}
            placeholder="Try keyboard shortcuts"
          />
        </div>
        {message && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            {message}
          </div>
        )}
      </div>
    );
  },
};

// Textarea with Ctrl+Enter
export const TextareaWithCtrlEnter = {
  render: () => {
    const [value, setValue] = useState('Multi-line textarea\nUse Ctrl/Cmd + Enter to save');
    const [message, setMessage] = useState('');

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          setMessage('✓ Ctrl/Cmd + Enter pressed - Would save');
        } else {
          setMessage('Enter pressed - New line (not saving)');
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setMessage('✓ Escape pressed - Would cancel');
      }
    };

    return (
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            For textarea, use <kbd className="px-2 py-1 bg-white border rounded">Ctrl/Cmd + Enter</kbd> to save:
          </p>
          <InlineEditView
            value={value}
            onChange={setValue}
            onSave={() => setMessage('Save triggered')}
            onCancel={() => setMessage('Cancel triggered')}
            onKeyDown={handleKeyDown}
            onBlur={() => setMessage('Blur triggered')}
            isLoading={false}
            error={null}
            inputType="textarea"
            placeholder="Enter multi-line text"
          />
        </div>
        {message && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700">
            {message}
          </div>
        )}
      </div>
    );
  },
};

