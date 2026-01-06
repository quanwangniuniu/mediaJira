import React from 'react';

interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  variant?: 'solid' | 'dashed' | 'dotted';
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: 'gray-100' | 'gray-200' | 'gray-300';
  className?: string;
}

const variantClasses = {
  solid: 'border-solid',
  dashed: 'border-dashed',
  dotted: 'border-dotted',
};

const spacingClasses = {
  none: '',
  xs: 'my-1',
  sm: 'my-2',
  md: 'my-4',
  lg: 'my-6',
  xl: 'my-8',
};

const verticalSpacingClasses = {
  none: '',
  xs: 'mx-1',
  sm: 'mx-2',
  md: 'mx-4',
  lg: 'mx-6',
  xl: 'mx-8',
};

const colorClasses = {
  'gray-100': 'border-gray-100',
  'gray-200': 'border-gray-200',
  'gray-300': 'border-gray-300',
};

const Divider: React.FC<DividerProps> = ({
  orientation = 'horizontal',
  variant = 'solid',
  spacing = 'md',
  color = 'gray-200',
  className = '',
}) => {
  const variantClass = variantClasses[variant];
  const colorClass = colorClasses[color];

  if (orientation === 'horizontal') {
    const spacingClass = spacingClasses[spacing];
    return (
      <div
        className={`border-t ${colorClass} w-full ${variantClass} ${spacingClass} ${className}`}
        aria-hidden="true"
      />
    );
  }

  const spacingClass = verticalSpacingClasses[spacing];
  return (
    <div
      className={`border-l ${colorClass} h-full ${variantClass} ${spacingClass} ${className}`}
      aria-hidden="true"
    />
  );
};

export default Divider;

