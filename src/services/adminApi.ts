/**
 * Admin / dashboard API service.
 *
 * Migrated to the central apiFetch / apiJson client which:
 *   - sends the in-memory access token,
 *   - includes the httpOnly refresh-token cookie,
 *   - transparently refreshes on 401 and replays the request,
 *   - bounces to /login only when refresh fails.
 *
 * The optional `_authToken` argument is preserved on each function for
 * source-compatibility with existing callers but is ignored — token resolution
 * is centralised in apiFetch.
 */
import { API_URLS } from '@/lib/url';
import { apiFetch, apiJson, ApiError } from '@/lib/apiClient';

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
  date?: string;
  dateStart?: string;
  dateEnd?: string;
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

export interface UpdateAdminUserResponse { message: string; }
export interface DeleteAdminUserResponse { message: string; }

const okOrEmptyArray = async <T>(p: Promise<T[]>): Promise<T[]> => {
  try { return await p; } catch (err) {
    if (err instanceof ApiError && err.status === 401) return [];
    throw err;
  }
};

const okOrNull = async <T>(p: Promise<T>): Promise<T | null> => {
  try { return await p; } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
};

// --- License --------------------------------------------------------------

export const fetchLicenseInfo = async (_authToken?: string): Promise<LicenseInfo | null> => {
  void _authToken;
  return okOrNull(apiJson<LicenseInfo>(API_URLS.admin.licenseInfo, { method: 'GET' }));
};

// --- Users (dashboard scope) ---------------------------------------------

export const fetchDashboardUsers = async (_authToken?: string): Promise<DashboardUser[]> => {
  void _authToken;
  return okOrEmptyArray((async () => {
    const data = await apiJson<{ users?: DashboardUser[] } | DashboardUser[]>(
      API_URLS.dashboard.users, { method: 'GET' },
    );
    return Array.isArray(data) ? data : (data.users ?? []);
  })());
};

export const fetchDashboardSummary = async (_authToken?: string): Promise<DashboardSummary | null> => {
  void _authToken;
  return okOrNull((async () => {
    const data = await apiJson<DashboardSummary | Record<string, never>>(
      API_URLS.dashboard.summary, { method: 'GET' },
    );
    return {
      activeUsers: Number((data as DashboardSummary).activeUsers ?? 0),
      chatsToday: Number((data as DashboardSummary).chatsToday ?? 0),
      alerts: Number((data as DashboardSummary).alerts ?? 0),
      spend: Number((data as DashboardSummary).spend ?? 0),
    };
  })());
};

export const fetchDashboardAlerts = async (
  query?: DashboardAlertsQuery,
  _authToken?: string,
): Promise<DashboardAlertsResponse | null> => {
  void _authToken;
  const url = new URL(API_URLS.dashboard.alerts);
  if (query) {
    const p = new URLSearchParams();
    if (typeof query.piiFlag === 'boolean') p.set('piiFlag', String(query.piiFlag));
    if (typeof query.override === 'boolean') p.set('override', String(query.override));
    if (typeof query.riskScoreMin === 'number') p.set('riskScoreMin', String(query.riskScoreMin));
    if (typeof query.riskScoreMax === 'number') p.set('riskScoreMax', String(query.riskScoreMax));
    if (query.date) p.set('date', query.date);
    if (query.dateStart) p.set('dateStart', query.dateStart);
    if (query.dateEnd) p.set('dateEnd', query.dateEnd);
    if (typeof query.offset === 'number') p.set('offset', String(query.offset));
    if (typeof query.limit === 'number') p.set('limit', String(query.limit));
    if (query.sortBy) p.set('sortBy', query.sortBy);
    if (query.sortOrder) p.set('sortOrder', query.sortOrder);
    url.search = p.toString();
  }

  return okOrNull((async () => {
    const data = await apiJson<DashboardAlertsResponse | Record<string, never>>(
      url.toString(), { method: 'GET' },
    );
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
  })());
};

// --- Admin user management -----------------------------------------------

export const createAdminUser = async (
  payload: CreateUserPayload,
  _authToken?: string,
): Promise<CreateUserResponse> => {
  void _authToken;
  const data = await apiJson<CreateUserResponse | Record<string, never>>(
    API_URLS.admin.createUser, { method: 'POST', body: payload },
  );
  return { message: (data as CreateUserResponse).message ?? 'User created successfully.' };
};

export const fetchAdminUserByEmail = async (
  email: string,
  _authToken?: string,
): Promise<AdminUserDetails> => {
  void _authToken;
  return apiJson<AdminUserDetails>(
    `${API_URLS.admin.userDetails}/${encodeURIComponent(email)}`,
    { method: 'GET' },
  );
};

export const updateAdminUser = async (
  payload: UpdateAdminUserPayload,
  _authToken?: string,
): Promise<UpdateAdminUserResponse> => {
  void _authToken;
  // Backend route is PUT /api/auth/admin/users/:email
  const { email, ...rest } = payload;
  const data = await apiJson<UpdateAdminUserResponse | Record<string, never>>(
    `${API_URLS.admin.userDetails}/${encodeURIComponent(email)}`,
    { method: 'PUT', body: rest },
  );
  return { message: (data as UpdateAdminUserResponse).message ?? 'User updated successfully.' };
};

export const deleteAdminUser = async (
  email: string,
  _authToken?: string,
): Promise<DeleteAdminUserResponse> => {
  void _authToken;
  const res = await apiFetch(
    `${API_URLS.dashboard.deleteUser}/${encodeURIComponent(email)}`,
    { method: 'DELETE' },
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(
      (body as { error?: string })?.error || 'Failed to delete user',
      res.status,
      body,
    );
  }
  const data = (await res.json().catch(() => ({}))) as DeleteAdminUserResponse | Record<string, never>;
  return { message: (data as DeleteAdminUserResponse).message ?? 'User deleted successfully.' };
};
