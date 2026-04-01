import logging

import requests
from celery import shared_task
from django.contrib.auth import get_user_model

from .models import AgentMessage, AgentWorkflowRun
from .services import _generate_miro_board_for_workflow_run

User = get_user_model()
logger = logging.getLogger(__name__)

AGENT_BOT_EMAIL = 'agent-bot@system.local'


class _TaskOrchestrator:
    def __init__(self, workflow_run):
        self.session = workflow_run.session
        self.user = workflow_run.session.user
        self.project = workflow_run.session.project


@shared_task
def generate_miro_board_for_workflow_run_task(workflow_run_id: str):
    try:
        workflow_run = AgentWorkflowRun.objects.select_related(
            "session",
            "session__user",
            "session__project",
            "miro_board",
        ).get(id=workflow_run_id, is_deleted=False)
    except AgentWorkflowRun.DoesNotExist:
        logger.warning("Workflow run not found for background Miro generation: %s", workflow_run_id)
        return

    if workflow_run.miro_board_id:
        logger.info("Skipping background Miro generation because board already exists for run=%s", workflow_run_id)
        return

    orchestrator = _TaskOrchestrator(workflow_run)
    logger.info("Starting background Miro generation for workflow_run=%s", workflow_run_id)

    try:
        _snapshot, board = _generate_miro_board_for_workflow_run(orchestrator, workflow_run)
    except requests.HTTPError as exc:
        status_code = getattr(exc.response, "status_code", None)
        logger.exception(
            "Background Miro generation failed with HTTP error for workflow_run=%s",
            workflow_run_id,
        )
        AgentMessage.objects.create(
            session=workflow_run.session,
            role="assistant",
            content=f"Miro generation failed: HTTP {status_code or 'error'}.",
            message_type="error",
            metadata={
                "workflow_run_id": str(workflow_run.id),
                "event_type": "miro_generation_failed",
                "status_code": status_code,
            },
        )
        return
    except Exception as exc:
        logger.exception("Background Miro generation failed for workflow_run=%s", workflow_run_id)
        AgentMessage.objects.create(
            session=workflow_run.session,
            role="assistant",
            content=f"Miro generation failed: {exc}",
            message_type="error",
            metadata={
                "workflow_run_id": str(workflow_run.id),
                "event_type": "miro_generation_failed",
            },
        )
        return

    logger.info(
        "Background Miro generation completed for workflow_run=%s board=%s",
        workflow_run_id,
        board.id,
    )
    AgentMessage.objects.create(
        session=workflow_run.session,
        role="assistant",
        content=f"Miro board is ready: {board.title}",
        message_type="text",
        metadata={
            "workflow_run_id": str(workflow_run.id),
            "board_id": str(board.id),
            "event_type": "miro_board_created",
        },
    )


@shared_task
def handle_chat_message_for_agent(message_id: int):
    """Process a chat message directed at the Agent Bot and send a reply."""
    from chat.models import ChatParticipant, Message
    from chat.services import MessageService
    from .chat_service import AgentChatService

    try:
        message = Message.objects.select_related('chat', 'sender').get(id=message_id)
    except Message.DoesNotExist:
        logger.warning("handle_chat_message_for_agent: message %s not found", message_id)
        return

    chat = message.chat

    # Validate bot is still a participant
    try:
        bot_user = User.objects.get(email=AGENT_BOT_EMAIL)
    except User.DoesNotExist:
        logger.warning("handle_chat_message_for_agent: bot user not found")
        return

    if not ChatParticipant.objects.filter(chat=chat, user=bot_user, is_active=True).exists():
        logger.info("handle_chat_message_for_agent: bot not a participant in chat %s", chat.id)
        return

    # Generate reply
    reply_text = AgentChatService.generate_reply(
        message=message.content or "",
        page_context="chat_widget",
        user_id=message.sender_id,
    )

    # Create bot reply via MessageService
    try:
        bot_message = MessageService.create_message(
            chat=chat,
            sender=bot_user,
            content=reply_text,
        )
    except ValueError:
        logger.warning("handle_chat_message_for_agent: bot cannot send to chat %s", chat.id)
        return

    # Broadcast the new message via existing notification pipeline
    from chat.tasks import notify_new_message
    notify_new_message.delay(bot_message.id)
    logger.info("handle_chat_message_for_agent: bot replied with message %s in chat %s", bot_message.id, chat.id)
