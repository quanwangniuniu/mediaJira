"""
Tests for edge cases and error handling
Tests edge cases and error handling scenarios
Uses faker to generate test data
"""
import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import timedelta
from faker import Faker
from campaign.models import CampaignTask, Channel, CampaignTaskStatus
from campaign.services import CampaignService
from campaign.executors import get_executor

fake = Faker()


@pytest.mark.django_db
class TestEmptyConfigHandling:
    """Test empty configuration handling"""
    
    def test_create_campaign_with_empty_creative_assets(self, user):
        """Test creating campaign with empty creative_asset_ids"""
        task = CampaignTask.objects.create(
            title='Empty Assets Campaign',
            scheduled_date=timezone.now(),
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=[],  # Empty list
            audience_config={'type': 'google', 'common': {}},
            created_by=user
        )
        
        assert task.creative_asset_ids == []
        assert task.status == CampaignTaskStatus.SCHEDULED
    
    def test_create_campaign_with_empty_audience_config(self, user):
        """Test creating campaign with minimal audience_config"""
        task = CampaignTask.objects.create(
            title='Minimal Config Campaign',
            scheduled_date=timezone.now(),
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=['asset1'],
            audience_config={},  # Empty dict
            created_by=user
        )
        
        assert task.audience_config == {}
    
    def test_create_campaign_with_null_external_ids(self, user):
        """Test creating campaign with null external_ids_json"""
        task = CampaignTask.objects.create(
            title='Null External IDs Campaign',
            scheduled_date=timezone.now(),
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=['asset1'],
            audience_config={'type': 'google', 'common': {}},
            created_by=user,
            external_ids_json=None
        )
        
        assert task.external_ids_json is None


@pytest.mark.django_db
class TestInvalidChannelHandling:
    """Test invalid channel handling"""
    
    def test_get_executor_with_invalid_channel(self):
        """Test get_executor raises error for invalid channel"""
        with pytest.raises(ValueError) as exc_info:
            get_executor('InvalidChannel')
        
        assert 'Unsupported channel' in str(exc_info.value)
    
    def test_create_campaign_with_invalid_channel_choice(self, user):
        """Test creating campaign with invalid channel choice"""
        # Django will validate the choice at the model level
        # This test verifies the validation works
        with pytest.raises(Exception):  # Could be ValidationError or similar
            task = CampaignTask(
                title='Invalid Channel Campaign',
                scheduled_date=timezone.now(),
                channel='InvalidChannel',  # Not in choices
                creative_asset_ids=['asset1'],
                audience_config={'type': 'google', 'common': {}},
                created_by=user
            )
            task.full_clean()  # This should raise ValidationError


@pytest.mark.django_db
class TestMissingRequiredFields:
    """Test missing required fields"""
    
    def test_create_campaign_missing_title(self, user):
        """Test creating campaign without title"""
        # title is required, but Django may not enforce it at model level
        # Check that it raises ValidationError or IntegrityError
        from django.core.exceptions import ValidationError
        from django.db import IntegrityError
        
        try:
            campaign = CampaignTask.objects.create(
                scheduled_date=timezone.now(),
                channel=Channel.GOOGLE_ADS,
                creative_asset_ids=['asset1'],
                audience_config={'type': 'google', 'common': {}},
                created_by=user
            )
            # If creation succeeds, full_clean should fail
            campaign.full_clean()
            pytest.fail("Expected ValidationError or IntegrityError")
        except (ValidationError, IntegrityError, ValueError, TypeError):
            pass  # Expected
    
    def test_create_campaign_missing_scheduled_date(self, user):
        """Test creating campaign without scheduled_date"""
        with pytest.raises(Exception):
            CampaignTask.objects.create(
                title='No Date Campaign',
                channel=Channel.GOOGLE_ADS,
                creative_asset_ids=['asset1'],
                audience_config={'type': 'google', 'common': {}},
                created_by=user
            )
    
    def test_create_campaign_missing_channel(self, user):
        """Test creating campaign without channel"""
        # channel is required, but Django may not enforce it at model level
        from django.core.exceptions import ValidationError
        from django.db import IntegrityError
        
        try:
            campaign = CampaignTask.objects.create(
                title='No Channel Campaign',
                scheduled_date=timezone.now(),
                creative_asset_ids=['asset1'],
                audience_config={'type': 'google', 'common': {}},
                created_by=user
            )
            # If creation succeeds, full_clean should fail
            campaign.full_clean()
            pytest.fail("Expected ValidationError or IntegrityError")
        except (ValidationError, IntegrityError, ValueError, TypeError):
            pass  # Expected
    
    def test_create_campaign_missing_created_by(self, user):
        """Test creating campaign without created_by"""
        with pytest.raises(Exception):
            CampaignTask.objects.create(
                title='No Creator Campaign',
                scheduled_date=timezone.now(),
                channel=Channel.GOOGLE_ADS,
                creative_asset_ids=['asset1'],
                audience_config={'type': 'google', 'common': {}}
            )


@pytest.mark.django_db
class TestExtremeDateValues:
    """Test extreme date values"""
    
    def test_create_campaign_with_future_date(self, user):
        """Test creating campaign with far future date"""
        future_date = timezone.now() + timedelta(days=365 * 10)  # 10 years in future
        
        task = CampaignTask.objects.create(
            title='Future Campaign',
            scheduled_date=future_date,
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=['asset1'],
            audience_config={'type': 'google', 'common': {}},
            created_by=user
        )
        
        assert task.scheduled_date == future_date
    
    def test_create_campaign_with_past_date(self, user):
        """Test creating campaign with past date"""
        past_date = timezone.now() - timedelta(days=365)  # 1 year ago
        
        task = CampaignTask.objects.create(
            title='Past Campaign',
            scheduled_date=past_date,
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=['asset1'],
            audience_config={'type': 'google', 'common': {}},
            created_by=user
        )
        
        assert task.scheduled_date == past_date
    
    def test_create_campaign_with_end_date_before_start(self, user):
        """Test creating campaign with end_date before scheduled_date"""
        scheduled = timezone.now()
        end_date = scheduled - timedelta(days=1)  # End before start
        
        task = CampaignTask.objects.create(
            title='Invalid Date Range Campaign',
            scheduled_date=scheduled,
            end_date=end_date,
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=['asset1'],
            audience_config={'type': 'google', 'common': {}},
            created_by=user
        )
        
        # Model allows this, but business logic should validate
        assert task.end_date < task.scheduled_date


@pytest.mark.django_db
class TestLargeJSONFields:
    """Test large JSON fields"""
    
    def test_create_campaign_with_large_audience_config(self, user):
        """Test creating campaign with large audience_config"""
        # Create large audience config
        large_config = {
            'type': 'google',
            'common': {
                'locations': [f'Location_{i}' for i in range(1000)],  # 1000 locations
                'interests': [f'Interest_{i}' for i in range(500)]  # 500 interests
            },
            'google': {
                'campaign_type': 'SEARCH',
                'bidding_strategy': 'TARGET_ROAS'
            }
        }
        
        task = CampaignTask.objects.create(
            title='Large Config Campaign',
            scheduled_date=timezone.now(),
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=['asset1'],
            audience_config=large_config,
            created_by=user
        )
        
        assert len(task.audience_config['common']['locations']) == 1000
        assert len(task.audience_config['common']['interests']) == 500
    
    def test_create_campaign_with_large_creative_assets(self, user):
        """Test creating campaign with large creative_asset_ids list using faker"""
        large_assets = [fake.uuid4() for _ in range(1000)]  # 1000 assets
        
        task = CampaignTask.objects.create(
            title=fake.sentence(nb_words=4),
            scheduled_date=timezone.now(),
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=large_assets,
            audience_config={'type': 'google', 'common': {}},
            created_by=user
        )
        
        assert len(task.creative_asset_ids) == 1000
    
    def test_create_campaign_with_large_external_ids(self, user):
        """Test creating campaign with large external_ids_json using faker"""
        large_external_ids = {
            'campaignId': fake.uuid4(),
            'adSetIds': [fake.uuid4() for _ in range(100)],
            'adIds': [fake.uuid4() for _ in range(500)],
            'assetIds': [fake.uuid4() for _ in range(200)]
        }
        
        task = CampaignTask.objects.create(
            title=fake.sentence(nb_words=4),
            scheduled_date=timezone.now(),
            channel=Channel.FACEBOOK_ADS,
            creative_asset_ids=[fake.uuid4()],
            audience_config={'type': 'facebook', 'common': {}},
            created_by=user,
            external_ids_json=large_external_ids
        )
        
        assert len(task.external_ids_json['adSetIds']) == 100
        assert len(task.external_ids_json['adIds']) == 500


@pytest.mark.django_db
class TestServiceLayerErrorHandling:
    """Test service layer error handling"""
    
    def test_launch_campaign_invalid_status(self, campaign_task_paused, user):
        """Test launching campaign in invalid status"""
        with pytest.raises(ValueError) as exc_info:
            CampaignService.launch_campaign(
                campaign_task=campaign_task_paused,
                dry_run=False
            )
        
        assert 'Cannot launch campaign task in status' in str(exc_info.value)
    
    def test_pause_campaign_invalid_status(self, campaign_task_scheduled, user):
        """Test pausing campaign in invalid status"""
        with pytest.raises(ValueError) as exc_info:
            CampaignService.pause_campaign(
                campaign_task=campaign_task_scheduled,
                reason='Test',
                actor_user=user
            )
        
        assert 'Cannot pause campaign task in status' in str(exc_info.value)
    
    def test_archive_campaign_invalid_status(self, campaign_task_launched, user):
        """Test archiving campaign in invalid status"""
        with pytest.raises(ValueError) as exc_info:
            CampaignService.archive_campaign(
                campaign_task=campaign_task_launched,
                actor_user=user
            )
        
        assert 'Cannot archive campaign task in status' in str(exc_info.value)


@pytest.mark.django_db
class TestSpecialCharacters:
    """Test special characters in fields"""
    
    def test_create_campaign_with_special_characters_in_title(self, user):
        """Test creating campaign with special characters in title"""
        special_title = fake.text(max_nb_chars=100) + ' with "quotes", <tags>, & symbols!'
        
        task = CampaignTask.objects.create(
            title=special_title,
            scheduled_date=timezone.now(),
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=[fake.uuid4()],
            audience_config={'type': 'google', 'common': {}},
            created_by=user
        )
        
        assert task.title == special_title
    
    def test_create_campaign_with_unicode_in_title(self, user):
        """Test creating campaign with unicode characters in title"""
        unicode_title = fake.sentence() + ' with 中文, 日本語, and русский'
        
        task = CampaignTask.objects.create(
            title=unicode_title,
            scheduled_date=timezone.now(),
            channel=Channel.GOOGLE_ADS,
            creative_asset_ids=[fake.uuid4()],
            audience_config={'type': 'google', 'common': {}},
            created_by=user
        )
        
        assert task.title == unicode_title
    
    def test_create_campaign_with_special_characters_in_paused_reason(self, campaign_task_launched):
        """Test pausing campaign with special characters in reason"""
        special_reason = fake.sentence() + ' due to "ROI drop" < 1.0 & budget exceeded!'
        
        campaign_task_launched.pause(reason=special_reason)
        campaign_task_launched.save()
        
        assert campaign_task_launched.paused_reason == special_reason

