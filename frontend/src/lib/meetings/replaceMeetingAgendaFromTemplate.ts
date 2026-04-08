import { MeetingsAPI } from '@/lib/api/meetingsApi';
import type { NestedAgendaTemplateSection } from '@/lib/meetings/meetingTemplates';

/**
 * Clears all agenda rows for a meeting, recreates them from nested template items,
 * and returns layout_config with nested item ids aligned to backend agenda ids.
 */
export async function replaceAgendaAndLayoutFromNested(
  projectId: number,
  meetingId: number,
  blocks: unknown[],
  nestedSections: NestedAgendaTemplateSection[],
): Promise<{ blocks: unknown[]; nestedSections: NestedAgendaTemplateSection[] }> {
  const existing = await MeetingsAPI.listAgendaItems(projectId, meetingId);
  const rows = Array.isArray(existing) ? existing : [];
  for (const row of rows) {
    await MeetingsAPI.deleteAgendaItem(projectId, meetingId, row.id);
  }

  const flat = nestedSections.flatMap((s) => s.items);
  let order = 0;
  for (const item of flat) {
    await MeetingsAPI.createAgendaItem(projectId, meetingId, {
      content: item.text,
      order_index: order,
      is_priority: item.duration === '10m',
    });
    order += 1;
  }

  const blocksCopy = Array.isArray(blocks) ? [...blocks] : [];

  if (flat.length === 0) {
    return {
      blocks: blocksCopy,
      nestedSections: nestedSections.map((s) => ({
        ...s,
        items: s.items.map((it) => ({ ...it })),
      })),
    };
  }

  const refreshed = await MeetingsAPI.listAgendaItems(projectId, meetingId);
  const refreshedList = Array.isArray(refreshed) ? refreshed : [];
  let idx = 0;
  const nextNested = nestedSections.map((section) => ({
    ...section,
    items: section.items.map((it) => {
      const agendaItem = refreshedList[idx];
      idx += 1;
      return {
        ...it,
        id: agendaItem ? String(agendaItem.id) : it.id,
      };
    }),
  }));

  return { blocks: blocksCopy, nestedSections: nextNested };
}
