export type StatusTone = 'todo' | 'in_progress' | 'in_review' | 'done' | 'default';

export interface StatusOption {
  value: string;
  label: string;
  tone?: StatusTone;
  workflow?: string;
  description?: string;
}

export interface StatusWorkflowGroup {
  id: string;
  label: string;
  statuses: StatusOption[];
}

export const DEFAULT_STATUS_OPTIONS: StatusOption[] = [
  { value: 'todo', label: 'TO DO', tone: 'todo', workflow: 'Backlog' },
  { value: 'in_progress', label: 'IN PROGRESS', tone: 'in_progress', workflow: 'In Progress' },
  { value: 'in_review', label: 'IN REVIEW', tone: 'in_review', workflow: 'In Progress' },
  { value: 'done', label: 'DONE', tone: 'done', workflow: 'Done' },
];
