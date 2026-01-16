import React, { useState } from 'react';
import { InlineEditableText } from '../keyboard-inline-edit/InlineEditableText';
import { InlineEditableForm } from '../keyboard-inline-edit/InlineEditableForm';
import { useInlineEdit } from '../keyboard-inline-edit/useInlineEdit';

export default {
  title: 'Keyboard Inline Edit',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'Reusable inline editing components with keyboard shortcuts and focus management.',
      },
    },
  },
  tags: ['autodocs'],
};

// Enter to Edit story
export const EnterToEdit: React.FC = () => {
  const [value, setValue] = useState('Click here or press Enter to edit');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Enter to Edit
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Focus the text below and press <kbd className="px-2 py-1 bg-white border rounded">Enter</kbd> to start editing,
          or click to edit directly.
        </p>
        <InlineEditableText
          value={value}
          onCommit={setValue}
          placeholder="Enter text here"
          showValue={false}
        />
      </div>
      <div className="mt-4 p-4 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">
          <strong>Current value:</strong> {value}
        </p>
      </div>
    </div>
  );
};

(EnterToEdit as any).play = async ({ canvasElement }: { canvasElement: HTMLElement | null }) => {
  // This would simulate pressing Enter to start editing
  // For now, we'll just demonstrate the component works
};

// Esc to Cancel and Revert story
export const EscToCancelRevert: React.FC = () => {
  const [value, setValue] = useState('Original value');

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Esc to Cancel and Revert
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Start editing, change the text, then press <kbd className="px-2 py-1 bg-white border rounded">Esc</kbd> to cancel and revert to the original value.
        </p>
        <InlineEditableText
          value={value}
          onCommit={setValue}
          placeholder="Start typing, then press Esc"
          showValue={false}
        />
      </div>
      <div className="mt-4 p-4 bg-gray-50 rounded">
        <p className="text-sm text-gray-600">
          <strong>Current value:</strong> {value}
        </p>
      </div>
    </div>
  );
};

// Tab Navigation Between Fields story
export const TabNavigationBetweenFields: React.FC = () => {
  const [person, setPerson] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
  });

  const handleCommit = (updatedPerson: typeof person) => {
    setPerson(updatedPerson);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Tab Navigation Between Fields
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          Use <kbd className="px-2 py-1 bg-white border rounded">Tab</kbd> to navigate between editable fields.
          Native Tab behavior is preserved - no custom handling.
        </p>
        <InlineEditableForm
          person={person}
          onCommit={handleCommit}
          showValue={false}
        />
      </div>
      <div className="mt-4 p-4 bg-gray-50 rounded">
        <h4 className="font-medium text-sm mb-2">Current values:</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>First Name:</strong> {person.firstName}</p>
          <p><strong>Last Name:</strong> {person.lastName}</p>
          <p><strong>Email:</strong> {person.email}</p>
        </div>
      </div>
    </div>
  );
};

// Additional story for textarea with Ctrl+Enter
export const TextareaWithCtrlEnter: React.FC = () => {
  const [value, setValue] = useState('This is a multi-line text area.\n\nUse Ctrl+Enter (or Cmd+Enter on Mac) to commit changes.\n\nRegular Enter creates new lines.');

  const { isEditing, viewProps, inputProps } = useInlineEdit(
    value,
    setValue,
    {}
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium text-gray-700 mb-2">
          Textarea with Ctrl+Enter to Commit
        </h3>
        <p className="text-xs text-gray-500 mb-4">
          For textareas, <kbd className="px-2 py-1 bg-white border rounded">Enter</kbd> creates new lines.
          Use <kbd className="px-2 py-1 bg-white border rounded">Ctrl</kbd> + <kbd className="px-2 py-1 bg-white border rounded">Enter</kbd> to commit.
        </p>
        <div className="w-full max-w-md">
          {isEditing ? (
            <textarea
              {...inputProps}
              className="w-full min-h-[100px] px-2 py-1 rounded border border-blue-500 bg-white focus-visible:outline-none resize-none"
              placeholder="Enter multi-line text"
            />
          ) : (
            <div
              {...viewProps}
              className="w-full min-h-[100px] px-2 py-1 rounded border border-transparent hover:border-gray-300 focus-visible:border-blue-500 focus-visible:outline-none cursor-pointer whitespace-pre-wrap"
            >
              {value || (
                <span className="text-gray-400 italic">Click to edit multi-line text</span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="mt-4 p-4 bg-gray-50 rounded">
        <p className="text-sm text-gray-600 whitespace-pre-wrap">
          <strong>Current value:</strong>
          <br />
          {value}
        </p>
      </div>
    </div>
  );
};