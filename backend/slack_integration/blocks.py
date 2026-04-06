"""
Slack Block Kit message builders for MediaJira notifications.

This module provides:
  - Low-level block primitives (_header, _section, _divider, _button_block, _context)
  - URL helpers for deep-linking back into the MediaJira frontend
  - High-level message builders for each notification event type

Each build_* function returns a (fallback_text, blocks) tuple to be passed
directly to send_slack_message().
"""

from django.conf import settings
from decision.models import Decision
from task.models import Task

FRONTEND_URL = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')


# ─── Low-level block primitives ───────────────────────────────────────────────

def _header(text: str) -> dict:
    return {
        "type": "header",
        "text": {"type": "plain_text", "text": text, "emoji": True},
    }


def _section(text: str) -> dict:
    return {
        "type": "section",
        "text": {"type": "mrkdwn", "text": text},
    }


def _divider() -> dict:
    return {"type": "divider"}


def _context(text: str) -> dict:
    return {
        "type": "context",
        "elements": [{"type": "mrkdwn", "text": text}],
    }


def _button_block(label: str, url: str) -> dict:
    """
    An interactive URL button.
    Requires 'Interactivity & Shortcuts' to be enabled in the Slack App
    settings.
    """
    return {
        "type": "actions",
        "elements": [
            {
                "type": "button",
                "text": {"type": "plain_text", "text": label, "emoji": True},
                "url": url,
                "style": "primary",
            }
        ],
    }


def _link_section(label: str, url: str) -> dict:
    """
    A plain mrkdwn hyperlink — works without Interactivity enabled.
    Use this as a fallback when the Slack App doesn't have Interactivity configured.
    """
    return _section(f"<{url}|🔗 {label}>")


# ─── Deep-link URL helpers ────────────────────────────────────────────────────

def task_url(task) -> str:
    return f"{FRONTEND_URL}/tasks/{task.id}?project_id={task.project_id}"


def decision_url(decision) -> str:
    base = f"{FRONTEND_URL}/decisions/{decision.id}"
    if decision.project_id:
        return f"{base}?project_id={decision.project_id}"
    return base


# ─── Per-scenario task message builders ──────────────────────────────────────

def _due_date_label(task) -> str:
    if not task.due_date:
        return "Not set"
    return task.due_date.strftime("%b %d, %Y")


def build_task_submitted(task) -> tuple:
    """📋 Task submitted — notify approvers that new work is waiting."""
    owner = task.owner.email if task.owner else "Unassigned"
    blocks = [
        _header("📋 New Task Submitted for Review"),
        _section(f"*{task.summary}*"),
        _section(
            f"*Project:* {task.project.name}    "
            f"*Due Date:* {_due_date_label(task)}    "
            f"*Submitted by:* {owner}"
        ),
        _button_block("View Task in MediaJira", task_url(task)),
        _divider(),
    ]
    fallback = f"New Task Submitted: {task.summary} (Project: {task.project.name})"
    return fallback, blocks


def build_task_under_review(task, old_status: str) -> tuple:
    """🔍 Task entered UNDER_REVIEW — first review or multi-step forward."""
    if old_status == Task.Status.APPROVED:
        # Multi-step approval chain forward
        header = "➡️ Task Forwarded to Next Approver"
        approver_text = (
            f"*Current Approver:* {task.current_approver.email}"
            if task.current_approver else ""
        )
        step_text = (
            f"    *Step:* {task.current_approval_step}"
            if task.current_approval_step else ""
        )
        meta = f"*Project:* {task.project.name}{('    ' + approver_text) if approver_text else ''}{step_text}"
    else:
        # Normal SUBMITTED → UNDER_REVIEW
        header = "🔍 Task Now Under Review"
        approver_text = (
            f"*Reviewer:* {task.current_approver.email}"
            if task.current_approver else ""
        )
        meta = f"*Project:* {task.project.name}" + (f"    {approver_text}" if approver_text else "")

    blocks = [
        _header(header),
        _section(f"*{task.summary}*"),
        _section(meta),
        _button_block("View Task in MediaJira", task_url(task)),
        _divider(),
    ]
    fallback = f"{header}: {task.summary}"
    return fallback, blocks


def build_task_cancelled(task, old_status: str) -> tuple:
    """🚫 Task cancelled."""
    blocks = [
        _header("🚫 Task Cancelled"),
        _section(f"*{task.summary}*"),
        _section(f"*Project:* {task.project.name}    *Was:* {old_status}"),
        _button_block("View Task in MediaJira", task_url(task)),
        _divider(),
    ]
    fallback = f"Task Cancelled: {task.summary} (was {old_status})"
    return fallback, blocks


def build_task_approval(task, approval_record) -> tuple:
    """Returns (fallback, blocks) for a task approval/rejection notification."""
    is_approved = approval_record.is_approved
    header_text = "✅ Task Approved" if is_approved else "❌ Task Rejected"
    status_label = "Approved ✅" if is_approved else "Rejected ❌"

    body = (
        f"*Task:* {task.summary}\n"
        f"*Decided by:* {approval_record.approved_by.email}"
    )
    if approval_record.comment:
        body += f"\n*Comment:* {approval_record.comment}"

    blocks = [
        _header(header_text),
        _section(body),
        _button_block("View Task in MediaJira", task_url(task)),
        _divider(),
    ]
    fallback = f"{header_text}: {task.summary} — {approval_record.approved_by.email}"
    return fallback, blocks


def build_comment_added(task, comment) -> tuple:
    """Returns (fallback, blocks) for a new comment notification."""
    body_str = str(comment.body)
    body_preview = body_str[:200] + ("..." if len(body_str) > 200 else "")

    blocks = [
        _header("💬 New Comment Added"),
        _section(f"*{task.summary}*"),
        _section(f"*From:* {comment.user.email}\n_{body_preview}_"),
        _button_block("View Task in MediaJira", task_url(task)),
        _divider(),
    ]
    fallback = f"Comment on {task.summary} by {comment.user.email}: {body_preview}"
    return fallback, blocks


def build_decision_committed(decision) -> tuple:
    """
    Returns (fallback, blocks) for a decision commit notification.
    Covers both COMMITTED and AWAITING_APPROVAL status transitions.
    """
    risk_emoji_map = {
        Decision.RiskLevel.HIGH: "🔴",
        Decision.RiskLevel.MEDIUM: "🟡",
        Decision.RiskLevel.LOW: "🟢",
    }
    risk_emoji = risk_emoji_map.get(decision.risk_level, "⬜")
    risk_display = decision.get_risk_level_display()
    risk_label = f"{risk_display} {risk_emoji}" if risk_display else "N/A"
    confidence_label = f"{decision.confidence}/5" if decision.confidence else "N/A"

    summary_text = str(decision.context_summary) if decision.context_summary else "No summary provided."
    if len(summary_text) > 280:
        summary_text = summary_text[:277] + "..."

    is_awaiting = decision.status == Decision.Status.AWAITING_APPROVAL
    header_text = "⚖️ Decision Submitted for Approval" if is_awaiting else "⚖️ New Decision Committed"

    meta = f"*Risk:* {risk_label}    *Confidence:* {confidence_label}"
    if decision.author:
        meta += f"    *Author:* {decision.author.email}"
    if decision.project:
        meta += f"\n*Project:* {decision.project.name}"

    title = str(decision.title) if decision.title else "Untitled Decision"

    blocks = [
        _header(header_text),
        _section(f"*{title}*"),
        _section(f"_{summary_text}_"),
        _section(meta),
        _button_block("View Decision in MediaJira", decision_url(decision)),
        _divider(),
    ]
    fallback = f"{header_text}: {title} | Risk: {risk_label}"
    return fallback, blocks


def build_decision_approved(decision, approved_by, note) -> tuple:
    """✅ Decision Approved"""
    title = str(decision.title) if decision.title else "Untitled Decision"
    body = (
        f"*Decision:* {title}\n"
        f"*Decided by:* {approved_by.email if approved_by else 'Unknown'}"
    )
    if note:
        body += f"\n*Approval Note:* {note}"

    blocks = [
        _header("✅ Decision Approved"),
        _section(body),
        _button_block("View Decision in MediaJira", decision_url(decision)),
        _divider(),
    ]
    fallback = f"Decision Approved: {title}"
    return fallback, blocks

