from django.contrib import admin
from .models import Category, Article, Comment, Talk, Project

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'article_count')
    search_fields = ('name',)

    def article_count(self, obj):
        return obj.articles.count()
    article_count.short_description = '文章数量'


    def article_count(self, obj):
        return obj.articles.count()
    article_count.short_description = '文章数量'

@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'category', 'author', 'views', 'is_top', 'created_at')
    list_filter = ('category', 'is_top', 'created_at')
    search_fields = ('title', 'content')
    date_hierarchy = 'created_at'

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'article', 'user', 'content_preview', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('content',)

    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = '评论内容'

@admin.register(Talk)
class TalkAdmin(admin.ModelAdmin):
    list_display = ('id', 'content_preview', 'author', 'views', 'created_at')
    search_fields = ('content',)

    def content_preview(self, obj):
        return obj.content[:40] + '...' if len(obj.content) > 40 else obj.content
    content_preview.short_description = '内容'

@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'is_featured', 'order', 'created_at')
    list_filter = ('is_featured',)
    search_fields = ('name', 'description')
