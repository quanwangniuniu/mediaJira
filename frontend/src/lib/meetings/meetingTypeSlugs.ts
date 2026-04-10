/**
 * Slugs for `meeting_type` query param — must match `MeetingTypeDefinition.slug`
 * created by the backend when users pick these labels on create (Django `slugify`).
 */
import { MEETING_TYPE_OPTIONS } from '@/lib/meetings/meetingTypes';

const LABEL_TO_SLUG: Record<string, string> = {
  Planning: 'planning',
  'Client Meeting': 'client-meeting',
  'Stand-up': 'stand-up',
  'Review & Retrospective': 'review-retrospective',
  'Deployment Sync': 'deployment-sync',
};

export const MEETING_TYPE_FILTER_OPTIONS = MEETING_TYPE_OPTIONS.map((opt) => ({
  label: opt.label,
  slug: LABEL_TO_SLUG[opt.value] ?? opt.value.toLowerCase().replace(/\s+/g, '-'),
}));

export function meetingTypeSlugToLabel(slug: string): string | undefined {
  const row = MEETING_TYPE_FILTER_OPTIONS.find((o) => o.slug === slug);
  return row?.label;
}
