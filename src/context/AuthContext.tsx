import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { API_URLS } from '@/lib/url';
import { clearAuthState, loadAuthState, persistAuthState } from '@/lib/authStorage';

interface AuthUser {
  email: string;
  role?: string;
}

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const fetchUserRole = async (token: string): Promise<string | null> => {
  try {
    const response = await fetch(API_URLS.user.role, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      console.error('Failed to fetch user role', errorBody);
      return null;
    }

    const data = (await response.json().catch(() => null)) as { role?: string } | null;
    return data?.role ?? null;
  } catch (error) {
    console.error('Failed to fetch user role', error);
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadAuthState();
    if (stored) {
      setIsAuthenticated(!!stored.isAuthenticated);
      setUser(stored.email ? { email: stored.email, role: stored.role } : null);
      setToken(stored.token ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated && user && token) {
      persistAuthState({ isAuthenticated: true, email: user.email, role: user.role, token });
    } else {
      clearAuthState();
    }
  }, [isAuthenticated, user, token, loading]);

  const login = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    const response = await fetch(API_URLS.auth.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody?.message || 'API request failed');
    }

    const data = (await response.json().catch(() => null)) as { token?: string } | null;
    if (!data?.token) {
      throw new Error('Login API did not return a token.');
    }

    const userRole = await fetchUserRole(data.token);

    setIsAuthenticated(true);
    setUser({ email, role: userRole ?? undefined });
    setToken(data.token);
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setToken(null);
    clearAuthState();
  };

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      loading,
      token,
      login,
      logout,
    }),
    [isAuthenticated, user, loading, token],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
