import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboardPage } from '../pages/AdminDashboardPage.js';
import { AdminLoginPage } from '../pages/AdminLoginPage.js';
import { AdminAppLayout } from '../components/AdminAppLayout.js';
import { useAdminAuth } from './auth-context.js';
import { Spinner } from '@homeservex/ui';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAdminAuth();
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' }}>
        <Spinner size="lg" color="#3B82F6" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAdminAuth();
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' }}>
        <Spinner size="lg" color="#3B82F6" />
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
        <Route path="/" element={<AdminAppLayout initialSection="dashboard" />} />
        <Route path="/dashboard" element={<AdminAppLayout initialSection="dashboard" />} />
        <Route path="/live-operations" element={<AdminAppLayout initialSection="live-operations" />} />
        <Route path="/dispatch-control" element={<AdminAppLayout initialSection="dispatch-control" />} />
        <Route path="/orders" element={<AdminAppLayout initialSection="orders" />} />
        <Route path="/providers" element={<AdminAppLayout initialSection="providers" />} />
        <Route path="/customers" element={<AdminAppLayout initialSection="customers" />} />
        <Route path="/services" element={<AdminAppLayout initialSection="services" />} />
        <Route path="/offers" element={<AdminAppLayout initialSection="offers" />} />
        <Route path="/reports" element={<AdminAppLayout initialSection="reports" />} />
        <Route path="/settings" element={<AdminAppLayout initialSection="settings" />} />
        <Route path="/login" element={<PublicOnlyRoute><AdminLoginPage /></PublicOnlyRoute>} />
        <Route path="/legacy" element={<ProtectedRoute><AdminDashboardPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
