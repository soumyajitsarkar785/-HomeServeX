import React, { useState } from 'react';
import { Icons } from '@homeservex/ui';
import { AdminDashboardScreen } from '../pages/AdminDashboardScreen.js';
import { AdminLiveOperationsScreen } from '../pages/AdminLiveOperationsScreen.js';
import { AdminDispatchControlScreen } from '../pages/AdminDispatchControlScreen.js';
import { AdminOrdersScreen } from '../pages/AdminOrdersScreen.js';
import { AdminProvidersScreen } from '../pages/AdminProvidersScreen.js';
import { AdminOffersScreen } from '../pages/AdminOffersScreen.js';
import { AdminSettingsScreen } from '../pages/AdminSettingsScreen.js';
import { AdminServicesScreen } from '../pages/AdminServicesScreen.js';
import { AdminCustomersScreen } from '../pages/AdminCustomersScreen.js';
import { AdminReportsScreen } from '../pages/AdminReportsScreen.js';

export type AdminSectionKey =
  | 'dashboard'
  | 'live-operations'
  | 'dispatch-control'
  | 'orders'
  | 'providers'
  | 'customers'
  | 'services'
  | 'offers'
  | 'reports'
  | 'settings';

interface AdminAppLayoutProps {
  initialSection?: AdminSectionKey;
}

export const AdminAppLayout: React.FC<AdminAppLayoutProps> = ({
  initialSection = 'dashboard',
}) => {
  const [currentSection, setCurrentSection] = useState<AdminSectionKey>(initialSection);
  const [searchQuery, setSearchQuery] = useState('');

  const sidebarItems: { key: AdminSectionKey; label: string; icon: any; screenNumber?: string }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: Icons.Home, screenNumber: '15' },
    { key: 'live-operations', label: 'Live Operations', icon: Icons.Zap, screenNumber: 'LIVE' },
    { key: 'dispatch-control', label: 'Dispatch Control', icon: Icons.MapPin, screenNumber: 'AUTO' },
    { key: 'orders', label: 'Orders', icon: Icons.Briefcase, screenNumber: '16' },
    { key: 'providers', label: 'Providers', icon: Icons.User, screenNumber: '17' },
    { key: 'customers', label: 'Customers', icon: Icons.User },
    { key: 'services', label: 'Services', icon: Icons.Grid },
    { key: 'offers', label: 'Offers', icon: Icons.Gift, screenNumber: '18' },
    { key: 'reports', label: 'Reports', icon: Icons.TrendingUp },
    { key: 'settings', label: 'Settings', icon: Icons.Settings, screenNumber: '19' },
  ];

  const renderContent = () => {
    switch (currentSection) {
      case 'dashboard':
        return <AdminDashboardScreen onNavigate={(sec) => setCurrentSection(sec as AdminSectionKey)} />;
      case 'live-operations':
        return <AdminLiveOperationsScreen />;
      case 'dispatch-control':
        return <AdminDispatchControlScreen />;
      case 'orders':
        return <AdminOrdersScreen />;
      case 'providers':
        return <AdminProvidersScreen />;
      case 'customers':
        return <AdminCustomersScreen />;
      case 'services':
        return <AdminServicesScreen />;
      case 'offers':
        return <AdminOffersScreen />;
      case 'reports':
        return <AdminReportsScreen />;
      case 'settings':
        return <AdminSettingsScreen />;
      default:
        return (
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '32px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', margin: '0 0 8px' }}>
              {(currentSection as string).toUpperCase()} Management
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B' }}>
              Connected to HomeServeX authoritative database. Select Dashboard, Orders, Providers, Customers, Services, Offers, or Settings to view complete live screens.
            </p>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F8FAFC', fontFamily: "'Inter', sans-serif" }}>
      {/* Dark Forest Green Sidebar (#0E3E2F) */}
      <aside
        style={{
          width: '240px',
          backgroundColor: '#0E3E2F',
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          boxShadow: '4px 0 20px rgba(0,0,0,0.06)',
          zIndex: 50,
        }}
      >
        {/* Brand Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: 900,
                fontSize: '18px',
              }}
            >
              H
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#FFFFFF', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
                HomeServe<span style={{ color: '#86EFAC' }}>X</span>
              </div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#A7F3D0', letterSpacing: '1px' }}>
                ADMIN DASHBOARD
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Nav */}
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {sidebarItems.map((item) => {
            const Icon = item.icon;
            const isSelected = currentSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setCurrentSection(item.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: isSelected ? 'rgba(255,255,255,0.15)' : 'transparent',
                  color: isSelected ? '#FFFFFF' : '#94A3B8',
                  fontSize: '13px',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Icon size={18} color={isSelected ? '#34D399' : '#94A3B8'} />
                  <span>{item.label}</span>
                </div>
                {item.screenNumber && (
                  <span
                    style={{
                      fontSize: '10px',
                      backgroundColor: isSelected ? '#16A34A' : 'rgba(255,255,255,0.08)',
                      color: '#FFFFFF',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      fontWeight: 700,
                    }}
                  >
                    #{item.screenNumber}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Status */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', fontSize: '11px', color: '#A7F3D0' }}>
          Platform v2.4.0 • Enterprise
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header Bar */}
        <header
          style={{
            height: '68px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            position: 'sticky',
            top: 0,
            zIndex: 40,
          }}
        >
          {/* Global Search Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              border: '1px solid #E2E8F0',
              padding: '0 14px',
              width: '320px',
            }}
          >
            <Icons.Search size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search across orders, users, services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '9px 10px',
                border: 'none',
                backgroundColor: 'transparent',
                outline: 'none',
                fontSize: '13px',
                color: '#0F172A',
              }}
            />
          </div>

          {/* Right Admin Profile Pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Notification Bell */}
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative',
              }}
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
                }}
              />
            </div>

            {/* Admin Profile Pill: Soumyajit / Admin */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 14px 6px 8px',
                borderRadius: '24px',
                backgroundColor: '#F1F5F9',
                border: '1px solid #E2E8F0',
              }}
            >
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                alt="Soumyajit"
                style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', lineHeight: 1.1 }}>
                  Soumyajit
                </span>
                <span style={{ fontSize: '10px', fontWeight: 600, color: '#16A34A' }}>
                  Admin
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Container */}
        <main style={{ flex: 1, padding: '28px', minWidth: 0 }}>
          {renderContent()}
        </main>
      </div>
    </div>
  );
};
