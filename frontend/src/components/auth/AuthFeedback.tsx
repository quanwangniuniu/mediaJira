import React from 'react';
import Link from 'next/link';
import { ErrorMessage } from '../form';

type AuthFeedbackProps = {
  generalError?: string;
  showEmailVerificationHelp?: boolean;
  onDismissEmailVerification?: () => void;
  registerHref?: string;
};

export default function AuthFeedback({
  generalError,
  showEmailVerificationHelp = false,
  onDismissEmailVerification,
  registerHref = '/register',
}: AuthFeedbackProps) {
  return (
    <>
      {generalError ? <ErrorMessage message={generalError} /> : null}

      {showEmailVerificationHelp ? (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Email Verification Required
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Your account needs to be verified before you can log in. Please:</p>
                <ul className="list-disc pl-5 mt-1 space-y-1">
                  <li>Check your email inbox for a verification message</li>
                  <li>Click the verification link in the email</li>
                  <li>Check your spam folder if you don't see the email</li>
                </ul>
              </div>
              <div className="mt-3 flex space-x-3">
                <Link
                  href={registerHref}
                  className="text-sm bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-1.5 rounded transition-colors"
                >
                  Register Again
                </Link>
                <button
                  type="button"
                  onClick={onDismissEmailVerification}
                  className="text-sm text-blue-600 hover:text-blue-500"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
