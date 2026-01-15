'use client';

interface OnlineStatusIndicatorProps {
  className?: string;
}

export default function OnlineStatusIndicator({ className = '' }: OnlineStatusIndicatorProps) {
  return (
    <div
      className={`w-3 h-3 bg-green-500 border-2 border-white rounded-full ${className}`}
      title="Online"
      aria-label="Online"
    />
  );
}

