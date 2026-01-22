'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type ProfileActionsProps = Readonly<{
  children: ReactNode;
  className?: string;
}>;

export default function ProfileActions({ children, className }: ProfileActionsProps) {
  return <div className={cn('flex items-center gap-2', className)}>{children}</div>;
}
