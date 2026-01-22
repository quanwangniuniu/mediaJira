from __future__ import annotations

from typing import Any, Optional

from django.db import transaction
from django.utils import timezone

from .models import CommitRecord, Decision, DecisionStateTransition


def _build_validation_snapshot(decision: Decision) -> dict[str, Any]:
    if hasattr(decision, "_build_validation_snapshot"):
        return decision._build_validation_snapshot()
    return {
        "context_summary_present": bool(decision.context_summary),
        "signals_count": decision.signals.count(),
        "options_count": decision.options.count(),
        "selected_options_count": decision.options.filter(is_selected=True).count(),
        "reasoning_present": bool(decision.reasoning),
        "risk_level": decision.risk_level,
        "confidence": decision.confidence,
    }


def commit_decision(
    decision: Decision,
    user,
    note: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
    validation_snapshot: Optional[dict[str, Any]] = None,
) -> Decision:
    with transaction.atomic():
        from_status = decision.status
        decision.commit(user=user)
        to_status = decision.status

        snapshot = validation_snapshot or _build_validation_snapshot(decision)
        CommitRecord.objects.update_or_create(
            decision=decision,
            defaults={
                "committed_by": user,
                "committed_at": timezone.now(),
                "validation_snapshot": snapshot,
            },
        )

        DecisionStateTransition.objects.create(
            decision=decision,
            from_status=from_status,
            to_status=to_status,
            triggered_by=user,
            transition_method="commit",
            note=note,
            metadata=metadata,
        )

    return decision


def approve_decision(
    decision: Decision,
    user,
    note: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> Decision:
    with transaction.atomic():
        from_status = decision.status
        decision.approve(user=user)
        to_status = decision.status

        DecisionStateTransition.objects.create(
            decision=decision,
            from_status=from_status,
            to_status=to_status,
            triggered_by=user,
            transition_method="approve",
            note=note,
            metadata=metadata,
        )

    return decision


def archive_decision(
    decision: Decision,
    user,
    note: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> Decision:
    with transaction.atomic():
        from_status = decision.status
        decision.archive(user=user)
        to_status = decision.status

        DecisionStateTransition.objects.create(
            decision=decision,
            from_status=from_status,
            to_status=to_status,
            triggered_by=user,
            transition_method="archive",
            note=note,
            metadata=metadata,
        )

    return decision
