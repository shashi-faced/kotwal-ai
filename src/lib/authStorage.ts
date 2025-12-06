export const AUTH_STORAGE_KEY = 'kotwal_auth_state';

export type StoredAuthState = {
  isAuthenticated: boolean;
  email?: string;
  token?: string;
  role?: string;
};

const hasWindow = () => typeof window !== 'undefined' && !!window.localStorage;

export const loadAuthState = (): StoredAuthState | null => {
  if (!hasWindow()) return null;
  try {
    const stored = window.localStorage.getItem(AUTH_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as StoredAuthState) : null;
  } catch (error) {
    console.error('Failed to read auth state from storage', error);
    return null;
  }
};

export const persistAuthState = (state: StoredAuthState) => {
  if (!hasWindow()) return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to persist auth state', error);
  }
};

export const clearAuthState = () => {
  if (!hasWindow()) return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear auth state', error);
  }
};

export const getStoredToken = (): string | null => loadAuthState()?.token ?? null;
