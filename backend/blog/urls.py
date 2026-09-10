from django.urls import path
from . import views
from . import leetcode_views
from . import netease_views

urlpatterns = [
    # Categories
    path('categories/', views.CategoryListView.as_view(), name='category-list'),
    path('categories/manage/', views.CategoryManageView.as_view(), name='category-manage'),
    path('categories/manage/<int:pk>/', views.CategoryManageView.as_view(), name='category-manage-detail'),
    # Articles
    path('articles/', views.ArticleListView.as_view(), name='article-list'),
    path('articles/create/', views.ArticleCreateView.as_view(), name='article-create'),
    path('articles/<int:pk>/', views.ArticleDetailView.as_view(), name='article-detail'),
    path('articles/<int:pk>/edit/', views.ArticleManageView.as_view(), name='article-edit'),
    path('articles/<int:pk>/delete/', views.ArticleManageView.as_view(), name='article-delete'),
    # Archive
    path('archives/', views.ArchiveListView.as_view(), name='archive-list'),
    # Comments
    path('articles/<int:article_id>/comments/', views.CommentListView.as_view(), name='comment-list'),
    path('comments/create/', views.CommentCreateView.as_view(), name='comment-create'),
    path('comments/<int:pk>/delete/', views.CommentDeleteView.as_view(), name='comment-delete'),
    # Likes
    path('articles/<int:pk>/like/', views.ArticleLikeView.as_view(), name='article-like'),
    path('talks/<int:pk>/like/', views.TalkLikeView.as_view(), name='talk-like'),
    # Talks
    path('talks/', views.TalkListView.as_view(), name='talk-list'),
    path('talks/create/', views.TalkCreateView.as_view(), name='talk-create'),
    path('talks/<int:pk>/delete/', views.TalkDeleteView.as_view(), name='talk-delete'),
    # Projects
    path('projects/', views.ProjectListView.as_view(), name='project-list'),
    path('projects/manage/', views.ProjectManageView.as_view(), name='project-manage'),
    path('projects/manage/<int:pk>/', views.ProjectManageView.as_view(), name='project-manage-detail'),
    # Site stats
    path('stats/', views.SiteStatsView.as_view(), name='site-stats'),
    # LeetCode
    path('leetcode/<str:username>/', leetcode_views.leetcode_stats, name='leetcode-stats'),
    # Netease
    path('netease/playlists/', netease_views.netease_playlists, name='netease-playlists'),
    path('netease/playlist/<int:playlist_id>/', netease_views.netease_playlist, name='netease-playlist'),
    path('netease/playlist/<int:playlist_id>/tracks/', netease_views.netease_playlist_tracks, name='netease-playlist-tracks'),
    path('netease/song/<int:song_id>/', netease_views.netease_song_url, name='netease-song-url'),
    path('netease/song/<int:song_id>/stream/', netease_views.netease_stream, name='netease-song-stream'),
    path('netease/song/<int:song_id>/lyric/', netease_views.netease_lyric, name='netease-lyric'),
    path('netease/search/', netease_views.netease_search, name='netease-search'),
    path('netease/user/<int:uid>/', netease_views.netease_user_playlist, name='netease-user-playlist'),
    path('netease/bootstrap/', netease_views.netease_bootstrap, name='netease-bootstrap'),
]
