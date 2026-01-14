'use client';

import React, { useState, useMemo } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import UserAvatar from './UserAvatar';

export interface User {
  id: string | number;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  organizationId?: string | number;
  teamId?: string | number;
}

export interface UserPickerProps {
  users: User[];
  value?: string | number | null;
  onChange?: (userId: string | number | null) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  showAvatar?: boolean;
  allowClear?: boolean;
}


const UserPicker: React.FC<UserPickerProps> = ({
  users,
  value = null,
  onChange,
  placeholder = 'Select user...',
  disabled = false,
  loading = false,
  className = '',
  searchPlaceholder = 'Search users...',
  emptyMessage = 'No users found',
  showAvatar = true,
  allowClear = true,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedUser = useMemo(() => {
    if (value === null) return null;
    return users.find((u) => String(u.id) === String(value)) || null;
  }, [users, value]);

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.role?.toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const handleSelect = (userId: string | number) => {
    if (String(userId) === String(value)) {
      // Toggle off if already selected
      if (allowClear) {
        onChange?.(null);
      }
    } else {
      onChange?.(userId);
    }
    setOpen(false);
    setSearchQuery('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!disabled && allowClear) {
      onChange?.(null);
    }
  };

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            disabled={disabled || loading}
            className={cn(
              'w-full justify-between gap-2 pr-8 flex items-center px-3 py-2 text-sm',
              'border border-gray-300 rounded-md bg-white hover:bg-gray-50',
              'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500',
              'disabled:bg-gray-100 disabled:cursor-not-allowed',
              !selectedUser && 'text-gray-500'
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  <span className="text-gray-500">Loading...</span>
                </div>
              ) : selectedUser ? (
                <>
                  {showAvatar && (
                    <UserAvatar user={selectedUser} size="sm" className="flex-shrink-0" />
                  )}
                  <span className="truncate">{selectedUser.name}</span>
                </>
              ) : (
                <span className="truncate">{placeholder}</span>
              )}
            </div>
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={searchPlaceholder}
              value={searchQuery}
              onValueChange={setSearchQuery}
            />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    <span className="text-sm text-gray-500">Loading users...</span>
                  </div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              ) : (
                <CommandGroup>
                  {filteredUsers.map((user) => {
                    const isSelected = String(user.id) === String(value);
                    return (
                      <CommandItem
                        key={user.id}
                        onSelect={() => handleSelect(user.id)}
                        className="flex items-center justify-between gap-2 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {showAvatar && (
                            <UserAvatar user={user} size="sm" className="flex-shrink-0" />
                          )}
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="truncate font-medium">{user.name}</span>
                            {user.email && (
                              <span className="truncate text-xs text-gray-500">{user.email}</span>
                            )}
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedUser && allowClear && (
        <button
          type="button"
          onClick={handleClear}
          onMouseDown={(e) => e.preventDefault()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100"
          aria-label="Clear selection"
        >
          <span className="text-gray-400 hover:text-gray-600 text-sm">×</span>
        </button>
      )}
    </div>
  );
};

export default UserPicker;
