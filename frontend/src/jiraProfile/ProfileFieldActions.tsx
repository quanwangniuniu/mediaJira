'use client';

import Button from '@/components/button/Button';
import { cn } from '@/lib/utils';

type FieldActionsProps = Readonly<{
  mode: 'view' | 'edit';
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  loading?: boolean;
  className?: string;
}>;

export default function FieldActions({
  mode,
  onEdit,
  onSave,
  onCancel,
  loading,
  className,
}: FieldActionsProps) {
  if (mode === 'view') {
    return onEdit ? (
      <Button variant="ghost" size="sm" onClick={onEdit} className={cn('h-7', className)}>
        Edit
      </Button>
    ) : null;
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Button variant="primary" size="sm" loading={loading} onClick={onSave}>
        Save
      </Button>
      <Button variant="ghost" size="sm" onClick={onCancel} disabled={loading}>
        Cancel
      </Button>
    </div>
  );
}
