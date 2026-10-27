import React, { useState } from 'react';
import { Button, Input, Card, Icons } from '@homeservex/ui';
import { useAuth } from '../app/auth-context.js';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('customer@homeservex.com');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(email, password);
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect') || '/';
      window.location.href = redirectUrl;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-main, #F7F9F7)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <a href="/" style={{ textDecoration: 'none', display: 'inline-flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                backgroundColor: 'var(--color-primary, #145C43)',
                borderRadius: '14px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '26px',
                fontWeight: 900,
                marginBottom: '12px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              H
            </div>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--color-text, #17211C)', letterSpacing: '-0.02em', margin: 0 }}>
              HomeServe<span style={{ color: 'var(--color-primary-emerald, #16865D)' }}>X</span>
            </h1>
          </a>
          <p style={{ color: 'var(--color-text-secondary, #6B756F)', marginTop: '6px', fontSize: '14px' }}>
            Sign in to manage bookings, track pros & access invoices
          </p>
        </div>

        {/* Card */}
        <Card style={{ padding: '32px', borderRadius: '18px', border: '1px solid var(--color-border, #E4EAE5)', boxShadow: 'var(--shadow-md)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <Input
              label="Email Address"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              id="login-email"
              leftIcon={<Icons.User size={16} />}
            />

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                id="login-password"
                leftIcon={<Icons.Lock size={16} />}
              />
            </div>

            {/* Quick Demo Helper */}
            <div style={{ backgroundColor: '#EAF6EF', borderRadius: '12px', padding: '10px 14px', border: '1px solid #D1EADE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '11px', fontWeight: 800, color: '#145C43' }}>DEMO CREDENTIALS</div>
                <div style={{ fontSize: '12px', color: '#16865D' }}>customer@homeservex.com / Password123!</div>
              </div>
              <button
                type="button"
                onClick={() => { setEmail('customer@homeservex.com'); setPassword('Password123!'); }}
                style={{ backgroundColor: '#145C43', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
              >
                Auto Fill
              </button>
            </div>

            {error && (
              <div style={{ backgroundColor: '#FEE2E2', border: '1px solid #FCA5A5', color: '#B91C1C', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', fontWeight: 600 }}>
                {error}
              </div>
            )}

            <Button type="submit" variant="primary" isLoading={isLoading} style={{ width: '100%', height: '44px' }} id="login-submit">
              Sign In to HomeServeX
            </Button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', color: 'var(--color-text-secondary, #6B756F)', fontSize: '13px' }}>
            New to HomeServeX?{' '}
            <a href="/register" style={{ color: 'var(--color-primary, #145C43)', fontWeight: 700 }}>
              Create free account
            </a>
          </div>
        </Card>

        {/* Portals footer */}
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '12px', color: 'var(--color-text-secondary, #6B756F)' }}>
          Are you a service professional?{' '}
          <a href="http://localhost:5174" style={{ color: 'var(--color-primary, #145C43)', fontWeight: 600 }}>
            Partner Portal Login →
          </a>
        </div>
      </div>
    </div>
  );
};
