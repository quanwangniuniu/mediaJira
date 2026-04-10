import {
  MEETING_DISCOVERY_QUERY_KEYS,
  activeMeetingDiscoveryFilterCount,
  discoveryParamsToSearchParamsString,
  hasActiveDiscoveryFilters,
  mergeMeetingDiscoveryPatch,
  parseMeetingDiscoveryParams,
} from '@/lib/meetings/meetingDiscoveryUrl';
import { DEFAULT_MEETING_ORDERING } from '@/lib/meetings/meetingOrdering';
import type { MeetingListQueryParams } from '@/types/meeting';

describe('meetingDiscoveryUrl', () => {
  it('exports frozen query keys aligned with OpenAPI', () => {
    expect(MEETING_DISCOVERY_QUERY_KEYS).toContain('date_from');
    expect(MEETING_DISCOVERY_QUERY_KEYS).toContain('is_archived');
    expect(MEETING_DISCOVERY_QUERY_KEYS).not.toContain('from');
  });

  it('round-trips exclude_participant', () => {
    const original: MeetingListQueryParams = {
      exclude_participant: [7],
    };
    const qs = discoveryParamsToSearchParamsString(original);
    const back = parseMeetingDiscoveryParams(new URLSearchParams(qs));
    expect(back.exclude_participant).toEqual([7]);
  });

  it('round-trips repeated participant params', () => {
    const qs = 'participant=1&participant=2&participant=1';
    const back = parseMeetingDiscoveryParams(new URLSearchParams(qs));
    expect(back.participant).toEqual([1, 2]);
  });

  it('round-trips repeated meeting_type params', () => {
    const qs = 'meeting_type=planning&meeting_type=review&meeting_type=planning';
    const back = parseMeetingDiscoveryParams(new URLSearchParams(qs));
    expect(back.meeting_type).toEqual(['planning', 'review']);
  });

  it('round-trips discovery params through URLSearchParams', () => {
    const original: MeetingListQueryParams = {
      q: 'roadmap',
      meeting_type: ['planning'],
      participant: [42],
      tag: 'strategy',
      date_from: '2026-02-01',
      date_to: '2026-02-28',
      is_archived: false,
      has_generated_decisions: true,
      has_generated_tasks: false,
      ordering: '-title',
      page: 3,
    };
    const qs = discoveryParamsToSearchParamsString(original);
    const back = parseMeetingDiscoveryParams(new URLSearchParams(qs));
    expect(back).toEqual(original);
  });

  it('omits default ordering from serialized query string', () => {
    const qs = discoveryParamsToSearchParamsString({
      ordering: DEFAULT_MEETING_ORDERING,
    });
    expect(qs).not.toContain('ordering=');
  });

  it('parses boolean query flags', () => {
    const a = parseMeetingDiscoveryParams(
      new URLSearchParams(
        'is_archived=true&has_generated_decisions=false&has_generated_tasks=true',
      ),
    );
    expect(a.is_archived).toBe(true);
    expect(a.has_generated_decisions).toBe(false);
    expect(a.has_generated_tasks).toBe(true);
  });

  it('hasActiveDiscoveryFilters respects default ordering only', () => {
    expect(
      hasActiveDiscoveryFilters({
        ordering: DEFAULT_MEETING_ORDERING,
      }),
    ).toBe(false);
    expect(hasActiveDiscoveryFilters({ ordering: '-title' })).toBe(true);
  });

  it('activeMeetingDiscoveryFilterCount ignores q, page, and meeting_type (toolbar)', () => {
    expect(
      activeMeetingDiscoveryFilterCount({
        q: 'x',
        page: 2,
        meeting_type: ['planning'],
        tag: 'b',
      }),
    ).toBe(1);
    expect(activeMeetingDiscoveryFilterCount({ q: 'only' })).toBe(0);
  });

  it('mergeMeetingDiscoveryPatch removes page when primary filter changes', () => {
    const next = mergeMeetingDiscoveryPatch(
      { meeting_type: ['planning'], page: 3 },
      { meeting_type: ['review'] },
      { resetPage: true, defaultOrdering: DEFAULT_MEETING_ORDERING },
    );
    expect(next.meeting_type).toEqual(['review']);
    expect(next.page).toBeUndefined();
  });

  it('mergeMeetingDiscoveryPatch strips default ordering', () => {
    const next = mergeMeetingDiscoveryPatch(
      { ordering: '-title' },
      { ordering: DEFAULT_MEETING_ORDERING },
      { resetPage: true, defaultOrdering: DEFAULT_MEETING_ORDERING },
    );
    expect(next.ordering).toBeUndefined();
  });

  it('mergeMeetingDiscoveryPatch keeps explicit page when patch includes page', () => {
    const next = mergeMeetingDiscoveryPatch(
      { page: 2 },
      { page: 4 },
      { resetPage: true, defaultOrdering: DEFAULT_MEETING_ORDERING },
    );
    expect(next.page).toBe(4);
  });
});
