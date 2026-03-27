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
  hideDefaultHandle?: boolean;
  customHandle?: (props: DragHandleProps) => ReactNode;
  actions?: ReactNode;
}

export function SortableBlock({
  id,
  children,
  className = '',
  hideDefaultHandle = false,
  customHandle,
  actions,
}: SortableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border border-transparent bg-transparent ring-1 ring-transparent shadow-none transition hover:bg-slate-50/50 hover:ring-slate-100 ${actions ? 'pr-14' : ''} ${className}`}
    >
      {customHandle ? customHandle({ attributes, listeners }) : null}
      {hideDefaultHandle ? null : (
        <button
          type="button"
          className="absolute top-3 left-3 z-10 cursor-grab rounded-md p-1.5 text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-50 active:cursor-grabbing"
          aria-label="Drag block"
          {...(attributes as HTMLAttributes<HTMLButtonElement>)}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
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
