import time
from django.test import TestCase
from asset.models import Task


class TaskModelTest(TestCase):
    """Test cases for Task model"""
    
    def setUp(self):
        self.task = Task.objects.create(
            title="Test Task",
            description="Test task description"
        )
    
    def test_task_creation(self):
        """Test basic task creation"""
        self.assertEqual(self.task.title, "Test Task")
        self.assertEqual(self.task.description, "Test task description")
        self.assertIsNotNone(self.task.created_at)
        self.assertIsNotNone(self.task.updated_at)
    
    def test_task_string_representation(self):
        """Test task string representation"""
        expected = f"Task {self.task.id}: Test Task"
        self.assertEqual(str(self.task), expected)
    
    def test_task_table_name(self):
        """Test task table name"""
        self.assertEqual(self.task._meta.db_table, 'tasks') 

    def test_task_with_blank_description(self):
        """Test task creation with blank description"""
        task = Task.objects.create(title="No Description")
        self.assertEqual(task.description, "")

    def test_task_updated_at_changes(self):
        """Test that updated_at field updates on save"""
        original_updated = self.task.updated_at
        self.task.title = "Updated Task"
        time.sleep(1)  # Ensure timestamp difference
        self.task.save()
        self.task.refresh_from_db()
        self.assertNotEqual(self.task.updated_at, original_updated)