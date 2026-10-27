import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminAuthContextValue {
  user: AdminUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);
const API_BASE = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : '';

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(() => {
    try {
      const saved = localStorage.getItem('hsx_admin_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('hsx_admin_token'));
  const [isLoading, setIsLoading] = useState(() => !localStorage.getItem('hsx_admin_token'));

  useEffect(() => {
    if (accessToken) {
      fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data?.data && data.data.role === 'ADMIN') {
            setUser(data.data);
            localStorage.setItem('hsx_admin_user', JSON.stringify(data.data));
          } else if (data && data.success === false) {
            localStorage.removeItem('hsx_admin_token');
            localStorage.removeItem('hsx_admin_user');
            setAccessToken(null);
            setUser(null);
          }
        })
        .catch(() => {
          // Gracefully retain cached user during transient network delays
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [accessToken]);

  const login = async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || 'Login failed');
    if (data.data.user.role !== 'ADMIN') throw new Error('Access denied. Admin credentials required.');
    localStorage.setItem('hsx_admin_token', data.data.accessToken);
    localStorage.setItem('hsx_admin_user', JSON.stringify(data.data.user));
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);
    setIsLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('hsx_admin_token');
    localStorage.removeItem('hsx_admin_user');
    setAccessToken(null);
    setUser(null);
  };

  return (
    <AdminAuthContext.Provider value={{ user, accessToken, isLoading, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
