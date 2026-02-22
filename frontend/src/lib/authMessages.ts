/**
 * Standardized login error messages.
 * Use these keys everywhere so copy can be updated in one place.
 * Never include the user's email in any message (security/privacy).
 */
export const LOGIN_ERROR_MESSAGES = {
  /** Unregistered email – keep generic; do not disclose the email address */
  EMAIL_NOT_REGISTERED: 'This email is not registered. Please sign up first.',
  /** Valid email but incorrect password – indicate password error only */
  INVALID_PASSWORD: 'Invalid password. Please try again.',
  /** Network/connection failure */
  NETWORK: 'Network error. Please check your connection and try again.',
  /** Account email not verified */
  EMAIL_NOT_VERIFIED: 'Email not verified. Please check your inbox.',
  /** Google OAuth user has not set password yet */
  PASSWORD_NOT_SET: 'Password not set. Please complete your password setup to continue.',
  /** Missing or invalid form fields */
  VALIDATION: 'Please check your input.',
  /** Server error (5xx) */
  SERVER: 'Server error. Please try again later.',
  /** Generic fallback */
  GENERIC: 'Login failed. Please try again.',
} as const;

export type LoginErrorKey = keyof typeof LOGIN_ERROR_MESSAGES;

/** True when the error is due to network/connection (no response, timeout, etc.). */
export function isNetworkError(error: any): boolean {
  if (!error) return false;
  if (error.response === undefined || error.response === null) return true;
  const code = error.code;
  const message = (error.message || '').toLowerCase();
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    message.includes('network error') ||
    message.includes('failed to fetch')
  );
}
