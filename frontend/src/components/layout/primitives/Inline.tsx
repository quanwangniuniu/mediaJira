import React from 'react';

interface InlineProps {
  children: React.ReactNode;
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'baseline' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
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
  baseline: 'items-baseline',
  stretch: 'items-stretch',
};

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
};

const Inline: React.FC<InlineProps> = ({
  children,
  spacing = 'md',
  align = 'center',
  justify = 'start',
  wrap = false,
  className = '',
}) => {
  const baseClasses = 'flex flex-row';
  const spacingClass = spacingClasses[spacing];
  const alignClass = alignClasses[align];
  const justifyClass = justifyClasses[justify];
  const wrapClass = wrap ? 'flex-wrap' : 'flex-nowrap';

  return (
    <div
      className={`${baseClasses} ${spacingClass} ${alignClass} ${justifyClass} ${wrapClass} ${className}`}
    >
      {children}
    </div>
  );
};

export default Inline;

