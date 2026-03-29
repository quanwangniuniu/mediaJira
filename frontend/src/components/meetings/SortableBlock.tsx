import type { HTMLAttributes, ReactNode } from 'react';
import { GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';

export type DragHandleProps = {
  attributes: DraggableAttributes;
  listeners: SyntheticListenerMap | undefined;
};

interface SortableBlockProps {
  id: string;
  children: ReactNode;
  className?: string;
  /** Small caps line above content (e.g. "Agenda" → AGENDA). Enables overline row + handle layout. */
  overlineLabel?: string;
  hideDefaultHandle?: boolean;
  customHandle?: (props: DragHandleProps) => ReactNode;
  actions?: ReactNode;
}

export function SortableBlock({
  id,
  children,
  className = '',
  overlineLabel,
  hideDefaultHandle = false,
  customHandle,
  actions,
}: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const showOverlineLayout = Boolean(overlineLabel);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border border-transparent shadow-none transition-all duration-200 hover:border-slate-200 hover:shadow-sm ${actions ? 'pr-14' : ''} ${className}`}
    >
      {showOverlineLayout ? (
        <div className="mb-2 flex items-center gap-1.5">
          {!hideDefaultHandle &&
            (customHandle ? (
              customHandle({ attributes, listeners })
            ) : (
              <button
                type="button"
                className="z-10 shrink-0 cursor-grab rounded p-0.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-50 active:cursor-grabbing"
                aria-label="Drag block"
                {...(attributes as HTMLAttributes<HTMLButtonElement>)}
                {...listeners}
              >
                <GripVertical className="h-3 w-3" strokeWidth={2} />
              </button>
            ))}
          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            {overlineLabel}
          </span>
        </div>
      ) : (
        <>
          {customHandle ? customHandle({ attributes, listeners }) : null}
          {!hideDefaultHandle ? (
            <button
              type="button"
              className="absolute top-3 left-3 z-10 cursor-grab rounded-md p-1.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-50 active:cursor-grabbing"
              aria-label="Drag block"
              {...(attributes as HTMLAttributes<HTMLButtonElement>)}
              {...listeners}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : null}
        </>
      )}
      {actions ? (
        <div className="absolute top-2 right-2 z-10 flex gap-2 pointer-events-none opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100">
          {actions}
        </div>
      ) : null}
      {children}
    </div>
  );
}
