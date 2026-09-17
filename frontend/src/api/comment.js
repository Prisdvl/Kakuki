import request from './request';

export const getComments = (articleId) => request.get(`/articles/${articleId}/comments/`);
export const createComment = (data) => request.post('/comments/create/', data);
export const deleteComment = (id) => request.delete(`/comments/${id}/delete/`);
export const getRecentComments = (limit = 5) => request.get('/comments/recent/', { params: { limit } });
