import React from 'react';
import { FormButton } from '../form';
import Divider from '../layout/primitives/Divider';

type AuthSubmitProps = {
  loading: boolean;
  disabled: boolean;
  onSubmitClick: () => void;
  submitLabel: string;
  loadingLabel?: string;
  auxiliary?: React.ReactNode;
  showDivider?: boolean;
  dividerText?: string;
  showGoogle?: boolean;
  googleLabel?: string;
  googleDisabled?: boolean;
  onGoogleLogin: () => void;
};

export default function AuthSubmit({
  loading,
  disabled,
  onSubmitClick,
  submitLabel,
  loadingLabel,
  auxiliary,
  showDivider = true,
  dividerText = 'Or continue with',
  showGoogle = true,
  googleLabel = 'Sign in with Google',
  googleDisabled = false,
  onGoogleLogin,
}: AuthSubmitProps) {
  return (
    <>
      <FormButton
        type="submit"
        onClick={onSubmitClick}
        loading={loading}
        disabled={disabled}
      >
        {loading && loadingLabel ? loadingLabel : submitLabel}
      </FormButton>

      {auxiliary ? <div className="text-center">{auxiliary}</div> : null}

      {showDivider ? <Divider text={dividerText} color="gray-300" spacing="md" /> : null}

      {showGoogle ? (
        <button
          type="button"
          onClick={onGoogleLogin}
          disabled={googleDisabled}
          className="w-full relative flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="absolute left-4 flex items-center">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
          </div>
          <span className="flex-1 text-center">{googleLabel}</span>
        </button>
      ) : null}
    </>
  );
}
