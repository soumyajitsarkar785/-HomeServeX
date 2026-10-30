import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from '../pages/HomePage.js';
import { LoginPage } from '../pages/LoginPage.js';
import { RegisterPage } from '../pages/RegisterPage.js';
import { DashboardPage } from '../pages/DashboardPage.js';
import { useAuth } from './auth-context.js';
import { Spinner } from '@homeservex/ui';

import { AccountPage } from '../pages/AccountPage.js';
import { CustomerAppContainer } from '../components/CustomerAppContainer.js';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }
  if (user) return <Navigate to="/bookings" replace />;
  return <>{children}</>;
}

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CustomerAppContainer initialScreen="home" />} />
        <Route path="/home" element={<CustomerAppContainer initialScreen="home" />} />
        <Route path="/legacy/home" element={<HomePage />} />
        <Route path="/app" element={<CustomerAppContainer />} />
        <Route path="/mobile" element={<CustomerAppContainer />} />
        <Route path="/services" element={<CustomerAppContainer initialScreen="services" />} />
        <Route path="/service-detail" element={<CustomerAppContainer initialScreen="service-detail" />} />
        <Route path="/track" element={<CustomerAppContainer initialScreen="tracking" />} />
        <Route path="/orders" element={<CustomerAppContainer initialScreen="orders" />} />
        <Route path="/offers" element={<CustomerAppContainer initialScreen="offers" />} />
        <Route path="/account" element={<CustomerAppContainer initialScreen="account" />} />
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
        <Route path="/bookings" element={<CustomerAppContainer initialScreen="orders" />} />
        <Route path="/dashboard" element={<Navigate to="/bookings" replace />} />
        <Route path="/legacy/bookings" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/legacy/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
