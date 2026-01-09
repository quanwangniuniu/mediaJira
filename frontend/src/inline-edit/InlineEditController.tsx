import React from 'react';
import { useInlineEdit } from './useInlineEdit';
import InlineEditTrigger from './InlineEditTrigger';
import InlineEditView from './InlineEditView';

export interface InlineEditControllerProps {
  value: string;
  onSave: (value: string) => Promise<void> | void;
  enableBlurToSave?: boolean;
  validate?: (value: string) => Promise<string | null> | string | null;
  inputType?: 'input' | 'textarea';
  placeholder?: string;
  className?: string;
  renderTrigger?: (value: string) => React.ReactNode;
}

/**
 * Main controller component that combines Trigger and View
 * Combines the trigger (display mode) and view (edit mode) components
 */
const InlineEditController: React.FC<InlineEditControllerProps> = ({
  value: initialValue,
  onSave,
  enableBlurToSave = true,
  validate,
  inputType = 'input',
  placeholder = 'Click to edit',
  className = '',
  renderTrigger,
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
        className={className}
      />
    );
  }

  return (
    <InlineEditTrigger
      value={value}
      onStartEdit={startEdit}
      placeholder={placeholder}
      className={className}
      renderTrigger={renderTrigger}
    />
  );
};

export default InlineEditController;

