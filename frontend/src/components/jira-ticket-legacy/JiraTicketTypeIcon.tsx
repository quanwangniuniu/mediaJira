import type { ComponentType } from 'react';
import { BookOpen, Layers, Zap } from 'lucide-react';
import { BugAntIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

type JiraTicketType = 'bug' | 'task' | 'story' | 'epic' | 'spike';

type JiraTicketTypeIconProps = {
  type: JiraTicketType;
  size?: 'sm' | 'md';
  className?: string;
  label?: string;
  muted?: boolean;
};

const sizeClasses = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
};

const typeStyles: Record<JiraTicketType, string> = {
  bug: 'text-red-600',
  task: 'text-slate-600',
  story: 'text-emerald-600',
  epic: 'text-indigo-600',
  spike: 'text-amber-600',
};

const typeLabels: Record<JiraTicketType, string> = {
  bug: 'Bug',
  task: 'Task',
  story: 'Story',
  epic: 'Epic',
  spike: 'Spike',
};

const iconComponents: Record<JiraTicketType, ComponentType<{ className?: string; 'aria-hidden'?: boolean }>> = {
  bug: BugAntIcon,
  task: ClipboardDocumentListIcon,
  story: BookOpen,
  epic: Layers,
  spike: Zap,
};

export default function JiraTicketTypeIcon({
  type,
  size = 'md',
  className = '',
  label,
  muted = false,
}: JiraTicketTypeIconProps) {
  return (
    <span
      className={`inline-flex items-center justify-center ${muted ? 'text-slate-300' : typeStyles[type]} ${className}`}
      aria-label={label ?? typeLabels[type]}
      role="img"
    >
      {(() => {
        const Icon = iconComponents[type];
        return <Icon className={sizeClasses[size]} aria-hidden="true" />;
      })()}
    </span>
  );
}
