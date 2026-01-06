import React from 'react';

interface StackProps {
  children: React.ReactNode;
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  className?: string;
}

const spacingClasses = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const Stack: React.FC<StackProps> = ({
  children,
  spacing = 'md',
  align = 'stretch',
  className = '',
}) => {
  const baseClasses = 'flex flex-col';
  const spacingClass = spacingClasses[spacing];
  const alignClass = alignClasses[align];

  return (
    <div
      className={`${baseClasses} ${spacingClass} ${alignClass} ${className}`}
    >
      {children}
    </div>
  );
};

export default Stack;

