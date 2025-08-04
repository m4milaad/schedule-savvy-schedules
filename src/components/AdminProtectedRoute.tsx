import React from 'react';
import { Navigate } from 'react-router-dom';
import { adminAuth } from '@/utils/adminAuth';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const isLoggedIn = adminAuth.isLoggedIn();

  if (!isLoggedIn) {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
};