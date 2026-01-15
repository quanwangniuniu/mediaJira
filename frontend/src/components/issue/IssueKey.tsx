type IssueKeyProps = {
  value: string;
  href?: string;
  as?: 'span' | 'a';
  className?: string;
};

export default function IssueKey({ value, href, as, className = '' }: IssueKeyProps) {
  const content = (
    <span className="font-mono text-xs font-semibold uppercase tracking-wide">{value}</span>
  );
  const isLink = as === 'a' || Boolean(href);

  if (isLink && href) {
    return (
      <a
        href={href}
        className={`inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-600 transition hover:border-slate-300 hover:text-slate-900 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 ${className}`}
      >
        {content}
      </a>
    );
  }

  return (
    <span
      className={`inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 ${className}`}
    >
      {content}
    </span>
  );
}
