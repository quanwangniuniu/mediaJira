import type { MeetingTypeOptionValue } from '@/lib/meetings/meetingTypes';

export type NestedAgendaTemplateItem = {
  id: string;
  text: string;
  completed: boolean;
  duration: string;
};

export type NestedAgendaTemplateSection = {
  id: string;
  title: string;
  items: NestedAgendaTemplateItem[];
};

export const MEETING_TEMPLATES: Record<MeetingTypeOptionValue, NestedAgendaTemplateSection[]> = {
  Planning: [
    {
      id: 'planning-kickoff',
      title: 'Kickoff',
      items: [
        { id: 'planning-kickoff-1', text: 'Kickoff and context alignment', completed: false, duration: '5m' },
        { id: 'planning-kickoff-2', text: 'Review priorities and constraints', completed: false, duration: '10m' },
      ],
    },
    {
      id: 'planning-actions',
      title: 'Action Plan',
      items: [
        { id: 'planning-actions-1', text: 'Define owners and timeline', completed: false, duration: '10m' },
      ],
    },
  ],
  'Client Meeting': [
    {
      id: 'client-context',
      title: 'Client Context',
      items: [
        { id: 'client-context-1', text: 'Client goals and success criteria', completed: false, duration: '10m' },
        { id: 'client-context-2', text: 'Progress update and blockers', completed: false, duration: '10m' },
      ],
    },
    {
      id: 'client-decisions',
      title: 'Decisions',
      items: [
        { id: 'client-decisions-1', text: 'Decisions and next actions', completed: false, duration: '5m' },
      ],
    },
  ],
  'Stand-up': [
    {
      id: 'standup-core',
      title: 'Daily Core',
      items: [
        { id: 'standup-core-1', text: 'Yesterday progress', completed: false, duration: '5m' },
        { id: 'standup-core-2', text: 'Today plan', completed: false, duration: '5m' },
        { id: 'standup-core-3', text: 'Blockers and support needed', completed: false, duration: '5m' },
      ],
    },
  ],
  'Review & Retrospective': [
    {
      id: 'retro-reflect',
      title: 'Reflection',
      items: [
        { id: 'retro-reflect-1', text: 'What went well', completed: false, duration: '10m' },
        { id: 'retro-reflect-2', text: 'What can be improved', completed: false, duration: '10m' },
      ],
    },
    {
      id: 'retro-actions',
      title: 'Actions',
      items: [
        { id: 'retro-actions-1', text: 'Action items and owners', completed: false, duration: '10m' },
      ],
    },
  ],
  'Deployment Sync': [
    {
      id: 'deploy-check',
      title: 'Readiness',
      items: [
        { id: 'deploy-check-1', text: 'Release scope and checklist', completed: false, duration: '10m' },
        { id: 'deploy-check-2', text: 'Risks and rollback plan', completed: false, duration: '10m' },
      ],
    },
    {
      id: 'deploy-owners',
      title: 'Execution',
      items: [
        { id: 'deploy-owners-1', text: 'Go-live owners and communication', completed: false, duration: '10m' },
      ],
    },
  ],
};

export function getNestedTemplateForMeetingType(meetingType: string): NestedAgendaTemplateSection[] {
  const template = MEETING_TEMPLATES[meetingType as MeetingTypeOptionValue] ?? [];
  return template.map((section) => ({
    ...section,
    items: section.items.map((item) => ({ ...item })),
  }));
}

export function getTemplateForMeetingType(meetingType: string): string[] {
  return getNestedTemplateForMeetingType(meetingType).flatMap((section) =>
    section.items.map((item) => item.text),
  );
}
