import request from './request';

export const login = (data) => request.post('/auth/login/', data);
export const register = (data) => request.post('/auth/register/', data);
export const getUserProfile = () => request.get('/auth/me/');
export const updateUserProfile = (data) => request.put('/auth/me/', data);
export const changePassword = (data) => request.post('/auth/change-password/', data);
