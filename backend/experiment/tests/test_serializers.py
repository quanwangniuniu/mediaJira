"""
Test cases for experiment serializers
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from experiment.models import Experiment, ExperimentProgressUpdate
from experiment.serializers import ExperimentSerializer, ExperimentProgressUpdateSerializer
from task.models import Task
from core.models import Organization, Project, ProjectMember

User = get_user_model()


class ExperimentSerializerTest(TestCase):
    """Test cases for ExperimentSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.organization = Organization.objects.create(name="Test Organization")
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        
        self.task = Task.objects.create(
            summary='Test Experiment Task',
            type='experiment',
            project=self.project,
            owner=self.user
        )
    
    def test_experiment_serializer_create(self):
        """Test creating experiment via serializer"""
        data = {
            'name': 'Test Experiment',
            'hypothesis': 'New creative increases CTR by 10%',
            'expected_outcome': '10% increase in CTR',
            'description': 'Test description',
            'control_group': {'campaigns': ['fb:123456']},
            'variant_group': {'campaigns': ['fb:789012']},
            'success_metric': 'CTR',
            'constraints': 'Budget constraint',
            'start_date': timezone.now().date(),
            'end_date': (timezone.now() + timezone.timedelta(days=30)).date(),
            'status': Experiment.ExperimentStatus.DRAFT,
            'task': self.task.id,
        }
        
        serializer = ExperimentSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        
        experiment = serializer.save(created_by=self.user)
        self.assertEqual(experiment.name, 'Test Experiment')
        self.assertEqual(experiment.task, self.task)
    
    def test_experiment_serializer_validate_date_range(self):
        """Test date range validation"""
        data = {
            'name': 'Test Experiment',
            'hypothesis': 'Test hypothesis',
            'start_date': timezone.now().date(),
            'end_date': timezone.now().date(),  # Same as start_date
            'task': self.task.id,
        }
        
        serializer = ExperimentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('end_date', serializer.errors)
    
    def test_experiment_serializer_validate_started_at(self):
        """Test started_at validation"""
        data = {
            'name': 'Test Experiment',
            'hypothesis': 'Test hypothesis',
            'start_date': timezone.now().date(),
            'end_date': (timezone.now() + timezone.timedelta(days=30)).date(),
            'started_at': (timezone.now() - timezone.timedelta(days=1)).isoformat(),  # Before start_date
            'task': self.task.id,
        }
        
        serializer = ExperimentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('started_at', serializer.errors)
    
    def test_experiment_serializer_validate_control_group(self):
        """Test control_group validation"""
        # Test invalid structure (not a dict)
        data = {
            'name': 'Test Experiment',
            'hypothesis': 'Test hypothesis',
            'start_date': timezone.now().date(),
            'end_date': (timezone.now() + timezone.timedelta(days=30)).date(),
            'control_group': ['invalid', 'list'],  # Should be dict
            'task': self.task.id,
        }
        
        serializer = ExperimentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('control_group', serializer.errors)
        
        # Test missing required keys
        data['control_group'] = {}
        serializer = ExperimentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('control_group', serializer.errors)
        
        # Test valid control_group
        data['control_group'] = {'campaigns': ['fb:123456']}
        serializer = ExperimentSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
    
    def test_experiment_serializer_validate_variant_group(self):
        """Test variant_group validation"""
        # Test invalid ID format
        data = {
            'name': 'Test Experiment',
            'hypothesis': 'Test hypothesis',
            'start_date': timezone.now().date(),
            'end_date': (timezone.now() + timezone.timedelta(days=30)).date(),
            'variant_group': {'campaigns': ['invalid-id']},  # Invalid format
            'task': self.task.id,
        }
        
        serializer = ExperimentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('variant_group', serializer.errors)
        
        # Test valid variant_group
        data['variant_group'] = {'campaigns': ['fb:123456'], 'ad_set_ids': ['fb:789']}
        serializer = ExperimentSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
    
    def test_experiment_serializer_validate_outcome_when_completed(self):
        """Test that outcome can only be set when status is completed"""
        experiment = Experiment.objects.create(
            name='Test Experiment',
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            status=Experiment.ExperimentStatus.RUNNING,
            task=self.task,
            created_by=self.user
        )
        
        data = {
            'experiment_outcome': Experiment.ExperimentOutcome.WIN,
            'outcome_notes': 'Test notes'
        }
        
        serializer = ExperimentSerializer(experiment, data=data, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn('experiment_outcome', serializer.errors)
        
        # Set status to completed first
        experiment.status = Experiment.ExperimentStatus.COMPLETED
        experiment.save()
        
        serializer = ExperimentSerializer(experiment, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
    
    def test_experiment_serializer_validate_task_type(self):
        """Test that task type must be 'experiment'"""
        wrong_task = Task.objects.create(
            summary='Wrong Task',
            type='asset',  # Wrong type
            project=self.project,
            owner=self.user
        )
        
        data = {
            'name': 'Test Experiment',
            'hypothesis': 'Test hypothesis',
            'start_date': timezone.now().date(),
            'end_date': (timezone.now() + timezone.timedelta(days=30)).date(),
            'task': wrong_task.id,
        }
        
        serializer = ExperimentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('task', serializer.errors)
    
    def test_experiment_serializer_nested_progress_updates(self):
        """Test that progress_updates are included in serialization"""
        experiment = Experiment.objects.create(
            name='Test Experiment',
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            task=self.task,
            created_by=self.user
        )
        
        # Create progress updates
        ExperimentProgressUpdate.objects.create(
            experiment=experiment,
            notes='Update 1',
            created_by=self.user
        )
        ExperimentProgressUpdate.objects.create(
            experiment=experiment,
            notes='Update 2',
            created_by=self.user
        )
        
        serializer = ExperimentSerializer(experiment)
        data = serializer.data
        
        self.assertIn('progress_updates', data)
        self.assertEqual(len(data['progress_updates']), 2)


class ExperimentProgressUpdateSerializerTest(TestCase):
    """Test cases for ExperimentProgressUpdateSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        
        self.organization = Organization.objects.create(name="Test Organization")
        self.project = Project.objects.create(
            name="Test Project",
            organization=self.organization
        )
        
        self.task = Task.objects.create(
            summary='Test Experiment Task',
            type='experiment',
            project=self.project,
            owner=self.user
        )
        
        self.experiment = Experiment.objects.create(
            name='Test Experiment',
            hypothesis='Test hypothesis',
            start_date=timezone.now().date(),
            end_date=(timezone.now() + timezone.timedelta(days=30)).date(),
            task=self.task,
            created_by=self.user
        )
    
    def test_progress_update_serializer_create(self):
        """Test creating progress update via serializer"""
        data = {
            'experiment': self.experiment.id,
            'notes': 'Test progress update',
        }
        
        serializer = ExperimentProgressUpdateSerializer(data=data)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        
        update = serializer.save(created_by=self.user)
        self.assertEqual(update.notes, 'Test progress update')
        self.assertEqual(update.experiment, self.experiment)
        self.assertEqual(update.created_by, self.user)
    
    def test_progress_update_serializer_read_only_fields(self):
        """Test that read-only fields are not writable"""
        update = ExperimentProgressUpdate.objects.create(
            experiment=self.experiment,
            notes='Test update',
            created_by=self.user
        )
        
        data = {
            'id': 999,  # Should be ignored
            'created_at': '2020-01-01T00:00:00Z',  # Should be ignored
            'created_by': 999,  # Should be ignored
            'notes': 'Updated notes',
        }
        
        serializer = ExperimentProgressUpdateSerializer(update, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), serializer.errors)
        
        updated = serializer.save()
        self.assertEqual(updated.id, update.id)  # ID should not change
        self.assertEqual(updated.created_by, self.user)  # Should not change
        self.assertEqual(updated.notes, 'Updated notes')  # Should update

