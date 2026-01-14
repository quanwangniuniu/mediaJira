'use client';

import React from 'react';
import { Info, Minus } from 'lucide-react';
import Icon, { IconSize } from '@/components/ui/Icon';
import { IconKey } from '@/components/ui/iconRegistry';
import { cn } from '@/lib/utils';

export type PriorityValue = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE' | null | undefined;

export interface PriorityIconProps {
  priority?: PriorityValue;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  showLabel?: boolean;
  showTooltip?: boolean;
}

const sizeClasses = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

// Map PriorityIcon size to Icon component size
const iconSizeMap: Record<'xs' | 'sm' | 'md' | 'lg', IconSize> = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};

const priorityConfig = {
  CRITICAL: {
    iconName: 'alertCircle' as IconKey,
    iconComponent: null as React.ComponentType<React.SVGProps<SVGSVGElement>> | null,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Critical',
  },
  HIGH: {
    iconName: 'alertTriangle' as IconKey,
    iconComponent: null as React.ComponentType<React.SVGProps<SVGSVGElement>> | null,
    color: 'text-red-500',
    bgColor: 'bg-red-50',
    label: 'High',
  },
  MEDIUM: {
    iconName: 'alertTriangle' as IconKey,
    iconComponent: null as React.ComponentType<React.SVGProps<SVGSVGElement>> | null,
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    label: 'Medium',
  },
  LOW: {
    iconName: null as IconKey | null,
    iconComponent: Info as React.ComponentType<React.SVGProps<SVGSVGElement>>,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    label: 'Low',
  },
  NONE: {
    iconName: null as IconKey | null,
    iconComponent: Minus as React.ComponentType<React.SVGProps<SVGSVGElement>>,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50',
    label: 'None',
  },
};

const PriorityIcon: React.FC<PriorityIconProps> = ({
  priority,
  size = 'md',
  className = '',
  showLabel = false,
  showTooltip = false,
}) => {
  const normalizedPriority = priority || 'NONE';
  const config = priorityConfig[normalizedPriority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE'] || priorityConfig.NONE;
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizeMap[size];

  // Decide whether to use Icon component or directly imported component based on config
  const renderIcon = () => {
    if (config.iconComponent) {

      // Use directly imported component (info, minus)
      const IconComponent = config.iconComponent;
      const iconSizePx = {
        xs: 12,
        sm: 16,
        md: 20,
        lg: 24,
      }[size];
      return (
        <IconComponent
          width={iconSizePx}
          height={iconSizePx}
          className={cn(config.color)}
          strokeWidth={2.5}
        />
      );
    } else if (config.iconName) {
    
      // Use Icon component (from iconRegistry)
      return (
        <Icon
          name={config.iconName}
          size={iconSize}
          color="currentColor"
          className={cn(config.color)}
          strokeWidth={2.5}
          ariaLabel={showTooltip ? config.label : undefined}
        />
      );
    }
    return null;
  };

  const iconContent = (
    <div
      className={cn(
        'inline-flex items-center justify-center rounded',
        config.bgColor,
        sizeClass,
        className
      )}
      title={showTooltip ? config.label : undefined}
    >
      {renderIcon()}
    </div>
  );

  if (showLabel) {
    return (
      <div className="inline-flex items-center gap-2">
        {iconContent}
        <span className={cn('text-sm font-medium', config.color)}>
          {config.label}
        </span>
      </div>
    );
  }

  if (showTooltip && priority) {
    return (
      <div className="relative group">
        {iconContent}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
          {config.label}
        </div>
      </div>
    );
  }

  return iconContent;
};

export default PriorityIcon;
