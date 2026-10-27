import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { PartnerDashboardPage } from '../pages/PartnerDashboardPage.js';
import { PartnerLoginPage } from '../pages/PartnerLoginPage.js';
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<PublicOnlyRoute><PartnerLoginPage /></PublicOnlyRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PartnerDashboardPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
