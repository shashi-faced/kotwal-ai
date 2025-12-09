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
