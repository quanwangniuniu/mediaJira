from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
import json

from user_preferences.models import UserPreferences

User = get_user_model()


class UserPreferencesViewTest(APITestCase):
    """
    用户偏好视图测试
    
    测试所有视图功能包括：
    - GET请求（获取偏好设置）
    - PUT/PATCH请求（更新偏好设置）
    - 权限验证
    - 数据隔离
    - 错误处理
    """
    
    def setUp(self):
        """设置测试数据"""
        self.client = APIClient()
        
        # 创建测试用户
        self.user = User.objects.create(
            username='testuser',
            email='test@example.com'
        )
        self.user.set_password('testpass123')
        self.user.save()
        
        # 创建另一个用户用于测试数据隔离
        self.other_user = User.objects.create(
            username='otheruser',
            email='other@example.com'
        )
        self.other_user.set_password('testpass123')
        self.other_user.save()
        
        # 创建用户偏好设置
        self.preferences = UserPreferences.objects.create(
            user=self.user,
            timezone='Asia/Shanghai',
            language='zh-CN'
        )
        
        # 创建其他用户的偏好设置
        self.other_preferences = UserPreferences.objects.create(
            user=self.other_user,
            timezone='America/New_York',
            language='en-US'
        )
        
        # 获取用户偏好设置的URL
        self.url = reverse('user-preferences')  # 需要在urls.py中定义
    
    def test_get_user_preferences_authenticated(self):
        """测试已认证用户获取偏好设置"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(data['timezone'], 'Asia/Shanghai')
        self.assertEqual(data['language'], 'zh-CN')
    
    def test_get_user_preferences_unauthenticated(self):
        """测试未认证用户获取偏好设置"""
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_get_user_preferences_creates_if_not_exists(self):
        """测试获取偏好设置时如果不存在则创建"""
        # 创建一个没有偏好设置的用户
        new_user = User.objects.create(
            username='newuser',
            email='new@example.com'
        )
        new_user.set_password('testpass123')
        new_user.save()
        
        self.client.force_authenticate(user=new_user)
        
        response = self.client.get(self.url)
        
        # 应该返回默认的空偏好设置
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 验证偏好设置已创建
        self.assertTrue(UserPreferences.objects.filter(user=new_user).exists())
    
    def test_update_user_preferences_put(self):
        """测试使用PUT更新用户偏好设置"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'timezone': 'Europe/London',
            'language': 'en-US'
        }
        
        response = self.client.put(
            self.url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 验证数据已更新
        self.preferences.refresh_from_db()
        self.assertEqual(self.preferences.timezone, 'Europe/London')
        self.assertEqual(self.preferences.language, 'en-US')
    
    def test_update_user_preferences_patch(self):
        """测试使用PATCH部分更新用户偏好设置"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'timezone': 'Asia/Tokyo'
        }
        
        response = self.client.patch(
            self.url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 验证只有timezone被更新，language保持不变
        self.preferences.refresh_from_db()
        self.assertEqual(self.preferences.timezone, 'Asia/Tokyo')
        self.assertEqual(self.preferences.language, 'zh-CN')
    
    def test_update_user_preferences_invalid_data(self):
        """测试更新用户偏好设置时的数据验证"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'timezone': 'Invalid/Timezone',
            'language': 'invalid-lang'
        }
        
        response = self.client.patch(
            self.url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # 验证原数据没有被修改
        self.preferences.refresh_from_db()
        self.assertEqual(self.preferences.timezone, 'Asia/Shanghai')
        self.assertEqual(self.preferences.language, 'zh-CN')
    
    def test_update_user_preferences_unauthenticated(self):
        """测试未认证用户更新偏好设置"""
        data = {
            'timezone': 'Europe/London',
            'language': 'en-US'
        }
        
        response = self.client.put(
            self.url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_user_can_only_access_own_preferences(self):
        """测试用户只能访问自己的偏好设置"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        # 应该获取到自己的偏好设置，而不是其他用户的
        self.assertEqual(data['timezone'], 'Asia/Shanghai')
        self.assertEqual(data['language'], 'zh-CN')
        
        # 验证不是其他用户的数据
        self.assertNotEqual(data['timezone'], self.other_preferences.timezone)
        self.assertNotEqual(data['language'], self.other_preferences.language)
    
    def test_user_can_only_update_own_preferences(self):
        """测试用户只能更新自己的偏好设置"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'timezone': 'Europe/London',
            'language': 'en-US'
        }
        
        response = self.client.put(
            self.url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 验证自己的偏好设置已更新
        self.preferences.refresh_from_db()
        self.assertEqual(self.preferences.timezone, 'Europe/London')
        self.assertEqual(self.preferences.language, 'en-US')
        
        # 验证其他用户的偏好设置没有被修改
        self.other_preferences.refresh_from_db()
        self.assertEqual(self.other_preferences.timezone, 'America/New_York')
        self.assertEqual(self.other_preferences.language, 'en-US')
    
    def test_null_values_update(self):
        """测试空值更新"""
        self.client.force_authenticate(user=self.user)
        
        data = {
            'timezone': None,
            'language': None
        }
        
        response = self.client.patch(
            self.url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 验证数据已更新为None
        self.preferences.refresh_from_db()
        self.assertIsNone(self.preferences.timezone)
        self.assertIsNone(self.preferences.language)
    
    def test_response_format(self):
        """测试响应格式"""
        self.client.force_authenticate(user=self.user)
        
        response = self.client.get(self.url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/json')
        
        data = response.json()
        
        # 验证响应包含预期的字段
        expected_fields = {'timezone', 'language'}
        self.assertEqual(set(data.keys()), expected_fields)
    
    def test_method_not_allowed(self):
        """测试不允许的HTTP方法"""
        self.client.force_authenticate(user=self.user)
        
        # 测试DELETE方法
        response = self.client.delete(self.url)
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
        
        # 测试POST方法
        response = self.client.post(self.url, {})
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)
    
    def test_concurrent_updates(self):
        """测试并发更新"""
        self.client.force_authenticate(user=self.user)
        
        # 模拟两个并发请求
        data1 = {'timezone': 'Europe/London'}
        data2 = {'language': 'en-US'}
        
        response1 = self.client.patch(
            self.url,
            data=json.dumps(data1),
            content_type='application/json'
        )
        
        response2 = self.client.patch(
            self.url,
            data=json.dumps(data2),
            content_type='application/json'
        )
        
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        self.assertEqual(response2.status_code, status.HTTP_200_OK)
        
        # 验证最终状态
        self.preferences.refresh_from_db()
        self.assertEqual(self.preferences.timezone, 'Europe/London')
        self.assertEqual(self.preferences.language, 'en-US')
    
    def test_large_data_handling(self):
        """测试大数据处理"""
        self.client.force_authenticate(user=self.user)
        
        # 测试长字符串
        long_timezone = 'A' * 100  # 假设这是一个无效的长时区字符串
        
        data = {
            'timezone': long_timezone,
            'language': 'zh-CN'
        }
        
        response = self.client.patch(
            self.url,
            data=json.dumps(data),
            content_type='application/json'
        )
        
        # 应该返回验证错误
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST) 