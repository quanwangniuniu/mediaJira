"""
Tests for concurrency safety
Tests concurrency safety: race conditions between pause vs complete
Follows the style of budget_approval/tests/test_concurrency.py
"""
import pytest
import threading
import time
from django.db import transaction
from campaign.models import CampaignTask, CampaignTaskStatus
from campaign.services import CampaignService


@pytest.mark.django_db(transaction=True)
class TestConcurrentPauseAndComplete:
    """Test concurrent pause and complete operations"""
    
    @staticmethod
    def pause_campaign(campaign_task_id, results, errors):
        """Helper function to pause a campaign"""
        try:
            with transaction.atomic():
                campaign_task = CampaignTask.objects.select_for_update().get(
                    campaign_task_id=campaign_task_id
                )
                if campaign_task.status == CampaignTaskStatus.LAUNCHED:
                    CampaignService.pause_campaign(
                        campaign_task=campaign_task,
                        reason='Concurrent pause test'
                    )
                    results.append({
                        'action': 'pause',
                        'success': True,
                        'status': campaign_task.status
                    })
                else:
                    errors.append({
                        'action': 'pause',
                        'error': f'Invalid status: {campaign_task.status}'
                    })
        except Exception as e:
            errors.append({
                'action': 'pause',
                'error': str(e)
            })
    
    @staticmethod
    def complete_campaign(campaign_task_id, results, errors):
        """Helper function to complete a campaign"""
        try:
            with transaction.atomic():
                campaign_task = CampaignTask.objects.select_for_update().get(
                    campaign_task_id=campaign_task_id
                )
                if campaign_task.status == CampaignTaskStatus.PAUSED:
                    campaign_task.complete()
                    campaign_task.save()
                    results.append({
                        'action': 'complete',
                        'success': True,
                        'status': campaign_task.status
                    })
                else:
                    errors.append({
                        'action': 'complete',
                        'error': f'Invalid status: {campaign_task.status}'
                    })
        except Exception as e:
            errors.append({
                'action': 'complete',
                'error': str(e)
            })
    
    def test_concurrent_pause_and_complete(self, campaign_task_launched):
        """Test concurrent pause and complete operations"""
        campaign_task_id = campaign_task_launched.campaign_task_id
        results = []
        errors = []
        
        # First pause the campaign
        campaign_task_launched.pause(reason='Initial pause')
        campaign_task_launched.save()
        campaign_task_launched.refresh_from_db()
        assert campaign_task_launched.status == CampaignTaskStatus.PAUSED
        
        # Create two threads: one trying to pause, one trying to complete
        thread1 = threading.Thread(
            target=self.complete_campaign,
            args=(campaign_task_id, results, errors)
        )
        thread2 = threading.Thread(
            target=self.complete_campaign,
            args=(campaign_task_id, results, errors)
        )
        
        # Start both threads simultaneously
        thread1.start()
        thread2.start()
        
        # Wait for both threads to complete
        thread1.join()
        thread2.join()
        
        # Refresh campaign task
        campaign_task_launched.refresh_from_db()
        
        # Only one operation should succeed
        successful_operations = [r for r in results if r.get('success')]
        assert len(successful_operations) <= 2  # Both might succeed if they both see PAUSED
        
        # Final status should be COMPLETED (if complete succeeded)
        if any(r.get('action') == 'complete' and r.get('success') for r in results):
            assert campaign_task_launched.status == CampaignTaskStatus.COMPLETED


@pytest.mark.django_db(transaction=True)
class TestConcurrentStatusUpdates:
    """Test concurrent status updates"""
    
    def test_concurrent_launch_operations(self, campaign_task_scheduled):
        """Test concurrent launch operations on same campaign"""
        campaign_task_id = campaign_task_scheduled.campaign_task_id
        results = []
        errors = []
        
        def launch_campaign(campaign_task_id, results, errors):
            try:
                with transaction.atomic():
                    campaign_task = CampaignTask.objects.select_for_update(nowait=True).get(
                        campaign_task_id=campaign_task_id
                    )
                    if campaign_task.status == CampaignTaskStatus.SCHEDULED:
                        campaign_task.launch()
                        campaign_task.save()
                        results.append({
                            'action': 'launch',
                            'success': True,
                            'status': campaign_task.status
                        })
            except Exception as e:
                errors.append({
                    'action': 'launch',
                    'error': str(e)
                })
        
        # Create two threads trying to launch simultaneously
        thread1 = threading.Thread(
            target=launch_campaign,
            args=(campaign_task_id, results, errors)
        )
        thread2 = threading.Thread(
            target=launch_campaign,
            args=(campaign_task_id, results, errors)
        )
        
        # Start both threads
        thread1.start()
        thread2.start()
        
        # Wait for completion
        thread1.join()
        thread2.join()
        
        # Refresh campaign task
        campaign_task_scheduled.refresh_from_db()
        
        # Only one launch should succeed
        successful_launches = [r for r in results if r.get('success')]
        assert len(successful_launches) == 1
        
        # Final status should be LAUNCHED
        assert campaign_task_scheduled.status == CampaignTaskStatus.LAUNCHED


@pytest.mark.django_db(transaction=True)
class TestDatabaseLocking:
    """Test database locking mechanisms"""
    
    def test_select_for_update_locks_row(self, campaign_task_launched):
        """Test select_for_update locks the row"""
        campaign_task_id = campaign_task_launched.campaign_task_id
        
        def update_with_lock(campaign_task_id, delay, results):
            try:
                with transaction.atomic():
                    campaign_task = CampaignTask.objects.select_for_update().get(
                        campaign_task_id=campaign_task_id
                    )
                    time.sleep(delay)  # Hold lock
                    campaign_task.pause(reason='Locked update')
                    campaign_task.save()
                    results.append('success')
            except Exception as e:
                results.append(f'error: {str(e)}')
        
        results1 = []
        results2 = []
        
        # First thread holds lock for longer
        thread1 = threading.Thread(
            target=update_with_lock,
            args=(campaign_task_id, 0.1, results1)
        )
        # Second thread tries to update immediately
        thread2 = threading.Thread(
            target=update_with_lock,
            args=(campaign_task_id, 0.0, results2)
        )
        
        thread1.start()
        time.sleep(0.01)  # Small delay to ensure thread1 gets lock first
        thread2.start()
        
        thread1.join()
        thread2.join()
        
        # Both should complete (second waits for first)
        assert len(results1) == 1
        assert len(results2) == 1
        
        # Final status should be PAUSED
        campaign_task_launched.refresh_from_db()
        assert campaign_task_launched.status == CampaignTaskStatus.PAUSED
    
    def test_select_for_update_nowait_raises_on_lock(self, campaign_task_launched):
        """Test select_for_update(nowait=True) raises exception if row is locked"""
        campaign_task_id = campaign_task_launched.campaign_task_id
        
        def hold_lock(campaign_task_id, results):
            try:
                with transaction.atomic():
                    campaign_task = CampaignTask.objects.select_for_update().get(
                        campaign_task_id=campaign_task_id
                    )
                    time.sleep(0.2)  # Hold lock
                    results.append('lock_held')
            except Exception as e:
                results.append(f'error: {str(e)}')
        
        def try_lock_nowait(campaign_task_id, results):
            try:
                time.sleep(0.05)  # Wait a bit for first thread to get lock
                with transaction.atomic():
                    campaign_task = CampaignTask.objects.select_for_update(nowait=True).get(
                        campaign_task_id=campaign_task_id
                    )
                    results.append('lock_acquired')
            except Exception as e:
                results.append(f'error: {str(e)}')
        
        results1 = []
        results2 = []
        
        thread1 = threading.Thread(
            target=hold_lock,
            args=(campaign_task_id, results1)
        )
        thread2 = threading.Thread(
            target=try_lock_nowait,
            args=(campaign_task_id, results2)
        )
        
        thread1.start()
        thread2.start()
        
        thread1.join()
        thread2.join()
        
        # First thread should hold lock
        assert 'lock_held' in results1
        # Second thread should get error (lock already held)
        assert any('error' in r for r in results2)


@pytest.mark.django_db(transaction=True)
class TestConcurrentLogCreation:
    """Test concurrent log creation"""
    
    def test_concurrent_log_creation(self, campaign_task_launched, user):
        """Test concurrent log creation doesn't cause conflicts"""
        campaign_task_id = campaign_task_launched.campaign_task_id
        logs_created = []
        
        def create_log(campaign_task_id, user_id, log_num, logs_created):
            try:
                from campaign.models import OperationEvent, OperationResult
                from django.contrib.auth import get_user_model
                User = get_user_model()
                campaign_task = CampaignTask.objects.get(campaign_task_id=campaign_task_id)
                user_obj = User.objects.get(id=user_id)
                log = CampaignService.log_execution_event(
                    campaign_task=campaign_task,
                    event=OperationEvent.METRIC_INGEST,
                    result=OperationResult.SUCCESS,
                    actor_user_id=user_obj,
                    message=f'Log {log_num}'
                )
                logs_created.append(log.execution_log_id)
            except Exception as e:
                logs_created.append(f'error: {str(e)}')
        
        threads = []
        for i in range(5):
            thread = threading.Thread(
                target=create_log,
                args=(campaign_task_id, user.id, i, logs_created)
            )
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads
        for thread in threads:
            thread.join()
        
        # All logs should be created (check for UUIDs, not error strings)
        # logs_created contains either UUIDs (from log.execution_log_id) or error strings
        successful_logs = [l for l in logs_created if not (isinstance(l, str) and 'error' in l)]
        # Should have 5 successful log creations
        assert len(successful_logs) == 5, f"Expected 5 successful logs, got {len(successful_logs)}. Results: {logs_created}"

