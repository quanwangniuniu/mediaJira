'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

export default function DropdownMenu({ trigger, items, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (item) => {
    if (item.onClick) {
      item.onClick();
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div onClick={() => setIsOpen(!isOpen)}>
        {trigger}
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
          <div className="py-1">
            {items.map((item, index) => (
              <div key={index}>
                {item.type === 'divider' ? (
                  <div className="border-t border-gray-100 my-1" />
                ) : (
                  <button
                    onClick={() => handleItemClick(item)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center ${
                      item.className || 'text-gray-700'
                    }`}
                  >
                    {item.icon && <item.icon className="h-4 w-4 mr-2" />}
                    {item.label}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 