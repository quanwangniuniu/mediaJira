'use client';

import { useState } from 'react';
import { Menu, X, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../lib/authStore';

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { initialized, isAuthenticated, user } = useAuthStore();

  const displayName = user?.username || user?.email || 'User';
  const displayRole = user?.roles?.[0] || 'Member';

  const handleLoginClick = () => {
    if (!initialized) return;
    if (isAuthenticated) {
      router.push('/profile');
      return;
    }
    router.push('/login');
  };

  const handleGetStartedClick = () => {
    if (!initialized) return;
    if (isAuthenticated) {
      router.push('/tasks');
      return;
    }
    router.push('/login');
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile Menu Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50">
            <nav className="px-6 py-4 space-y-4">
              <a 
                href="#" 
                className="block text-gray-700 hover:text-blue-800 py-2 border-b border-gray-100"
                onClick={() => setIsOpen(false)}
              >
                Features
              </a>
              <a 
                href="#" 
                className="block text-gray-700 hover:text-blue-800 py-2 border-b border-gray-100"
                onClick={() => setIsOpen(false)}
              >
                Solutions
              </a>
              <a 
                href="#" 
                className="block text-gray-700 hover:text-blue-800 py-2 border-b border-gray-100"
                onClick={() => setIsOpen(false)}
              >
                Pricing
              </a>
              <a 
                href="#" 
                className="block text-gray-700 hover:text-blue-800 py-2 border-b border-gray-100"
                onClick={() => setIsOpen(false)}
              >
                Resource
              </a>
              
              <div className="pt-4 space-y-3">
                {isAuthenticated ? (
                  <button 
                    onClick={handleLoginClick} 
                    className="block w-full px-6 py-3 text-blue-800 border-2 border-blue-800 rounded-full hover:bg-blue-50 transition bg-white text-center font-medium"
                  >
                    <span className="inline-flex items-center gap-2 justify-center">
                      <User className="w-4 h-4" />
                      <span>{displayName}</span>
                      <span className="text-xs text-gray-600">{displayRole}</span>
                    </span>
                  </button>
                ) : (
                  <button 
                    onClick={handleLoginClick} 
                    className="block w-full px-6 py-3 text-blue-800 border-2 border-blue-800 rounded-full hover:bg-blue-50 transition bg-white text-center font-medium"
                  >
                    Log in
                  </button>
                )}
                <button 
                  onClick={handleGetStartedClick} 
                  className="block w-full px-6 py-3 bg-blue-800 text-white rounded-full hover:bg-blue-900 transition text-center font-medium"
                >
                  Get Started
                </button>
              </div>
            </nav>
          </div>
        </>
      )}
    </>
  );
}
