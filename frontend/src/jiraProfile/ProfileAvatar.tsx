'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

type AvatarSize = 'sm' | 'md' | 'lg';

type AvatarProps = Readonly<{
  src?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}>;

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-10 w-10 text-base',
  md: 'h-14 w-14 text-xl',
  lg: 'h-24 w-24 text-3xl',
};

const getInitials = (name?: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || '?';
};

export default function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const [hasError, setHasError] = useState(false);
  const initials = getInitials(name);

  return (
    <div
      className={cn(
        'flex items-center justify-center overflow-hidden rounded-full bg-purple-600 font-semibold text-white',
        sizeClasses[size],
        className
      )}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className="h-full w-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{initials}</span>
      )}
    </div>
  );
}
