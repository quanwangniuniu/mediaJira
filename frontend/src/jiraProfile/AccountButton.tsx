'use client';

import Button from '@/components/button/Button';
import { cn } from '@/lib/utils';

type AccountButtonProps = Readonly<{
  className?: string;
}>;

export default function AccountButton({ className }: AccountButtonProps) {
  return (
    <Button variant="secondary" size="md" className={cn('w-full', className)}>
      Manage your account
    </Button>
  );
}
