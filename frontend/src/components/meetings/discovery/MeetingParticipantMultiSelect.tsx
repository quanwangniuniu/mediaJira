'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';

import type { ProjectMemberData } from '@/lib/api/projectApi';
import { cn } from '@/lib/utils';

function initialsFromLabel(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] ?? '';
    const b = parts[parts.length - 1][0] ?? '';
    return `${a}${b}`.toUpperCase();
  }
  return label.slice(0, 2).toUpperCase();
}

function avatarBg(userId: number): string {
  const hues = [45, 330, 200, 120, 280, 160];
  return `hsl(${hues[userId % hues.length]} 65% 42%)`;
}

export interface MeetingParticipantMultiSelectProps {
  value: number[];
  onChange: (ids: number[]) => void;
  members: ProjectMemberData[];
  memberLabel: (userId: number) => string;
  disabled?: boolean;
  /** Shown when there are no chips yet. */
  placeholder?: string;
}

/**
 * Searchable multi-select: selected users as removable chips; type to filter and pick from the list.
 */
export function MeetingParticipantMultiSelect({
  value,
  onChange,
  members,
  memberLabel,
  disabled,
  placeholder = 'Search participants…',
}: MeetingParticipantMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (selectedSet.has(m.user.id)) return false;
      if (!q) return true;
      const label = memberLabel(m.user.id);
      const blob = [
        label,
        m.user.name ?? '',
        m.user.username ?? '',
        m.user.email ?? '',
        String(m.user.id),
      ]
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    });
  }, [members, memberLabel, query, selectedSet]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const el = rootRef.current;
      if (el && !el.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const add = (userId: number) => {
    if (selectedSet.has(userId)) return;
    onChange([...value, userId]);
    setQuery('');
  };

  const remove = (userId: number) => {
    onChange(value.filter((x) => x !== userId));
  };

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <div
        className={cn(
          'flex min-h-[2.5rem] w-full flex-wrap items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1.5',
          disabled && 'pointer-events-none opacity-50',
        )}
      >
        {value.map((uid) => {
          const label = memberLabel(uid);
          return (
            <span
              key={uid}
              className="inline-flex max-w-full items-center gap-1 rounded-md border border-slate-200 bg-slate-50 py-0.5 pl-1 pr-0.5 text-xs font-medium text-slate-800"
            >
              <span
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white"
                style={{ backgroundColor: avatarBg(uid) }}
                aria-hidden
              >
                {initialsFromLabel(label)}
              </span>
              <span className="min-w-0 max-w-[10rem] truncate">{label}</span>
              <button
                type="button"
                className="shrink-0 rounded p-0.5 text-slate-500 hover:bg-slate-200 hover:text-slate-900"
                aria-label={`Remove ${label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(uid);
                }}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            </span>
          );
        })}
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder={value.length === 0 ? placeholder : ''}
          className="min-w-[7rem] flex-1 border-0 bg-transparent py-0.5 text-sm text-slate-800 outline-none placeholder:text-slate-400"
          aria-label="Search participants to add"
          autoComplete="off"
        />
      </div>

      {open && filtered.length > 0 ? (
        <div
          className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-56 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg"
          role="listbox"
        >
          {filtered.map((m) => {
            const label = memberLabel(m.user.id);
            const sub = m.user.email ?? m.user.username ?? '';
            return (
              <button
                key={m.id}
                type="button"
                role="option"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(m.user.id)}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white"
                  style={{ backgroundColor: avatarBg(m.user.id) }}
                  aria-hidden
                >
                  {initialsFromLabel(label)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-slate-900">
                    {label}
                  </span>
                  {sub ? (
                    <span className="block truncate text-xs text-slate-500">
                      {sub}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
