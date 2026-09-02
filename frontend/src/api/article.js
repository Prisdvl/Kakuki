import request from './request';

export const getArticles = (params) => request.get('/articles/', { params });
export const getArticleDetail = (id) => request.get(`/articles/${id}/`);
export const createArticle = (data) => request.post('/articles/create/', data);
export const updateArticle = (id, data) => request.put(`/articles/${id}/edit/`, data);
export const deleteArticle = (id) => request.delete(`/articles/${id}/delete/`);
export const likeArticle = (id) => request.post(`/articles/${id}/like/`);
export const getCategories = () => request.get('/categories/');
export const getTags = () => request.get('/tags/');
export const getArchives = () => request.get('/archives/');
export const getSiteStats = () => request.get('/stats/');
