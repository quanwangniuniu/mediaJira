/**
 * SMP-484 #6: align with PO decision doc `docs/meetings/SMP-484-participants-timing.md`.
 * When true, the create-meeting form requires at least one participant user id (until #2 search ships).
 * Backend must set MEETINGS_REQUIRE_PARTICIPANTS_AT_CREATE=true as well.
 */
export const meetingsRequireParticipantsAtCreate =
  process.env.NEXT_PUBLIC_MEETINGS_REQUIRE_PARTICIPANTS_AT_CREATE === 'true';
