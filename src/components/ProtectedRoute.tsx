import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  allowedRoles?: string[];
  redirectTo?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAuth = true,
  allowedRoles = [],
  redirectTo = '/auth'
}) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Authenticating..." variant="morphing" />;
  }

  if (requireAuth && !user) {
    return <Navigate to={redirectTo} replace />;
  }

  if (allowedRoles.length > 0 && profile && !allowedRoles.includes(profile.user_type)) {
    // Redirect based on user role
    if (profile.user_type === 'student') {
      return <Navigate to="/" replace />;
    } else if (['admin', 'department_admin'].includes(profile.user_type)) {
      return <Navigate to="/admin-dashboard" replace />;
    } else if (profile.user_type === 'teacher') {
      return <Navigate to="/teacher-dashboard" replace />;
    }
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};