import { MeetingsAPI } from '@/lib/api/meetingsApi';
import { DEFAULT_MEETING_WORKSPACE_BLOCKS } from '@/lib/meetings/defaultMeetingWorkspace';
import {
  getNestedTemplateForMeetingType,
  type NestedAgendaTemplateSection,
} from '@/lib/meetings/meetingTemplates';
import { MEETING_TYPE_OPTIONS, type MeetingTypeOptionValue } from '@/lib/meetings/meetingTypes';

/** Prefix for meeting_type when the user picked a saved (non-system) template. */
export const CUSTOM_TEMPLATE_TYPE_PREFIX = 'custom_tpl:';

export type UnifiedMeetingTemplateOption = {
  /** Value stored in Meeting.meeting_type (system) or `custom_tpl:<id>` (custom). */
  value: string;
  label: string;
  is_system: boolean;
  /** Set for custom templates — API template id (UUID string). */
  templateId?: string;
  /** System meeting type key when is_system. */
  meetingTypeValue?: MeetingTypeOptionValue;
  layout_config?: unknown;
};

export function buildSystemTemplateOptions(): UnifiedMeetingTemplateOption[] {
  return MEETING_TYPE_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
    is_system: true,
    meetingTypeValue: opt.value,
  }));
}

/** `meeting_type` value stored on Meeting when a user template is selected. */
export function customTemplateMeetingTypeValue(templateId: string): string {
  return `${CUSTOM_TEMPLATE_TYPE_PREFIX}${templateId}`;
}

export function isCustomTemplateMeetingType(meetingType: string): boolean {
  return meetingType.trim().toLowerCase().startsWith(CUSTOM_TEMPLATE_TYPE_PREFIX);
}

export function parseCustomTemplateId(meetingType: string): string | null {
  const m = meetingType.trim();
  const match = new RegExp(`^${CUSTOM_TEMPLATE_TYPE_PREFIX}(.+)$`, 'i').exec(m);
  if (!match) return null;
  const id = match[1].trim();
  return id || null;
}

export function labelForMeetingType(
  meetingType: string,
  options: UnifiedMeetingTemplateOption[],
): string {
  const trimmed = meetingType.trim();
  const byExact = options.find((o) => o.value === trimmed);
  if (byExact) return byExact.label;

  const templateId = parseCustomTemplateId(trimmed);
  if (templateId) {
    const byTemplateId = options.find((o) => o.templateId === templateId);
    if (byTemplateId) return byTemplateId.label;
  }

  return trimmed;
}

/**
 * System rows + user templates from API. Safe if list fails (system only).
 */
export async function fetchUnifiedMeetingTemplateOptions(): Promise<UnifiedMeetingTemplateOption[]> {
  const system = buildSystemTemplateOptions();
  try {
    const list = await MeetingsAPI.listMeetingTemplates();
    const rows = Array.isArray(list) ? list : [];
    const custom: UnifiedMeetingTemplateOption[] = rows.map((t) => ({
      value: customTemplateMeetingTypeValue(t.id),
      label: t.name,
      is_system: false,
      templateId: t.id,
      layout_config: t.layout_config,
    }));
    return [...system, ...custom];
  } catch {
    return system;
  }
}

export function parseSavedTemplateLayout(raw: unknown): {
  blocks: typeof DEFAULT_MEETING_WORKSPACE_BLOCKS;
  nestedSections: NestedAgendaTemplateSection[];
} {
  if (Array.isArray(raw)) {
    return {
      blocks: raw as typeof DEFAULT_MEETING_WORKSPACE_BLOCKS,
      nestedSections: [],
    };
  }
  if (raw && typeof raw === 'object') {
    const o = raw as { blocks?: unknown; nestedSections?: unknown };
    const blocks =
      Array.isArray(o.blocks) && o.blocks.length > 0
        ? (o.blocks as typeof DEFAULT_MEETING_WORKSPACE_BLOCKS)
        : DEFAULT_MEETING_WORKSPACE_BLOCKS;
    const nestedSections = Array.isArray(o.nestedSections)
      ? (o.nestedSections as NestedAgendaTemplateSection[])
      : [];
    return { blocks, nestedSections };
  }
  return { blocks: DEFAULT_MEETING_WORKSPACE_BLOCKS, nestedSections: [] };
}

/** Build initial `layout_config` + `meeting_type` for POST /meetings/. */
export function layoutConfigForNewMeetingFromSelection(opt: UnifiedMeetingTemplateOption): {
  meeting_type: string;
  layout_config: { blocks: unknown[]; nestedSections: NestedAgendaTemplateSection[] };
} {
  if (opt.is_system && opt.meetingTypeValue) {
    const nestedSections = getNestedTemplateForMeetingType(opt.meetingTypeValue);
    return {
      meeting_type: opt.value,
      layout_config: {
        blocks: [...DEFAULT_MEETING_WORKSPACE_BLOCKS],
        nestedSections,
      },
    };
  }
  const parsed = parseSavedTemplateLayout(opt.layout_config);
  return {
    meeting_type: opt.value,
    layout_config: {
      blocks: [...parsed.blocks],
      nestedSections: parsed.nestedSections.map((s) => ({
        ...s,
        items: s.items.map((it) => ({ ...it })),
      })),
    },
  };
}
