const BASE_URL = 'https://kotwal.onrender.com';

const withBase = (path: string) => `${BASE_URL}${path}`;

export const API_URLS = {
  auth: {
    login: withBase('/api/auth/login'),
  },
  chat: {
    models: withBase('/api/chat-models'),
    send: withBase('/api/chat'),
  },
  user: {
    role: withBase('/api/auth/user/role'),
  },
};

export type ApiUrlKey = keyof typeof API_URLS;
