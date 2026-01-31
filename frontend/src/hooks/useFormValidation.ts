import { useState, useCallback } from 'react';

// Validation rule type - function that takes a value and returns error message or empty string
export type ValidationRule<T> = (value: T[keyof T]) => string;

// Validation rules object - maps field names to validation functions
export type ValidationRules<T> = {
  [K in keyof T]?: ValidationRule<T>;
};

// Hook return type
export interface UseFormValidationReturn<T> {
  errors: Record<string, string>;
  validateField: (field: keyof T, value: T[keyof T]) => string;
  validateForm: (data: Partial<T>, requiredFields: (keyof T)[]) => boolean;
  clearErrors: () => void;
  setErrors: (errors: Record<string, string>) => void;
  clearFieldError: (field: keyof T) => void;
}

/**
 * Reusable form validation hook
 * Provides field-level and form-level validation with error state management
 * 
 * @param validationRules - Object containing validation functions for each field
 * @returns Validation methods and error state
 */
export const useFormValidation = <T extends Record<string, any>>(
  validationRules: ValidationRules<T>
): UseFormValidationReturn<T> => {
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate a single field
   * @param field - Field name to validate
   * @param value - Field value to validate
   * @returns Error message or empty string if valid
   */
  const validateField = useCallback((field: keyof T, value: T[keyof T]): string => {
    const rule = validationRules[field];
    if (!rule) return '';
    
    return rule(value);
  }, [validationRules]);

  /**
   * Validate entire form
   * @param data - Form data object
   * @param requiredFields - Array of required field names
   * @returns True if form is valid, false otherwise
   */
  const validateForm = useCallback((data: Partial<T>, requiredFields: (keyof T)[]): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate all required fields
    requiredFields.forEach(field => {
      const error = validateField(field, data[field] as T[keyof T]);
      if (error) {
        newErrors[field as string] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [validateField]);

  /**
   * Clear all errors
   */
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Clear error for a specific field
   * @param field - Field name to clear error for
   */
  const clearFieldError = useCallback((field: keyof T) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field as string];
      return newErrors;
    });
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    clearErrors,
    setErrors,
    clearFieldError
  };
}; 