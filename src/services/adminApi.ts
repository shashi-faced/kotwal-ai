import { API_URLS } from '@/lib/url';
import { handleUnauthorized } from '@/lib/session';
import { getStoredToken } from '@/lib/authStorage';

export interface LicenseInfo {
  availableLicenses: number;
  assignedLicenses: number;
  remainingLicenses: number;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: 'admin' | 'user';
}

export interface CreateUserResponse {
  message: string;
}

export interface AdminUserDetails {
  name: string;
  email: string;
  role: string;
  status?: string;
  permissions?: string[];
}

export interface DashboardUser {
  email: string;
  name: string;
  role: string;
  status?: string;
  lastLogin?: string;
  createdAt: string;
}

export interface DashboardSummary {
  activeUsers: number;
  chatsToday: number;
  alerts: number;
  spend: number;
}

export interface DashboardAlertPiiDetails {
  riskScore: number;
  type: string;
  found: boolean;
}

export interface DashboardAlert {
  id: string;
  riskCategory: string;
  createdAt: string;
  userName: string;
  userEmail: string;
  message: string;
  piiDetails: DashboardAlertPiiDetails | null;
  override: boolean;
  piiFlag: boolean;
  error: string | null;
}

export interface DashboardAlertCounts {
  piiFlagCounts: Record<string, number>;
  overrideCounts: Record<string, number>;
  highRisk: number;
  medRisk: number;
  lowRisk: number;
  overrideCount: number;
  piiCount: number;
}

export interface DashboardAlertsPagination {
  limit: number;
  offset: number;
  total: number;
}

export interface DashboardAlertsResponse {
  counts: DashboardAlertCounts;
  alerts: DashboardAlert[];
  pagination: DashboardAlertsPagination;
}

export interface DashboardAlertsQuery {
  piiFlag?: boolean;
  override?: boolean;
  riskScoreMin?: number;
  riskScoreMax?: number;
  offset?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface UpdateAdminUserPayload {
  email: string;
  name?: string;
  role?: 'admin' | 'user';
  status?: string;
  permissions?: string[];
}

export interface UpdateAdminUserResponse {
  message: string;
}

export interface DeleteAdminUserResponse {
  message: string;
}

interface ApiErrorBody {
  message?: string;
}

const buildHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

const parseErrorMessage = (body: ApiErrorBody | Record<string, never>, fallback: string) =>
  (body as ApiErrorBody).message || fallback;

export const fetchLicenseInfo = async (authToken?: string): Promise<LicenseInfo | null> => {
  const token = authToken ?? getStoredToken();

  const response = await fetch(API_URLS.admin.licenseInfo, {
    method: 'GET',
    headers: buildHeaders(token),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return null;
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiErrorBody | Record<string, never>;
    throw new Error(parseErrorMessage(errorBody, 'Failed to fetch license info'));
  }

  const data = (await response.json()) as LicenseInfo;
  return data;
};

export const fetchDashboardUsers = async (authToken?: string): Promise<DashboardUser[]> => {
  const token = authToken ?? getStoredToken();

  const response = await fetch(API_URLS.dashboard.users, {
    method: 'GET',
    headers: buildHeaders(token),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return [];
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiErrorBody | Record<string, never>;
    throw new Error(parseErrorMessage(errorBody, 'Failed to fetch users'));
  }

  const data = (await response.json().catch(() => ({}))) as { users?: DashboardUser[] } | DashboardUser[];

  if (Array.isArray(data)) return data;
  return data.users ?? [];
};

export const fetchDashboardSummary = async (authToken?: string): Promise<DashboardSummary | null> => {
  const token = authToken ?? getStoredToken();

  const response = await fetch(API_URLS.dashboard.summary, {
    method: 'GET',
    headers: buildHeaders(token),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return null;
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiErrorBody | Record<string, never>;
    throw new Error(parseErrorMessage(errorBody, 'Failed to fetch dashboard summary'));
  }

  const data = (await response.json().catch(() => ({}))) as DashboardSummary | Record<string, never>;

  return {
    activeUsers: Number((data as DashboardSummary).activeUsers ?? 0),
    chatsToday: Number((data as DashboardSummary).chatsToday ?? 0),
    alerts: Number((data as DashboardSummary).alerts ?? 0),
    spend: Number((data as DashboardSummary).spend ?? 0),
  };
};

export const fetchDashboardAlerts = async (
  query?: DashboardAlertsQuery,
  authToken?: string
): Promise<DashboardAlertsResponse | null> => {
  const token = authToken ?? getStoredToken();

  const baseUrl = API_URLS.dashboard.alerts;
  const url = new URL(baseUrl);

  if (query) {
    const params = new URLSearchParams();
    if (typeof query.piiFlag === 'boolean') params.set('piiFlag', String(query.piiFlag));
    if (typeof query.override === 'boolean') params.set('override', String(query.override));
    if (typeof query.riskScoreMin === 'number') params.set('riskScoreMin', String(query.riskScoreMin));
    if (typeof query.riskScoreMax === 'number') params.set('riskScoreMax', String(query.riskScoreMax));
    if (typeof query.offset === 'number') params.set('offset', String(query.offset));
    if (typeof query.limit === 'number') params.set('limit', String(query.limit));
    if (query.sortBy) params.set('sortBy', query.sortBy);
    if (query.sortOrder) params.set('sortOrder', query.sortOrder);

    url.search = params.toString();
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(token),
  });

  if (response.status === 401) {
    handleUnauthorized();
    return null;
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiErrorBody | Record<string, never>;
    throw new Error(parseErrorMessage(errorBody, 'Failed to fetch alerts'));
  }

  const data = (await response.json().catch(() => ({}))) as DashboardAlertsResponse | Record<string, never>;

  const counts = (data as DashboardAlertsResponse).counts;
  const alerts = (data as DashboardAlertsResponse).alerts ?? [];
  const pagination = (data as DashboardAlertsResponse).pagination;

  return {
    counts: {
      piiFlagCounts: counts?.piiFlagCounts ?? {},
      overrideCounts: counts?.overrideCounts ?? {},
      highRisk: Number(counts?.highRisk ?? 0),
      medRisk: Number(counts?.medRisk ?? 0),
      lowRisk: Number(counts?.lowRisk ?? 0),
      overrideCount: Number(counts?.overrideCount ?? 0),
      piiCount: Number(counts?.piiCount ?? 0),
    },
    alerts,
    pagination: pagination ?? { limit: alerts.length, offset: 0, total: alerts.length },
  };
};

export const createAdminUser = async (
  payload: CreateUserPayload,
  authToken?: string
): Promise<CreateUserResponse> => {
  const token = authToken ?? getStoredToken();

  const response = await fetch(API_URLS.admin.createUser, {
    method: 'POST',
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiErrorBody | Record<string, never>;
    throw new Error(parseErrorMessage(errorBody, 'Failed to create user'));
  }

  const data = (await response.json().catch(() => ({}))) as CreateUserResponse | Record<string, never>;
  return {
    message: (data as CreateUserResponse).message ?? 'User created successfully.',
  };
};

export const fetchAdminUserByEmail = async (
  email: string,
  authToken?: string
): Promise<AdminUserDetails> => {
  const token = authToken ?? getStoredToken();

  const response = await fetch(`${API_URLS.admin.userDetails}/${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: buildHeaders(token),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiErrorBody | Record<string, never>;
    throw new Error(parseErrorMessage(errorBody, 'User not found.'));
  }

  const data = (await response.json()) as AdminUserDetails;
  return data;
};

export const updateAdminUser = async (
  payload: UpdateAdminUserPayload,
  authToken?: string
): Promise<UpdateAdminUserResponse> => {
  const token = authToken ?? getStoredToken();

  const response = await fetch(API_URLS.admin.userDetails, {
    method: 'PUT',
    headers: buildHeaders(token),
    body: JSON.stringify(payload),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiErrorBody | Record<string, never>;
    throw new Error(parseErrorMessage(errorBody, 'Failed to update user'));
  }

  const data = (await response.json().catch(() => ({}))) as UpdateAdminUserResponse | Record<string, never>;
  return {
    message: (data as UpdateAdminUserResponse).message ?? 'User updated successfully.',
  };
};

export const deleteAdminUser = async (
  email: string,
  authToken?: string
): Promise<DeleteAdminUserResponse> => {
  const token = authToken ?? getStoredToken();

  const response = await fetch(`${API_URLS.dashboard.deleteUser}/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: buildHeaders(token),
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Session expired. Please log in again.');
  }

  if (!response.ok) {
    const errorBody = (await response.json().catch(() => ({}))) as ApiErrorBody | Record<string, never>;
    throw new Error(parseErrorMessage(errorBody, 'Failed to delete user'));
  }

  const data = (await response.json().catch(() => ({}))) as DeleteAdminUserResponse | Record<string, never>;
  return {
    message: (data as DeleteAdminUserResponse).message ?? 'User deleted successfully.',
  };
};
