import React from 'react';
import Link from 'next/link';

type RegisterSuccessMessageProps = {
  message: string;
  onRegisterAnother: () => void;
  loginHref?: string;
};

export default function RegisterSuccessMessage({
  message,
  onRegisterAnother,
  loginHref = '/login',
}: RegisterSuccessMessageProps) {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
        <svg className="h-8 w-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-900">
          Registration Successful!
        </h3>
        <p className="text-gray-600">{message}</p>

        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Account Ready!
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Your account has been created and is ready to use. You can now log in with your email and password.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-sm text-gray-500">
          <p>Need to make changes? You can</p>
          <button
            type="button"
            onClick={onRegisterAnother}
            className="text-blue-600 hover:text-blue-500 font-medium"
          >
            register another account
          </button>
        </div>

        <div className="pt-4">
          <Link
            href={loginHref}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Go to Login Page
          </Link>
        </div>
      </div>
    </div>
  );
}
