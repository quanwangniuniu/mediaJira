import React, { useState } from 'react';
import InlineEditController from '../../inline-edit/InlineEditController';

export default {
  title: 'Inline Edit/InlineEditController',
  component: InlineEditController,
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
          'InlineEditController is the main component that combines InlineEditTrigger and InlineEditView. It manages the complete inline editing flow including state management, validation, keyboard handling, and blur-to-save functionality.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    value: {
      control: 'text',
      description: 'The initial value to display and edit.',
      table: {
        type: { summary: 'string' },
        category: 'Content',
      },
    },
    onSave: {
      action: 'save',
      description: 'Callback function called when save is triggered. Can be synchronous or asynchronous.',
      table: {
        type: { summary: '(value: string) => Promise<void> | void' },
        category: 'Events',
      },
    },
    enableBlurToSave: {
      control: 'boolean',
      description: 'Whether to automatically save when the input loses focus.',
      table: {
        type: { summary: 'boolean' },
        defaultValue: { summary: 'true' },
        category: 'Behavior',
      },
    },
    validate: {
      control: false,
      description: 'Validation function that returns an error message or null.',
      table: {
        type: { summary: '(value: string) => Promise<string | null> | string | null' },
        category: 'Validation',
      },
    },
    inputType: {
      control: 'select',
      options: ['input', 'textarea'],
      description: 'Type of input element to use.',
      table: {
        type: { summary: 'input | textarea' },
        defaultValue: { summary: 'input' },
        category: 'Layout',
      },
    },
    placeholder: {
      control: 'text',
      description: 'Placeholder text shown when value is empty or in edit mode.',
      table: {
        type: { summary: 'string' },
        defaultValue: { summary: 'Click to edit' },
        category: 'Content',
      },
    },
    className: {
      control: 'text',
      description: 'Additional CSS classes to apply.',
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
  render: () => {
    const [savedValue, setSavedValue] = useState('John Doe');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Click the text below to start editing
          </h3>
          <InlineEditController
            value={savedValue}
            onSave={async (newValue) => {
              await new Promise((resolve) => setTimeout(resolve, 500));
              setSavedValue(newValue);
            }}
          />
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Saved value:</strong> {savedValue}
          </p>
        </div>
      </div>
    );
  },
};

// Keyboard Support - Enter to Save
export const KeyboardEnterToSave = {
  render: () => {
    const [savedValue, setSavedValue] = useState('Press Enter to save');
    const [lastAction, setLastAction] = useState('');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Keyboard Support: Enter to Save
          </h3>
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
            <p className="font-medium mb-2">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Click the text below to start editing</li>
              <li>Type your changes</li>
              <li>Press <kbd className="px-2 py-1 bg-white border rounded">Enter</kbd> to save</li>
            </ol>
          </div>
          <InlineEditController
            value={savedValue}
            onSave={async (newValue) => {
              setLastAction('Saved via Enter key');
              await new Promise((resolve) => setTimeout(resolve, 300));
              setSavedValue(newValue);
            }}
          />
        </div>
        {lastAction && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            ✓ {lastAction}
          </div>
        )}
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Saved value:</strong> {savedValue}
          </p>
        </div>
      </div>
    );
  },
};

// Keyboard Support - Esc to Cancel
export const KeyboardEscToCancel = {
  render: () => {
    const [savedValue, setSavedValue] = useState('Press Esc to cancel');
    const [lastAction, setLastAction] = useState('');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Keyboard Support: Esc to Cancel
          </h3>
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
            <p className="font-medium mb-2">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Click the text below to start editing</li>
              <li>Type some changes</li>
              <li>Press <kbd className="px-2 py-1 bg-white border rounded">Esc</kbd> to cancel (changes will be discarded)</li>
            </ol>
          </div>
          <InlineEditController
            value={savedValue}
            onSave={async (newValue) => {
              await new Promise((resolve) => setTimeout(resolve, 300));
              setSavedValue(newValue);
            }}
          />
        </div>
        {lastAction && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
            {lastAction}
          </div>
        )}
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Saved value:</strong> {savedValue} (unchanged if Esc was pressed)
          </p>
        </div>
      </div>
    );
  },
};

// Blur-to-Save Enabled (Default)
export const BlurToSaveEnabled = {
  render: () => {
    const [savedValue, setSavedValue] = useState('Click outside to save');
    const [saveCount, setSaveCount] = useState(0);

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Blur-to-Save Enabled (Default Behavior)
          </h3>
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
            <p className="font-medium mb-2">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Click the text below to start editing</li>
              <li>Type your changes</li>
              <li>Click outside the input (blur) to automatically save</li>
            </ol>
          </div>
          <InlineEditController
            value={savedValue}
            onSave={async (newValue) => {
              setSaveCount((prev) => prev + 1);
              await new Promise((resolve) => setTimeout(resolve, 300));
              setSavedValue(newValue);
            }}
            enableBlurToSave={true}
          />
        </div>
        <div className="p-3 bg-gray-50 rounded text-sm">
          <p className="text-gray-600">
            <strong>Save count:</strong> {saveCount}
          </p>
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Saved value:</strong> {savedValue}
          </p>
        </div>
      </div>
    );
  },
};

// Blur-to-Save Disabled
export const BlurToSaveDisabled = {
  render: () => {
    const [savedValue, setSavedValue] = useState('Must press Enter to save');
    const [message, setMessage] = useState('');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Blur-to-Save Disabled
          </h3>
          <div className="mb-4 p-3 bg-yellow-50 rounded text-sm">
            <p className="font-medium mb-2">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Click the text below to start editing</li>
              <li>Type your changes</li>
              <li>Click outside - changes will be <strong>discarded</strong> (not saved)</li>
              <li>You must press <kbd className="px-2 py-1 bg-white border rounded">Enter</kbd> to save</li>
            </ol>
          </div>
          <InlineEditController
            value={savedValue}
            onSave={async (newValue) => {
              setMessage('Saved via Enter key');
              await new Promise((resolve) => setTimeout(resolve, 300));
              setSavedValue(newValue);
            }}
            enableBlurToSave={false}
          />
        </div>
        {message && (
          <div className="p-3 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            ✓ {message}
          </div>
        )}
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Saved value:</strong> {savedValue}
          </p>
        </div>
      </div>
    );
  },
};

// Complete Keyboard Support Demo
export const CompleteKeyboardSupport = {
  render: () => {
    const [savedValue, setSavedValue] = useState('Complete keyboard demo');
    const [actions, setActions] = useState<string[]>([]);

    const addAction = (action: string) => {
      setActions((prev) => [...prev, action]);
    };

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Complete Keyboard Support Demo
          </h3>
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
            <p className="font-medium mb-2">Keyboard shortcuts:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>
                <kbd className="px-2 py-1 bg-white border rounded">Enter</kbd> - Save (for input)
              </li>
              <li>
                <kbd className="px-2 py-1 bg-white border rounded">Ctrl/Cmd + Enter</kbd> - Save (for textarea)
              </li>
              <li>
                <kbd className="px-2 py-1 bg-white border rounded">Esc</kbd> - Cancel editing
              </li>
              <li>
                <kbd className="px-2 py-1 bg-white border rounded">Tab</kbd> or click outside - Blur (saves if enabled)
              </li>
            </ul>
          </div>
          <InlineEditController
            value={savedValue}
            onSave={async (newValue) => {
              addAction(`Saved: "${newValue}"`);
              await new Promise((resolve) => setTimeout(resolve, 300));
              setSavedValue(newValue);
            }}
          />
        </div>
        {actions.length > 0 && (
          <div className="p-3 bg-gray-50 rounded text-sm">
            <p className="font-medium mb-2">Action log:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {actions.map((action, index) => (
                <li key={index}>{action}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Saved value:</strong> {savedValue}
          </p>
        </div>
      </div>
    );
  },
};

// Textarea with Ctrl+Enter
export const TextareaWithCtrlEnter = {
  render: () => {
    const [savedValue, setSavedValue] = useState('Multi-line textarea\nUse Ctrl/Cmd + Enter to save');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Textarea with Ctrl/Cmd + Enter to Save
          </h3>
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
            <p className="font-medium mb-2">Instructions:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-700">
              <li>Click the text below to start editing</li>
              <li>Type multiple lines (Enter creates new line)</li>
              <li>Press <kbd className="px-2 py-1 bg-white border rounded">Ctrl/Cmd + Enter</kbd> to save</li>
              <li>Or click outside to save (blur-to-save)</li>
            </ol>
          </div>
          <InlineEditController
            value={savedValue}
            onSave={async (newValue) => {
              await new Promise((resolve) => setTimeout(resolve, 500));
              setSavedValue(newValue);
            }}
            inputType="textarea"
            placeholder="Enter multi-line text"
          />
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600 whitespace-pre-wrap">
            <strong>Saved value:</strong>
            <br />
            {savedValue}
          </p>
        </div>
      </div>
    );
  },
};

// With validation
export const WithValidation = {
  render: () => {
    const [savedValue, setSavedValue] = useState('');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            With Validation (Minimum 3 Characters)
          </h3>
          <InlineEditController
            value={savedValue}
            onSave={async (newValue) => {
              await new Promise((resolve) => setTimeout(resolve, 500));
              setSavedValue(newValue);
            }}
            validate={(value) => {
              if (value.trim().length < 3) {
                return 'At least 3 characters required';
              }
              return null;
            }}
            placeholder="Enter at least 3 characters"
          />
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Saved value:</strong> {savedValue || '(empty)'}
          </p>
        </div>
      </div>
    );
  },
};

// Async validation
export const WithAsyncValidation = {
  render: () => {
    const [savedValue, setSavedValue] = useState('');
    const [usedNames] = useState(['admin', 'test', 'user']);

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            With Async Validation (Check Name Availability)
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Used names: {usedNames.join(', ')}
          </p>
          <InlineEditController
            value={savedValue}
            onSave={async (newValue) => {
              await new Promise((resolve) => setTimeout(resolve, 500));
              setSavedValue(newValue);
            }}
            validate={async (value) => {
              await new Promise((resolve) => setTimeout(resolve, 800));
              if (usedNames.includes(value.toLowerCase())) {
                return 'This name is already taken';
              }
              if (value.trim().length < 2) {
                return 'At least 2 characters required';
              }
              return null;
            }}
            placeholder="Enter new name"
          />
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Saved value:</strong> {savedValue || '(empty)'}
          </p>
        </div>
      </div>
    );
  },
};

// Error handling
export const ErrorHandling = {
  render: () => {
    const [savedValue, setSavedValue] = useState('May fail randomly');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Error Handling (Random Failure)
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Save may randomly fail to demonstrate error handling
          </p>
          <InlineEditController
            value={savedValue}
            onSave={async (newValue) => {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              if (Math.random() > 0.5) {
                throw new Error('Save failed, please try again');
              }
              setSavedValue(newValue);
            }}
          />
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Saved value:</strong> {savedValue}
          </p>
        </div>
      </div>
    );
  },
};

// Custom render trigger
export const CustomRenderTrigger = {
  render: () => {
    const [savedValue, setSavedValue] = useState('Custom Rendered');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Custom Render Trigger
          </h3>
          <InlineEditController
            value={savedValue}
            onSave={async (newValue) => {
              await new Promise((resolve) => setTimeout(resolve, 500));
              setSavedValue(newValue);
            }}
            renderTrigger={(value) => (
              <div className="flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded">
                <span className="text-lg font-semibold text-blue-600">{value}</span>
                <span className="text-sm text-gray-500">(Click to edit)</span>
              </div>
            )}
          />
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Saved value:</strong> {savedValue}
          </p>
        </div>
      </div>
    );
  },
};

// Synchronous save
export const SynchronousSave = {
  render: () => {
    const [savedValue, setSavedValue] = useState('Synchronous Save');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Synchronous Save (Immediate)
          </h3>
          <InlineEditController
            value={savedValue}
            onSave={(newValue) => {
              // Synchronous save - no async/await
              setSavedValue(newValue);
            }}
          />
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Saved value:</strong> {savedValue}
          </p>
        </div>
      </div>
    );
  },
};

// Asynchronous save
export const AsynchronousSave = {
  render: () => {
    const [savedValue, setSavedValue] = useState('Asynchronous Save');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Asynchronous Save (Simulated API Call)
          </h3>
          <InlineEditController
            value={savedValue}
            onSave={async (newValue) => {
              // Simulate API call with delay
              await new Promise((resolve) => setTimeout(resolve, 1500));
              setSavedValue(newValue);
            }}
          />
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Saved value:</strong> {savedValue}
          </p>
        </div>
      </div>
    );
  },
};

