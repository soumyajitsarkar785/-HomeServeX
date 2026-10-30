import React, { useState } from 'react';
import { Icons } from '@homeservex/ui';
import { ProviderDashboardScreen } from '../pages/ProviderDashboardScreen.js';
import { ProviderAvailableJobsScreen } from '../pages/ProviderAvailableJobsScreen.js';
import { ProviderActiveJobScreen } from '../pages/ProviderActiveJobScreen.js';
import { ProviderEarningsScreen } from '../pages/ProviderEarningsScreen.js';
import { ProviderProfileScreen } from '../pages/ProviderProfileScreen.js';
import { ProviderNotificationsScreen } from '../pages/ProviderNotificationsScreen.js';
import { ProviderSettingsScreen } from '../pages/ProviderSettingsScreen.js';
import { ProviderSubscriptionScreen } from '../pages/ProviderSubscriptionScreen.js';

export type ProviderScreenKey =
  | 'dashboard'
  | 'jobs'
  | 'active-job'
  | 'earnings'
  | 'profile'
  | 'notifications'
  | 'settings'
  | 'subscription';

interface ProviderAppContainerProps {
  initialScreen?: ProviderScreenKey;
}

export const ProviderAppContainer: React.FC<ProviderAppContainerProps> = ({
  initialScreen = 'dashboard',
}) => {
  const [currentScreen, setCurrentScreen] = useState<ProviderScreenKey>(initialScreen);
  const [selectedJobId, setSelectedJobId] = useState<string>('job-1');
  const [isOnline, setIsOnline] = useState(true);

  // Bottom navigation tab mapping
  const activeTab: 'home' | 'jobs' | 'earnings' | 'profile' =
    currentScreen === 'dashboard'
      ? 'home'
      : currentScreen === 'jobs' || currentScreen === 'active-job'
      ? 'jobs'
      : currentScreen === 'earnings'
      ? 'earnings'
      : currentScreen === 'profile' || currentScreen === 'settings'
      ? 'profile'
      : 'home';

  const renderScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return (
          <ProviderDashboardScreen
            onNavigate={(s) => setCurrentScreen(s as ProviderScreenKey)}
            onSelectJob={(id) => setSelectedJobId(id)}
            isOnline={isOnline}
            onToggleOnline={() => setIsOnline(!isOnline)}
          />
        );
      case 'jobs':
        return (
          <ProviderAvailableJobsScreen
            onNavigate={(s) => setCurrentScreen(s as ProviderScreenKey)}
            onSelectJob={(id) => setSelectedJobId(id)}
          />
        );
      case 'active-job':
        return (
          <ProviderActiveJobScreen
            onNavigate={(s) => setCurrentScreen(s as ProviderScreenKey)}
            jobId={selectedJobId}
          />
        );
      case 'earnings':
        return (
          <ProviderEarningsScreen
            onNavigate={(s) => setCurrentScreen(s as ProviderScreenKey)}
          />
        );
      case 'profile':
        return (
          <ProviderProfileScreen
            onNavigate={(s) => setCurrentScreen(s as ProviderScreenKey)}
          />
        );
      case 'notifications':
        return (
          <ProviderNotificationsScreen
            onNavigate={(s) => setCurrentScreen(s as ProviderScreenKey)}
          />
        );
      case 'settings':
        return (
          <ProviderSettingsScreen
            onNavigate={(s) => setCurrentScreen(s as ProviderScreenKey)}
            onLogout={() => setCurrentScreen('dashboard')}
          />
        );
      case 'subscription':
        return (
          <ProviderSubscriptionScreen
            onNavigate={(s) => setCurrentScreen(s as ProviderScreenKey)}
          />
        );
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8FAFC',
        color: '#0F172A',
        fontFamily: "'Inter', sans-serif",
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Company Header (Clean & Professional, matching Image 1 style) */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          backgroundColor: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            maxWidth: '840px',
            margin: '0 auto',
            padding: '14px 20px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Left: Branding & Role */}
          <div
            onClick={() => setCurrentScreen('dashboard')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                backgroundColor: '#0E3E2F',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 900,
                fontSize: '18px',
                boxShadow: '0 4px 10px rgba(14, 62, 47, 0.2)',
              }}
            >
              H
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                HomeServe<span style={{ color: '#16A34A' }}>X</span>
              </div>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', letterSpacing: '0.4px' }}>
                PROVIDER PORTAL
              </div>
            </div>
          </div>

          {/* Right: Online Toggle & Notification Bell */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setIsOnline(!isOnline)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '24px',
                border: isOnline ? '1px solid #86EFAC' : '1px solid #CBD5E1',
                backgroundColor: isOnline ? '#DCFCE7' : '#F8FAFC',
                color: isOnline ? '#15803D' : '#64748B',
                fontSize: '12px',
                fontWeight: 800,
                letterSpacing: '0.2px',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                boxShadow: isOnline ? '0 3px 12px rgba(22, 163, 74, 0.25)' : '0 1px 3px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = isOnline ? '0 5px 16px rgba(22, 163, 74, 0.35)' : '0 2px 8px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = isOnline ? '0 3px 12px rgba(22, 163, 74, 0.25)' : '0 1px 3px rgba(0,0,0,0.04)';
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.96)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            >
              <span
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: isOnline ? '#16A34A' : '#94A3B8',
                  boxShadow: isOnline ? '0 0 10px #16A34A' : 'none',
                }}
              />
              <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </button>

            <button
              onClick={() => setCurrentScreen('notifications')}
              style={{
                position: 'relative',
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.18s ease',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F8FAFC';
                e.currentTarget.style.borderColor = '#CBD5E1';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#FFFFFF';
                e.currentTarget.style.borderColor = '#E2E8F0';
                e.currentTarget.style.transform = 'none';
              }}
              onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.95)')}
              onMouseUp={(e) => (e.currentTarget.style.transform = 'translateY(-1px)')}
            >
              <Icons.Bell size={18} color="#0F172A" />
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#16A34A',
                  border: '2px solid #FFFFFF',
                }}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area (Full-width responsive container matching Image 1) */}
      <main
        style={{
          flex: 1,
          maxWidth: '840px',
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {renderScreen()}
      </main>

      {/* Authoritative 4-Tab Bottom Navigation Bar (Fixed at bottom, matching Image 1) */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E2E8F0',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.04)',
        }}
      >
        <div
          style={{
            maxWidth: '840px',
            margin: '0 auto',
            height: '64px',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '0 16px',
          }}
        >
          {/* Home Tab */}
          <button
            onClick={() => setCurrentScreen('dashboard')}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              color: activeTab === 'home' ? '#0E3E2F' : '#94A3B8',
              padding: '6px 0',
              transition: 'all 0.18s ease',
            }}
          >
            <div
              style={{
                padding: '4px 16px',
                borderRadius: '16px',
                backgroundColor: activeTab === 'home' ? '#EAF4EF' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <Icons.Home size={19} color={activeTab === 'home' ? '#0E3E2F' : '#94A3B8'} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: activeTab === 'home' ? 800 : 600 }}>
              Home
            </span>
          </button>

          {/* Jobs Tab */}
          <button
            onClick={() => setCurrentScreen('jobs')}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              color: activeTab === 'jobs' ? '#0E3E2F' : '#94A3B8',
              padding: '6px 0',
              transition: 'all 0.18s ease',
            }}
          >
            <div
              style={{
                padding: '4px 16px',
                borderRadius: '16px',
                backgroundColor: activeTab === 'jobs' ? '#EAF4EF' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <Icons.Briefcase size={19} color={activeTab === 'jobs' ? '#0E3E2F' : '#94A3B8'} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: activeTab === 'jobs' ? 800 : 600 }}>
              Jobs
            </span>
          </button>

          {/* Earnings Tab */}
          <button
            onClick={() => setCurrentScreen('earnings')}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              color: activeTab === 'earnings' ? '#0E3E2F' : '#94A3B8',
              padding: '6px 0',
              transition: 'all 0.18s ease',
            }}
          >
            <div
              style={{
                padding: '4px 16px',
                borderRadius: '16px',
                backgroundColor: activeTab === 'earnings' ? '#EAF4EF' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <Icons.Wallet size={19} color={activeTab === 'earnings' ? '#0E3E2F' : '#94A3B8'} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: activeTab === 'earnings' ? 800 : 600 }}>
              Earnings
            </span>
          </button>

          {/* Profile Tab */}
          <button
            onClick={() => setCurrentScreen('profile')}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              color: activeTab === 'profile' ? '#0E3E2F' : '#94A3B8',
              padding: '6px 0',
              transition: 'all 0.18s ease',
            }}
          >
            <div
              style={{
                padding: '4px 16px',
                borderRadius: '16px',
                backgroundColor: activeTab === 'profile' ? '#EAF4EF' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <Icons.User size={19} color={activeTab === 'profile' ? '#0E3E2F' : '#94A3B8'} />
            </div>
            <span style={{ fontSize: '11px', fontWeight: activeTab === 'profile' ? 800 : 600 }}>
              Profile
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
};

