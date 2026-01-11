"""
Test cases for experiment models
"""
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.exceptions import ValidationError

from experiment.models import Experiment, ExperimentProgressUpdate
from task.models import Task
from core.models import Organization, Project, ProjectMember

User = get_user_model()


class ExperimentModelTest(TestCase):
    """Test cases for Experiment model"""
    
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
    
    def test_create_experiment(self):
        """Test creating an experiment"""
        experiment = Experiment.objects.create(
            name='Test A/B Campaign',
            hypothesis='New video creative increases CTR by 10%',
            expected_outcome='10% increase in CTR',
            description='Testing new video creative',
            control_group={'campaigns': ['fb:123456']},
            variant_group={'campaigns': ['fb:789012']},
            success_metric='CTR',
            constraints='Budget constraint: max $5000',
            status=Experiment.ExperimentStatus.DRAFT,
            task=self.task,
            created_by=self.user
        )
        
        self.assertEqual(experiment.name, 'Test A/B Campaign')
        self.assertEqual(experiment.hypothesis, 'New video creative increases CTR by 10%')
        self.assertEqual(experiment.expected_outcome, '10% increase in CTR')
        self.assertEqual(experiment.status, Experiment.ExperimentStatus.DRAFT)
        self.assertEqual(experiment.task, self.task)
        self.assertEqual(experiment.created_by, self.user)
        self.assertIsNotNone(experiment.id)
    
    def test_experiment_status_choices(self):
        """Test experiment status choices"""
        status_choices = Experiment.ExperimentStatus.choices
        
        expected_choices = [
            ('draft', 'Draft'),
            ('running', 'Running'),
            ('paused', 'Paused'),
            ('completed', 'Completed'),
            ('cancelled', 'Cancelled')
        ]
        
        self.assertEqual(status_choices, expected_choices)
    
    def test_experiment_outcome_choices(self):
        """Test experiment outcome choices"""
        outcome_choices = Experiment.ExperimentOutcome.choices
        
        expected_choices = [
            ('win', 'Win'),
            ('lose', 'Lose'),
            ('inconclusive', 'Inconclusive')
        ]
        
        self.assertEqual(outcome_choices, expected_choices)
    
    def test_experiment_control_variant_groups_json_field(self):
        """Test that control_group and variant_group are properly handled as JSON fields"""
        control_group = {'campaigns': ['fb:123456'], 'ad_set_ids': ['fb:789']}
        variant_group = {'campaigns': ['fb:654321'], 'ad_ids': ['fb:101']}
        
        experiment = Experiment.objects.create(
            name='JSON Test',
            hypothesis='Test hypothesis',
            control_group=control_group,
            variant_group=variant_group,
            task=self.task,
            created_by=self.user
        )
        
        # Refresh from database
        experiment.refresh_from_db()
        
        self.assertEqual(experiment.control_group, control_group)
        self.assertEqual(experiment.variant_group, variant_group)
        self.assertIsInstance(experiment.control_group, dict)
        self.assertIsInstance(experiment.variant_group, dict)
    
    def test_experiment_required_fields(self):
        """Test experiment required fields"""
        # Test missing name
        with self.assertRaises(ValidationError):
            experiment = Experiment(
                hypothesis='Test hypothesis',
                task=self.task,
                created_by=self.user
            )
            experiment.full_clean()
        
        # Test missing hypothesis
        with self.assertRaises(ValidationError):
            experiment = Experiment(
                name='Test Experiment',
                task=self.task,
                created_by=self.user
            )
            experiment.full_clean()
        
        # Note: start_date and end_date are now in Task model, not Experiment
        # Date validation happens at Task level or in serializer
    
    def test_experiment_one_to_one_relationship_with_task(self):
        """Test OneToOneField relationship with Task"""
        experiment = Experiment.objects.create(
            name='Test Experiment',
            hypothesis='Test hypothesis',
            task=self.task,
            created_by=self.user
        )
        
        # Test forward relationship
        self.assertEqual(experiment.task, self.task)
        
        # Test reverse relationship
        self.assertEqual(self.task.experiment, experiment)
    
    def test_experiment_cascade_delete_task(self):
        """Test that experiment is deleted when task is deleted"""
        experiment = Experiment.objects.create(
            name='Test Experiment',
            hypothesis='Test hypothesis',
            task=self.task,
            created_by=self.user
        )
        
        experiment_id = experiment.id
        
        # Delete task
        self.task.delete()
        
        # Experiment should be deleted as well
        self.assertFalse(Experiment.objects.filter(id=experiment_id).exists())
    
    def test_experiment_foreign_key_relationship(self):
        """Test experiment foreign key relationship with User"""
        experiment = Experiment.objects.create(
            name='Test Experiment',
            hypothesis='Test hypothesis',
            task=self.task,
            created_by=self.user
        )
        
        # Test forward relationship
        self.assertEqual(experiment.created_by, self.user)
        
        # Test reverse relationship
        self.assertIn(experiment, self.user.created_experiments.all())
    
    def test_experiment_default_status(self):
        """Test that default status is DRAFT"""
        experiment = Experiment.objects.create(
            name='Test Experiment',
            hypothesis='Test hypothesis',
            task=self.task,
            created_by=self.user
        )
        
        self.assertEqual(experiment.status, Experiment.ExperimentStatus.DRAFT)
    
    def test_experiment_timestamps(self):
        """Test that timestamps are automatically set"""
        experiment = Experiment.objects.create(
            name='Test Experiment',
            hypothesis='Test hypothesis',
            task=self.task,
            created_by=self.user
        )
        
        self.assertIsNotNone(experiment.created_at)
        self.assertIsNotNone(experiment.updated_at)
        self.assertLessEqual(experiment.created_at, timezone.now())
    
    def test_experiment_str_representation(self):
        """Test string representation of experiment"""
        experiment = Experiment.objects.create(
            name='Test Experiment',
            hypothesis='Test hypothesis',
            task=self.task,
            created_by=self.user
        )
        
        self.assertEqual(str(experiment), f"Test Experiment ({experiment.id})")


class ExperimentProgressUpdateModelTest(TestCase):
    """Test cases for ExperimentProgressUpdate model"""
    
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
            task=self.task,
            created_by=self.user
        )
    
    def test_create_progress_update(self):
        """Test creating a progress update"""
        update = ExperimentProgressUpdate.objects.create(
            experiment=self.experiment,
            notes='Initial setup completed, campaigns launched',
            created_by=self.user
        )
        
        self.assertEqual(update.experiment, self.experiment)
        self.assertEqual(update.notes, 'Initial setup completed, campaigns launched')
        self.assertEqual(update.created_by, self.user)
        self.assertIsNotNone(update.id)
        self.assertIsNotNone(update.update_date)
    
    def test_progress_update_auto_timestamp(self):
        """Test that progress update automatically sets timestamp"""
        update = ExperimentProgressUpdate.objects.create(
            experiment=self.experiment,
            notes='Test update',
            created_by=self.user
        )
        
        self.assertIsNotNone(update.update_date)
        self.assertIsNotNone(update.created_at)
        self.assertLessEqual(update.update_date, timezone.now())
        self.assertLessEqual(update.created_at, timezone.now())
    
    def test_progress_update_required_fields(self):
        """Test progress update required fields"""
        # Test missing experiment
        with self.assertRaises(ValidationError):
            update = ExperimentProgressUpdate(
                notes='Test update',
                created_by=self.user
            )
            update.full_clean()
        
        # Test missing notes
        with self.assertRaises(ValidationError):
            update = ExperimentProgressUpdate(
                experiment=self.experiment,
                created_by=self.user
            )
            update.full_clean()
        
        # Test missing created_by
        with self.assertRaises(ValidationError):
            update = ExperimentProgressUpdate(
                experiment=self.experiment,
                notes='Test update'
            )
            update.full_clean()
    
    def test_progress_update_foreign_key_relationship(self):
        """Test progress update foreign key relationships"""
        update = ExperimentProgressUpdate.objects.create(
            experiment=self.experiment,
            notes='Test update',
            created_by=self.user
        )
        
        # Test forward relationships
        self.assertEqual(update.experiment, self.experiment)
        self.assertEqual(update.created_by, self.user)
        
        # Test reverse relationship
        self.assertIn(update, self.experiment.progress_updates.all())
        self.assertIn(update, self.user.created_experiment_progress_updates.all())
    
    def test_progress_update_cascade_delete_experiment(self):
        """Test that progress updates are deleted when experiment is deleted"""
        update = ExperimentProgressUpdate.objects.create(
            experiment=self.experiment,
            notes='Test update',
            created_by=self.user
        )
        
        update_id = update.id
        
        # Delete experiment
        self.experiment.delete()
        
        # Progress update should be deleted as well
        self.assertFalse(ExperimentProgressUpdate.objects.filter(id=update_id).exists())
    
    def test_progress_update_cascade_delete_user(self):
        """Test that progress updates are deleted when user is deleted"""
        update = ExperimentProgressUpdate.objects.create(
            experiment=self.experiment,
            notes='Test update',
            created_by=self.user
        )
        
        update_id = update.id
        
        # Delete user
        self.user.delete()
        
        # Progress update should be deleted as well
        self.assertFalse(ExperimentProgressUpdate.objects.filter(id=update_id).exists())
    
    def test_multiple_progress_updates(self):
        """Test that experiment can have multiple progress updates"""
        update1 = ExperimentProgressUpdate.objects.create(
            experiment=self.experiment,
            notes='First update',
            created_by=self.user
        )
        
        update2 = ExperimentProgressUpdate.objects.create(
            experiment=self.experiment,
            notes='Second update',
            created_by=self.user
        )
        
        updates = self.experiment.progress_updates.all()
        self.assertEqual(updates.count(), 2)
        self.assertIn(update1, updates)
        self.assertIn(update2, updates)
    
    def test_progress_update_ordering(self):
        """Test that progress updates are ordered by created_at descending"""
        update1 = ExperimentProgressUpdate.objects.create(
            experiment=self.experiment,
            notes='First update',
            created_by=self.user
        )
        
        import time
        time.sleep(0.01)  # Small delay to ensure different timestamps
        
        update2 = ExperimentProgressUpdate.objects.create(
            experiment=self.experiment,
            notes='Second update',
            created_by=self.user
        )
        
        updates = list(self.experiment.progress_updates.all())
        # Should be ordered by -created_at, so newest first
        self.assertEqual(updates[0], update2)
        self.assertEqual(updates[1], update1)
    
    def test_progress_update_str_representation(self):
        """Test string representation of progress update"""
        update = ExperimentProgressUpdate.objects.create(
            experiment=self.experiment,
            notes='Test update',
            created_by=self.user
        )
        
        self.assertEqual(str(update), f"Progress Update {update.id} for Experiment {self.experiment.id}")


class ExperimentModelRelationshipsTest(TestCase):
    """Test model relationships and queries"""
    
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
            name='Relationship Test Experiment',
            hypothesis='Test relationships hypothesis',
            task=self.task,
            created_by=self.user
        )
    
    def test_experiment_progress_updates_relationship(self):
        """Test experiment-progress updates relationship"""
        # Create multiple progress updates
        updates = []
        for i in range(5):
            update = ExperimentProgressUpdate.objects.create(
                experiment=self.experiment,
                notes=f'Progress update {i}',
                created_by=self.user
            )
            updates.append(update)
        
        # Test reverse relationship
        experiment_updates = self.experiment.progress_updates.all()
        self.assertEqual(experiment_updates.count(), 5)
        
        for update in updates:
            self.assertIn(update, experiment_updates)
    
    def test_task_experiment_relationship(self):
        """Test task-experiment relationship"""
        # Test forward relationship
        self.assertEqual(self.experiment.task, self.task)
        
        # Test reverse relationship
        self.assertEqual(self.task.experiment, self.experiment)
        
        # Test that only one experiment can be linked to a task
        task2 = Task.objects.create(
            summary='Another Task',
            type='experiment',
            project=self.project,
            owner=self.user
        )
        
        # Try to link same experiment to another task should fail
        # (OneToOneField constraint)
        self.experiment.task = task2
        self.experiment.save()
        
        # Original task should no longer have experiment
        # Use refresh_from_db with fields parameter to avoid django-fsm protected status field
        # Or re-fetch from database to get updated relationship
        self.task = Task.objects.get(id=self.task.id)
        with self.assertRaises(Experiment.DoesNotExist):
            _ = self.task.experiment

