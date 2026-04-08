import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MeetingDiscoveryToolbar } from '@/components/meetings/discovery/MeetingDiscoveryToolbar';

const baseDraft = {
  has_generated_decisions: '' as const,
  has_generated_tasks: '' as const,
  archived: 'all' as const,
};

const panelExtras = {
  excludeParticipant: undefined,
  currentUserId: undefined,
  quickIncludeMeActive: false,
  quickThisWeekActive: false,
  quickNextWeekActive: false,
  quickHasGenDecisionsActive: false,
  quickHasGenTasksActive: false,
  onQuickIncludeMe: jest.fn(),
  onQuickThisWeek: jest.fn(),
  onQuickNextWeek: jest.fn(),
  onQuickHasGenDecisions: jest.fn(),
  onQuickHasGenTasks: jest.fn(),
};

describe('MeetingDiscoveryToolbar', () => {
  it('calls onAdvancedFiltersApply with tag when Apply advanced filters is clicked', async () => {
    const onAdvancedFiltersApply = jest.fn();
    render(
      <MeetingDiscoveryToolbar
        qValue=""
        onQDebouncedChange={jest.fn()}
        filterBadgeCount={0}
        selectedMeetingTypeSlugs={[]}
        onMeetingTypeSlugsChange={jest.fn()}
        tagSlug=""
        members={[]}
        memberLabel={() => ''}
        popoverDraft={baseDraft}
        onAdvancedFiltersApply={onAdvancedFiltersApply}
        onPopoverCancel={jest.fn()}
        onClearAll={jest.fn()}
        canClear={false}
        {...panelExtras}
      />,
    );

    await userEvent.click(screen.getByTestId('meetings-filter-trigger'));

    const panel = await screen.findByRole('region', { name: /meeting filters/i });
    await userEvent.click(
      within(panel).getByTestId('meetings-add-filter-trigger'),
    );
    const tagsItem = await screen.findByRole('menuitem', {
      name: /^Tags$/,
    });
    await userEvent.click(tagsItem);
    const tagInput = within(panel).getByLabelText('Filter by tag');
    fireEvent.change(tagInput, { target: { value: 'strategy' } });
    expect(onAdvancedFiltersApply).not.toHaveBeenCalled();

    await userEvent.click(
      within(panel).getByRole('button', { name: /apply advanced filters/i }),
    );
    expect(onAdvancedFiltersApply).toHaveBeenCalledTimes(1);
    expect(onAdvancedFiltersApply.mock.calls[0][0].discovery.tag).toBe(
      'strategy',
    );
  });

  it('does not call onAdvancedFiltersApply until Apply advanced filters is clicked', async () => {
    const user = userEvent.setup();
    const onAdvancedFiltersApply = jest.fn();

    render(
      <MeetingDiscoveryToolbar
        qValue=""
        onQDebouncedChange={jest.fn()}
        filterBadgeCount={0}
        selectedMeetingTypeSlugs={[]}
        onMeetingTypeSlugsChange={jest.fn()}
        tagSlug=""
        members={[]}
        memberLabel={() => ''}
        popoverDraft={baseDraft}
        onAdvancedFiltersApply={onAdvancedFiltersApply}
        onPopoverCancel={jest.fn()}
        onClearAll={jest.fn()}
        canClear={false}
        {...panelExtras}
      />,
    );

    await user.click(screen.getByTestId('meetings-filter-trigger'));
    const panel = await screen.findByRole('region', { name: /meeting filters/i });
    await user.click(within(panel).getByTestId('meetings-add-filter-trigger'));
    const genItem = await screen.findByRole('menuitem', {
      name: /^Generated decisions$/,
    });
    await user.click(genItem);
    const genSelect = within(panel).getByLabelText('Generated decisions filter');
    fireEvent.change(genSelect, { target: { value: 'yes' } });
    expect(onAdvancedFiltersApply).not.toHaveBeenCalled();

    await user.click(
      within(panel).getByRole('button', { name: /apply advanced filters/i }),
    );
    expect(onAdvancedFiltersApply).toHaveBeenCalledTimes(1);
  });
});
