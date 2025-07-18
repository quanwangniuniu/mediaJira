// src/components/ui/ApproverSelect.tsx - 连接真实API版本
import React, { useState, useMemo } from 'react';
import { Combobox } from '@headlessui/react';
import { ChevronsUpDown, Check, X, Search } from 'lucide-react';
import { ApproverUser } from '@/types/approver';

interface ApproverSelectProps {
  users: ApproverUser[];
  value: ApproverUser[];
  onChange: (value: ApproverUser[]) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const ApproverSelect: React.FC<ApproverSelectProps> = ({
  users,
  value,
  onChange,
  placeholder = 'Search for user...',
  className = '',
  disabled = false,
}) => {
  const [query, setQuery] = useState('');

  const filteredUsers = useMemo(() => {
    if (!query) return users;
    const q = query.toLowerCase();
    return users.filter(user =>
      user.username.toLowerCase().includes(q) ||
      user.email.toLowerCase().includes(q)
    );
  }, [users, query]);

  const handleSelect = (user: ApproverUser) => {
    if (value.some(u => u.id === user.id)) {
      onChange(value.filter(u => u.id !== user.id));
    } else {
      onChange([...value, user]);
    }
  };

  const handleRemove = (userId: number) => {
    onChange(value.filter(u => u.id !== userId));
  };

  return (
    <div className={`w-full ${className}`}>
      <Combobox value={value} onChange={onChange} multiple disabled={disabled}>
        <div className="relative">
          <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 sm:text-sm">
            <Combobox.Input
              className="w-full border-none py-2 pl-3 pr-10 leading-5 text-gray-900 focus:ring-0"
              displayValue={() => ''}
              onChange={e => setQuery(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
            />
            <span className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronsUpDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
            </span>
          </div>
          <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {filteredUsers.length === 0 && (
              <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                No users found.
              </div>
            )}
            {filteredUsers.map(user => (
              <Combobox.Option
                key={user.id}
                value={user}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                  }`
                }
                onClick={() => handleSelect(user)}
              >
                <span className={`block truncate ${value.some(u => u.id === user.id) ? 'font-medium' : 'font-normal'}`}>
                  {user.username} <span className="text-xs text-gray-400">({user.email})</span>
                </span>
                {value.some(u => u.id === user.id) && (
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </span>
                )}
              </Combobox.Option>
            ))}
          </Combobox.Options>
        </div>
      </Combobox>
      {/* Choosen users list */}
      <div className="mt-2 flex flex-wrap gap-2">
        {value.map(user => (
          <span key={user.id} className="inline-flex items-center rounded bg-blue-100 px-2 py-1 text-xs text-blue-800">
            {user.username}
            <button
              type="button"
              className="ml-1 text-blue-500 hover:text-blue-700"
              onClick={() => handleRemove(user.id)}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
};

export default ApproverSelect;