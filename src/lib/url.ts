/**
 * API URL registry. Override base URL via VITE_API_BASE_URL.
 */
const BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'https://api.aikotwal.com';

const withBase = (path: string) => `${BASE_URL}${path}`;

export const API_BASE_URL = BASE_URL;

export const API_URLS = {
  auth: {
    login: withBase('/api/auth/login'),
    refresh: withBase('/api/auth/refresh'),
    logout: withBase('/api/auth/logout'),
    me: withBase('/api/auth/me'),
    register: withBase('/api/auth/register'),
    changePassword: withBase('/api/auth/change-password'),
  },
  chat: {
    models: withBase('/api/chat-models'),
    send: withBase('/api/chat'),
    stream: withBase('/api/chat/stream'),
    sessions: withBase('/api/chat/sessions'),
  },
  user: {
    role: withBase('/api/auth/me'),
  },
  admin: {
    licenseInfo: withBase('/api/auth/admin/license'),
    createUser: withBase('/api/auth/register'),
    userDetails: withBase('/api/auth/admin/users'),
    changePassword: withBase('/api/auth/admin/change-password'),
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
    aggregateMonthly: withBase('/api/billing/aggregate/monthly'),
  },
  policy: {
    base: withBase('/api/policy'),
    defaults: withBase('/api/policy/defaults'),
  },
  deviceTokens: {
    base: withBase('/api/device-tokens'),
  },
};

export type ApiUrlKey = keyof typeof API_URLS;
