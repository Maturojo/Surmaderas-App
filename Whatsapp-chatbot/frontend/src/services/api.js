import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getConversations = (params) => api.get('/conversations', { params });
export const getConversation = (phone) => api.get(`/conversations/${phone}`);
export const replyToConversation = (phone, body) => api.post(`/conversations/${phone}/reply`, { body });
export const updateStatus = (phone, status) => api.patch(`/conversations/${phone}/status`, { status });
export const updateTags = (phone, tags) => api.patch(`/conversations/${phone}/tags`, { tags });

export const getFAQs = () => api.get('/faqs');
export const createFAQ = (data) => api.post('/faqs', data);
export const updateFAQ = (id, data) => api.put(`/faqs/${id}`, data);
export const deleteFAQ = (id) => api.delete(`/faqs/${id}`);

export const getStats = () => api.get('/stats');

export const getConfig = () => api.get('/config');
export const saveConfig = (data) => api.put('/config', data);
