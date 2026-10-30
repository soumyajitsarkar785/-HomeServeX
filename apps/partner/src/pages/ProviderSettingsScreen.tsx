import React, { useState } from 'react';
import { Icons } from '@homeservex/ui';

interface ProviderSettingsScreenProps {
  onNavigate: (screen: string) => void;
  onLogout?: () => void;
}

const GlobeIcon: React.FC<{ size?: number; color?: string }> = ({ size = 18, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

export const ProviderSettingsScreen: React.FC<ProviderSettingsScreenProps> = ({
  onNavigate,
  onLogout,
}) => {
  const [pushEnabled, setPushEnabled] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <div style={{ backgroundColor: '#F8FAFC', minHeight: '100%', padding: '16px 16px 90px', fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px' }}>
        <button
          onClick={() => onNavigate('dashboard')}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '12px',
            border: '1px solid #E2E8F0',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          <Icons.ArrowLeft size={18} color="#0F172A" />
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: 0 }}>
          Settings
        </h1>
      </div>

      {/* Settings Card */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          overflow: 'hidden',
          marginBottom: '28px',
        }}
      >
        {/* Push Notifications Toggle */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icons.Bell size={18} color="#0E3E2F" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
              Push Notifications
            </span>
          </div>

          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={pushEnabled}
              onChange={e => setPushEnabled(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: pushEnabled ? '#16A34A' : '#CBD5E1',
                borderRadius: '24px',
                transition: '0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  content: "''",
                  height: '18px',
                  width: '18px',
                  left: pushEnabled ? '22px' : '3px',
                  bottom: '3px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '50%',
                  transition: '0.2s',
                }}
              />
            </span>
          </label>
        </div>

        {/* Location Tracking Toggle */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icons.MapPin size={18} color="#0E3E2F" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
              Location Tracking
            </span>
          </div>

          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={locationEnabled}
              onChange={e => setLocationEnabled(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: locationEnabled ? '#16A34A' : '#CBD5E1',
                borderRadius: '24px',
                transition: '0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  content: "''",
                  height: '18px',
                  width: '18px',
                  left: locationEnabled ? '22px' : '3px',
                  bottom: '3px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '50%',
                  transition: '0.2s',
                }}
              />
            </span>
          </label>
        </div>

        {/* Sound Toggle */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icons.Headphones size={18} color="#0E3E2F" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
              Sound
            </span>
          </div>

          <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={soundEnabled}
              onChange={e => setSoundEnabled(e.target.checked)}
              style={{ opacity: 0, width: 0, height: 0 }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: soundEnabled ? '#16A34A' : '#CBD5E1',
                borderRadius: '24px',
                transition: '0.2s',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  content: "''",
                  height: '18px',
                  width: '18px',
                  left: soundEnabled ? '22px' : '3px',
                  bottom: '3px',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '50%',
                  transition: '0.2s',
                }}
              />
            </span>
          </label>
        </div>

        {/* Language Nav */}
        <button
          onClick={() => alert('Language: English (UK) selected.')}
          style={{
            width: '100%',
            padding: '16px',
            border: 'none',
            borderBottom: '1px solid #F1F5F9',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <GlobeIcon size={18} color="#0E3E2F" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
              Language
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#64748B', fontSize: '13px' }}>
            <span>English</span>
            <Icons.ChevronRight size={16} color="#94A3B8" />
          </div>
        </button>

        {/* Help & Support */}
        <button
          onClick={() => alert('HomeServeX Provider Support: Call 1800-419-HSX or email partner@homeservex.com')}
          style={{
            width: '100%',
            padding: '16px',
            border: 'none',
            borderBottom: '1px solid #F1F5F9',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icons.Headphones size={18} color="#0E3E2F" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
              Help & Support
            </span>
          </div>
          <Icons.ChevronRight size={16} color="#94A3B8" />
        </button>

        {/* About App */}
        <button
          onClick={() => alert('HomeServeX Provider App v2.4.0 — Certified for Enterprise Operations.')}
          style={{
            width: '100%',
            padding: '16px',
            border: 'none',
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Icons.FileText size={18} color="#0E3E2F" />
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#0F172A' }}>
              About App
            </span>
          </div>
          <Icons.ChevronRight size={16} color="#94A3B8" />
        </button>
      </div>

      {/* Destructive Action: Centered full-width Logout button (Green container / outline) */}
      <button
        onClick={() => {
          if (onLogout) onLogout();
          else alert('Logged out successfully.');
        }}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: '24px',
          border: '1.5px solid #0E3E2F',
          backgroundColor: '#0E3E2F',
          color: '#FFFFFF',
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <Icons.LogOut size={18} color="#FFFFFF" />
        Logout
      </button>
    </div>
  );
};
