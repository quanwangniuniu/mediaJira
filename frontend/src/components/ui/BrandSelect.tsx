'use client';

import * as Popover from '@radix-ui/react-popover';
import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { isTriggerMeaningfullyVisible } from '@/components/spreadsheets/toolbarMenuPosition';


export interface BrandSelectOption {
  value: string;
  label: string;
  style?: CSSProperties;
}

interface Props {
  value: string;
  onValueChange: (next: string) => void;
  options: BrandSelectOption[];
  disabled?: boolean;
  ariaLabel: string;
  testId?: string;
  widthClass?: string;
  renderValue?: (value: string) => ReactNode;
  align?: 'start' | 'center' | 'end';
  confineToRef?: RefObject<HTMLElement | null>;
  open?: boolean;
  onOpenChange?: (next: boolean) => void;
}

export default function BrandSelect({
  value,
  onValueChange,
  options,
  disabled = false,
  ariaLabel,
  testId,
  widthClass = 'min-w-[6rem]',
  renderValue,
  align = 'start',
  confineToRef,
  open: openProp,
  onOpenChange,
}: Props) {
  const current = options.find((o) => o.value === value);
  const displayLabel = renderValue ? renderValue(value) : current?.label ?? value ?? '';
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = openProp !== undefined;
  const resolvedOpen = isControlled ? openProp : uncontrolledOpen;

  const setResolvedOpen = (next: boolean) => {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  };

  useEffect(() => {
    if (!resolvedOpen || !confineToRef) return;
    const bar = confineToRef.current;
    if (!bar) return;
  
    const closeIfMostlyHidden = () => {
      const barRect = confineToRef.current?.getBoundingClientRect();
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!barRect || !rect) return;
      if (!isTriggerMeaningfullyVisible(rect, barRect)) {
        setResolvedOpen(false);
      }
    };
  
    bar.addEventListener('scroll', closeIfMostlyHidden);
    window.addEventListener('scroll', closeIfMostlyHidden, true);
    window.addEventListener('resize', closeIfMostlyHidden);
    return () => {
      bar.removeEventListener('scroll', closeIfMostlyHidden);
      window.removeEventListener('scroll', closeIfMostlyHidden, true);
      window.removeEventListener('resize', closeIfMostlyHidden);
    };
  }, [resolvedOpen, confineToRef]);

  return (
    <Popover.Root
      open={resolvedOpen}
      onOpenChange={(next) => {
        if (next && confineToRef) {
          const bar = confineToRef.current?.getBoundingClientRect();
          const rect = triggerRef.current?.getBoundingClientRect();
          if (bar && rect && !isTriggerMeaningfullyVisible(rect, bar)) return;
        }
        setResolvedOpen(next);
      }}
    >
      <Popover.Trigger asChild>
        <button
          ref={triggerRef}
          type="button"
          aria-label={ariaLabel}
          title={ariaLabel}
          disabled={disabled}
          data-testid={testId}
          className={`inline-flex h-8 items-center justify-between gap-1 rounded-md px-2 text-xs text-gray-700 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3CCED7]/30 disabled:cursor-not-allowed disabled:opacity-40 ${widthClass}`}
        >
          <span className="truncate" style={current?.style}>
            {displayLabel}
          </span>
          <ChevronDown className="h-3 w-3 shrink-0 text-gray-400" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          sideOffset={6}
          align={align}
          collisionPadding={8}
          className="z-[120] flex flex-col overflow-hidden rounded-lg bg-white shadow-lg ring-1 ring-gray-100 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
          style={{ minWidth: 'var(--radix-popover-trigger-width)', maxHeight: 'min(15rem, var(--radix-popover-content-available-height))' }}
        >
          <div className="h-[3px] w-full bg-gradient-to-r from-[#3CCED7] to-[#A6E661]" />
          <div role="listbox" aria-label={ariaLabel} className="min-h-0 flex-1 overflow-y-auto py-1">
            {options.map((opt) => {
              const selected = opt.value === value;
              return (
                <Popover.Close asChild key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    onClick={() => onValueChange(opt.value)}
                    className={`flex w-full items-center justify-between px-3 py-1.5 text-left text-xs transition ${
                      selected ? 'bg-[#3CCED7]/10 text-[#0E8A96]' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate" style={opt.style}>
                      {opt.label}
                    </span>
                    {selected && <Check className="h-3 w-3 text-[#0E8A96]" aria-hidden="true" />}
                  </button>
                </Popover.Close>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}