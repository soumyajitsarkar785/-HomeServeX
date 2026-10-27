import React, { useState } from 'react';
import { Button, Input, Card } from '@homeservex/ui';
import { useAuth } from '../app/auth-context.js';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setIsLoading(true);
    try {
      await register(form.name, form.email, form.phone, form.password);
      window.location.href = '/bookings';
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--color-bg-main, #F7F9F7)', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '480px' }}>
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
              Create Your Account
            </h1>
          </a>
          <p style={{ color: 'var(--color-text-secondary, #6B756F)', marginTop: '6px', fontSize: '14px' }}>
            Join 50,000+ Indian households trusting HomeServeX
          </p>
        </div>

        <Card style={{ padding: '32px', borderRadius: '18px', border: '1px solid var(--color-border, #E4EAE5)', boxShadow: 'var(--shadow-md)' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <Input label="Full Name" type="text" placeholder="e.g. Rahul Sharma" value={form.name} onChange={handleChange('name')} required id="reg-name" />
            <Input label="Email Address" type="email" placeholder="rahul@example.com" value={form.email} onChange={handleChange('email')} required id="reg-email" />
            <Input label="Phone Number" type="tel" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange('phone')} required id="reg-phone" />
            <Input label="Password" type="password" placeholder="At least 8 characters" value={form.password} onChange={handleChange('password')} required id="reg-password" />
            <Input label="Confirm Password" type="password" placeholder="Re-enter your password" value={form.confirmPassword} onChange={handleChange('confirmPassword')} required id="reg-confirm-password" />

            {error && (
              <div style={{ padding: '10px 14px', backgroundColor: '#FDF1F1', borderRadius: '10px', color: '#D64545', fontSize: '13px', fontWeight: 600, border: '1px solid #F8CECE' }}>
                ⚠️ {error}
              </div>
            )}

            <Button type="submit" variant="primary" isLoading={isLoading} style={{ width: '100%', height: '44px', marginTop: '4px' }} id="reg-submit">
              Register Account
            </Button>

            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary, #6B756F)', textAlign: 'center', lineHeight: 1.5, margin: 0 }}>
              By registering, you agree to our{' '}
              <a href="/#faq" style={{ color: 'var(--color-primary, #145C43)', fontWeight: 600 }}>Terms of Service</a> and{' '}
              <a href="/#faq" style={{ color: 'var(--color-primary, #145C43)', fontWeight: 600 }}>Privacy Policy</a>.
            </p>
          </form>

          <div style={{ marginTop: '20px', textAlign: 'center', color: 'var(--color-text-secondary, #6B756F)', fontSize: '13px' }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: 'var(--color-primary, #145C43)', fontWeight: 700 }}>Sign in</a>
          </div>
        </Card>
      </div>
    </div>
  );
};
