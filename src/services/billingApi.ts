/**
 * Billing API service.
 *
 * Migrated to apiFetch / apiJson — see services/adminApi.ts header for the
 * full rationale. The legacy `authToken` parameter is preserved for source
 * compatibility but ignored; token resolution lives in apiFetch.
 */
import { API_URLS } from '@/lib/url';
import { apiJson, ApiError } from '@/lib/apiClient';

export interface BillingRecord {
  id: string;
  description?: string;
  amount?: number;
  currency?: string;
  tokens?: number;
  createdAt: string;
  periodStart?: string;
  periodEnd?: string;
  totalCost?: number;
  status?: string;
  tenantId?: string;
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

export interface BillingStatementAggregatePayload {
  periodStart: string;
  periodEnd: string;
}

const okOrNull = async <T>(p: Promise<T>): Promise<T | null> => {
  try { return await p; } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
};

export const fetchBillingRecords = async (_authToken?: string): Promise<BillingRecord[]> => {
  void _authToken;
  try {
    const data = await apiJson<{ records?: BillingRecord[] } | BillingRecord[]>(
      API_URLS.billing.records, { method: 'GET' },
    );
    if (Array.isArray(data)) return data;
    return data.records ?? [];
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return [];
    throw err;
  }
};

export const fetchBillingAggregate = async (
  payload: BillingAggregatePayload,
  _authToken?: string,
): Promise<BillingAggregate | null> => {
  void _authToken;
  return okOrNull(apiJson<BillingAggregate>(
    API_URLS.billing.aggregate, { method: 'POST', body: payload },
  ));
};

export const fetchBillingStatementAggregate = async (
  payload: BillingStatementAggregatePayload,
  _authToken?: string,
): Promise<BillingRecord | null> => {
  void _authToken;
  return okOrNull((async () => {
    const data = await apiJson<{ record?: BillingRecord } | BillingRecord | null>(
      API_URLS.billing.aggregate, { method: 'POST', body: payload },
    );
    if (data && typeof data === 'object' && 'record' in data) {
      return (data as { record?: BillingRecord }).record ?? null;
    }
    return (data as BillingRecord | null) ?? null;
  })()) as Promise<BillingRecord | null>;
};

export const fetchBillingAggregateMonthly = async (
  _authToken?: string,
): Promise<BillingAggregate | null> => {
  void _authToken;
  return okOrNull(apiJson<BillingAggregate>(
    API_URLS.billing.aggregateMonthly, { method: 'POST' },
  ));
};
