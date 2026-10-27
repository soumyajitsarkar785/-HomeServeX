import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '../app/auth-context.js';

export const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState('admin@homeservex.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Admin authentication failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F1D17', // Deep forest night background
        padding: '24px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#145C43',
              border: '2px solid #16865D',
              borderRadius: '16px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontSize: '28px',
              fontWeight: 900,
              marginBottom: '16px',
              boxShadow: '0 8px 24px rgba(20, 92, 67, 0.4)',
            }}
          >
            H
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#F7F9F7', letterSpacing: '-0.5px', marginBottom: '6px' }}>
            HomeServe<span style={{ color: '#16865D' }}>X</span> Operations
          </h1>
          <p style={{ color: '#8BA196', fontSize: '14px', margin: 0 }}>
            Central Marketplace Administration & Compliance
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            backgroundColor: '#172720',
            borderRadius: '16px',
            border: '1px solid #233A31',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
            padding: '36px',
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#D0DDD5', marginBottom: '8px' }}>
                Admin Work Email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="admin@homeservex.com"
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  backgroundColor: '#0E1A14',
                  border: '1px solid #284439',
                  borderRadius: '10px',
                  color: '#F7F9F7',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#D0DDD5', marginBottom: '8px' }}>
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                value={password}
                placeholder="••••••••"
                onChange={e => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  backgroundColor: '#0E1A14',
                  border: '1px solid #284439',
                  borderRadius: '10px',
                  color: '#F7F9F7',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Quick Demo Helper */}
            <div style={{ backgroundColor: '#0E1A14', borderRadius: '10px', padding: '10px 14px', border: '1px solid #233A31', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#16865D' }}>DEMO CREDENTIALS</div>
                <div style={{ fontSize: '12px', color: '#8BA196' }}>admin@homeservex.com / Password123!</div>
              </div>
              <button
                type="button"
                onClick={() => { setEmail('admin@homeservex.com'); setPassword('Password123!'); }}
                style={{ backgroundColor: '#145C43', color: '#FFFFFF', border: '1px solid #16865D', borderRadius: '6px', padding: '5px 10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
              >
                Auto Fill
              </button>
            </div>

            {error && (
              <div
                style={{
                  padding: '12px 16px',
                  backgroundColor: 'rgba(214, 69, 69, 0.15)',
                  borderRadius: '8px',
                  color: '#F98B8B',
                  fontSize: '13px',
                  border: '1px solid rgba(214, 69, 69, 0.3)',
                }}
              >
                ⚠ {error}
              </div>
            )}

            <button
              type="submit"
              id="admin-login-submit"
              disabled={isLoading}
              style={{
                padding: '14px',
                backgroundColor: '#16865D',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 700,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                transition: 'all 0.15s ease',
                marginTop: '6px',
              }}
            >
              {isLoading ? 'Verifying Admin Session...' : 'Authenticate to Console →'}
            </button>
          </form>

          <div
            style={{
              marginTop: '24px',
              padding: '14px',
              backgroundColor: '#0E1A14',
              borderRadius: '10px',
              border: '1px solid #233A31',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '12px', color: '#8BA196', lineHeight: 1.5 }}>
              🔒 Authorized Access Only — 2FA & Audit Logging Active
              <br />
              Default Admin: <strong style={{ color: '#D0DDD5' }}>admin@homeservex.com</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
