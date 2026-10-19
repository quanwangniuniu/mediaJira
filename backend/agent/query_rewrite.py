"""Project-RAG query rewrite.

The current question is already stored as the latest user message before
answer_project_question runs. recent_rewrite_turns selects earlier completed
turns. rewrite_project_question calls the rewrite model only when that
history exists, and returns the original question when the call cannot be
used.
"""
import logging

from django.conf import settings

from agent.models import AgentMessage

logger = logging.getLogger(__name__)

_REWRITE_MODEL = 'gemini-2.5-flash-lite'
_REWRITE_TEMPERATURE = 0
_REWRITE_MAX_OUTPUT_TOKENS = 256
_REWRITE_SYSTEM_PROMPT = (
    "You rewrite a follow-up question so it can be searched on its own. "
    "Use the conversation only to resolve references such as 'that' or 'why'. "
    "If the question is already complete, return it unchanged. "
    "Return one line containing only the question. Do not explain."
)


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


def rewrite_project_question(session, project, question: str) -> str:
    """Return the question to search with.

    With no earlier completed turn, the original question is returned and
    the model is not called. Otherwise the model must return exactly one
    line. An empty reply, more than one line, a timeout, or any other
    error returns the original question.
    """
    original = (question or '').strip()
    turns = recent_rewrite_turns(session)
    if not turns:
        _log_rewrite(project, session, original, original, fell_back=False, reason='no_history')
        return original

    try:
        from agent.llm_client import call_llm

        result = call_llm(
            agent_session=session,
            provider='gemini',
            model=_REWRITE_MODEL,
            system_prompt=_REWRITE_SYSTEM_PROMPT,
            user_prompt=_rewrite_user_prompt(turns, original),
            max_output_tokens=_REWRITE_MAX_OUTPUT_TOKENS,
            temperature=_REWRITE_TEMPERATURE,
            call_purpose='other',
            timeout=settings.RAG_QUERY_REWRITE_TIMEOUT_SECONDS,
        )
    except Exception as exc:
        logger.warning(
            "RAG query rewrite failed project_id=%s session_id=%s error_type=%s",
            project.id, session.id, type(exc).__name__,
        )
        _log_rewrite(project, session, original, original, fell_back=True, reason='error')
        return original

    accepted = _single_question(result.get('text') or '')
    if accepted is None:
        _log_rewrite(project, session, original, original, fell_back=True, reason='unusable_output')
        return original

    _log_rewrite(project, session, original, accepted, fell_back=False, reason='rewritten')
    return accepted


def _rewrite_user_prompt(turns: list[tuple[str, str]], question: str) -> str:
    lines = []
    for user_text, assistant_text in turns:
        lines.append(f"User: {user_text}")
        lines.append(f"Assistant: {assistant_text}")
    history = "\n".join(lines)
    return f"Conversation:\n{history}\n\nFollow-up question:\n{question}"


def _single_question(text: str) -> str | None:
    """Accept one non-empty line. Several lines are an explanation, not a question."""
    lines = [line.strip() for line in text.strip().splitlines() if line.strip()]
    if len(lines) != 1:
        return None
    line = lines[0]
    if len(line) >= 2 and line[0] == line[-1] and line[0] in {'"', "'"}:
        line = line[1:-1].strip()
    return line or None


def _log_rewrite(project, session, original: str, rewritten: str, *, fell_back: bool, reason: str) -> None:
    logger.info(
        "RAG query rewrite project_id=%s session_id=%s fell_back=%s reason=%s original=%s rewritten=%s",
        project.id, session.id, fell_back, reason, original, rewritten,
    )
