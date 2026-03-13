import React from 'react';
import Image from 'next/image';

export default function FormContainer({ children, title, subtitle }) {
  return (
      <div className="max-w-md w-full space-y-8">
        <div className="bg-white py-8 px-6 shadow-lg rounded-lg">
          <div className="text-center mb-8">
            <div className="flex flex-col justify-center mb-4 items-center">
              <Image
                src="/login_logo_square.jpeg"
                alt="MediaJira Logo"
                width={278}
                height={69}
                className="h-16 w-auto"
                priority
              />
              <h1 className="text-3xl font-bold">
                <span className="text-blue-800">Media</span>
                <span className="text-gray-900">Jira</span>
              </h1>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
            {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
          </div>
          
          {children}
        </div>
      </div>
  );
}