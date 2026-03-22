import json
import uuid
from unittest.mock import patch, MagicMock

from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from core.models import Organization, Project, ProjectMember, CustomUser
from .models import AgentSession, AgentMessage, AgentWorkflowRun
from .services import AgentOrchestrator, _forward_to_users


def _test_analysis_data():
    """Minimal valid analysis structure for tests."""
    return {
        "anomalies": [
            {
                "metric": "ROAS",
                "movement": "SHARP_DECREASE",
                "scope_type": "CAMPAIGN",
                "scope_value": "Test Campaign",
                "delta_value": -20.0,
                "delta_unit": "PERCENT",
                "period": "LAST_7_DAYS",
                "description": "Test Campaign ROAS dropped 20%",
            },
        ],
        "suggested_decision": {
            "title": "Test Decision",
            "context_summary": "Test context",
            "reasoning": "Test reasoning",
            "risk_level": "MEDIUM",
            "confidence": 3,
            "options": [
                {"text": "Option A", "order": 0},
                {"text": "Option B", "order": 1},
            ],
        },
        "recommended_tasks": [
            {"type": "optimization", "summary": "Test task", "priority": "MEDIUM"},
        ],
    }


class AgentModelTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name='Test Org', slug='test-org')
        self.user = CustomUser.objects.create_user(
            email='agent@test.com',
            username='agentuser',
            password='testpass123',
        )
        self.user.organization = self.org
        self.user.save()
        self.project = Project.objects.create(
            name='Test Project',
            organization=self.org,
            owner=self.user,
        )

    def test_create_session(self):
        session = AgentSession.objects.create(
            user=self.user,
            project=self.project,
            title='Test Session',
        )
        self.assertEqual(session.status, 'active')
        self.assertEqual(str(session.id), str(session.pk))

    def test_create_message(self):
        session = AgentSession.objects.create(
            user=self.user,
            project=self.project,
        )
        msg = AgentMessage.objects.create(
            session=session,
            role='user',
            content='Hello agent',
        )
        self.assertEqual(msg.message_type, 'text')
        self.assertEqual(msg.metadata, {})

    def test_create_workflow_run(self):
        session = AgentSession.objects.create(
            user=self.user,
            project=self.project,
        )
        run = AgentWorkflowRun.objects.create(
            session=session,
            status='analyzing',
        )
        self.assertEqual(run.status, 'analyzing')
        self.assertIsNone(run.spreadsheet)


class AgentSessionAPITests(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(name='Test Org API', slug='test-org-api')
        self.user = CustomUser.objects.create_user(
            email='agentapi@test.com',
            username='agentapiuser',
            password='testpass123',
        )
        self.user.organization = self.org
        self.user.save()
        self.project = Project.objects.create(
            name='Test Project API',
            organization=self.org,
            owner=self.user,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_session(self):
        response = self.client.post(
            '/api/agent/sessions/',
            {'project_id': self.project.id},
            format='json',
            HTTP_X_PROJECT_ID=str(self.project.id),
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('id', response.data)

    def test_list_sessions(self):
        AgentSession.objects.create(
            user=self.user,
            project=self.project,
            title='Session 1',
        )
        response = self.client.get(
            '/api/agent/sessions/',
            HTTP_X_PROJECT_ID=str(self.project.id),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)

    def test_retrieve_session(self):
        session = AgentSession.objects.create(
            user=self.user,
            project=self.project,
            title='Detail Session',
        )
        AgentMessage.objects.create(
            session=session,
            role='user',
            content='test message',
        )
        response = self.client.get(
            f'/api/agent/sessions/{session.id}/',
            HTTP_X_PROJECT_ID=str(self.project.id),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['messages']), 1)

    def test_delete_session(self):
        session = AgentSession.objects.create(
            user=self.user,
            project=self.project,
        )
        response = self.client.delete(
            f'/api/agent/sessions/{session.id}/',
            HTTP_X_PROJECT_ID=str(self.project.id),
        )
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        session.refresh_from_db()
        self.assertTrue(session.is_deleted)


class ChatAPITests(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(name='Test Org Chat', slug='test-org-chat')
        self.user = CustomUser.objects.create_user(
            email='chat@test.com',
            username='chatuser',
            password='testpass123',
        )
        self.user.organization = self.org
        self.user.save()
        self.project = Project.objects.create(
            name='Test Project Chat',
            organization=self.org,
            owner=self.user,
        )
        self.session = AgentSession.objects.create(
            user=self.user,
            project=self.project,
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_chat_returns_sse_response(self):
        response = self.client.post(
            f'/api/agent/sessions/{self.session.id}/chat/',
            {'message': 'Hello'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'text/event-stream')

    def test_chat_creates_messages(self):
        response = self.client.post(
            f'/api/agent/sessions/{self.session.id}/chat/',
            {'message': 'Hello agent'},
            format='json',
        )
        # Consume the streaming response
        content = b''.join(response.streaming_content).decode()
        self.assertIn('"type": "done"', content)

        # Check messages were saved
        messages = AgentMessage.objects.filter(session=self.session)
        self.assertEqual(messages.filter(role='user').count(), 1)
        self.assertEqual(messages.filter(role='assistant').count(), 1)

    def test_chat_session_not_found(self):
        fake_id = uuid.uuid4()
        response = self.client.post(
            f'/api/agent/sessions/{fake_id}/chat/',
            {'message': 'Hello'},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_chat_sets_session_title(self):
        self.client.post(
            f'/api/agent/sessions/{self.session.id}/chat/',
            {'message': 'Analyze my campaign data'},
            format='json',
        )
        self.session.refresh_from_db()
        self.assertEqual(self.session.title, 'Analyze my campaign data')


class SpreadsheetListAPITests(APITestCase):
    def setUp(self):
        self.org = Organization.objects.create(name='Test Org SS', slug='test-org-ss')
        self.user = CustomUser.objects.create_user(
            email='ss@test.com',
            username='ssuser',
            password='testpass123',
        )
        self.user.organization = self.org
        self.user.save()
        self.project = Project.objects.create(
            name='Test Project SS',
            organization=self.org,
            owner=self.user,
        )
        ProjectMember.objects.create(user=self.user, project=self.project, is_active=True)
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_list_spreadsheets(self):
        from spreadsheet.models import Spreadsheet
        Spreadsheet.objects.create(project=self.project, name='Test Sheet')
        response = self.client.get(
            '/api/agent/spreadsheets/',
            HTTP_X_PROJECT_ID=str(self.project.id),
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['name'], 'Test Sheet')

    def test_list_spreadsheets_no_project(self):
        response = self.client.get('/api/agent/spreadsheets/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class OrchestratorTests(TestCase):
    def setUp(self):
        self.org = Organization.objects.create(name='Test Org Orch', slug='test-org-orch')
        self.user = CustomUser.objects.create_user(
            email='orch@test.com',
            username='orchuser',
            password='testpass123',
        )
        self.user.organization = self.org
        self.user.save()
        self.project = Project.objects.create(
            name='Test Project Orch',
            organization=self.org,
            owner=self.user,
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            role='owner',
            is_active=True,
        )
        self.session = AgentSession.objects.create(
            user=self.user,
            project=self.project,
        )

    def test_handle_message_general_chat(self):
        orchestrator = AgentOrchestrator(self.user, self.project, self.session)
        chunks = list(orchestrator.handle_message("hello"))
        types = [c['type'] for c in chunks]
        self.assertIn('text', types)
        self.assertIn('done', types)

    def test_create_decision_draft(self):
        from decision.models import Decision, Signal, Option
        orchestrator = AgentOrchestrator(self.user, self.project, self.session)
        analysis = _test_analysis_data()
        chunks = list(orchestrator.create_decision_draft(analysis))
        types = [c['type'] for c in chunks]
        self.assertIn('decision_draft', types)

        # Verify decision was created
        decision = Decision.objects.filter(project=self.project).last()
        self.assertIsNotNone(decision)
        self.assertEqual(decision.author, self.user)
        self.assertTrue(decision.signals.exists())
        self.assertTrue(decision.options.exists())

    def test_create_tasks_from_decision(self):
        from decision.models import Decision
        from task.models import Task

        decision = Decision.objects.create(
            title='Test Decision',
            project=self.project,
            project_seq=1,
            author=self.user,
        )
        workflow_run = AgentWorkflowRun.objects.create(
            session=self.session,
            decision=decision,
            analysis_result=_test_analysis_data(),
        )
        orchestrator = AgentOrchestrator(self.user, self.project, self.session)
        chunks = list(orchestrator.create_tasks_from_analysis(workflow_run))
        types = [c['type'] for c in chunks]
        self.assertIn('task_created', types)

        # Verify tasks were created
        tasks = Task.objects.filter(project=self.project)
        self.assertTrue(tasks.exists())
        workflow_run.refresh_from_db()
        self.assertEqual(workflow_run.status, 'completed')

    @patch('agent.services._call_dify_chat')
    def test_follow_up_completed_marks_run_and_passes_project_members(self, mock_call_dify_chat):
        teammate = CustomUser.objects.create_user(
            email='alice@test.com',
            username='alice',
            password='testpass123',
            first_name='Alice',
            last_name='Chen',
        )
        teammate.organization = self.org
        teammate.save()
        ProjectMember.objects.create(
            user=teammate,
            project=self.project,
            role='member',
            is_active=True,
        )
        workflow_run = AgentWorkflowRun.objects.create(
            session=self.session,
            status='awaiting_confirmation',
            analysis_result=_test_analysis_data(),
        )
        AgentMessage.objects.create(
            session=self.session,
            role='assistant',
            content='Analysis complete.',
        )
        mock_call_dify_chat.return_value = {
            'status': 'completed',
            'text': 'Prepared a summary.',
            'forwards': [],
        }

        orchestrator = AgentOrchestrator(self.user, self.project, self.session)
        chunks = list(orchestrator.handle_message("Explain this to me."))

        self.assertIn(
            {'type': 'text', 'content': 'Prepared a summary.'},
            chunks,
        )
        workflow_run.refresh_from_db()
        self.assertTrue(workflow_run.chat_followed_up)

        self.assertTrue(mock_call_dify_chat.called)
        project_members = mock_call_dify_chat.call_args.kwargs['project_members']
        usernames = {member['username'] for member in project_members}
        self.assertIn('orchuser', usernames)
        self.assertIn('alice', usernames)
        self.assertNotIn('agent-bot', usernames)

    @patch('agent.services._call_dify_chat')
    def test_follow_up_needs_clarification_keeps_run_open(self, mock_call_dify_chat):
        workflow_run = AgentWorkflowRun.objects.create(
            session=self.session,
            status='awaiting_confirmation',
            analysis_result=_test_analysis_data(),
        )
        mock_call_dify_chat.return_value = {
            'status': 'needs_clarification',
            'text': 'Please provide the exact username.',
            'forwards': [],
        }

        orchestrator = AgentOrchestrator(self.user, self.project, self.session)
        chunks = list(orchestrator.handle_message("Forward this to Alex."))

        self.assertIn(
            {'type': 'text', 'content': 'Please provide the exact username.'},
            chunks,
        )
        workflow_run.refresh_from_db()
        self.assertFalse(workflow_run.chat_followed_up)

    @patch('chat.tasks.notify_new_message.delay')
    def test_forward_to_users_does_not_match_first_name(self, mock_notify_delay):
        teammate = CustomUser.objects.create_user(
            email='alice-fn@test.com',
            username='alice-ops',
            password='testpass123',
            first_name='Alice',
            last_name='Operator',
        )
        teammate.organization = self.org
        teammate.save()
        ProjectMember.objects.create(
            user=teammate,
            project=self.project,
            role='member',
            is_active=True,
        )

        results = _forward_to_users(
            [{'username': 'Alice', 'content': 'Please review the report.'}],
            self.user,
            self.project,
        )

        self.assertEqual(results[0]['status'], 'not_found')
        mock_notify_delay.assert_not_called()

    @patch('chat.tasks.notify_new_message.delay')
    def test_forward_to_users_reactivates_existing_private_chat(self, mock_notify_delay):
        from chat.models import Chat, ChatParticipant, ChatType
        from core.utils.bot_user import get_agent_bot_user

        teammate = CustomUser.objects.create_user(
            email='alice-chat@test.com',
            username='alice-chat',
            password='testpass123',
        )
        teammate.organization = self.org
        teammate.save()
        ProjectMember.objects.create(
            user=teammate,
            project=self.project,
            role='member',
            is_active=True,
        )

        bot = get_agent_bot_user()
        chat = Chat.objects.create(project=self.project, type=ChatType.PRIVATE)
        ChatParticipant.objects.create(chat=chat, user=bot, is_active=True)
        participant = ChatParticipant.objects.create(chat=chat, user=teammate, is_active=False)

        results = _forward_to_users(
            [{'username': 'alice-chat', 'content': 'Please review Campaign A.'}],
            self.user,
            self.project,
        )

        participant.refresh_from_db()
        self.assertTrue(participant.is_active)
        self.assertEqual(results[0]['status'], 'sent')
        mock_notify_delay.assert_called_once()
