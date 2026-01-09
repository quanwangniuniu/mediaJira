import React from 'react';

interface ScrollableContainerProps {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal' | 'both';
  maxHeight?: string;
  maxWidth?: string;
  className?: string;
}

const directionClasses = {
  vertical: 'overflow-y-auto overflow-x-hidden',
  horizontal: 'overflow-x-auto overflow-y-hidden',
  both: 'overflow-auto',
};

const ScrollableContainer: React.FC<ScrollableContainerProps> = ({
  children,
  direction = 'vertical',
  maxHeight,
  maxWidth,
  className = '',
}) => {
  const baseClasses = directionClasses[direction];
  const style: React.CSSProperties = {};

  if (maxHeight) {
    style.maxHeight = maxHeight;
  }

  if (maxWidth) {
    style.maxWidth = maxWidth;
  }

  return (
    <div
      className={`${baseClasses} ${className}`}
      style={style}
    >
      {children}
    </div>
  );
};

export default ScrollableContainer;

