// frontend/src/types/meeting.ts

export type MeetingStatus = 'draft';

export interface Meeting {
  id: number;
  project: number;
  title: string;
  meeting_type: string;
  objective: string;
  scheduled_date: string | null;
  scheduled_time: string | null;
  external_reference: string | null;
  status: MeetingStatus;
}

export interface MeetingCreateRequest {
  title: string;
  meeting_type: string;
  objective: string;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  external_reference?: string | null;
  status?: MeetingStatus;
  /** Optional on create: project member user IDs (see SMP-484 participants timing). */
  participant_user_ids?: number[];
}

export interface MeetingUpdateRequest {
  title: string;
  meeting_type: string;
  objective: string;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  external_reference?: string | null;
  status: MeetingStatus;
}

export interface MeetingPartialUpdateRequest {
  title?: string;
  meeting_type?: string;
  objective?: string;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  external_reference?: string | null;
  status?: MeetingStatus;
}

export interface AgendaItem {
  id: number;
  meeting: number;
  content: string;
  order_index: number;
  is_priority: boolean;
}

export interface AgendaItemCreateRequest {
  content: string;
  order_index: number;
  is_priority?: boolean;
}

export interface AgendaItemUpdateRequest {
  content: string;
  order_index: number;
  is_priority: boolean;
}

export interface AgendaItemPartialUpdateRequest {
  content?: string;
  order_index?: number;
  is_priority?: boolean;
}

export interface AgendaItemsReorderItem {
  id: number;
  order_index: number;
}

export interface AgendaItemsReorderRequest {
  items: AgendaItemsReorderItem[];
}

export interface ParticipantLink {
  id: number;
  meeting: number;
  user: number;
  role: string | null;
}

export interface ParticipantLinkCreateRequest {
  user: number;
  role?: string | null;
}

export interface ParticipantLinkPartialUpdateRequest {
  role?: string | null;
}

export interface ArtifactLink {
  id: number;
  meeting: number;
  artifact_type: string;
  artifact_id: number;
}

export interface ArtifactLinkCreateRequest {
  artifact_type: string;
  artifact_id: number;
}
