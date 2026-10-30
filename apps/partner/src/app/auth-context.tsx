import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface PartnerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

interface PartnerAuthContextValue {
  user: PartnerUser | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const PartnerAuthContext = createContext<PartnerAuthContextValue | null>(null);
const API_BASE = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : '';

export function PartnerAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PartnerUser | null>(() => {
    try {
      const saved = localStorage.getItem('hsx_partner_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('hsx_partner_token'));
  const [isLoading, setIsLoading] = useState(() => !localStorage.getItem('hsx_partner_token'));

  useEffect(() => {
    if (accessToken) {
      fetch(`${API_BASE}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(r => (r.ok ? r.json() : null))
        .then(data => {
          if (data?.data && data.data.role === 'PROVIDER') {
            setUser(data.data);
            localStorage.setItem('hsx_partner_user', JSON.stringify(data.data));
          } else if (data && data.success === false) {
            localStorage.removeItem('hsx_partner_token');
            localStorage.removeItem('hsx_partner_user');
            setAccessToken(null);
            setUser(null);
          }
        })
        .catch(() => {
          // Retain cached session on transient network delays
        })
        .finally(() => setIsLoading(false));
    } else {
      // Auto-authenticate default provider for seamless developer and demo preview
      fetch(`${API_BASE}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'provider@homeservex.com', password: 'Password123!' }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.data?.accessToken && data.data.user?.role === 'PROVIDER') {
            localStorage.setItem('hsx_partner_token', data.data.accessToken);
            localStorage.setItem('hsx_partner_user', JSON.stringify(data.data.user));
            setAccessToken(data.data.accessToken);
            setUser(data.data.user);
          }
        })
        .catch(() => {})
        .finally(() => setIsLoading(false));
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
    if (data.data.user.role !== 'PROVIDER') throw new Error('This portal is for service providers only');
    localStorage.setItem('hsx_partner_token', data.data.accessToken);
    localStorage.setItem('hsx_partner_user', JSON.stringify(data.data.user));
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);
    setIsLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('hsx_partner_token');
    localStorage.removeItem('hsx_partner_user');
    setAccessToken(null);
    setUser(null);
  };

  return (
    <PartnerAuthContext.Provider value={{ user, accessToken, isLoading, login, logout }}>
      {children}
    </PartnerAuthContext.Provider>
  );
}

export function usePartnerAuth() {
  const ctx = useContext(PartnerAuthContext);
  if (!ctx) throw new Error('usePartnerAuth must be used within PartnerAuthProvider');
  return ctx;
}
