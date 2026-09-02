from django.db import models
from users.models import User


class Category(models.Model):
    name = models.CharField(max_length=50, unique=True, verbose_name='分类名称')
    description = models.TextField(blank=True, verbose_name='分类描述')

    class Meta:
        verbose_name = '分类'
        verbose_name_plural = '分类'
        ordering = ['id']

    def __str__(self):
        return self.name



class Article(models.Model):
    title = models.CharField(max_length=200, verbose_name='标题')
    content = models.TextField(verbose_name='内容')
    summary = models.TextField(blank=True, max_length=500, verbose_name='摘要')
    cover_image = models.ImageField(upload_to='covers/', blank=True, null=True, verbose_name='封面图')
    category = models.ForeignKey(
        Category, on_delete=models.SET_NULL,
        null=True, blank=True, related_name='articles',
        verbose_name='分类'
    )
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='articles', verbose_name='作者')
    views = models.IntegerField(default=0, verbose_name='阅读量')
    is_top = models.BooleanField(default=False, verbose_name='置顶')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        verbose_name = '文章'
        verbose_name_plural = '文章'
        ordering = ['-is_top', '-created_at']
        indexes = [
            models.Index(fields=['-is_top', '-created_at']),
            models.Index(fields=['category', '-created_at']),
            models.Index(fields=['author', '-created_at']),
            models.Index(fields=['views']),
        ]

    def __str__(self):
        return self.title


class Comment(models.Model):
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='comments', verbose_name='文章')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments', verbose_name='用户')
    content = models.TextField(verbose_name='评论内容')
    parent = models.ForeignKey(
        'self', on_delete=models.CASCADE, null=True, blank=True,
        related_name='replies', verbose_name='父评论'
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '评论'
        verbose_name_plural = '评论'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.user.nickname or self.user.username}: {self.content[:30]}...'


class Talk(models.Model):
    """杂谈：简短的日常想法 / 碎片化记录"""
    content = models.TextField(max_length=500, verbose_name='内容')
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name='talks', verbose_name='作者')
    views = models.IntegerField(default=0, verbose_name='浏览量')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '杂谈'
        verbose_name_plural = '杂谈'
        ordering = ['-created_at']
        indexes = [models.Index(fields=['-created_at'])]

    def __str__(self):
        return f'{self.content[:30]}...'


class Project(models.Model):
    """项目展示"""
    name = models.CharField(max_length=100, verbose_name='项目名称')
    description = models.TextField(max_length=1000, verbose_name='项目描述')
    url = models.URLField(blank=True, verbose_name='项目链接')
    repo_url = models.URLField(blank=True, verbose_name='仓库链接')
    tech_stack = models.CharField(max_length=200, blank=True, help_text='逗号分隔，如：React,Django,MySQL', verbose_name='技术栈')
    cover_image = models.ImageField(upload_to='projects/', blank=True, null=True, verbose_name='项目封面')
    is_featured = models.BooleanField(default=False, verbose_name='精选')
    order = models.IntegerField(default=0, verbose_name='排序权重')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '项目'
        verbose_name_plural = '项目'
        ordering = ['-is_featured', 'order', '-created_at']

    def __str__(self):
        return self.name

    @property
    def tech_list(self):
        return [t.strip() for t in self.tech_stack.split(',') if t.strip()]


class ArticleLike(models.Model):
    """文章点赞记录（登录用户按用户去重，游客按 IP 去重）"""
    article = models.ForeignKey(Article, on_delete=models.CASCADE, related_name='likes', verbose_name='文章')
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='article_likes', verbose_name='用户')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP 地址')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '文章点赞'
        verbose_name_plural = '文章点赞'
        # NULL 字段不参与唯一性判断（标准 SQL 行为），兼容 SQLite/MySQL
        constraints = [
            models.UniqueConstraint(fields=['article', 'user'], name='uniq_article_like_user'),
            models.UniqueConstraint(fields=['article', 'ip_address'], name='uniq_article_like_ip'),
        ]

    def __str__(self):
        return f'{self.article.title} <- {self.user or self.ip_address}'


class TalkLike(models.Model):
    """杂谈点赞记录"""
    talk = models.ForeignKey(Talk, on_delete=models.CASCADE, related_name='likes', verbose_name='杂谈')
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='talk_likes', verbose_name='用户')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP 地址')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        verbose_name = '杂谈点赞'
        verbose_name_plural = '杂谈点赞'
        constraints = [
            models.UniqueConstraint(fields=['talk', 'user'], name='uniq_talk_like_user'),
            models.UniqueConstraint(fields=['talk', 'ip_address'], name='uniq_talk_like_ip'),
        ]

    def __str__(self):
        return f'{self.talk_id} <- {self.user or self.ip_address}'
