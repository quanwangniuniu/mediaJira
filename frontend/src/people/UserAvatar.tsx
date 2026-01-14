'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export interface UserAvatarProps {
  user?: {
    name: string;
    avatar?: string;
    email?: string;
  } | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
  fallbackText?: string;
}

const sizeClasses = {
  xs: 'w-5 h-5 text-xs',
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-12 h-12 text-lg',
};

/**
 * UserAvatar Component
 * Displays a user's avatar image or initials fallback
 */
const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  className = '',
  showTooltip = false,
  fallbackText,
}) => {
  const getInitials = (name: string): string => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarColor = (name: string): string => {
    // Generate a consistent color based on the name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const code = name.codePointAt(i) ?? 0;
      hash = code + ((hash << 5) - hash);
    }
    const hue = hash % 360;
    return `hsl(${hue}, 65%, 50%)`;
  };

  const displayName = user?.name || fallbackText || 'Unknown';
  const initials = getInitials(displayName);
  const bgColor = getAvatarColor(displayName);
  const sizeClass = sizeClasses[size];

  const avatarContent = (
    <div
      className={cn(
        'relative flex items-center justify-center rounded-full overflow-hidden',
        'bg-gray-200 border border-gray-300',
        sizeClass,
        className
      )}
      style={user?.avatar ? undefined : { backgroundColor: bgColor, color: 'white' }}
      title={showTooltip ? displayName : undefined}
    >
      {user?.avatar ? (
        <img
          src={user.avatar}
          alt={displayName}
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to initials if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement;
            if (parent) {
              parent.innerHTML = `<span class="font-medium">${initials}</span>`;
              parent.style.backgroundColor = bgColor;
              parent.style.color = 'white';
            }
          }}
        />
      ) : (
        <span className="font-medium select-none">{initials}</span>
      )}
    </div>
  );

  if (showTooltip && user) {
    return (
      <div className="relative group">
        {avatarContent}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {displayName}
          {user.email && (
            <>
              <br />
              <span className="text-gray-400">{user.email}</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return avatarContent;
};

export default UserAvatar;
