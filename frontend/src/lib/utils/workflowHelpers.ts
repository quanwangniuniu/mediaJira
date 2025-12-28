/**
 * Helper utilities for workflow operations
 */

/**
 * Generate a unique temporary ID for optimistic updates
 * Uses timestamp + random string to ensure uniqueness
 */
export function generateTempId(): number {
  return Date.now() + Math.floor(Math.random() * 1000000);
}

/**
 * Extract error message from API error response
 * Handles different error response formats
 */
export function extractErrorMessage(error: any, defaultMessage: string): string {
  if (!error) return defaultMessage;

  // Try different error response formats
  if (error.response?.data) {
    const errorData = error.response.data;
    
    // Direct message field
    if (errorData.message) {
      return errorData.message;
    }
    
    // Non-field errors (array or string)
    if (errorData.non_field_errors) {
      const errors = Array.isArray(errorData.non_field_errors)
        ? errorData.non_field_errors
        : [errorData.non_field_errors];
      return errors[0] || defaultMessage;
    }
    
    // Error field
    if (errorData.error) {
      return typeof errorData.error === 'string' 
        ? errorData.error 
        : defaultMessage;
    }
    
    // Field-specific errors (first field error)
    const fieldErrors = Object.values(errorData).find(
      (value) => Array.isArray(value) && value.length > 0
    ) as string[] | undefined;
    if (fieldErrors && fieldErrors.length > 0) {
      return fieldErrors[0];
    }
  }
  
  // Fallback to error message or default
  return error.message || defaultMessage;
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: Array<{ code: string; message: string }>): string {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0].message;
  return `${errors.length} validation errors found`;
}

