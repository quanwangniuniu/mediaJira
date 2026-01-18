'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LabelData {
  id: string | number;
  name: string;
  color?: string;
}

type LabelSize = 'xs' | 'sm' | 'md' | 'lg';
type LabelVariant = 'default' | 'outline' | 'subtle';

export interface LabelProps {
  label: LabelData;
  size?: LabelSize;
  variant?: LabelVariant;
  showRemove?: boolean;
  onRemove?: (label: LabelData) => void;
  className?: string;
  maxWidth?: string;
}

const sizeClasses = {
  xs: 'px-1.5 py-0.5 text-xs',
  sm: 'px-2 py-1 text-xs',
  md: 'px-2.5 py-1.5 text-sm',
  lg: 'px-3 py-2 text-sm',
};

const defaultColorClass = 'bg-white text-black border-black/30';

const Label: React.FC<LabelProps> = ({
  label,
  size = 'sm',
  variant = 'outline',
  showRemove = false,
  onRemove,
  className = '',
  maxWidth,
}) => {
  const colorClass = label.color
    ? `bg-[${label.color}]/10 text-[${label.color}] border-[${label.color}]/20`
    : defaultColorClass;

  const variantClasses = {
    default: `border ${colorClass}`,
    outline: `border-2 ${colorClass}`,
    subtle: `border-0 ${colorClass}`,
  };

  const sizeClass = sizeClasses[size];

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    onRemove?.(label);
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm font-semibold uppercase tracking-wide',
        sizeClass,
        variantClasses[variant],
        className
      )}
      style={maxWidth ? { maxWidth } : undefined}
      title={label.name}
    >
      <span className="truncate">{label.name}</span>
      {showRemove && (
        <button
          type="button"
          onClick={handleRemove}
          className="ml-0.5 -mr-1 flex-shrink-0 rounded p-0.5 hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-offset-1"
          aria-label={`Remove ${label.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
};

export default Label;
