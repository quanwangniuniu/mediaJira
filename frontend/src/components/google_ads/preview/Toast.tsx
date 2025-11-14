'use client';

import { useEffect } from 'react';

interface ToastProps {
  open: boolean;
  message: string;
  onClose: () => void;
  duration?: number;
}

export default function Toast({
  open,
  message,
  onClose,
  duration = 1800,
}: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed bottom-[18px] left-1/2 -translate-x-1/2 z-[60]"
      role="status"
      aria-live="polite"
    >
      <div className="bg-gray-900 text-white rounded-lg px-[14px] py-[10px] shadow-[0_8px_30px_rgba(0,0,0,0.25)] text-sm">
        {message}
      </div>
    </div>
  );
}

