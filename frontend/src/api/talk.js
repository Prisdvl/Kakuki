import request from './request';

export const getTalks = (params) => request.get('/talks/', { params });
export const createTalk = (data) => request.post('/talks/create/', data);
export const deleteTalk = (id) => request.delete(`/talks/${id}/delete/`);
export const likeTalk = (id) => request.post(`/talks/${id}/like/`);
