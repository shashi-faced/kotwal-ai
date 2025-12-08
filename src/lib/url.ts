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
  admin: {
    licenseInfo: withBase('/api/auth/admin/license-info'),
  },
  billing: {
    records: withBase('/api/billing'),
    aggregate: withBase('/api/billing/aggregate'),
    aggregateMonthly: withBase('/api/billing/aggregate-monthly'),
  },
};

export type ApiUrlKey = keyof typeof API_URLS;
