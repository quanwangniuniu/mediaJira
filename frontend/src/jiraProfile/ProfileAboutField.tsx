'use client';

import type { ReactNode } from 'react';
import EditableField from '@/jiraProfile/ProfileEditableField';
import { cn } from '@/lib/utils';

type ProfileAboutFieldProps = Readonly<{
  icon: ReactNode;
  value: string;
  onSave: (value: string) => Promise<void> | void;
  title?: string;
  placeholder?: string;
  inputType?: 'input' | 'textarea';
  className?: string;
  contentClassName?: string;
}>;

export default function ProfileAboutField({
  icon,
  value,
  onSave,
  title,
  placeholder = 'Your department',
  inputType = 'input',
  className,
  contentClassName,
}: ProfileAboutFieldProps) {
  return (
    <EditableField
      value={value}
      onSave={async (next) => onSave(next)}
      showActions={false}
      saveOnBlur
      cancelOnEscape
      renderView={(current) => (
        <section className={cn('flex items-center gap-3', className)}>
          <div className="flex h-6 w-6 items-center justify-center text-gray-500">{icon}</div>
          <div className="flex-1 max-w-[280px] rounded-md hover:bg-gray-200">
            {title ? <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p> : null}
            <p className={cn('py-1.5 text-sm text-gray-500 truncate', contentClassName)}>
              {current || placeholder}
            </p>
          </div>
        </section>
      )}
      renderEdit={(current, onChange) => (
        <section className={cn('flex items-center gap-3', className)}>
          <div className="flex h-6 w-6 items-center justify-center text-gray-500">{icon}</div>
          <div className="flex-1 max-w-[280px]">
            {title ? <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{title}</p> : null}
            {inputType === 'textarea' ? (
              <textarea
                value={current}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className={cn(
                  'w-full resize-none rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200',
                  contentClassName
                )}
              />
            ) : (
              <input
                value={current}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className={cn(
                  'w-full rounded-md border border-gray-200 px-2 py-1 text-sm text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200',
                  contentClassName
                )}
              />
            )}
          </div>
        </section>
      )}
    />
  );
}
