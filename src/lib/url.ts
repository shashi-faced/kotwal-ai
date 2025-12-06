export const API_URLS = {
  auth: {
    login: '/api/auth/login',
  },
  chat: {
    models: '/api/chat-models',
    send: '/api/chat',
  },
};

export type ApiUrlKey = keyof typeof API_URLS;
