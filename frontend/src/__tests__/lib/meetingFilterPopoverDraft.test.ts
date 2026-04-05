import {
  patchFromPopoverDraft,
  popoverDraftFromQuery,
} from '@/components/meetings/discovery/MeetingFilterPopover';

describe('MeetingFilterPopover draft helpers', () => {
  it('patchFromPopoverDraft maps tri-state and archived', () => {
    const draft = {
      has_generated_decisions: 'yes' as const,
      has_generated_tasks: 'no' as const,
      archived: 'no' as const,
    };
    expect(patchFromPopoverDraft(draft)).toEqual({
      has_generated_decisions: true,
      has_generated_tasks: false,
      is_archived: false,
    });
  });

  it('patchFromPopoverDraft maps tri-state to undefined when any', () => {
    const draft = {
      has_generated_decisions: '' as const,
      has_generated_tasks: '' as const,
      archived: 'all' as const,
    };
    expect(patchFromPopoverDraft(draft)).toEqual({
      has_generated_decisions: undefined,
      has_generated_tasks: undefined,
      is_archived: undefined,
    });
  });

  it('popoverDraftFromQuery restores draft from URL-shaped params', () => {
    const d = popoverDraftFromQuery(true, undefined, false);
    expect(d.has_generated_decisions).toBe('yes');
    expect(d.has_generated_tasks).toBe('');
    expect(d.archived).toBe('no');
  });
});
