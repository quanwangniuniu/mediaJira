import React from 'react';
import { FormContainer } from '../form';

type AuthFormWrapperProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
};

export default function AuthFormWrapper({
  title,
  subtitle,
  children,
  className = '',
}: AuthFormWrapperProps) {
  return (
    <div
      className={`min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-cyan-50 py-12 px-4 sm:px-6 lg:px-8 ${className}`}
    >
      <FormContainer title={title} subtitle={subtitle}>
        {children}
      </FormContainer>
    </div>
  );
}
