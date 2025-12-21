const BASE_URL = 'https://kotwal.onrender.com';

const withBase = (path: string) => `${BASE_URL}${path}`;

export const API_URLS = {
  auth: {
    login: withBase('/api/auth/login'),
  },
  chat: {
    models: withBase('/api/chat-models'),
    send: withBase('/api/chat'),
    sessions: withBase('/api/chat-sessions'),
  },
  user: {
    role: withBase('/api/auth/user/role'),
  },
  admin: {
    licenseInfo: withBase('/api/auth/admin/license-info'),
    createUser: withBase('/api/auth/create-user'),
    userDetails: withBase('/api/auth/admin/user'),
  },
  dashboard: {
    users: withBase('/api/dashboard/users'),
    deleteUser: withBase('/api/dashboard/users'),
    summary: withBase('/api/dashboard/summary'),
    alerts: withBase('/api/dashboard/alerts'),
  },
  billing: {
    records: withBase('/api/billing'),
    aggregate: withBase('/api/billing/aggregate'),
    aggregateMonthly: withBase('/api/billing/aggregate-monthly'),
  },
};

export type ApiUrlKey = keyof typeof API_URLS;
