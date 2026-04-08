export const MEETING_ORDERING_OPTIONS: { value: string; label: string }[] = [
  { value: '-updated_at', label: 'Latest updated' },
  { value: '-created_at', label: 'Latest created' },
  { value: '-scheduled_date', label: 'Scheduled (latest first)' },
  { value: 'scheduled_date', label: 'Scheduled (earliest first)' },
  { value: 'title', label: 'Title A–Z' },
  { value: '-title', label: 'Title Z–A' },
];

export const DEFAULT_MEETING_ORDERING = '-created_at';

export function meetingOrderingLabel(value: string): string {
  return MEETING_ORDERING_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
