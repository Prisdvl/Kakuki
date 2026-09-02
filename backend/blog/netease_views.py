import time
import json
import requests
import urllib3
from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Prisdvl's known info
PRISDVL_PLAYLIST_ID = 2215753622
PRISDVL_UID = 1450284080

NETEASE_BASE = 'https://music.163.com'

NETEASE_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://music.163.com',
    'Content-Type': 'application/x-www-form-urlencoded',
}

# In-memory cache
_cache = {}
CACHE_TTL = 600  # 10 minutes


def _get_cache(key):
    if key in _cache:
        ts, data = _cache[key]
        if time.time() - ts < CACHE_TTL:
            return data
        del _cache[key]
    return None


def _set_cache(key, data):
    _cache[key] = (time.time(), data)


def _netease_get(endpoint, params=None, timeout=10):
    url = f'{NETEASE_BASE}{endpoint}'
    try:
        resp = requests.get(url, params=params, headers=NETEASE_HEADERS, timeout=timeout)
        if resp.ok:
            return resp.json()
        return None
    except Exception:
        return None


def _netease_post(endpoint, data=None, timeout=10):
    url = f'{NETEASE_BASE}{endpoint}'
    try:
        resp = requests.post(url, data=data, headers=NETEASE_HEADERS, timeout=timeout)
        if resp.ok:
            return resp.json()
        return None
    except Exception:
        return None


def _build_outer_url(song_id):
    return f'{NETEASE_BASE}/song/media/outer/url?id={song_id}.mp3'


def _fetch_playlist_tracks(playlist_id, limit=100):
    """Fetch tracks from a playlist, filter VIP, return mapped tracks + urls."""
    pl_data = _netease_get('/api/v6/playlist/detail', params={
        'id': playlist_id, 'n': 0, 's': 0
    })
    if pl_data is None:
        return None

    playlist = pl_data.get('playlist', {})
    track_ids = playlist.get('trackIds', [])
    if not track_ids:
        return None

    # Batch fetch song details
    song_limit = min(limit, len(track_ids))
    batch_size = 50
    raw_tracks = []

    for i in range(0, song_limit, batch_size):
        batch = track_ids[i:i + batch_size]
        ids_param = json.dumps([{'id': t['id']} for t in batch])
        result = _netease_post('/api/v3/song/detail', data={'c': ids_param})
        if result and result.get('songs'):
            raw_tracks.extend(result['songs'])

    # Filter VIP and map
    mapped_tracks = []
    for t in raw_tracks:
        fee = t.get('fee', 0)
        if fee in (1, 4):
            continue
        ar = t.get('ar') or t.get('artists') or []
        al = t.get('al') or t.get('album') or {}
        mapped_tracks.append({
            'id': t['id'],
            'name': t.get('name', ''),
            'ar': [{'name': a.get('name', '')} for a in ar],
            'al': {
                'name': al.get('name', ''),
                'picUrl': al.get('picUrl', ''),
            },
            'duration': t.get('dt', t.get('duration', 0)),
        })

    return {
        'playlist': {
            'id': playlist_id,
            'name': playlist.get('name', ''),
            'coverImgUrl': playlist.get('coverImgUrl', ''),
            'trackCount': playlist.get('trackCount', len(track_ids)),
            'creator': 'Prisdvl',
            'tracks': mapped_tracks,
        },
        'song_urls': [{'id': t['id'], 'url': _build_outer_url(t['id'])} for t in mapped_tracks],
    }


@api_view(['GET'])
def netease_playlists(request):
    """Get all of Prisdvl's playlists."""
    cached = _get_cache('playlists')
    if cached:
        return Response(cached)

    data = _netease_get('/api/user/playlist', params={'uid': PRISDVL_UID, 'limit': 50})
    if data is None:
        return Response({'error': '无法连接到网易云 API'}, status=status.HTTP_502_BAD_GATEWAY)

    playlists = []
    for pl in data.get('playlist', []):
        playlists.append({
            'id': pl['id'],
            'name': pl.get('name', ''),
            'coverImgUrl': pl.get('coverImgUrl', ''),
            'trackCount': pl.get('trackCount', 0),
            'playCount': pl.get('playCount', 0),
        })

    result = {'playlists': playlists}
    _set_cache('playlists', result)
    return Response(result)


@api_view(['GET'])
def netease_bootstrap(request):
    """Fetch a playlist with tracks. Uses playlist_id param or defaults to Prisdvl's liked music."""
    playlist_id = request.query_params.get('playlist_id', PRISDVL_PLAYLIST_ID)
    limit = int(request.query_params.get('limit', 100))

    cache_key = f'bootstrap_{playlist_id}'
    cached = _get_cache(cache_key)
    if cached:
        return Response(cached)

    result = _fetch_playlist_tracks(playlist_id, limit)
    if result is None:
        return Response({'error': '无法获取歌单数据'}, status=status.HTTP_502_BAD_GATEWAY)

    _set_cache(cache_key, result)
    return Response(result)


@api_view(['GET'])
def netease_lyric(request, song_id):
    """Get song lyrics from Netease direct API."""
    cache_key = f'lyric_{song_id}'
    cached = _get_cache(cache_key)
    if cached:
        return Response(cached)

    data = _netease_get('/api/song/lyric', params={
        'os': 'pc', 'id': song_id, 'lv': -1, 'kv': -1, 'tv': -1
    })
    if data is None:
        return Response({'error': 'API not available'}, status=status.HTTP_502_BAD_GATEWAY)
    _set_cache(cache_key, data)
    return Response(data)


@api_view(['GET'])
def netease_song_url(request, song_id):
    """Get playable song URL using outer URL redirect."""
    return Response({'data': [{'id': song_id, 'url': _build_outer_url(song_id)}]})


@api_view(['GET'])
def netease_playlist(request, playlist_id):
    """Get playlist detail."""
    data = _netease_get('/api/v6/playlist/detail', params={'id': playlist_id, 'n': 0, 's': 0})
    if data is None:
        return Response({'error': 'API not available'}, status=status.HTTP_502_BAD_GATEWAY)
    return Response(data)


@api_view(['GET'])
def netease_search(request):
    """Search by keywords."""
    keywords = request.query_params.get('keywords', '')
    data = _netease_get('/api/search/get', params={'s': keywords, 'type': 1000, 'limit': 10})
    if data is None:
        return Response({'error': 'API not available'}, status=status.HTTP_502_BAD_GATEWAY)
    return Response(data)


@api_view(['GET'])
def netease_user_playlist(request, uid):
    """Get user playlists."""
    data = _netease_get('/api/user/playlist', params={'uid': uid, 'limit': 30})
    if data is None:
        return Response({'error': 'API not available'}, status=status.HTTP_502_BAD_GATEWAY)
    return Response(data)


@api_view(['GET'])
def netease_playlist_tracks(request, playlist_id):
    """Get tracks from a playlist (with VIP filter and outer URLs)."""
    limit = int(request.query_params.get('limit', 100))
    cache_key = f'bootstrap_{playlist_id}'
    cached = _get_cache(cache_key)
    if cached:
        return Response(cached)

    result = _fetch_playlist_tracks(playlist_id, limit)
    if result is None:
        return Response({'error': 'API not available'}, status=status.HTTP_502_BAD_GATEWAY)
    _set_cache(cache_key, result)
    return Response(result)
