'use client';

export type StatusOptionForSidebar = {
  value: string;
  label: string;
  disabled: boolean;
  hint: string;
};

interface StatusChangeSidebarProps {
  hoveredOption: string | null;
  statusOptions: StatusOptionForSidebar[];
  selectedCount: number;
}

const STATUS_INFO: Record<string, { description: string; from: string }> = {
  DRAFT: {
    description: 'Task is being prepared and not yet submitted.',
    from: 'Rejected or Cancelled tasks only',
  },
  SUBMITTED: {
    description: 'Task has been submitted and is awaiting review.',
    from: 'Draft tasks only',
  },
  UNDER_REVIEW: {
    description: 'Task is currently under active review.',
    from: 'Submitted tasks only',
  },
  APPROVED: {
    description: 'Task has been reviewed and approved.',
    from: 'Under Review tasks only',
  },
  REJECTED: {
    description: 'Task has been reviewed and rejected.',
    from: 'Under Review tasks only',
  },
  LOCKED: {
    description: 'Task is locked and cannot be modified.',
    from: 'Approved tasks only',
  },
  UNLOCK: {
    description: 'Unlock a locked task, returning it back to Approved status.',
    from: 'Locked tasks only',
  },
  CANCELLED: {
    description: 'Task has been cancelled.',
    from: 'Any status except Locked',
  },
};

const StatusChangeSidebar = ({
  hoveredOption,
  statusOptions,
  selectedCount,
}: StatusChangeSidebarProps) => {
  const opt = statusOptions.find((o) => o.value === hoveredOption);
  const info = hoveredOption ? STATUS_INFO[hoveredOption] : null;

  return (
    <div className="w-44 shrink-0 border-l border-gray-100 bg-gray-50/60 px-3 py-3">
      {opt && info ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-800">{opt.label}</p>
          <p className="text-xs text-gray-500 leading-relaxed">
            {info.description}
          </p>
          <div className="border-t border-gray-200 pt-2">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">
              Requires
            </p>
            <p
              className={`text-xs leading-relaxed ${
                opt.disabled ? 'text-red-400' : 'text-green-600'
              }`}
            >
              {info.from}
            </p>
          </div>
          {!opt.disabled && (
            <div className="border-t border-gray-200 pt-2">
              <p className="text-xs text-green-600 font-medium">
                ✓ {selectedCount} task{selectedCount !== 1 ? 's' : ''} eligible
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-gray-400 leading-relaxed">
          Hover a status to see details.
        </p>
      )}
    </div>
  );
};

export default StatusChangeSidebar;
