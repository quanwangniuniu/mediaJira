"""
Comprehensive Django TestCase-compatible tests for campaign module.
These tests can be run with: python manage.py test campaign
"""
from django.test import TestCase
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
from freezegun import freeze_time

from django.contrib.auth import get_user_model
from core.models import Organization, Project, ProjectMember
from task.models import Task
from campaign.models import (
    Campaign,
    CampaignStatusHistory,
    PerformanceCheckIn,
    PerformanceSnapshot,
    CampaignAttachment,
    CampaignTemplate,
    CampaignTaskLink,
    CampaignDecisionLink,
    CampaignCalendarLink,
)

User = get_user_model()


# ============================================================================
# Campaign Model Tests
# ============================================================================

class CampaignModelTestCase(TestCase):
    """Test Campaign model"""
    
    def setUp(self):
        """Set up test data"""
        self.organization = Organization.objects.create(
            name="Test Organization",
            email_domain="test.com"
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@test.com',
            password='testpass123',
            organization=self.organization
        )
        self.user2 = User.objects.create_user(
            username='testuser2',
            email='testuser2@test.com',
            password='testpass123',
            organization=self.organization
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            role='member',
            is_active=True
        )
        ProjectMember.objects.create(
            user=self.user2,
            project=self.project,
            role='member',
            is_active=True
        )
    
    def _create_campaign(self, **kwargs):
        """Helper to create campaign (defaults to PLANNING status)"""
        defaults = {
            'name': kwargs.get('name', 'Test Campaign'),
            'objective': kwargs.get('objective', Campaign.Objective.CONVERSION),
            'platforms': kwargs.get('platforms', [Campaign.Platform.META]),
            'start_date': kwargs.get('start_date', timezone.now().date()),
            'project': self.project,
            'owner': self.user,
            'creator': self.user,
            # Note: status defaults to PLANNING (cannot be set directly due to FSM protection)
        }
        defaults.update(kwargs)
        # Remove status if it was passed - FSM fields can't be set directly
        defaults.pop('status', None)
        return Campaign.objects.create(**defaults)
    
    def _create_campaign_testing(self):
        """Helper to create campaign in TESTING status"""
        campaign = self._create_campaign()
        campaign.start_testing(user=self.user)
        campaign.save()
        return campaign
    
    def _create_campaign_scaling(self):
        """Helper to create campaign in SCALING status"""
        campaign = self._create_campaign_testing()
        PerformanceSnapshot.objects.create(
            campaign=campaign,
            milestone_type=PerformanceSnapshot.MilestoneType.LAUNCH,
            spend=Decimal('1000.00'),
            metric_type=PerformanceSnapshot.MetricType.ROAS,
            metric_value=Decimal('3.50'),
            snapshot_by=self.user
        )
        campaign.start_scaling(user=self.user)
        campaign.save()
        return campaign
    
    def _create_campaign_completed(self):
        """Helper to create campaign in COMPLETED status"""
        campaign = self._create_campaign_testing()
        campaign.end_date = timezone.now().date()
        campaign.complete(user=self.user)
        campaign.save()
        return campaign
    
    def _create_campaign_archived(self):
        """Helper to create campaign in ARCHIVED status"""
        campaign = self._create_campaign_completed()
        campaign.archive(user=self.user)
        campaign.save()
        return campaign

    # === Basic CRUD Operations ===

    def test_campaign_creation_with_required_fields(self):
        """Test campaign creation with all required fields"""
        campaign = self._create_campaign()
        self.assertIsNotNone(campaign.id)
        self.assertEqual(campaign.name, "Test Campaign")
        self.assertEqual(campaign.objective, Campaign.Objective.CONVERSION)
        self.assertEqual(campaign.platforms, [Campaign.Platform.META])
        self.assertEqual(campaign.status, Campaign.Status.PLANNING)
        self.assertFalse(campaign.is_deleted)

    def test_campaign_creation_with_optional_fields(self):
        """Test campaign creation with optional fields"""
        campaign = self._create_campaign(
            name="Campaign with Options",
            objective=Campaign.Objective.AWARENESS,
            platforms=[Campaign.Platform.META, Campaign.Platform.TIKTOK],
            end_date=timezone.now().date() + timezone.timedelta(days=30),
            assignee=self.user,
            hypothesis="Test hypothesis",
            tags=["tag1", "tag2"],
            budget_estimate=Decimal('5000.00'),
            status_note="Initial planning note"
        )
        self.assertEqual(campaign.hypothesis, "Test hypothesis")
        self.assertEqual(campaign.tags, ["tag1", "tag2"])
        self.assertEqual(campaign.budget_estimate, Decimal('5000.00'))
        self.assertEqual(campaign.assignee, self.user)

    def test_campaign_update_operations(self):
        """Test campaign update operations"""
        campaign = self._create_campaign()
        campaign.name = "Updated Campaign Name"
        campaign.hypothesis = "Updated hypothesis"
        campaign.save()
        
        # Refresh non-status fields to avoid FSM protection
        campaign.refresh_from_db(fields=['name', 'hypothesis'])
        self.assertEqual(campaign.name, "Updated Campaign Name")
        self.assertEqual(campaign.hypothesis, "Updated hypothesis")

    def test_campaign_soft_delete(self):
        """Test campaign soft delete"""
        campaign = self._create_campaign()
        self.assertFalse(campaign.is_deleted)
        campaign.is_deleted = True
        campaign.save()
        
        # Refresh non-status fields to avoid FSM protection
        campaign.refresh_from_db(fields=['is_deleted'])
        self.assertTrue(campaign.is_deleted)

    def test_campaign_string_representation(self):
        """Test campaign string representation"""
        campaign = self._create_campaign()
        expected = f"{campaign.name} ({campaign.get_status_display()})"
        self.assertEqual(str(campaign), expected)

    # === Field Validation ===

    def test_clean_invalid_platforms(self):
        """Test clean() method - invalid platforms validation"""
        campaign = Campaign(
            name="Invalid Platforms Campaign",
            objective=Campaign.Objective.CONVERSION,
            platforms=["INVALID_PLATFORM", Campaign.Platform.META],
            start_date=timezone.now().date(),
            project=self.project,
            owner=self.user,
            creator=self.user
        )
        with self.assertRaises(ValidationError) as context:
            campaign.clean()
        self.assertIn('platforms', str(context.exception))

    @freeze_time("2024-01-15 10:00:00")
    def test_clean_planning_start_date_validation(self):
        """Test clean() method - PLANNING status start_date validation (must be future/today)"""
        campaign = Campaign(
            name="Past Date Campaign",
            objective=Campaign.Objective.CONVERSION,
            platforms=[Campaign.Platform.META],
            start_date=timezone.now().date() - timezone.timedelta(days=1),
            project=self.project,
            owner=self.user,
            creator=self.user
            # status defaults to PLANNING (cannot be set directly)
        )
        with self.assertRaises(ValidationError) as context:
            campaign.clean()
        self.assertIn('start_date', str(context.exception))

    @freeze_time("2024-01-15 10:00:00")
    def test_clean_planning_start_date_today_allowed(self):
        """Test clean() method - PLANNING status with today's date is allowed"""
        campaign = Campaign(
            name="Today Date Campaign",
            objective=Campaign.Objective.CONVERSION,
            platforms=[Campaign.Platform.META],
            start_date=timezone.now().date(),
            project=self.project,
            owner=self.user,
            creator=self.user
            # status defaults to PLANNING (cannot be set directly)
        )
        # Should not raise error
        campaign.clean()

    def test_clean_completed_end_date_requirement(self):
        """Test clean() method - COMPLETED status end_date requirement"""
        campaign = self._create_campaign_completed()
        campaign.end_date = None
        with self.assertRaises(ValidationError) as context:
            campaign.clean()
        self.assertIn('end_date', str(context.exception))

    def test_clean_archived_campaign_edit_restrictions(self):
        """Test clean() method - archived campaign edit restrictions"""
        campaign = self._create_campaign_archived()
        # Modify a field to trigger clean() validation
        # The clean() method checks if campaign was archived and blocks edits
        campaign.name = "Modified Name"
        # Since the campaign is ARCHIVED, clean() should raise ValidationError
        # when detecting that status is not COMPLETED (the only allowed transition from ARCHIVED)
        with self.assertRaises(ValidationError) as context:
            campaign.clean()
        # The validation error should mention archived campaigns cannot be edited
        self.assertIn('Archived campaigns cannot be edited', str(context.exception))

    def test_save_calls_full_clean(self):
        """Test save() method calls full_clean() on update (not initial creation)"""
        # Create campaign first (validation skipped on creation)
        campaign = self._create_campaign()
        
        # Now try to update with invalid data - should trigger validation
        campaign.platforms = ["INVALID"]
        with self.assertRaises(ValidationError):
            campaign.save()

    # === FSM Transitions ===

    def test_start_testing_transition(self):
        """Test start_testing() transition (PLANNING → TESTING)"""
        campaign = self._create_campaign()
        self.assertEqual(campaign.status, Campaign.Status.PLANNING)
        campaign.start_testing(user=self.user)
        campaign.save()
        
        # Use get() to retrieve latest status after FSM transition
        campaign = Campaign.objects.get(id=campaign.id)
        self.assertEqual(campaign.status, Campaign.Status.TESTING)

    def test_start_scaling_with_performance_data(self):
        """Test start_scaling() transition (TESTING → SCALING) - with performance data"""
        campaign = self._create_campaign_testing()
        PerformanceSnapshot.objects.create(
            campaign=campaign,
            milestone_type=PerformanceSnapshot.MilestoneType.LAUNCH,
            spend=Decimal('1000.00'),
            metric_type=PerformanceSnapshot.MetricType.ROAS,
            metric_value=Decimal('3.50'),
            snapshot_by=self.user
        )
        
        campaign.start_scaling(user=self.user)
        campaign.save()
        
        # Use get() to retrieve latest status after FSM transition
        campaign = Campaign.objects.get(id=campaign.id)
        self.assertEqual(campaign.status, Campaign.Status.SCALING)

    def test_start_scaling_without_performance_data(self):
        """Test start_scaling() transition failure - no performance data"""
        campaign = self._create_campaign_testing()
        self.assertFalse(campaign.performance_snapshots.exists())
        
        with self.assertRaises(ValidationError) as context:
            campaign.start_scaling(user=self.user)
        self.assertIn("performance data", str(context.exception))

    def test_start_optimizing_from_testing(self):
        """Test start_optimizing() transition (TESTING → OPTIMIZING)"""
        campaign = self._create_campaign_testing()
        campaign.start_optimizing(user=self.user)
        campaign.save()
        
        # Use get() to retrieve latest status after FSM transition
        campaign = Campaign.objects.get(id=campaign.id)
        self.assertEqual(campaign.status, Campaign.Status.OPTIMIZING)

    def test_start_optimizing_from_scaling(self):
        """Test start_optimizing() transition (SCALING → OPTIMIZING)"""
        campaign = self._create_campaign_scaling()
        campaign.start_optimizing(user=self.user)
        campaign.save()
        
        # Use get() to retrieve latest status after FSM transition
        campaign = Campaign.objects.get(id=campaign.id)
        self.assertEqual(campaign.status, Campaign.Status.OPTIMIZING)

    def test_pause_from_testing(self):
        """Test pause() transition (TESTING → PAUSED)"""
        campaign = self._create_campaign_testing()
        campaign.pause(user=self.user)
        campaign.save()
        
        # Use get() to retrieve latest status after FSM transition
        campaign = Campaign.objects.get(id=campaign.id)
        self.assertEqual(campaign.status, Campaign.Status.PAUSED)

    def test_pause_from_scaling(self):
        """Test pause() transition (SCALING → PAUSED)"""
        campaign = self._create_campaign_scaling()
        campaign.pause(user=self.user)
        campaign.save()
        
        # Use get() to retrieve latest status after FSM transition
        campaign = Campaign.objects.get(id=campaign.id)
        self.assertEqual(campaign.status, Campaign.Status.PAUSED)

    def test_resume_transition(self):
        """Test resume() transition (PAUSED → TESTING)"""
        campaign = self._create_campaign_testing()
        campaign.pause(user=self.user)
        campaign.save()
        # Use get() to retrieve latest status after FSM transition
        campaign = Campaign.objects.get(id=campaign.id)
        
        campaign.resume(user=self.user)
        campaign.save()
        
        # Use get() to retrieve latest status after FSM transition
        campaign = Campaign.objects.get(id=campaign.id)
        self.assertEqual(campaign.status, Campaign.Status.TESTING)

    def test_complete_transition(self):
        """Test complete() transition (TESTING → COMPLETED)"""
        campaign = self._create_campaign_testing()
        campaign.end_date = timezone.now().date()
        campaign.complete(user=self.user)
        campaign.save()
        
        # Use get() to retrieve latest status after FSM transition
        campaign = Campaign.objects.get(id=campaign.id)
        self.assertEqual(campaign.status, Campaign.Status.COMPLETED)
        self.assertIsNotNone(campaign.actual_completion_date)

    def test_complete_sets_actual_completion_date(self):
        """Test complete() sets actual_completion_date"""
        campaign = self._create_campaign_testing()
        self.assertIsNone(campaign.actual_completion_date)
        campaign.end_date = timezone.now().date()
        campaign.complete(user=self.user)
        campaign.save()
        
        # Use get() to retrieve latest status and actual_completion_date after FSM transition
        campaign = Campaign.objects.get(id=campaign.id)
        self.assertEqual(campaign.actual_completion_date, timezone.now().date())

    def test_archive_transition(self):
        """Test archive() transition (COMPLETED → ARCHIVED)"""
        campaign = self._create_campaign_completed()
        campaign.archive(user=self.user)
        campaign.save()
        
        # Use get() to retrieve latest status after FSM transition
        campaign = Campaign.objects.get(id=campaign.id)
        self.assertEqual(campaign.status, Campaign.Status.ARCHIVED)

    def test_restore_transition(self):
        """Test restore() transition (ARCHIVED → COMPLETED)"""
        campaign = self._create_campaign_archived()
        campaign.restore(user=self.user)
        campaign.save()
        
        # Use get() to retrieve latest status after FSM transition
        campaign = Campaign.objects.get(id=campaign.id)
        self.assertEqual(campaign.status, Campaign.Status.COMPLETED)

    def test_invalid_fsm_transitions(self):
        """Test invalid FSM transitions raise errors"""
        campaign = self._create_campaign()
        # Cannot go directly from PLANNING to SCALING
        with self.assertRaises(Exception):
            campaign.start_scaling(user=self.user)
        
        # Cannot go directly from PLANNING to OPTIMIZING
        with self.assertRaises(Exception):
            campaign.start_optimizing(user=self.user)

    # === Status History Tracking ===

    def test_status_transitions_create_history(self):
        """Test status transitions create CampaignStatusHistory records"""
        campaign = self._create_campaign()
        initial_count = CampaignStatusHistory.objects.filter(campaign=campaign).count()
        
        campaign.start_testing(user=self.user)
        campaign.save()
        
        history_count = CampaignStatusHistory.objects.filter(campaign=campaign).count()
        self.assertEqual(history_count, initial_count + 1)
        
        history = CampaignStatusHistory.objects.filter(campaign=campaign).latest('created_at')
        self.assertEqual(history.from_status, Campaign.Status.PLANNING)
        self.assertEqual(history.to_status, Campaign.Status.TESTING)
        self.assertEqual(history.changed_by, self.user)

    def test_status_history_includes_user_and_note(self):
        """Test status history includes user and note"""
        campaign = self._create_campaign()
        campaign.status_note = "Starting testing phase"
        campaign.start_testing(user=self.user)
        campaign.save()
        
        history = CampaignStatusHistory.objects.filter(campaign=campaign).latest('created_at')
        self.assertEqual(history.changed_by, self.user)
        self.assertEqual(history.note, "Starting testing phase")

    # === Properties ===

    @freeze_time("2024-01-20 10:00:00")
    def test_days_running_campaign_started(self):
        """Test days_running property - campaign started"""
        campaign = self._create_campaign(
            start_date=timezone.now().date() - timezone.timedelta(days=5)
        )
        self.assertEqual(campaign.days_running, 5)

    @freeze_time("2024-01-15 10:00:00")
    def test_days_running_campaign_not_started(self):
        """Test days_running property - campaign not started (returns None)"""
        campaign = self._create_campaign(
            start_date=timezone.now().date() + timezone.timedelta(days=5)
        )
        self.assertIsNone(campaign.days_running)

    def test_is_editable_archived_campaign(self):
        """Test is_editable property - archived campaigns return False"""
        campaign = self._create_campaign_archived()
        self.assertFalse(campaign.is_editable)

    def test_is_editable_non_archived_campaign(self):
        """Test is_editable property - non-archived campaigns return True"""
        campaign = self._create_campaign()
        self.assertTrue(campaign.is_editable)

    # === Relationships ===

    def test_campaign_foreign_key_relationships(self):
        """Test campaign foreign key relationships"""
        campaign = self._create_campaign()
        self.assertEqual(campaign.project, self.project)
        self.assertEqual(campaign.owner, self.user)
        self.assertEqual(campaign.creator, self.user)
        self.assertEqual(campaign.project_id, self.project.id)
        self.assertEqual(campaign.owner_id, self.user.id)

    def test_campaign_cascade_delete_behavior(self):
        """Test cascade delete behavior"""
        campaign = self._create_campaign()
        project_id = campaign.project_id
        campaign.delete()
        
        # Campaign should be deleted
        self.assertFalse(Campaign.objects.filter(id=campaign.id).exists())


# ============================================================================
# CampaignStatusHistory Model Tests
# ============================================================================

class CampaignStatusHistoryTestCase(TestCase):
    """Test CampaignStatusHistory model"""
    
    def setUp(self):
        """Set up test data"""
        self.organization = Organization.objects.create(
            name="Test Organization",
            email_domain="test.com"
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@test.com',
            password='testpass123',
            organization=self.organization
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            role='member',
            is_active=True
        )
        self.campaign = Campaign.objects.create(
            name="Test Campaign",
            objective=Campaign.Objective.CONVERSION,
            platforms=[Campaign.Platform.META],
            start_date=timezone.now().date(),
            project=self.project,
            owner=self.user,
            creator=self.user
        )

    def test_status_history_creation(self):
        """Test status history creation"""
        history = CampaignStatusHistory.objects.create(
            campaign=self.campaign,
            from_status=Campaign.Status.PLANNING,
            to_status=Campaign.Status.TESTING,
            changed_by=self.user,
            note="Test note"
        )
        self.assertIsNotNone(history.id)
        self.assertEqual(history.campaign, self.campaign)
        self.assertEqual(history.from_status, Campaign.Status.PLANNING)
        self.assertEqual(history.to_status, Campaign.Status.TESTING)
        self.assertEqual(history.changed_by, self.user)
        self.assertEqual(history.note, "Test note")

    def test_status_history_string_representation(self):
        """Test status history string representation"""
        history = CampaignStatusHistory.objects.create(
            campaign=self.campaign,
            from_status=Campaign.Status.PLANNING,
            to_status=Campaign.Status.TESTING,
            changed_by=self.user
        )
        expected = f"{self.campaign.name}: {history.get_from_status_display()} → {history.get_to_status_display()}"
        self.assertEqual(str(history), expected)

    def test_status_history_cascade_delete(self):
        """Test cascade delete when campaign is deleted"""
        history = CampaignStatusHistory.objects.create(
            campaign=self.campaign,
            from_status=Campaign.Status.PLANNING,
            to_status=Campaign.Status.TESTING,
            changed_by=self.user
        )
        history_id = history.id
        
        self.campaign.delete()
        
        self.assertFalse(CampaignStatusHistory.objects.filter(id=history_id).exists())

    def test_status_history_ordering(self):
        """Test ordering by -created_at"""
        history1 = CampaignStatusHistory.objects.create(
            campaign=self.campaign,
            from_status=Campaign.Status.PLANNING,
            to_status=Campaign.Status.TESTING,
            changed_by=self.user
        )
        
        history2 = CampaignStatusHistory.objects.create(
            campaign=self.campaign,
            from_status=Campaign.Status.TESTING,
            to_status=Campaign.Status.SCALING,
            changed_by=self.user
        )
        
        histories = list(CampaignStatusHistory.objects.filter(campaign=self.campaign))
        self.assertEqual(histories[0], history2)  # Most recent first
        self.assertEqual(histories[1], history1)


# ============================================================================
# PerformanceCheckIn Model Tests
# ============================================================================

class PerformanceCheckInTestCase(TestCase):
    """Test PerformanceCheckIn model"""
    
    def setUp(self):
        """Set up test data"""
        self.organization = Organization.objects.create(
            name="Test Organization",
            email_domain="test.com"
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@test.com',
            password='testpass123',
            organization=self.organization
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            role='member',
            is_active=True
        )
        self.campaign = Campaign.objects.create(
            name="Test Campaign",
            objective=Campaign.Objective.CONVERSION,
            platforms=[Campaign.Platform.META],
            start_date=timezone.now().date(),
            project=self.project,
            owner=self.user,
            creator=self.user
        )
        self.campaign.start_testing(user=self.user)
        self.campaign.save()

    def test_checkin_creation_with_all_fields(self):
        """Test check-in creation with all fields"""
        checkin = PerformanceCheckIn.objects.create(
            campaign=self.campaign,
            sentiment=PerformanceCheckIn.Sentiment.POSITIVE,
            note="Campaign is performing well",
            checked_by=self.user
        )
        self.assertIsNotNone(checkin.id)
        self.assertEqual(checkin.campaign, self.campaign)
        self.assertEqual(checkin.sentiment, PerformanceCheckIn.Sentiment.POSITIVE)
        self.assertEqual(checkin.note, "Campaign is performing well")
        self.assertEqual(checkin.checked_by, self.user)

    def test_checkin_creation_with_optional_note(self):
        """Test check-in creation with optional note"""
        checkin = PerformanceCheckIn.objects.create(
            campaign=self.campaign,
            sentiment=PerformanceCheckIn.Sentiment.NEUTRAL,
            checked_by=self.user
        )
        self.assertEqual(checkin.sentiment, PerformanceCheckIn.Sentiment.NEUTRAL)
        self.assertTrue(checkin.note is None or checkin.note == "")

    def test_sentiment_choices_validation(self):
        """Test sentiment choices validation"""
        valid_sentiments = [
            PerformanceCheckIn.Sentiment.POSITIVE,
            PerformanceCheckIn.Sentiment.NEUTRAL,
            PerformanceCheckIn.Sentiment.NEGATIVE
        ]
        for sentiment in valid_sentiments:
            checkin = PerformanceCheckIn.objects.create(
                campaign=self.campaign,
                sentiment=sentiment,
                checked_by=self.user
            )
            self.assertEqual(checkin.sentiment, sentiment)

    def test_checkin_string_representation(self):
        """Test string representation"""
        checkin = PerformanceCheckIn.objects.create(
            campaign=self.campaign,
            sentiment=PerformanceCheckIn.Sentiment.POSITIVE,
            checked_by=self.user
        )
        expected = f"{self.campaign.name} - {checkin.get_sentiment_display()} ({checkin.created_at.date()})"
        self.assertEqual(str(checkin), expected)

    def test_checkin_cascade_delete(self):
        """Test cascade delete when campaign is deleted"""
        checkin = PerformanceCheckIn.objects.create(
            campaign=self.campaign,
            sentiment=PerformanceCheckIn.Sentiment.POSITIVE,
            checked_by=self.user
        )
        checkin_id = checkin.id
        
        self.campaign.delete()
        
        self.assertFalse(PerformanceCheckIn.objects.filter(id=checkin_id).exists())

    def test_checkin_ordering(self):
        """Test ordering by -created_at"""
        checkin1 = PerformanceCheckIn.objects.create(
            campaign=self.campaign,
            sentiment=PerformanceCheckIn.Sentiment.POSITIVE,
            checked_by=self.user
        )
        
        checkin2 = PerformanceCheckIn.objects.create(
            campaign=self.campaign,
            sentiment=PerformanceCheckIn.Sentiment.NEGATIVE,
            checked_by=self.user
        )
        
        checkins = list(PerformanceCheckIn.objects.filter(campaign=self.campaign))
        self.assertEqual(checkins[0], checkin2)  # Most recent first
        self.assertEqual(checkins[1], checkin1)


# ============================================================================
# PerformanceSnapshot Model Tests
# ============================================================================

class PerformanceSnapshotTestCase(TestCase):
    """Test PerformanceSnapshot model"""
    
    def setUp(self):
        """Set up test data"""
        self.organization = Organization.objects.create(
            name="Test Organization",
            email_domain="test.com"
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@test.com',
            password='testpass123',
            organization=self.organization
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            role='member',
            is_active=True
        )
        self.campaign = Campaign.objects.create(
            name="Test Campaign",
            objective=Campaign.Objective.CONVERSION,
            platforms=[Campaign.Platform.META],
            start_date=timezone.now().date(),
            project=self.project,
            owner=self.user,
            creator=self.user
        )
        self.campaign.start_testing(user=self.user)
        self.campaign.save()

    def test_snapshot_creation_with_mandatory_fields(self):
        """Test snapshot creation with mandatory fields (spend, metric_type, metric_value)"""
        snapshot = PerformanceSnapshot.objects.create(
            campaign=self.campaign,
            spend=Decimal('1000.00'),
            metric_type=PerformanceSnapshot.MetricType.ROAS,
            metric_value=Decimal('3.50'),
            snapshot_by=self.user
        )
        self.assertIsNotNone(snapshot.id)
        self.assertEqual(snapshot.spend, Decimal('1000.00'))
        self.assertEqual(snapshot.metric_type, PerformanceSnapshot.MetricType.ROAS)
        self.assertEqual(snapshot.metric_value, Decimal('3.50'))

    def test_snapshot_creation_with_optional_fields(self):
        """Test snapshot creation with optional fields"""
        snapshot = PerformanceSnapshot.objects.create(
            campaign=self.campaign,
            milestone_type=PerformanceSnapshot.MilestoneType.LAUNCH,
            spend=Decimal('2000.00'),
            metric_type=PerformanceSnapshot.MetricType.CPA,
            metric_value=Decimal('25.50'),
            percentage_change=Decimal('15.25'),
            notes="Performance is improving",
            additional_metrics={'clicks': 1000, 'impressions': 5000},
            snapshot_by=self.user
        )
        self.assertEqual(snapshot.milestone_type, PerformanceSnapshot.MilestoneType.LAUNCH)
        self.assertEqual(snapshot.percentage_change, Decimal('15.25'))
        self.assertEqual(snapshot.notes, "Performance is improving")
        self.assertEqual(snapshot.additional_metrics, {'clicks': 1000, 'impressions': 5000})

    def test_milestone_type_choices_validation(self):
        """Test milestone_type choices validation"""
        valid_types = [
            PerformanceSnapshot.MilestoneType.LAUNCH,
            PerformanceSnapshot.MilestoneType.MID_TEST,
            PerformanceSnapshot.MilestoneType.TEST_COMPLETE,
            PerformanceSnapshot.MilestoneType.CUSTOM
        ]
        for milestone_type in valid_types:
            snapshot = PerformanceSnapshot.objects.create(
                campaign=self.campaign,
                milestone_type=milestone_type,
                spend=Decimal('1000.00'),
                metric_type=PerformanceSnapshot.MetricType.ROAS,
                metric_value=Decimal('3.50'),
                snapshot_by=self.user
            )
            self.assertEqual(snapshot.milestone_type, milestone_type)

    def test_metric_type_choices_validation(self):
        """Test metric_type choices validation"""
        valid_types = [
            PerformanceSnapshot.MetricType.ROAS,
            PerformanceSnapshot.MetricType.CPA,
            PerformanceSnapshot.MetricType.CTR,
            PerformanceSnapshot.MetricType.CPM
        ]
        for metric_type in valid_types:
            snapshot = PerformanceSnapshot.objects.create(
                campaign=self.campaign,
                spend=Decimal('1000.00'),
                metric_type=metric_type,
                metric_value=Decimal('3.50'),
                snapshot_by=self.user
            )
            self.assertEqual(snapshot.metric_type, metric_type)

    def test_snapshot_string_representation(self):
        """Test string representation"""
        snapshot = PerformanceSnapshot.objects.create(
            campaign=self.campaign,
            spend=Decimal('1000.00'),
            metric_type=PerformanceSnapshot.MetricType.ROAS,
            metric_value=Decimal('3.50'),
            snapshot_by=self.user
        )
        expected = f"{self.campaign.name} - {snapshot.get_metric_type_display()}: {snapshot.metric_value} ({snapshot.created_at.date()})"
        self.assertEqual(str(snapshot), expected)

    def test_snapshot_cascade_delete(self):
        """Test cascade delete when campaign is deleted"""
        snapshot = PerformanceSnapshot.objects.create(
            campaign=self.campaign,
            spend=Decimal('1000.00'),
            metric_type=PerformanceSnapshot.MetricType.ROAS,
            metric_value=Decimal('3.50'),
            snapshot_by=self.user
        )
        snapshot_id = snapshot.id
        
        self.campaign.delete()
        
        self.assertFalse(PerformanceSnapshot.objects.filter(id=snapshot_id).exists())

    def test_snapshot_ordering(self):
        """Test ordering by -created_at"""
        snapshot1 = PerformanceSnapshot.objects.create(
            campaign=self.campaign,
            spend=Decimal('1000.00'),
            metric_type=PerformanceSnapshot.MetricType.ROAS,
            metric_value=Decimal('3.50'),
            snapshot_by=self.user
        )
        
        snapshot2 = PerformanceSnapshot.objects.create(
            campaign=self.campaign,
            spend=Decimal('2000.00'),
            metric_type=PerformanceSnapshot.MetricType.CPA,
            metric_value=Decimal('25.00'),
            snapshot_by=self.user
        )
        
        snapshots = list(PerformanceSnapshot.objects.filter(campaign=self.campaign))
        self.assertEqual(snapshots[0], snapshot2)  # Most recent first
        self.assertEqual(snapshots[1], snapshot1)


# ============================================================================
# CampaignAttachment Model Tests
# ============================================================================

class CampaignAttachmentTestCase(TestCase):
    """Test CampaignAttachment model"""
    
    def setUp(self):
        """Set up test data"""
        self.organization = Organization.objects.create(
            name="Test Organization",
            email_domain="test.com"
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@test.com',
            password='testpass123',
            organization=self.organization
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            role='member',
            is_active=True
        )
        self.campaign = Campaign.objects.create(
            name="Test Campaign",
            objective=Campaign.Objective.CONVERSION,
            platforms=[Campaign.Platform.META],
            start_date=timezone.now().date(),
            project=self.project,
            owner=self.user,
            creator=self.user
        )

    def test_attachment_creation_with_url(self):
        """Test attachment creation with URL"""
        attachment = CampaignAttachment.objects.create(
            campaign=self.campaign,
            url="https://example.com/document.pdf",
            asset_type=CampaignAttachment.AssetType.DOCUMENT,
            uploaded_by=self.user
        )
        self.assertEqual(attachment.url, "https://example.com/document.pdf")
        self.assertEqual(attachment.asset_type, CampaignAttachment.AssetType.DOCUMENT)

    def test_attachment_creation_fails_without_file_or_url(self):
        """Test attachment creation fails when both file and URL are missing"""
        attachment = CampaignAttachment(
            campaign=self.campaign,
            asset_type=CampaignAttachment.AssetType.IMAGE,
            uploaded_by=self.user
        )
        with self.assertRaises(ValidationError) as context:
            attachment.clean()
        error_str = str(context.exception)
        self.assertTrue('file' in error_str or 'url' in error_str)

    def test_attachment_clean_method_validation(self):
        """Test clean() method validation"""
        attachment = CampaignAttachment(
            campaign=self.campaign,
            asset_type=CampaignAttachment.AssetType.LINK,
            uploaded_by=self.user
        )
        # Should fail without file or URL
        with self.assertRaises(ValidationError):
            attachment.clean()
        
        # Should pass with URL
        attachment.url = "https://example.com/link"
        attachment.clean()  # Should not raise

    def test_asset_type_choices_validation(self):
        """Test asset_type choices validation"""
        valid_types = [
            CampaignAttachment.AssetType.IMAGE,
            CampaignAttachment.AssetType.DOCUMENT,
            CampaignAttachment.AssetType.VIDEO,
            CampaignAttachment.AssetType.LINK
        ]
        for asset_type in valid_types:
            attachment = CampaignAttachment.objects.create(
                campaign=self.campaign,
                url=f"https://example.com/{asset_type.lower()}.ext",
                asset_type=asset_type,
                uploaded_by=self.user
            )
            self.assertEqual(attachment.asset_type, asset_type)

    def test_attachment_string_representation(self):
        """Test string representation"""
        attachment = CampaignAttachment.objects.create(
            campaign=self.campaign,
            url="https://example.com/test.jpg",
            asset_type=CampaignAttachment.AssetType.IMAGE,
            uploaded_by=self.user
        )
        expected = f"{self.campaign.name} - {attachment.get_asset_type_display()}: https://example.com/test.jpg"
        self.assertEqual(str(attachment), expected)

    def test_attachment_cascade_delete(self):
        """Test cascade delete when campaign is deleted"""
        attachment = CampaignAttachment.objects.create(
            campaign=self.campaign,
            url="https://example.com/file.pdf",
            asset_type=CampaignAttachment.AssetType.DOCUMENT,
            uploaded_by=self.user
        )
        attachment_id = attachment.id
        
        self.campaign.delete()
        
        self.assertFalse(CampaignAttachment.objects.filter(id=attachment_id).exists())


# ============================================================================
# CampaignTemplate Model Tests
# ============================================================================

class CampaignTemplateTestCase(TestCase):
    """Test CampaignTemplate model"""
    
    def setUp(self):
        """Set up test data"""
        self.organization = Organization.objects.create(
            name="Test Organization",
            email_domain="test.com"
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@test.com',
            password='testpass123',
            organization=self.organization
        )

    def test_template_creation_with_all_fields(self):
        """Test template creation with all fields"""
        template = CampaignTemplate.objects.create(
            name="Complete Template",
            description="A complete template",
            creator=self.user,
            version_number=1,
            sharing_scope=CampaignTemplate.SharingScope.TEAM,
            project=self.project,
            objective=Campaign.Objective.CONVERSION,
            platforms=[Campaign.Platform.META, Campaign.Platform.GOOGLE_ADS],
            hypothesis_framework="Test framework",
            tag_suggestions=["tag1", "tag2"],
            task_checklist=["Task 1", "Task 2"],
            review_schedule_pattern={'frequency': 'weekly'},
            recommended_variation_count=5
        )
        self.assertIsNotNone(template.id)
        self.assertEqual(template.name, "Complete Template")
        self.assertEqual(template.sharing_scope, CampaignTemplate.SharingScope.TEAM)
        self.assertEqual(template.usage_count, 0)

    def test_template_creation_with_different_sharing_scopes(self):
        """Test template creation with different sharing scopes"""
        scopes = [
            CampaignTemplate.SharingScope.PERSONAL,
            CampaignTemplate.SharingScope.TEAM,
            CampaignTemplate.SharingScope.ORGANIZATION
        ]
        for scope in scopes:
            template = CampaignTemplate.objects.create(
                name=f"Template {scope}",
                creator=self.user,
                sharing_scope=scope,
                project=self.project if scope != CampaignTemplate.SharingScope.PERSONAL else None
            )
            self.assertEqual(template.sharing_scope, scope)

    def test_increment_usage_method(self):
        """Test increment_usage() method"""
        template = CampaignTemplate.objects.create(
            name="Test Template",
            creator=self.user,
            sharing_scope=CampaignTemplate.SharingScope.PERSONAL
        )
        initial_count = template.usage_count
        template.increment_usage()
        
        template.refresh_from_db()
        self.assertEqual(template.usage_count, initial_count + 1)

    def test_archive_template_method(self):
        """Test archive_template() method"""
        template = CampaignTemplate.objects.create(
            name="Test Template",
            creator=self.user,
            sharing_scope=CampaignTemplate.SharingScope.PERSONAL
        )
        self.assertFalse(template.is_archived)
        template.archive_template()
        
        template.refresh_from_db()
        self.assertTrue(template.is_archived)

    def test_restore_template_method(self):
        """Test restore_template() method"""
        template = CampaignTemplate.objects.create(
            name="Test Template",
            creator=self.user,
            sharing_scope=CampaignTemplate.SharingScope.PERSONAL
        )
        template.archive_template()
        template.restore_template()
        
        template.refresh_from_db()
        self.assertFalse(template.is_archived)

    def test_template_string_representation(self):
        """Test string representation"""
        template = CampaignTemplate.objects.create(
            name="Test Template",
            creator=self.user,
            sharing_scope=CampaignTemplate.SharingScope.PERSONAL
        )
        expected = f"{template.name} (v{template.version_number})"
        self.assertEqual(str(template), expected)
        
        template.archive_template()
        expected_archived = f"{template.name} (v{template.version_number}) [ARCHIVED]"
        self.assertEqual(str(template), expected_archived)


# ============================================================================
# Link Models Tests
# ============================================================================

class CampaignTaskLinkTestCase(TestCase):
    """Test CampaignTaskLink model"""
    
    def setUp(self):
        """Set up test data"""
        self.organization = Organization.objects.create(
            name="Test Organization",
            email_domain="test.com"
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@test.com',
            password='testpass123',
            organization=self.organization
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            role='member',
            is_active=True
        )
        self.campaign = Campaign.objects.create(
            name="Test Campaign",
            objective=Campaign.Objective.CONVERSION,
            platforms=[Campaign.Platform.META],
            start_date=timezone.now().date(),
            project=self.project,
            owner=self.user,
            creator=self.user
        )
        self.task = Task.objects.create(
            summary="Test Task",
            type="budget",
            project=self.project,
            owner=self.user
        )

    def test_link_creation(self):
        """Test link creation"""
        link = CampaignTaskLink.objects.create(
            campaign=self.campaign,
            task=self.task,
            link_type='auto_generated'
        )
        self.assertIsNotNone(link.id)
        self.assertEqual(link.campaign, self.campaign)
        self.assertEqual(link.task, self.task)
        self.assertEqual(link.link_type, 'auto_generated')

    def test_unique_together_constraint(self):
        """Test unique_together constraints"""
        CampaignTaskLink.objects.create(
            campaign=self.campaign,
            task=self.task,
            link_type='auto_generated'
        )
        
        # Creating duplicate should fail
        with self.assertRaises(Exception):  # IntegrityError
            CampaignTaskLink.objects.create(
                campaign=self.campaign,
                task=self.task,
                link_type='manual'
            )

    def test_link_cascade_delete_campaign(self):
        """Test cascade delete when campaign is deleted"""
        link = CampaignTaskLink.objects.create(
            campaign=self.campaign,
            task=self.task
        )
        link_id = link.id
        
        self.campaign.delete()
        
        self.assertFalse(CampaignTaskLink.objects.filter(id=link_id).exists())

    def test_link_string_representation(self):
        """Test string representation"""
        link = CampaignTaskLink.objects.create(
            campaign=self.campaign,
            task=self.task
        )
        expected = f"{self.campaign.name} -> Task #{self.task.id}"
        self.assertEqual(str(link), expected)


class CampaignDecisionLinkTestCase(TestCase):
    """Test CampaignDecisionLink model"""
    
    def setUp(self):
        """Set up test data"""
        self.organization = Organization.objects.create(
            name="Test Organization",
            email_domain="test.com"
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@test.com',
            password='testpass123',
            organization=self.organization
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            role='member',
            is_active=True
        )
        self.campaign = Campaign.objects.create(
            name="Test Campaign",
            objective=Campaign.Objective.CONVERSION,
            platforms=[Campaign.Platform.META],
            start_date=timezone.now().date(),
            project=self.project,
            owner=self.user,
            creator=self.user
        )

    def test_link_creation(self):
        """Test link creation"""
        from decision.models import Decision
        
        decision = Decision.objects.create(
            title="Test Decision",
            author=self.user
        )
        
        link = CampaignDecisionLink.objects.create(
            campaign=self.campaign,
            decision=decision,
            trigger_type='test_complete'
        )
        self.assertIsNotNone(link.id)
        self.assertEqual(link.campaign, self.campaign)
        self.assertEqual(link.decision, decision)
        self.assertEqual(link.trigger_type, 'test_complete')

    def test_unique_together_constraint(self):
        """Test unique_together constraints"""
        from decision.models import Decision
        
        decision = Decision.objects.create(
            title="Test Decision",
            author=self.user
        )
        
        CampaignDecisionLink.objects.create(
            campaign=self.campaign,
            decision=decision
        )
        
        # Creating duplicate should fail
        with self.assertRaises(Exception):  # IntegrityError
            CampaignDecisionLink.objects.create(
                campaign=self.campaign,
                decision=decision
            )

    def test_link_string_representation(self):
        """Test string representation"""
        from decision.models import Decision
        
        decision = Decision.objects.create(
            title="Test Decision",
            author=self.user
        )
        
        link = CampaignDecisionLink.objects.create(
            campaign=self.campaign,
            decision=decision
        )
        expected = f"{self.campaign.name} -> Decision #{decision.id}"
        self.assertEqual(str(link), expected)


class CampaignCalendarLinkTestCase(TestCase):
    """Test CampaignCalendarLink model"""
    
    def setUp(self):
        """Set up test data"""
        self.organization = Organization.objects.create(
            name="Test Organization",
            email_domain="test.com"
        )
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        self.user = User.objects.create_user(
            username='testuser',
            email='testuser@test.com',
            password='testpass123',
            organization=self.organization
        )
        ProjectMember.objects.create(
            user=self.user,
            project=self.project,
            role='member',
            is_active=True
        )
        self.campaign = Campaign.objects.create(
            name="Test Campaign",
            objective=Campaign.Objective.CONVERSION,
            platforms=[Campaign.Platform.META],
            start_date=timezone.now().date(),
            project=self.project,
            owner=self.user,
            creator=self.user
        )
        # Create Calendar for Event creation
        from calendars.models import Calendar
        self.calendar = Calendar.objects.create(
            organization=self.organization,
            owner=self.user,
            name="Test Calendar",
            timezone="UTC"
        )

    def test_link_creation(self):
        """Test link creation"""
        from calendars.models import Event
        
        start_datetime = timezone.now()
        end_datetime = start_datetime + timezone.timedelta(hours=1)
        event = Event.objects.create(
            title="Test Event",
            organization=self.campaign.project.organization,
            calendar=self.calendar,
            created_by=self.user,
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            timezone="UTC"
        )
        
        link = CampaignCalendarLink.objects.create(
            campaign=self.campaign,
            event=event,
            event_type='milestone'
        )
        self.assertIsNotNone(link.id)
        self.assertEqual(link.campaign, self.campaign)
        self.assertEqual(link.event, event)
        self.assertEqual(link.event_type, 'milestone')

    def test_unique_together_constraint(self):
        """Test unique_together constraints"""
        from calendars.models import Event
        
        start_datetime = timezone.now()
        end_datetime = start_datetime + timezone.timedelta(hours=1)
        event = Event.objects.create(
            title="Test Event",
            organization=self.campaign.project.organization,
            calendar=self.calendar,
            created_by=self.user,
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            timezone="UTC"
        )
        
        CampaignCalendarLink.objects.create(
            campaign=self.campaign,
            event=event
        )
        
        # Creating duplicate should fail
        with self.assertRaises(Exception):  # IntegrityError
            CampaignCalendarLink.objects.create(
                campaign=self.campaign,
                event=event
            )

    def test_link_string_representation(self):
        """Test string representation"""
        from calendars.models import Event
        
        start_datetime = timezone.now()
        end_datetime = start_datetime + timezone.timedelta(hours=1)
        event = Event.objects.create(
            title="Test Event",
            organization=self.campaign.project.organization,
            calendar=self.calendar,
            created_by=self.user,
            start_datetime=start_datetime,
            end_datetime=end_datetime,
            timezone="UTC"
        )
        
        link = CampaignCalendarLink.objects.create(
            campaign=self.campaign,
            event=event
        )
        expected = f"{self.campaign.name} -> Event: {event.title}"
        self.assertEqual(str(link), expected)
