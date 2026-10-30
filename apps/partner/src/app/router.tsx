import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PartnerDashboardPage } from '../pages/PartnerDashboardPage.js';
import { PartnerLoginPage } from '../pages/PartnerLoginPage.js';
import { ProviderAppContainer } from '../components/ProviderAppContainer.js';
import { usePartnerAuth } from './auth-context.js';
import { Spinner } from '@homeservex/ui';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = usePartnerAuth();
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDF4' }}>
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = usePartnerAuth();
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0FDF4' }}>
        <Spinner size="lg" />
      </div>
    );
  }
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProviderAppContainer initialScreen="dashboard" />} />
        <Route path="/app" element={<ProviderAppContainer initialScreen="dashboard" />} />
        <Route path="/mobile" element={<ProviderAppContainer initialScreen="dashboard" />} />
        <Route path="/jobs" element={<ProviderAppContainer initialScreen="jobs" />} />
        <Route path="/active-job" element={<ProviderAppContainer initialScreen="active-job" />} />
        <Route path="/earnings" element={<ProviderAppContainer initialScreen="earnings" />} />
        <Route path="/profile" element={<ProviderAppContainer initialScreen="profile" />} />
        <Route path="/notifications" element={<ProviderAppContainer initialScreen="notifications" />} />
        <Route path="/settings" element={<ProviderAppContainer initialScreen="settings" />} />
        <Route path="/login" element={<PublicOnlyRoute><PartnerLoginPage /></PublicOnlyRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PartnerDashboardPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
