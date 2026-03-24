/**
 * Curated meeting types for Meeting Preparation Workspace (create form).
 * Stored as `meeting_type` string on the Meeting model.
 */
export const MEETING_TYPE_OPTIONS = [
  {
    value: 'Planning',
    label: 'Planning',
    description: 'Campaign or sprint planning, scope and priorities.',
  },
  {
    value: 'Client Meeting',
    label: 'Client Meeting',
    description: 'External sync, reviews, and alignment with clients.',
  },
  {
    value: 'Stand-up',
    label: 'Stand-up',
    description: 'Short daily sync on progress and blockers.',
  },
  {
    value: 'Review & Retrospective',
    label: 'Review & Retrospective',
    description: 'Post-campaign or post-sprint review and learnings.',
  },
  {
    value: 'Deployment Sync',
    label: 'Deployment Sync',
    description: 'Release readiness, rollout, and deployment coordination.',
  },
] as const;

export type MeetingTypeOptionValue = (typeof MEETING_TYPE_OPTIONS)[number]['value'];
