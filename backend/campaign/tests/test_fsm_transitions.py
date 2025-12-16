"""
Tests for CampaignTask FSM transitions
Tests all FSM transitions: happy paths and broken paths
Follows the style of asset/tests/test_models/test_asset_model.py and budget_approval/tests/test_unit_fsm.py
"""
import pytest
from django_fsm import TransitionNotAllowed
from django.utils import timezone
from django.test import override_settings
from campaign.models import CampaignTask, CampaignTaskStatus, Channel
from campaign.services import CampaignService


@pytest.mark.django_db
class TestCampaignTaskFSMTransitions:
    """Test CampaignTask FSM transitions - Happy paths"""
    
    def test_scheduled_to_launched_transition(self, campaign_task_scheduled):
        """Test SCHEDULED -> LAUNCHED transition"""
        assert campaign_task_scheduled.status == CampaignTaskStatus.SCHEDULED
        
        campaign_task_scheduled.launch()
        campaign_task_scheduled.save()
        
        assert campaign_task_scheduled.status == CampaignTaskStatus.LAUNCHED
    
    def test_launched_to_paused_transition(self, campaign_task_launched):
        """Test LAUNCHED -> PAUSED transition"""
        assert campaign_task_launched.status == CampaignTaskStatus.LAUNCHED
        
        reason = 'Testing pause functionality'
        campaign_task_launched.pause(reason=reason)
        campaign_task_launched.save()
        
        assert campaign_task_launched.status == CampaignTaskStatus.PAUSED
        assert campaign_task_launched.paused_reason == reason
    
    def test_paused_to_completed_transition(self, campaign_task_paused):
        """Test PAUSED -> COMPLETED transition"""
        assert campaign_task_paused.status == CampaignTaskStatus.PAUSED
        
        campaign_task_paused.complete()
        campaign_task_paused.save()
        
        assert campaign_task_paused.status == CampaignTaskStatus.COMPLETED
        assert campaign_task_paused.end_date is not None
    
    def test_paused_to_failed_transition(self, campaign_task_paused):
        """Test PAUSED -> FAILED transition"""
        assert campaign_task_paused.status == CampaignTaskStatus.PAUSED
        
        campaign_task_paused.fail()
        campaign_task_paused.save()
        
        assert campaign_task_paused.status == CampaignTaskStatus.FAILED
    
    def test_completed_to_archived_transition(self, campaign_task_paused, user):
        """Test COMPLETED -> ARCHIVED transition"""
        campaign_task_paused.complete()
        campaign_task_paused.save()
        assert campaign_task_paused.status == CampaignTaskStatus.COMPLETED
        
        campaign_task_paused.archive()
        campaign_task_paused.save()
        
        assert campaign_task_paused.status == CampaignTaskStatus.ARCHIVED
    
    def test_failed_to_archived_transition(self, campaign_task_paused):
        """Test FAILED -> ARCHIVED transition"""
        campaign_task_paused.fail()
        campaign_task_paused.save()
        assert campaign_task_paused.status == CampaignTaskStatus.FAILED
        
        campaign_task_paused.archive()
        campaign_task_paused.save()
        
        assert campaign_task_paused.status == CampaignTaskStatus.ARCHIVED
    
    def test_full_happy_path(self, campaign_task_scheduled):
        """Test complete happy path: SCHEDULED -> LAUNCHED -> PAUSED -> COMPLETED -> ARCHIVED"""
        # SCHEDULED -> LAUNCHED
        campaign_task_scheduled.launch()
        campaign_task_scheduled.save()
        assert campaign_task_scheduled.status == CampaignTaskStatus.LAUNCHED
        
        # LAUNCHED -> PAUSED
        campaign_task_scheduled.pause(reason='ROI drop')
        campaign_task_scheduled.save()
        assert campaign_task_scheduled.status == CampaignTaskStatus.PAUSED
        
        # PAUSED -> COMPLETED
        campaign_task_scheduled.complete()
        campaign_task_scheduled.save()
        assert campaign_task_scheduled.status == CampaignTaskStatus.COMPLETED
        
        # COMPLETED -> ARCHIVED
        campaign_task_scheduled.archive()
        campaign_task_scheduled.save()
        assert campaign_task_scheduled.status == CampaignTaskStatus.ARCHIVED


@pytest.mark.django_db
class TestCampaignTaskFSMBrokenPaths:
    """Test CampaignTask FSM transitions - Broken paths (invalid transitions)"""
    
    def test_cannot_launch_from_paused(self, campaign_task_paused):
        """Test invalid transition: Cannot launch from PAUSED"""
        assert campaign_task_paused.status == CampaignTaskStatus.PAUSED
        
        with pytest.raises(TransitionNotAllowed):
            campaign_task_paused.launch()
    
    def test_cannot_launch_from_completed(self, campaign_task_paused):
        """Test invalid transition: Cannot launch from COMPLETED"""
        campaign_task_paused.complete()
        campaign_task_paused.save()
        assert campaign_task_paused.status == CampaignTaskStatus.COMPLETED
        
        with pytest.raises(TransitionNotAllowed):
            campaign_task_paused.launch()
    
    def test_cannot_pause_from_scheduled(self, campaign_task_scheduled):
        """Test invalid transition: Cannot pause from SCHEDULED"""
        assert campaign_task_scheduled.status == CampaignTaskStatus.SCHEDULED
        
        with pytest.raises(TransitionNotAllowed):
            campaign_task_scheduled.pause()
    
    def test_cannot_pause_from_completed(self, campaign_task_paused):
        """Test invalid transition: Cannot pause from COMPLETED"""
        campaign_task_paused.complete()
        campaign_task_paused.save()
        assert campaign_task_paused.status == CampaignTaskStatus.COMPLETED
        
        with pytest.raises(TransitionNotAllowed):
            campaign_task_paused.pause()
    
    def test_cannot_complete_from_scheduled(self, campaign_task_scheduled):
        """Test invalid transition: Cannot complete from SCHEDULED"""
        assert campaign_task_scheduled.status == CampaignTaskStatus.SCHEDULED
        
        with pytest.raises(TransitionNotAllowed):
            campaign_task_scheduled.complete()
    
    def test_cannot_complete_from_launched(self, campaign_task_launched):
        """Test invalid transition: Cannot complete from LAUNCHED (must pause first)"""
        assert campaign_task_launched.status == CampaignTaskStatus.LAUNCHED
        
        with pytest.raises(TransitionNotAllowed):
            campaign_task_launched.complete()
    
    def test_can_fail_from_scheduled(self, campaign_task_scheduled):
        """Test valid transition: Can fail from SCHEDULED (e.g., when launch fails)"""
        assert campaign_task_scheduled.status == CampaignTaskStatus.SCHEDULED
        
        # Now allowed: SCHEDULED -> FAILED (e.g., when launch fails)
        campaign_task_scheduled.fail()
        campaign_task_scheduled.save()
        
        assert campaign_task_scheduled.status == CampaignTaskStatus.FAILED
    
    def test_cannot_archive_from_scheduled(self, campaign_task_scheduled):
        """Test invalid transition: Cannot archive from SCHEDULED"""
        assert campaign_task_scheduled.status == CampaignTaskStatus.SCHEDULED
        
        with pytest.raises(TransitionNotAllowed):
            campaign_task_scheduled.archive()
    
    def test_cannot_archive_from_launched(self, campaign_task_launched):
        """Test invalid transition: Cannot archive from LAUNCHED"""
        assert campaign_task_launched.status == CampaignTaskStatus.LAUNCHED
        
        with pytest.raises(TransitionNotAllowed):
            campaign_task_launched.archive()
    
    def test_cannot_archive_from_paused(self, campaign_task_paused):
        """Test invalid transition: Cannot archive from PAUSED (must complete or fail first)"""
        assert campaign_task_paused.status == CampaignTaskStatus.PAUSED
        
        with pytest.raises(TransitionNotAllowed):
            campaign_task_paused.archive()


@pytest.mark.django_db
class TestCampaignTaskFSMWithService:
    """Test FSM transitions through service layer"""
    
    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
    def test_pause_through_service(self, campaign_task_launched, user):
        """Test pause transition through CampaignService"""
        assert campaign_task_launched.status == CampaignTaskStatus.LAUNCHED
        
        CampaignService.pause_campaign(
            campaign_task=campaign_task_launched,
            reason='Service layer pause test',
            actor_user=user
        )
        
        campaign_task_launched.refresh_from_db()
        assert campaign_task_launched.status == CampaignTaskStatus.PAUSED
        assert campaign_task_launched.paused_reason == 'Service layer pause test'
    
    def test_archive_through_service(self, campaign_task_paused, user):
        """Test archive transition through CampaignService"""
        campaign_task_paused.complete()
        campaign_task_paused.save()
        assert campaign_task_paused.status == CampaignTaskStatus.COMPLETED
        
        CampaignService.archive_campaign(
            campaign_task=campaign_task_paused,
            actor_user=user
        )
        
        campaign_task_paused.refresh_from_db()
        assert campaign_task_paused.status == CampaignTaskStatus.ARCHIVED

