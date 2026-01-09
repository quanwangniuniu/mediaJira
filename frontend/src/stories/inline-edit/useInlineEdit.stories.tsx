import React, { useState } from 'react';
import { useInlineEdit } from '../../inline-edit/useInlineEdit';
import InlineEditTrigger from '../../inline-edit/InlineEditTrigger';
import InlineEditView from '../../inline-edit/InlineEditView';

export default {
  title: 'Hooks/useInlineEdit',
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
          'useInlineEdit is a custom React Hook that manages inline editing state and logic. It provides state management, validation, keyboard handling, and blur-to-save functionality for inline editing components.',
      },
    },
  },
  tags: ['autodocs'],
};

// Demo component that uses the hook
const InlineEditDemo: React.FC<{
  initialValue: string;
  onSave: (value: string) => Promise<void> | void;
  enableBlurToSave?: boolean;
  validate?: (value: string) => Promise<string | null> | string | null;
  inputType?: 'input' | 'textarea';
  placeholder?: string;
}> = ({
  initialValue,
  onSave,
  enableBlurToSave = true,
  validate,
  inputType = 'input',
  placeholder = 'Click to edit',
}) => {
  const {
    isEditing,
    value,
    setValue,
    isLoading,
    error,
    startEdit,
    save,
    cancel,
    handleKeyDown,
    handleBlur,
  } = useInlineEdit({
    initialValue,
    onSave,
    enableBlurToSave,
    validate,
    inputType,
  });

  if (isEditing) {
    return (
      <div className="w-full max-w-md">
        <InlineEditView
          value={value}
          onChange={setValue}
          onSave={save}
          onCancel={cancel}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          isLoading={isLoading}
          error={error}
          inputType={inputType}
          placeholder={placeholder}
        />
        {isLoading && (
          <div className="mt-2 text-sm text-gray-500">Saving...</div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <InlineEditTrigger
        value={value}
        onStartEdit={startEdit}
        placeholder={placeholder}
      />
      {error && (
        <div className="mt-2 text-sm text-red-600">Error: {error}</div>
      )}
    </div>
  );
};

// Default story - Basic usage
export const Default = {
  render: () => {
    const [savedValue, setSavedValue] = useState('John Doe');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Click the text below to start editing
          </h3>
          <InlineEditDemo
            initialValue={savedValue}
            onSave={async (newValue) => {
              // Simulate API call
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

// Synchronous save
export const SynchronousSave = {
  render: () => {
    const [savedValue, setSavedValue] = useState('Synchronous Save Example');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Synchronous Save (Immediate)
          </h3>
          <InlineEditDemo
            initialValue={savedValue}
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
    const [savedValue, setSavedValue] = useState('Asynchronous Save Example');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Asynchronous Save (Simulated API Call)
          </h3>
          <InlineEditDemo
            initialValue={savedValue}
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
          <InlineEditDemo
            initialValue={savedValue}
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
            Async Validation (Check if Name Exists)
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Used names: {usedNames.join(', ')}
          </p>
          <InlineEditDemo
            initialValue={savedValue}
            onSave={async (newValue) => {
              await new Promise((resolve) => setTimeout(resolve, 500));
              setSavedValue(newValue);
            }}
            validate={async (value) => {
              // Simulate API call to check if name exists
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

// Textarea input type
export const TextareaInput = {
  render: () => {
    const [savedValue, setSavedValue] = useState('This is a multi-line text example.\nYou can enter multiple lines of content.');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Textarea Input (Use Ctrl/Cmd + Enter to Save)
          </h3>
          <InlineEditDemo
            initialValue={savedValue}
            onSave={async (newValue) => {
              await new Promise((resolve) => setTimeout(resolve, 500));
              setSavedValue(newValue);
            }}
            inputType="textarea"
            placeholder="Enter multi-line text, use Ctrl/Cmd + Enter to save"
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

// Disable blur to save
export const DisableBlurToSave = {
  render: () => {
    const [savedValue, setSavedValue] = useState('Must Press Enter to Save');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Disable Blur to Save (Must Press Enter)
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Clicking outside will not save, must press Enter to save
          </p>
          <InlineEditDemo
            initialValue={savedValue}
            onSave={async (newValue) => {
              await new Promise((resolve) => setTimeout(resolve, 500));
              setSavedValue(newValue);
            }}
            enableBlurToSave={false}
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

// Keyboard shortcuts demo
export const KeyboardShortcuts = {
  render: () => {
    const [savedValue, setSavedValue] = useState('Using Keyboard Shortcuts');

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Keyboard Shortcuts Demo
          </h3>
          <div className="mb-4 p-3 bg-blue-50 rounded text-sm">
            <p className="font-medium mb-2">Shortcuts:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>
                <kbd className="px-2 py-1 bg-white border rounded">Enter</kbd> - Save
              </li>
              <li>
                <kbd className="px-2 py-1 bg-white border rounded">Esc</kbd> - Cancel editing
              </li>
              <li>
                <kbd className="px-2 py-1 bg-white border rounded">Blur</kbd> - Auto save (if enabled)
              </li>
            </ul>
          </div>
          <InlineEditDemo
            initialValue={savedValue}
            onSave={async (newValue) => {
              await new Promise((resolve) => setTimeout(resolve, 300));
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

// Error handling
export const ErrorHandling = {
  render: () => {
    const [savedValue, setSavedValue] = useState('Value That May Fail');
    const [failCount, setFailCount] = useState(0);

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Error Handling Demo (Random Failure)
          </h3>
          <p className="text-xs text-gray-500 mb-2">
            Save may randomly fail to demonstrate error handling
          </p>
          <InlineEditDemo
            initialValue={savedValue}
            onSave={async (newValue) => {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              // Randomly fail to demonstrate error handling
              if (Math.random() > 0.5) {
                throw new Error('Save failed, please try again');
              }
              setSavedValue(newValue);
              setFailCount(0);
            }}
          />
        </div>
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">
            <strong>Saved value:</strong> {savedValue}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            <strong>Failure count:</strong> {failCount}
          </p>
        </div>
      </div>
    );
  },
};

// State display demo
export const StateDisplay = {
  render: () => {
    const [savedValue, setSavedValue] = useState('View State Changes');

    const StateDisplayComponent: React.FC = () => {
      const {
        isEditing,
        value,
        setValue,
        isLoading,
        error,
        startEdit,
        save,
        cancel,
        handleKeyDown,
        handleBlur,
      } = useInlineEdit({
        initialValue: savedValue,
        onSave: async (newValue) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          setSavedValue(newValue);
        },
      });

      return (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Edit Component
            </h3>
            {isEditing ? (
              <InlineEditView
                value={value}
                onChange={setValue}
                onSave={save}
                onCancel={cancel}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                isLoading={isLoading}
                error={error}
              />
            ) : (
              <InlineEditTrigger
                value={value}
                onStartEdit={startEdit}
                placeholder="Click to edit"
              />
            )}
          </div>
          <div className="mt-4 p-4 bg-gray-50 rounded space-y-2">
            <h4 className="font-medium text-sm">Hook State:</h4>
            <div className="text-xs space-y-1">
              <p>
                <strong>isEditing:</strong>{' '}
                <span className={isEditing ? 'text-green-600' : 'text-gray-600'}>
                  {isEditing ? 'true' : 'false'}
                </span>
              </p>
              <p>
                <strong>value:</strong> <span className="text-gray-700">"{value}"</span>
              </p>
              <p>
                <strong>isLoading:</strong>{' '}
                <span className={isLoading ? 'text-blue-600' : 'text-gray-600'}>
                  {isLoading ? 'true' : 'false'}
                </span>
              </p>
              <p>
                <strong>error:</strong>{' '}
                <span className={error ? 'text-red-600' : 'text-gray-600'}>
                  {error || 'null'}
                </span>
              </p>
            </div>
          </div>
        </div>
      );
    };

    return <StateDisplayComponent />;
  },
};

