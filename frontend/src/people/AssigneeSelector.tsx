'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Check, UserX, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
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

export interface RecentUser extends User {
  lastUsedAt: string;
  lastAssignedAt?: string;
  assignmentCount?: number;
}

export type AssigneeValue = string | number | null | 'unassigned';

export interface AssigneeSelectorProps {
  users: User[];
  recentUsers?: RecentUser[];
  value?: AssigneeValue;
  onChange?: (value: AssigneeValue) => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  triggerClassName?: string;
  searchPlaceholder?: string;
  unassignedLabel?: string;
  recentUsersLabel?: string;
  allUsersLabel?: string;
  showAvatar?: boolean;
  maxRecentUsers?: number;
}

const UNASSIGNED_ID = 'unassigned';


const AssigneeSelector: React.FC<AssigneeSelectorProps> = ({
  users,
  recentUsers = [],
  value = null,
  onChange,
  placeholder = 'Assign to...',
  disabled = false,
  loading = false,
  className = '',
  triggerClassName,
  searchPlaceholder = 'Search users...',
  unassignedLabel = 'Unassigned',
  recentUsersLabel = 'Recent',
  allUsersLabel = 'All users',
  showAvatar = true,
  maxRecentUsers = 5,
}) => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Get selected user or unassigned
  const selectedUser = useMemo(() => {
    if (value === null || value === UNASSIGNED_ID) return null;
    return users.find((u) => String(u.id) === String(value)) || null;
  }, [users, value]);

  const isUnassigned = value === null || value === UNASSIGNED_ID;

  // Filter recent users (exclude already selected user and limit count)
  const displayRecentUsers = useMemo(() => {
    const filtered = recentUsers
      .filter((user) => String(user.id) !== String(value))
      .slice(0, maxRecentUsers);
    return filtered;
  }, [recentUsers, value, maxRecentUsers]);

  // Filter all users based on search query
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

  const handleSelect = (selectedValue: AssigneeValue) => {
    if (selectedValue === value) {
      // Toggle off if already selected (only for unassigned)
      if (selectedValue === UNASSIGNED_ID) {
        onChange?.(null);
      }
    } else {
      onChange?.(selectedValue);
    }
    setOpen(false);
    setSearchQuery('');
  };

  // Reset search when popover closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

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
              !selectedUser && !isUnassigned && 'text-gray-500',
              triggerClassName
            )}
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  <span className="text-gray-500">Loading...</span>
                </div>
              ) : isUnassigned ? (
                <>
                  <UserX className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="truncate text-gray-500">{unassignedLabel}</span>
                </>
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
                    <span className="text-sm text-gray-500">Loading...</span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Unassigned Option */}
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => handleSelect(UNASSIGNED_ID)}
                      className="flex items-center justify-between gap-2 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <UserX className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-500">{unassignedLabel}</span>
                      </div>
                      {isUnassigned && <Check className="h-4 w-4" />}
                    </CommandItem>
                  </CommandGroup>

                  {displayRecentUsers.length > 0 && !searchQuery && (
                    <>
                      <CommandSeparator />
                      <CommandGroup heading={recentUsersLabel}>
                        {displayRecentUsers.map((user) => {
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
                                    <span className="truncate text-xs text-gray-500">
                                      {user.email}
                                    </span>
                                  )}
                                </div>
                                {user.lastAssignedAt && (
                                  <Clock className="h-3 w-3 text-gray-400 flex-shrink-0" />
                                )}
                              </div>
                              {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </>
                  )}

                
                  {filteredUsers.length > 0 && (
                    <>
                      {(displayRecentUsers.length > 0 || searchQuery) && <CommandSeparator />}
                      <CommandGroup heading={searchQuery ? undefined : allUsersLabel}>
                        {filteredUsers.map((user) => {
                          const isSelected = String(user.id) === String(value);
                          // Skip if already in recent users (when not searching)
                          if (
                            !searchQuery &&
                            displayRecentUsers.some((ru) => String(ru.id) === String(user.id))
                          ) {
                            return null;
                          }
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
                                    <span className="truncate text-xs text-gray-500">
                                      {user.email}
                                    </span>
                                  )}
                                </div>
                              </div>
                              {isSelected && <Check className="h-4 w-4 flex-shrink-0" />}
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </>
                  )}

                  {filteredUsers.length === 0 && searchQuery && (
                    <CommandEmpty>No users found</CommandEmpty>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default AssigneeSelector;
