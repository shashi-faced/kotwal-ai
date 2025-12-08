import { API_URLS } from '@/lib/url';
import { handleUnauthorized } from '@/lib/session';
import { getStoredToken } from '@/lib/authStorage';

export interface LicenseInfo {
  availableLicenses: number;
  assignedLicenses: number;
  remainingLicenses: number;
}

const buildHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
});

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
    const errorBody = await response.json().catch(() => ({}));
    throw new Error((errorBody as { message?: string })?.message || 'Failed to fetch license info');
  }

  const data = (await response.json()) as LicenseInfo;
  return data;
};
