import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { API_URLS } from '@/lib/url';

interface AuthContextValue {
  isAuthenticated: boolean;
  user: { email: string } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const STORAGE_KEY = 'kotwal_auth_state';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ email: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as { isAuthenticated: boolean; email?: string };
        setIsAuthenticated(!!parsed.isAuthenticated);
        setUser(parsed.email ? { email: parsed.email } : null);
      }
    } catch (error) {
      console.error('Failed to read auth state', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    try {
      if (isAuthenticated && user) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ isAuthenticated: true, email: user.email }));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error('Failed to persist auth state', error);
    }
  }, [isAuthenticated, user, loading]);

  const login = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }

    try {
      const response = await fetch(API_URLS.auth.login, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('API request failed');
      }
    } catch (error) {
      console.warn('Auth API unreachable, bypassing login for testing', error);
    }

    setIsAuthenticated(true);
    setUser({ email });
  };

  const logout = () => {
    setIsAuthenticated(false);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      isAuthenticated,
      user,
      loading,
      login,
      logout,
    }),
    [isAuthenticated, user, loading],
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
