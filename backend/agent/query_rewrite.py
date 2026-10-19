"""History window for project-RAG query rewrite.

The current question is already stored as the latest user message before
answer_project_question runs. This module only selects earlier completed
turns. It does not call the rewrite model.
"""
from django.conf import settings

from agent.models import AgentMessage


def recent_rewrite_turns(session) -> list[tuple[str, str]]:
    """Return the latest completed (user, assistant) turns before the current question.

    Messages are read from newest to oldest. The newest user message is the
    question being asked now, so it and anything after it are skipped. Walking
    backward, a turn is that user message plus the assistant text that follows
    it. Collection stops once RAG_QUERY_REWRITE_HISTORY_TURNS completed turns
    are in hand, so a long session is not read to the beginning.

    System messages and non-text message types are left out. Assistant text
    is truncated to RAG_QUERY_REWRITE_ASSISTANT_MAX_CHARS. The returned turns
    are oldest-first within the window.

    An empty list means there is no earlier completed turn, so the caller
    should search with the original question and skip the rewrite model.
    """
    turns_limit = settings.RAG_QUERY_REWRITE_HISTORY_TURNS
    max_chars = settings.RAG_QUERY_REWRITE_ASSISTANT_MAX_CHARS
    if turns_limit < 1:
        return []

    newest_first = (
        AgentMessage.objects.filter(
            session=session,
            role__in=('user', 'assistant'),
            message_type='text',
            is_deleted=False,
        )
        .order_by('-created_at', '-id')
        .iterator(chunk_size=turns_limit * 4)
    )

    seen_current_question = False # Whether the current question has already been skipped
    assistant_parts: list[str] = [] # Temporarily store assistant response parts
    turns_newest_first: list[tuple[str, str]] = [] # Store complete user–assistant turns

    for message in newest_first:
        content = (message.content or '').strip()
        if not content:
            continue
        if not seen_current_question:
            if message.role == 'user':
                seen_current_question = True
            continue
        if message.role == 'assistant':
            assistant_parts.append(content)
            continue
        if not assistant_parts:
            continue
        assistant_text = '\n'.join(reversed(assistant_parts))
        assistant_parts = []
        turns_newest_first.append((content, assistant_text[:max_chars]))
        if len(turns_newest_first) >= turns_limit:
            break

    turns_newest_first.reverse()
    return turns_newest_first
