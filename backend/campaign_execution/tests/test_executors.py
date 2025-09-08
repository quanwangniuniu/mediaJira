from django.test import TestCase
from unittest.mock import patch
from campaign_execution.executors import get_executor

class ExecutorsTest(TestCase):
    @patch('requests.post')
    @patch('requests.get')
    def test_google_launch_and_status_normalization(self, mock_get, mock_post):
        base = "http://mock"
        
        # Mock Google API responses
        mock_post.return_value.json.return_value = {"campaignId":"g-123","accountId":"acc-g"}
        mock_post.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"state":"ENABLED","spend":12.5,"roi":1.8}
        mock_get.return_value.status_code = 200
        
        exec_ = get_executor("google", {"auth_token":"mock", "settings":{"base_url":base}})
        ids = exec_.launch({"title":"t","audience":{},"creatives":[]})
        st = exec_.normalize_status(exec_.get_status(ids))
        
        self.assertIn("campaignId", ids)
        self.assertIn(st["state"], ("RUNNING","PAUSED","COMPLETED","FAILED"))
        self.assertIsInstance(st.get("spend",0), (int,float))
    
    @patch('requests.post')
    @patch('requests.get')
    def test_facebook_launch_and_status_normalization(self, mock_get, mock_post):
        base = "http://mock"
        
        # Mock Facebook API responses
        mock_post.return_value.json.return_value = {"id":"f-999","account":"acc-f"}
        mock_post.return_value.status_code = 200
        mock_get.return_value.json.return_value = {"status":"ACTIVE","spent":1250,"roi":1.8}
        mock_get.return_value.status_code = 200
        
        exec_ = get_executor("facebook", {"auth_token":"mock", "settings":{"base_url":base}})
        ids = exec_.launch({"title":"t","audience":{},"creatives":[]})
        st = exec_.normalize_status(exec_.get_status(ids))
        
        self.assertIn("campaignId", ids)
        self.assertIn(st["state"], ("RUNNING","PAUSED","COMPLETED","FAILED"))
        self.assertIsInstance(st.get("spend",0), (int,float))
