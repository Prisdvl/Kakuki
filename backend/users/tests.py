"""用户模块 API 测试：注册 / 登录 / 刷新 / 资料 / 改密"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

User = get_user_model()


class UserAuthTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='alice', password='alice123456', nickname='爱丽丝')
        self.register_url = '/api/v1/auth/register/'
        self.login_url = '/api/v1/auth/login/'
        self.refresh_url = '/api/v1/auth/refresh/'
        self.me_url = '/api/v1/auth/me/'
        self.change_pwd_url = '/api/v1/auth/change-password/'

    # --- 注册 ---
    def test_register_success(self):
        resp = self.client.post(self.register_url, {
            'username': 'bob', 'password': 'bob123456', 'nickname': '鲍勃'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['code'], 201)
        self.assertTrue(User.objects.filter(username='bob').exists())

    def test_register_duplicate_username(self):
        resp = self.client.post(self.register_url, {
            'username': 'alice', 'password': 'whatever123'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_short_password(self):
        resp = self.client.post(self.register_url, {
            'username': 'charlie', 'password': '123'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # --- 登录 / 刷新 ---
    def test_login_success(self):
        resp = self.client.post(self.login_url, {
            'username': 'alice', 'password': 'alice123456'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)
        self.assertIn('refresh', resp.data)

    def test_login_wrong_password(self):
        resp = self.client.post(self.login_url, {
            'username': 'alice', 'password': 'wrong-pass'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_refresh_token(self):
        login = self.client.post(self.login_url, {
            'username': 'alice', 'password': 'alice123456'
        }, format='json')
        resp = self.client.post(self.refresh_url, {
            'refresh': login.data['refresh']
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn('access', resp.data)

    # --- 用户信息 ---
    def test_me_requires_auth(self):
        resp = self.client.get(self.me_url)
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_authenticated(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.get(self.me_url)
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['data']['username'], 'alice')
        self.assertEqual(resp.data['data']['nickname'], '爱丽丝')

    def test_update_profile(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.patch(self.me_url, {'bio': 'hello world'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.bio, 'hello world')

    # --- 修改密码 ---
    def test_change_password_success(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(self.change_pwd_url, {
            'old_password': 'alice123456', 'new_password': 'newpass123'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newpass123'))

    def test_change_password_wrong_old(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post(self.change_pwd_url, {
            'old_password': 'wrong', 'new_password': 'newpass123'
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
