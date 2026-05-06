import axios from 'axios';

const LOCAL_WA_URL = 'http://localhost:3001';

function getDefaultWaUrl() {
  if (typeof window === 'undefined') return LOCAL_WA_URL;

  const host = window.location.hostname || 'localhost';
  const isLocalHost = host === 'localhost' || host === '127.0.0.1';

  return isLocalHost ? `http://${host}:3001` : '';
}

function getWaUrl() {
  const configured = String(import.meta.env.VITE_WA_API_URL || '').trim().replace(/\/+$/, '');
  if (configured && typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    const isLocalHost = host === 'localhost' || host === '127.0.0.1';

    if (!isLocalHost && /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?/i.test(configured)) {
      return '';
    }
  }

  return configured || getDefaultWaUrl();
}

const WA_URL = getWaUrl();

const api = axios.create({ baseURL: `${WA_URL}/api` });

export const waSocket = WA_URL;
export const isWhatsAppConfigured = Boolean(WA_URL);
export const whatsappConfigMessage = 'Configurá VITE_WA_API_URL con la URL pública del backend de WhatsApp.';

function ensureWhatsAppConfigured() {
  if (WA_URL) return null;
  const error = new Error(whatsappConfigMessage);
  error.code = 'WA_API_NOT_CONFIGURED';
  return Promise.reject(error);
}

function request(callback) {
  return ensureWhatsAppConfigured() || callback();
}

export const getConversations = (params) => request(() => api.get('/conversations', { params }));
export const getConversation = (phone) => request(() => api.get(`/conversations/${phone}`));
export const replyToConversation = (phone, body) => request(() => api.post(`/conversations/${phone}/reply`, { body }));
export const updateStatus = (phone, status) => request(() => api.patch(`/conversations/${phone}/status`, { status }));
export const updateTags = (phone, tags) => request(() => api.patch(`/conversations/${phone}/tags`, { tags }));

export const getFAQs = () => request(() => api.get('/faqs'));
export const createFAQ = (data) => request(() => api.post('/faqs', data));
export const updateFAQ = (id, data) => request(() => api.put(`/faqs/${id}`, data));
export const deleteFAQ = (id) => request(() => api.delete(`/faqs/${id}`));

export const getStats = () => request(() => api.get('/stats'));

export const getConfig = () => request(() => api.get('/config'));
export const saveConfig = (data) => request(() => api.put('/config', data));

export const addNote = (phone, body, author) => request(() => api.post(`/conversations/${phone}/notes`, { body, author }));

export const getQuickReplies = () => request(() => api.get('/quick-replies'));
export const createQuickReply = (data) => request(() => api.post('/quick-replies', data));
export const updateQuickReply = (id, data) => request(() => api.put(`/quick-replies/${id}`, data));
export const deleteQuickReply = (id) => request(() => api.delete(`/quick-replies/${id}`));

export const sendBroadcast = (data) => request(() => api.post('/broadcast', data));

export const getBudgetRequests = (params) => request(() => api.get('/budget-requests', { params }));
export const updateBudgetRequest = (id, data) => request(() => api.patch(`/budget-requests/${id}`, data));
