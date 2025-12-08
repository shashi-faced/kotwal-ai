import { API_URLS } from '@/lib/url';
import { handleUnauthorized } from '@/lib/session';
import { getStoredToken } from '@/lib/authStorage';

export interface BillingRecord {
  id: string;
  description: string;
  amount: number;
  currency?: string;
  tokens?: number;
  createdAt: string;
}

export interface BillingAggregatePayload {
  from: string;
  to: string;
}

export interface BillingAggregate {
  totalAmount?: number;
  totalTokens?: number;
  currency?: string;
  [key: string]: string | number | undefined;
}

const buildHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

export const fetchBillingRecords = async (authToken?: string): Promise<BillingRecord[]> => {
  const token = authToken ?? getStoredToken();
  const response = await fetch(API_URLS.billing.records, {
    method: 'GET',
    headers: buildHeaders(token),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return [];
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.message || 'Failed to fetch billing records');
  }

  const data = (await response.json()) as { records?: BillingRecord[] } | BillingRecord[];

  if (Array.isArray(data)) return data;
  return data.records ?? [];
};

export const fetchBillingAggregate = async (
  payload: BillingAggregatePayload,
  authToken?: string,
): Promise<BillingAggregate | null> => {
  const token = authToken ?? getStoredToken();
  const response = await fetch(API_URLS.billing.aggregate, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return null;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.message || 'Failed to fetch billing aggregate');
  }

  return (await response.json()) as BillingAggregate;
};

export const fetchBillingAggregateMonthly = async (authToken?: string): Promise<BillingAggregate | null> => {
  const token = authToken ?? getStoredToken();
  const response = await fetch(API_URLS.billing.aggregateMonthly, {
    method: 'POST',
    headers: buildHeaders(token),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return null;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody?.message || 'Failed to fetch monthly billing aggregate');
  }

  return (await response.json()) as BillingAggregate;
};
