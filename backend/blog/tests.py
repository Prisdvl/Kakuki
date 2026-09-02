"""blog 模块 API 测试：分类 / 标签 / 文章 / 评论 / 杂谈 / 项目 / 归档 / 统计 / 点赞"""
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Category, Tag, Article, Comment, Talk, Project

User = get_user_model()


class BlogBaseTestCase(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin', password='admin123456', nickname='管理员',
            is_staff=True, is_superuser=True)
        self.user = User.objects.create_user(
            username='demo', password='demo123456', nickname='演示用户')
        self.category = Category.objects.create(name='后端开发', description='服务端技术')
        self.tag = Tag.objects.create(name='Django')
        self.article = Article.objects.create(
            title='测试文章', content='# 标题\n正文内容', summary='摘要',
            category=self.category, author=self.admin, views=10)
        self.article.tags.add(self.tag)
        self.talk = Talk.objects.create(content='一条杂谈', author=self.admin)


class CategoryTagTests(BlogBaseTestCase):
    def test_category_list_with_count(self):
        resp = self.client.get('/api/v1/categories/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data['data']
        cat = next(c for c in data if c['name'] == '后端开发')
        self.assertEqual(cat['article_count'], 1)

    def test_tag_list_with_count(self):
        resp = self.client.get('/api/v1/tags/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        tag = next(t for t in resp.data['data'] if t['name'] == 'Django')
        self.assertEqual(tag['article_count'], 1)

    def test_create_category_permission(self):
        # 未登录 -> 401
        resp = self.client.post('/api/v1/categories/manage/', {'name': '新分类'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        # 普通用户 -> 403
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/v1/categories/manage/', {'name': '新分类'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        # 管理员 -> 201
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/v1/categories/manage/', {'name': '新分类'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)


class ArticleTests(BlogBaseTestCase):
    def test_article_list(self):
        resp = self.client.get('/api/v1/articles/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data['data']
        self.assertEqual(data['count'], 1)
        first = data['results'][0]
        self.assertEqual(first['title'], '测试文章')
        self.assertIn('comment_count', first)
        self.assertIn('like_count', first)

    def test_article_list_search(self):
        resp = self.client.get('/api/v1/articles/', {'search': '测试'})
        self.assertEqual(resp.data['data']['count'], 1)
        resp = self.client.get('/api/v1/articles/', {'search': '绝不存在的关键词xyz'})
        self.assertEqual(resp.data['data']['count'], 0)

    def test_article_list_filter_category(self):
        resp = self.client.get('/api/v1/articles/', {'category': self.category.id})
        self.assertEqual(resp.data['data']['count'], 1)
        other = Category.objects.create(name='前端开发')
        resp = self.client.get('/api/v1/articles/', {'category': other.id})
        self.assertEqual(resp.data['data']['count'], 0)

    def test_article_list_filter_tag(self):
        resp = self.client.get('/api/v1/articles/', {'tag': self.tag.id})
        self.assertEqual(resp.data['data']['count'], 1)

    def test_article_detail_increments_views(self):
        resp = self.client.get(f'/api/v1/articles/{self.article.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data['data']
        self.assertEqual(data['id'], self.article.id)
        self.assertIn('liked', data)
        self.assertIn('like_count', data)
        self.article.refresh_from_db()
        self.assertEqual(self.article.views, 11)  # 访问 +1

    def test_anonymous_like_toggle(self):
        """干净数据库下：第一次点赞 liked=True，第二次取消 liked=False 且计数归零"""
        r1 = self.client.post(f'/api/v1/articles/{self.article.id}/like/')
        self.assertEqual(r1.status_code, status.HTTP_200_OK)
        d1 = r1.data['data']
        self.assertTrue(d1['liked'])
        self.assertEqual(d1['like_count'], 1)

        r2 = self.client.post(f'/api/v1/articles/{self.article.id}/like/')
        d2 = r2.data['data']
        self.assertFalse(d2['liked'])
        self.assertEqual(d2['like_count'], 0)

    def test_authenticated_like_separate_users(self):
        self.client.force_authenticate(user=self.user)
        r1 = self.client.post(f'/api/v1/articles/{self.article.id}/like/')
        self.assertTrue(r1.data['data']['liked'])
        self.assertEqual(r1.data['data']['like_count'], 1)
        # 同一用户重复点赞 -> 取消
        r2 = self.client.post(f'/api/v1/articles/{self.article.id}/like/')
        self.assertFalse(r2.data['data']['liked'])
        # 另一用户点赞 -> 计数 +1
        self.client.force_authenticate(user=self.admin)
        r3 = self.client.post(f'/api/v1/articles/{self.article.id}/like/')
        self.assertTrue(r3.data['data']['liked'])
        self.assertEqual(r3.data['data']['like_count'], 1)

    def test_article_detail_unknown_returns_404(self):
        resp = self.client.get('/api/v1/articles/99999/')
        self.assertEqual(resp.status_code, status.HTTP_404_NOT_FOUND)

    def test_article_create_requires_admin(self):
        resp = self.client.post('/api/v1/articles/create/', {'title': 'x', 'content': 'y'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/v1/articles/create/', {'title': 'x', 'content': 'y'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_create_article(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/v1/articles/create/', {
            'title': '新文章', 'content': '内容', 'summary': '摘要',
            'category': self.category.id, 'tags': [self.tag.id], 'is_top': False,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Article.objects.count(), 2)
        created = Article.objects.get(title='新文章')
        self.assertEqual(created.author, self.admin)

    def test_admin_update_and_delete_article(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.put(
            f'/api/v1/articles/{self.article.id}/edit/',
            {'title': '改标题', 'content': '新内容'},
            format='json',
        )
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.article.refresh_from_db()
        self.assertEqual(self.article.title, '改标题')
        resp = self.client.delete(f'/api/v1/articles/{self.article.id}/delete/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Article.objects.filter(id=self.article.id).exists())


class CommentTests(BlogBaseTestCase):
    def test_comment_list_empty(self):
        resp = self.client.get(f'/api/v1/articles/{self.article.id}/comments/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['data'], [])

    def test_comment_create_requires_auth(self):
        resp = self.client.post('/api/v1/comments/create/', {
            'article': self.article.id, 'content': '测试评论',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_comment_create_and_reply_structure(self):
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/v1/comments/create/', {
            'article': self.article.id, 'content': '一级评论',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        parent_id = resp.data['data']['id']

        resp2 = self.client.post('/api/v1/comments/create/', {
            'article': self.article.id, 'content': '回复评论', 'parent': parent_id,
        }, format='json')
        self.assertEqual(resp2.status_code, status.HTTP_201_CREATED)

        resp3 = self.client.get(f'/api/v1/articles/{self.article.id}/comments/')
        comments = resp3.data['data']
        self.assertEqual(len(comments), 1)
        self.assertEqual(len(comments[0]['replies']), 1)
        self.assertEqual(Comment.objects.count(), 2)

    def test_comment_delete_permission(self):
        """删除规则：作者本人或管理员(staff)可删除，其余人 403"""
        # 先由 demo 发表一条评论
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/v1/comments/create/', {
            'article': self.article.id, 'content': '待删除评论',
        }, format='json')
        cid = resp.data['data']['id']

        # 非作者、非管理员（demo 的普通用户）本人即作者，先造一个别的普通用户来测 403
        other = User.objects.create_user(username='stranger', password='stranger123')
        self.client.force_authenticate(user=other)
        resp = self.client.delete(f'/api/v1/comments/{cid}/delete/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # 管理员(staff) 可删除任意评论 -> 204
        self.client.force_authenticate(user=self.admin)
        resp = self.client.delete(f'/api/v1/comments/{cid}/delete/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)


class TalkTests(BlogBaseTestCase):
    def test_talk_list(self):
        resp = self.client.get('/api/v1/talks/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['data']['count'], 1)

    def test_talk_like(self):
        resp = self.client.post(f'/api/v1/talks/{self.talk.id}/like/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertTrue(resp.data['data']['liked'])
        self.assertEqual(resp.data['data']['like_count'], 1)

    def test_talk_create_permission(self):
        resp = self.client.post('/api/v1/talks/create/', {'content': 'x'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.force_authenticate(user=self.user)
        resp = self.client.post('/api/v1/talks/create/', {'content': 'x'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_create_delete_talk(self):
        self.client.force_authenticate(user=self.admin)
        resp = self.client.post('/api/v1/talks/create/', {'content': '新杂谈'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        tid = resp.data['data']['id']
        self.assertEqual(resp.data['data']['author_name'], '管理员')
        resp2 = self.client.delete(f'/api/v1/talks/{tid}/delete/')
        self.assertEqual(resp2.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Talk.objects.filter(id=tid).exists())


class ProjectTests(BlogBaseTestCase):
    def setUp(self):
        super().setUp()
        self.project = Project.objects.create(
            name='Kakuki', description='博客项目', tech_stack='React,Django,MySQL',
            is_featured=True, order=0,
        )

    def test_project_list_with_tech_list(self):
        resp = self.client.get('/api/v1/projects/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data['data']
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['tech_list'], ['React', 'Django', 'MySQL'])


class ArchiveAndStatsTests(BlogBaseTestCase):
    def test_archive(self):
        resp = self.client.get('/api/v1/archives/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data['data']
        self.assertTrue(len(data) >= 1)
        year_group = data[0]
        self.assertIn('year', year_group)
        self.assertIn('months', year_group)
        articles = [a for m in year_group['months'] for a in m['articles']]
        self.assertEqual(articles[0]['id'], self.article.id)

    def test_stats(self):
        resp = self.client.get('/api/v1/stats/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        data = resp.data['data']
        self.assertEqual(data['article_count'], 1)
        self.assertEqual(data['category_count'], 1)
        self.assertEqual(data['tag_count'], 1)
        self.assertEqual(data['user_count'], 2)
        self.assertEqual(data['total_views'], 10)
        self.assertGreaterEqual(data['running_days'], 1)
