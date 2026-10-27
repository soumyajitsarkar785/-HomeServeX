import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '@homeservex/ui';
import { usePartnerAuth } from '../app/auth-context.js';

const API_BASE = import.meta.env.VITE_API_URL !== undefined ? import.meta.env.VITE_API_URL : '';

const SERVICE_SKILLS = [
  'Electrician & Wiring',
  'Plumbing & Sanitation',
  'Air Conditioner Servicing',
  'Deep Home Cleaning',
  'Appliance Repair',
  'Carpentry & Furniture',
  'Painting & Waterproofing',
  'Pest Control',
  'RO & Water Purifier',
];

export const PartnerLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = usePartnerAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [form, setForm] = useState({
    name: '',
    email: 'provider@homeservex.com',
    phone: '',
    password: 'Password123!',
    bio: '',
  });
  const [skills, setSkills] = useState<string[]>(['Electrician & Wiring']);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const toggleSkill = (skill: string) => {
    setSkills(prev =>
      prev.includes(skill) ? prev.filter(s => s !== skill) : [...prev, skill]
    );
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Partner login failed. Please verify credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (skills.length === 0) {
      setError('Please select at least one service skill to register.');
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/providers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, skills }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Registration failed');
      setSuccess('Application submitted! Your partner profile has been received and is pending admin verification. You can log in once approved.');
      setMode('login');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F9F7', display: 'flex', flexDirection: 'column' }}>
      {/* Top Brand Bar */}
      <header style={{ height: '72px', borderBottom: '1px solid #E4EAE5', backgroundColor: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '42px', height: '42px', backgroundColor: '#145C43', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', fontWeight: 900, fontSize: '20px', letterSpacing: '-0.5px' }}>
            H
          </div>
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#17211C', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
              HomeServe<span style={{ color: '#16865D' }}>X</span>
            </div>
            <div style={{ fontSize: '11px', color: '#16865D', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Service Partner Portal
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: '#6B756F' }}>Looking for home services?</span>
          <a
            href="http://localhost:5173"
            style={{ fontSize: '13px', fontWeight: 600, color: '#145C43', textDecoration: 'none', padding: '6px 14px', border: '1px solid #E4EAE5', borderRadius: '8px' }}
          >
            Customer App →
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '520px' }}>
          {/* Header Card Info */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '6px 14px', backgroundColor: '#EAF6EF', borderRadius: '20px', color: '#145C43', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '14px' }}>
              <span>★</span> Verified Indian Service Network
            </div>
            <h1 style={{ fontSize: '28px', fontWeight: 800, color: '#17211C', letterSpacing: '-0.5px', marginBottom: '8px' }}>
              {mode === 'login' ? 'Welcome Back, Partner' : 'Join HomeServeX as a Partner'}
            </h1>
            <p style={{ fontSize: '14px', color: '#6B756F', lineHeight: 1.5, margin: 0 }}>
              {mode === 'login'
                ? 'Sign in to access your assigned jobs, manage OTP completions, and track direct daily earnings.'
                : 'Grow your business with verified customer bookings, zero platform joining fees, and instant payouts.'}
            </p>
          </div>

          {/* Mode Switcher */}
          <div style={{ display: 'flex', backgroundColor: '#EAF6EF', padding: '4px', borderRadius: '12px', marginBottom: '20px' }}>
            <button
              id="partner-tab-login"
              type="button"
              onClick={() => { setMode('login'); setError(''); setSuccess(''); }}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: mode === 'login' ? '#FFFFFF' : 'transparent',
                color: mode === 'login' ? '#145C43' : '#6B756F',
                fontWeight: mode === 'login' ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: mode === 'login' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Partner Sign In
            </button>
            <button
              id="partner-tab-register"
              type="button"
              onClick={() => { setMode('register'); setError(''); setSuccess(''); }}
              style={{
                flex: 1,
                padding: '10px 16px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: mode === 'register' ? '#FFFFFF' : 'transparent',
                color: mode === 'register' ? '#145C43' : '#6B756F',
                fontWeight: mode === 'register' ? 700 : 500,
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: mode === 'register' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              Apply as Professional
            </button>
          </div>

          {/* Form Card */}
          <Card style={{ padding: '32px', borderRadius: '16px', border: '1px solid #E4EAE5', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
            {success && (
              <div style={{ padding: '14px 18px', backgroundColor: '#EAF6EF', border: '1px solid #82D1AD', borderRadius: '10px', color: '#145C43', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px', fontWeight: 500 }}>
                ✓ {success}
              </div>
            )}

            {error && (
              <div style={{ padding: '14px 18px', backgroundColor: '#FDECEC', border: '1px solid #F3A8A8', borderRadius: '10px', color: '#D64545', fontSize: '13px', lineHeight: 1.5, marginBottom: '20px', fontWeight: 500 }}>
                ⚠ {error}
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <Input
                  id="partner-login-email"
                  label="Registered Email Address"
                  type="email"
                  placeholder="technician@homeservex.com"
                  value={form.email}
                  onChange={handleChange('email')}
                  required
                />

                <Input
                  id="partner-login-password"
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange('password')}
                  required
                />

                {/* Quick Demo Helper */}
                <div style={{ backgroundColor: '#EAF6EF', borderRadius: '12px', padding: '10px 14px', border: '1px solid #D1EADE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 800, color: '#145C43' }}>DEMO CREDENTIALS</div>
                    <div style={{ fontSize: '12px', color: '#16865D' }}>provider@homeservex.com / Password123!</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setForm(prev => ({ ...prev, email: 'provider@homeservex.com', password: 'Password123!' })); }}
                    style={{ backgroundColor: '#145C43', color: '#FFFFFF', border: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                  >
                    Auto Fill
                  </button>
                </div>

                <Button
                  id="partner-login-submit"
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  style={{ width: '100%', padding: '14px', marginTop: '6px' }}
                >
                  Sign In to Partner Console
                </Button>

                <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: '#6B756F' }}>
                  New service technician?{' '}
                  <span
                    onClick={() => { setMode('register'); setError(''); }}
                    style={{ color: '#145C43', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Apply to join our network
                  </span>
                </div>
              </form>
            ) : (
              <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <Input
                  id="partner-reg-name"
                  label="Full Legal Name"
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.name}
                  onChange={handleChange('name')}
                  required
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Input
                    id="partner-reg-email"
                    label="Email Address"
                    type="email"
                    placeholder="ramesh@example.com"
                    value={form.email}
                    onChange={handleChange('email')}
                    required
                  />
                  <Input
                    id="partner-reg-phone"
                    label="Mobile Number (WhatsApp)"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    required
                  />
                </div>

                <Input
                  id="partner-reg-password"
                  label="Create Secure Password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  value={form.password}
                  onChange={handleChange('password')}
                  required
                />

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#17211C', marginBottom: '8px' }}>
                    Select Service Trades & Skills <span style={{ color: '#D64545' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {SERVICE_SKILLS.map(skill => {
                      const selected = skills.includes(skill);
                      return (
                        <button
                          type="button"
                          key={skill}
                          onClick={() => toggleSkill(skill)}
                          style={{
                            padding: '7px 12px',
                            borderRadius: '20px',
                            border: `1px solid ${selected ? '#145C43' : '#E4EAE5'}`,
                            backgroundColor: selected ? '#EAF6EF' : '#FFFFFF',
                            color: selected ? '#145C43' : '#6B756F',
                            fontSize: '12px',
                            fontWeight: selected ? 700 : 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {selected ? '✓' : '+'} {skill}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#17211C', marginBottom: '6px' }}>
                    Years of Experience & Background
                  </label>
                  <textarea
                    id="partner-reg-bio"
                    rows={2}
                    placeholder="e.g. 5+ years licensed electrician working across residential apartments in Bangalore."
                    value={form.bio}
                    onChange={handleChange('bio')}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      fontSize: '13px',
                      borderRadius: '8px',
                      border: '1px solid #E4EAE5',
                      outline: 'none',
                      fontFamily: 'inherit',
                      boxSizing: 'border-box',
                      resize: 'none',
                    }}
                  />
                </div>

                <Button
                  id="partner-reg-submit"
                  type="submit"
                  variant="primary"
                  isLoading={isLoading}
                  style={{ width: '100%', padding: '14px', marginTop: '6px' }}
                >
                  Submit Partner Application
                </Button>

                <p style={{ fontSize: '12px', color: '#6B756F', textAlign: 'center', margin: 0 }}>
                  By applying, you agree to undergo background checks and provide valid ID proof for HomeServeX verification.
                </p>
              </form>
            )}
          </Card>

          {/* Trust Guarantees */}
          <div style={{ marginTop: '28px', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#145C43' }}>₹0 Fee</div>
              <div style={{ fontSize: '12px', color: '#6B756F', marginTop: '2px' }}>Zero Joining Cost</div>
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#145C43' }}>Same-Day</div>
              <div style={{ fontSize: '12px', color: '#6B756F', marginTop: '2px' }}>Fast Direct Payouts</div>
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#145C43' }}>100% Secure</div>
              <div style={{ fontSize: '12px', color: '#6B756F', marginTop: '2px' }}>Customer Two-OTP</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
