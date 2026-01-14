import type { CSSProperties } from 'react';

type LoadingSkeletonProps = {
  rows?: number;
  height?: number;
  width?: string | number;
  rounded?: string;
  className?: string;
};

export default function LoadingSkeleton({
  rows = 3,
  height = 12,
  width = '100%',
  rounded = 'rounded-full',
  className = '',
}: LoadingSkeletonProps) {
  const style: CSSProperties = {
    height,
    width,
  };

  return (
    <div className={`flex w-full flex-col gap-3 ${className}`}>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          className={`animate-pulse bg-slate-200 ${rounded}`}
          style={style}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
