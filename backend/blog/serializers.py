from rest_framework import serializers
from .models import Category, Tag, Article, Comment, Talk, Project, TalkLike
from .utils import client_ip


class CategorySerializer(serializers.ModelSerializer):
    article_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ('id', 'name', 'description', 'article_count')


class TagSerializer(serializers.ModelSerializer):
    article_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Tag
        fields = ('id', 'name', 'article_count')


class ArticleListSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    author_name = serializers.CharField(source='author.nickname', read_only=True)
    comment_count = serializers.IntegerField(read_only=True)
    like_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Article
        fields = (
            'id', 'title', 'summary', 'cover_image', 'category', 'tags',
            'author_name', 'views', 'is_top', 'comment_count', 'like_count',
            'created_at', 'updated_at'
        )


class ArticleDetailSerializer(serializers.ModelSerializer):
    category = CategorySerializer(read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    author_name = serializers.CharField(source='author.nickname', read_only=True)
    author_id = serializers.IntegerField(source='author.id', read_only=True)
    comment_count = serializers.IntegerField(read_only=True)
    like_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Article
        fields = (
            'id', 'title', 'content', 'summary', 'cover_image',
            'category', 'tags', 'author_name', 'author_id',
            'views', 'is_top', 'comment_count', 'like_count', 'created_at', 'updated_at'
        )


class ArticleWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Article
        fields = ('title', 'content', 'summary', 'cover_image', 'category', 'tags', 'is_top')


class CommentSerializer(serializers.ModelSerializer):
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    user_name = serializers.CharField(source='user.nickname', read_only=True)
    user_avatar = serializers.ImageField(source='user.avatar', read_only=True)
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ('id', 'article', 'user_id', 'user_name', 'user_avatar',
                  'content', 'parent', 'replies', 'created_at')
        read_only_fields = ('id', 'created_at')

    def get_replies(self, obj):
        replies = getattr(obj, '_prefetched_replies', obj.replies.all())
        if replies:
            return CommentSerializer(replies, many=True).data
        return []


class CommentCreateSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(read_only=True)

    class Meta:
        model = Comment
        fields = ('id', 'article', 'content', 'parent')


class TalkSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.nickname', read_only=True)
    like_count = serializers.IntegerField(read_only=True)
    liked = serializers.SerializerMethodField()

    class Meta:
        model = Talk
        fields = ('id', 'content', 'author_name', 'like_count', 'liked', 'created_at')

    def get_liked(self, obj):
        request = self.context.get('request')
        user = getattr(request, 'user', None) if request else None
        if user is not None and user.is_authenticated:
            return TalkLike.objects.filter(talk=obj, user=user).exists()
        ip = client_ip(request) if request else None
        return TalkLike.objects.filter(talk=obj, ip_address=ip).exists() if ip else False


class TalkCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Talk
        fields = ('content',)


class ProjectSerializer(serializers.ModelSerializer):
    tech_list = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = ('id', 'name', 'description', 'url', 'repo_url',
                  'tech_stack', 'tech_list', 'cover_image', 'is_featured', 'order', 'created_at')

    def get_tech_list(self, obj):
        return obj.tech_list
