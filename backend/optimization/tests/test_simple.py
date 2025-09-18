"""
Simple test to verify Django test discovery for optimization app
"""
from django.test import TestCase


class SimpleOptimizationTest(TestCase):
    """Simple test case to verify test discovery"""
    
    def test_simple(self):
        """Simple test that always passes"""
        self.assertTrue(True)
        self.assertEqual(1 + 1, 2)
    
    def test_another(self):
        """Another simple test"""
        self.assertIsNotNone("test")
        self.assertIn("test", "this is a test")
