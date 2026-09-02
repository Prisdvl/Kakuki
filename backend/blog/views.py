from django.db.models import Count, Q, F, Sum
from django.utils import timezone
from rest_framework import generics, permissions, status, filters
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.views import APIView
from .models import Category, Article, Comment, Talk, Project, ArticleLike, TalkLike
from .serializers import (
    CategorySerializer,
    ArticleListSerializer, ArticleDetailSerializer, ArticleWriteSerializer,
    CommentSerializer, CommentCreateSerializer,
    TalkSerializer, TalkCreateSerializer, ProjectSerializer
)
from .permissions import IsAdminOrReadOnly
from .utils import client_ip


class StandardResponseMixin:
    """统一 list 响应格式：{code, message, data}（data 为数组或分页结构）"""

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        return Response({'code': 200, 'message': 'ok', 'data': response.data})



# --- Category ---
class CategoryListView(StandardResponseMixin, generics.ListAPIView):
    queryset = Category.objects.annotate(article_count=Count('articles')).order_by('-article_count')
    serializer_class = CategorySerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None


class CategoryManageView(StandardResponseMixin, generics.ListCreateAPIView, generics.RetrieveUpdateDestroyAPIView):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    pagination_class = None

    def get(self, request, *args, **kwargs):
        if kwargs.get('pk'):
            return self.retrieve(request, *args, **kwargs)
        self.queryset = Category.objects.annotate(article_count=Count('articles'))
        return self.list(request, *args, **kwargs)


# --- Article ---
class ArticleListView(StandardResponseMixin, generics.ListAPIView):
    queryset = Article.objects.annotate(
        comment_count=Count('comments', distinct=True),
        like_count=Count('likes', distinct=True),
    ).select_related('category', 'author').all()
    serializer_class = ArticleListSerializer
    permission_classes = [permissions.AllowAny]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'views']
    ordering = ['-is_top', '-created_at']

    def get_queryset(self):
        qs = super().get_queryset()
        category_id = self.request.query_params.get('category')
        year = self.request.query_params.get('year')
        month = self.request.query_params.get('month')
        if category_id:
            qs = qs.filter(category_id=category_id)
        if year:
            qs = qs.filter(created_at__year=year)
            if month:
                qs = qs.filter(created_at__month=month)
        return qs.distinct()


class ArticleDetailView(generics.RetrieveAPIView):
    queryset = Article.objects.annotate(
        comment_count=Count('comments', distinct=True),
        like_count=Count('likes', distinct=True),
    ).select_related('category', 'author')
    serializer_class = ArticleDetailSerializer
    permission_classes = [permissions.AllowAny]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        Article.objects.filter(pk=instance.pk).update(views=F('views') + 1)
        instance.refresh_from_db()
        liked = False
        if request.user.is_authenticated:
            liked = ArticleLike.objects.filter(article=instance, user=request.user).exists()
        else:
            ip = client_ip(request)
            liked = ArticleLike.objects.filter(article=instance, ip_address=ip).exists() if ip else False
        serializer = self.get_serializer(instance)
        data = dict(serializer.data)
        data['liked'] = liked
        return Response({'code': 200, 'message': 'ok', 'data': data})


class ArticleCreateView(generics.CreateAPIView):
    queryset = Article.objects.all()
    serializer_class = ArticleWriteSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({'code': 201, 'message': '发布成功', 'data': serializer.data},
                        status=status.HTTP_201_CREATED)


class ArticleManageView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Article.objects.all()
    serializer_class = ArticleWriteSerializer
    permission_classes = [permissions.IsAdminUser]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({'code': 200, 'message': '更新成功', 'data': serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({'code': 204, 'message': '删除成功', 'data': None},
                        status=status.HTTP_204_NO_CONTENT)


# --- Archive ---
class ArchiveListView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        """单次查询取全量文章，Python 按年月分组，避免 N+1 查询"""
        articles = Article.objects.exclude(created_at__isnull=True).order_by('-created_at').values(
            'id', 'title', 'created_at'
        )
        result = []
        month_index = {}
        for a in articles:
            dt = a['created_at']
            year, month = dt.year, dt.month
            key = (year, month)
            if key not in month_index:
                year_entry = next((r for r in result if r['year'] == year), None)
                if year_entry is None:
                    year_entry = {'year': year, 'months': []}
                    result.append(year_entry)
                month_entry = {'month': month, 'articles': []}
                year_entry['months'].append(month_entry)
                month_index[key] = month_entry
            month_index[key]['articles'].append({
                'id': a['id'],
                'title': a['title'],
                'created_at': a['created_at'],
            })
        return Response({'code': 200, 'message': 'ok', 'data': result})


# --- Comment ---
class CommentListView(StandardResponseMixin, generics.ListAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        article_id = self.kwargs.get('article_id')
        return Comment.objects.filter(
            article_id=article_id, parent__isnull=True
        ).select_related('user').prefetch_related('replies__user').all()


class CommentCreateView(generics.CreateAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentCreateSerializer
    permission_classes = [permissions.IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({'code': 201, 'message': '评论成功', 'data': serializer.data},
                        status=status.HTTP_201_CREATED)


class CommentDeleteView(generics.DestroyAPIView):
    queryset = Comment.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.user != request.user and not request.user.is_staff:
            return Response({'code': 403, 'message': '无权删除', 'data': None},
                            status=status.HTTP_403_FORBIDDEN)
        instance.delete()
        return Response({'code': 204, 'message': '删除成功', 'data': None},
                        status=status.HTTP_204_NO_CONTENT)


# --- Talk（杂谈） ---
class TalkListView(generics.ListAPIView):
    serializer_class = TalkSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return Talk.objects.annotate(
            like_count=Count('likes', distinct=True)
        ).select_related('author').order_by('-created_at')

    def list(self, request, *args, **kwargs):
        page = self.paginate_queryset(self.get_queryset())
        serializer = self.get_serializer(page, many=True)
        paginated = self.get_paginated_response(serializer.data)
        return Response({'code': 200, 'message': 'ok', 'data': paginated.data})


class TalkCreateView(generics.CreateAPIView):
    queryset = Talk.objects.all()
    serializer_class = TalkCreateSerializer
    permission_classes = [permissions.IsAdminUser]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        talk = serializer.save(author=request.user)
        data = TalkSerializer(talk, context=self.get_serializer_context()).data
        return Response({'code': 201, 'message': '发布成功', 'data': data},
                        status=status.HTTP_201_CREATED)


class TalkDeleteView(generics.DestroyAPIView):
    queryset = Talk.objects.all()
    permission_classes = [permissions.IsAdminUser]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response({'code': 204, 'message': '删除成功', 'data': None},
                        status=status.HTTP_204_NO_CONTENT)


# --- Project（项目展示） ---
class ProjectListView(generics.ListAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.AllowAny]
    pagination_class = None

    def get_queryset(self):
        return Project.objects.all()

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response({'code': 200, 'message': 'ok', 'data': serializer.data})


class ProjectManageView(generics.ListCreateAPIView, generics.RetrieveUpdateDestroyAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, *args, **kwargs):
        if kwargs.get('pk'):
            return self.retrieve(request, *args, **kwargs)
        return self.list(request, *args, **kwargs)


# --- Like（点赞） ---
class ArticleLikeView(APIView):
    """文章点赞 / 取消点赞：登录用户按用户去重，游客按 IP 去重"""
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        article = Article.objects.filter(pk=pk).first()
        if not article:
            return Response({'code': 404, 'message': '文章不存在', 'data': None},
                            status=status.HTTP_404_NOT_FOUND)
        user = request.user if request.user.is_authenticated else None
        ip = None if user else client_ip(request)
        like, created = ArticleLike.objects.get_or_create(
            article=article, user=user, ip_address=ip)
        if not created:
            like.delete()
            liked = False
        else:
            liked = True
        count = ArticleLike.objects.filter(article=article).count()
        return Response({'code': 200, 'message': 'ok',
                         'data': {'liked': liked, 'like_count': count}})


class TalkLikeView(APIView):
    """杂谈点赞 / 取消点赞"""
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        talk = Talk.objects.filter(pk=pk).first()
        if not talk:
            return Response({'code': 404, 'message': '杂谈不存在', 'data': None},
                            status=status.HTTP_404_NOT_FOUND)
        user = request.user if request.user.is_authenticated else None
        ip = None if user else client_ip(request)
        like, created = TalkLike.objects.get_or_create(talk=talk, user=user, ip_address=ip)
        if not created:
            like.delete()
            liked = False
        else:
            liked = True
        count = TalkLike.objects.filter(talk=talk).count()
        return Response({'code': 200, 'message': 'ok',
                         'data': {'liked': liked, 'like_count': count}})


# --- Stats（站点统计） ---
class SiteStatsView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        first_article = Article.objects.order_by('created_at').first()
        running_days = 1
        if first_article:
            delta = timezone.now() - first_article.created_at
            running_days = max(delta.days, 1)
        data = {
            'article_count': Article.objects.count(),
            'category_count': Category.objects.count(),
            'comment_count': Comment.objects.count(),
            'talk_count': Talk.objects.count(),
            'project_count': Project.objects.count(),
            'article_like_count': ArticleLike.objects.count(),
            'talk_like_count': TalkLike.objects.count(),
            'total_views': Article.objects.aggregate(s=Sum('views'))['s'] or 0,
            'running_days': running_days,
            'user_count': User.objects.count(),
        }
        return Response({'code': 200, 'message': 'ok', 'data': data})
