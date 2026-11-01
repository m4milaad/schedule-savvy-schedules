import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import logger from '@/lib/logger';
import { AdminShellSkeleton } from '@/components/admin/AdminPanel';


interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  const checkAdminAccess = async () => {
    try {
      // Local session read, no network round trip. This only gates the UI; RLS guards the data.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      
      if (!user) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Check user_roles table first (primary source of truth)
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'department_admin']);

      if (roles && roles.length > 0) {
        setIsAdmin(true);
      } else {
        // Fallback: check profiles.user_type for consistency
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('user_id', user.id)
          .single();

        setIsAdmin(
          profile?.user_type === 'admin' || profile?.user_type === 'department_admin'
        );
      }
    } catch (error) {
      logger.error('Error checking admin access:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    // Same themed skeleton the dashboard shows next, so the handover is invisible.
    return <AdminShellSkeleton />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};