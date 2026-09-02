import axios from 'axios';

const isDev = import.meta.env.DEV;
const BASE = isDev ? '/music-api' : 'https://163api.qijieya.cn';

const musicRequest = axios.create({
  baseURL: BASE,
  timeout: 15000,
  withCredentials: false,
});

let cookieString = '';

musicRequest.interceptors.request.use((config) => {
  if (cookieString) {
    config.headers = config.headers || {};
    config.headers.Cookie = cookieString;
  }
  return config;
});

musicRequest.interceptors.response.use(
  (res) => {
    const setCookie = res.headers['set-cookie'];
    if (setCookie && Array.isArray(setCookie)) {
      cookieString = setCookie
        .map((c) => c.split(';')[0])
        .join('; ');
    } else if (setCookie && typeof setCookie === 'string') {
      cookieString = setCookie.split(';')[0];
    }
    return res.data;
  },
  (err) => {
    if (err.response?.headers?.['set-cookie']) {
      const setCookie = err.response.headers['set-cookie'];
      if (Array.isArray(setCookie)) {
        cookieString = setCookie.map((c) => c.split(';')[0]).join('; ');
      } else {
        cookieString = setCookie.split(';')[0];
      }
    }
    return Promise.reject(err);
  }
);

export const musicApi = {
  getUserPlaylists: (uid) => musicRequest.get('/user/playlist', { params: { uid } }),
  getPlaylistTracks: (id, limit = 30, offset = 0) =>
    musicRequest.get('/playlist/track/all', { params: { id, limit, offset } }),
  getPlaylistDetail: (id) => musicRequest.get('/playlist/detail', { params: { id } }),

  getSongUrl: (id) => musicRequest.get('/song/url', { params: { id } }),
  getLyric: (id) => musicRequest.get('/lyric', { params: { id } }),

  search: (keywords, limit = 10) =>
    musicRequest.get('/search', { params: { keywords, limit } }),
};

export const getCookieString = () => cookieString;
export const setCookieString = (s) => { cookieString = s; };

export default musicApi;
