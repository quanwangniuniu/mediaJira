import type { ReactNode } from 'react';

type JiraTicketIdentityRowProps = {
  leading: ReactNode;
  summary: ReactNode;
  align?: 'start' | 'center';
  className?: string;
};

export default function JiraTicketIdentityRow({
  leading,
  summary,
  align = 'start',
  className = '',
}: JiraTicketIdentityRowProps) {
  const alignClass = align === 'center' ? 'items-center' : 'items-start';

  return (
    <div className={`w-full rounded-xl border border-slate-200 bg-white p-4 ${className}`}>
      <div className={`mb-3 flex gap-3 ${alignClass}`}>{leading}</div>
      <div>{summary}</div>
    </div>
  );
}
