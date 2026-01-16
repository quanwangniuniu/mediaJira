import React from 'react';
import { InlineEditableText } from './InlineEditableText';

interface Person {
  firstName: string;
  lastName: string;
  email: string;
}

interface InlineEditableFormProps {
  person: Person;
  onCommit: (next: Person) => void;
  onCancel?: () => void;
  className?: string;
  showValue?: boolean;
}

/**
 * A form component demonstrating Tab navigation between multiple inline editable fields.
 */
export const InlineEditableForm: React.FC<InlineEditableFormProps> = ({
  person,
  onCommit,
  onCancel,
  className = '',
  showValue = false,
}) => {
  const handleFieldCommit = (field: keyof Person, value: string) => {
    onCommit({
      ...person,
      [field]: value,
    });
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            First Name
          </label>
          <InlineEditableText
            value={person.firstName}
            onCommit={(value) => handleFieldCommit('firstName', value)}
            onCancel={onCancel}
            placeholder="Enter first name"
            className="w-full"
            showValue={showValue}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Last Name
          </label>
          <InlineEditableText
            value={person.lastName}
            onCommit={(value) => handleFieldCommit('lastName', value)}
            onCancel={onCancel}
            placeholder="Enter last name"
            className="w-full"
            showValue={showValue}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Email
        </label>
        <InlineEditableText
          value={person.email}
          onCommit={(value) => handleFieldCommit('email', value)}
          onCancel={onCancel}
          placeholder="Enter email address"
          className="w-full"
          showValue={showValue}
        />
      </div>
    </div>
  );
};
