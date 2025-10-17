import { supabase } from "@/integrations/supabase/client";
import { comparePassword } from "./passwordUtils";

export interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  is_active: boolean;
}

export interface AdminSession {
  user: AdminUser;
  loginTime: string;
}

const ADMIN_SESSION_KEY = 'admin_session';

export const adminAuth = {
  // Login function
  async login(username: string, password: string): Promise<{ success: boolean; error?: string; user?: AdminUser }> {
    try {
      // Query the admin_users table
      const { data: adminUsers, error } = await supabase
        .from('admin_users')
        .select('*')
        .eq('username', username)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: false, error: 'User not found or inactive' };
        }
        return { success: false, error: 'Database connection error' };
      }

      if (!adminUsers) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Verify password
      const isPasswordValid = await comparePassword(password, adminUsers.password_hash);
      
      if (!isPasswordValid) {
        return { success: false, error: 'Invalid credentials' };
      }

      // Create user object without password
      const user: AdminUser = {
        id: adminUsers.id,
        username: adminUsers.username,
        full_name: adminUsers.full_name,
        email: adminUsers.email,
        is_active: adminUsers.is_active
      };

      // Store session
      const session: AdminSession = {
        user,
        loginTime: new Date().toISOString()
      };
      
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(session));

      return { success: true, user };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  },

  // Get current session
  getSession(): AdminSession | null {
    try {
      const sessionStr = localStorage.getItem(ADMIN_SESSION_KEY);
      if (!sessionStr) return null;
      
      const session = JSON.parse(sessionStr) as AdminSession;
      
      // Check if session is expired (24 hours)
      const loginTime = new Date(session.loginTime);
      const now = new Date();
      const hoursDiff = (now.getTime() - loginTime.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff > 24) {
        this.logout();
        return null;
      }
      
      return session;
    } catch (error) {
      return null;
    }
  },

  // Check if user is logged in
  isLoggedIn(): boolean {
    return this.getSession() !== null;
  },

  // Get current user
  getCurrentUser(): AdminUser | null {
    const session = this.getSession();
    return session?.user || null;
  },

  // Logout
  logout(): void {
    localStorage.removeItem(ADMIN_SESSION_KEY);
  },

  // Clear all auth state
  clearAuthState(): void {
    localStorage.removeItem(ADMIN_SESSION_KEY);
    // Clear any other auth-related items
    Object.keys(localStorage).forEach(key => {
      if (key.includes('admin') || key.includes('auth')) {
        localStorage.removeItem(key);
      }
    });
  }
};