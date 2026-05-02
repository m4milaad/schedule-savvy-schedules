import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/database';
import { signUpSchema, signInSchema, profileUpdateSchema } from '@/lib/validation';
import { z } from 'zod';
import { persistAuthSession, clearPersistedAuthSession } from '@/lib/offlineCache';
import logger from '@/lib/logger';
import { getAppBaseUrl } from '@/lib/appUrl';


export type UserProfile = Profile;

function appHomeUrl(): string {
  return `${getAppBaseUrl()}/`;
}

export const useAuth = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Persist auth session for offline access
          void persistAuthSession({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }).catch(() => {});
          setTimeout(() => {
            void loadUserProfile(session.user.id);
          }, 0);
        } else {
          void clearPersistedAuthSession().catch(() => {});
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        logger.error('Error loading profile:', error);
        if (error.code !== 'PGRST116') { // Not found error
          toast({
            title: "Error",
            description: "Failed to load user profile",
            variant: "destructive",
          });
        }
      } else {
        setProfile(data as UserProfile);
      }
    } catch (error) {
      logger.error('Profile loading error:', error);
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, userData: {
    full_name: string;
    user_type: 'student' | 'department_admin' | 'admin' | 'teacher';
    dept_id?: string;
    student_enrollment_no?: string;
  }) => {
    try {
      // Validate inputs
      try {
        signUpSchema.parse({
          email,
          password,
          fullName: userData.full_name,
          userType: userData.user_type,
          enrollmentNumber: userData.student_enrollment_no,
          deptId: userData.dept_id,
        });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          throw new Error(validationError.issues[0]?.message ?? 'Validation failed');
        }
        throw validationError;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getAppBaseUrl()}/email-verified`,
          data: {
            ...userData,
            student_enrollment_no: userData.student_enrollment_no || null,
          }
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Account created successfully! Please check your email to verify your account.",
      });

      return { data, error: null };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Sign up error:', error);
      toast({
        title: "Error",
        description: message || "Failed to create account",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Validate inputs
      try {
        signInSchema.parse({ email, password });
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          throw new Error(validationError.issues[0]?.message ?? 'Validation failed');
        }
        throw validationError;
      }

      // ✅ FIX: Removed the pre-signIn signOut() call.
      // It was making an extra network request on every login attempt,
      // which could timeout on slow/mobile networks and was not necessary.
      // Stale local auth state is now cleaned up only on explicit signOut.

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Load profile to determine redirect
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_type, is_approved')
          .eq('user_id', data.user.id)
          .single();
        
        // Check if department_admin or teacher is approved
        if (['department_admin', 'teacher'].includes(profileData?.user_type ?? '') && !profileData?.is_approved) {
          // Sign out the unapproved user
          await supabase.auth.signOut();
          throw new Error('Your account is pending approval by an administrator. Please wait for approval before logging in.');
        }
        
        const go = (route: string) => {
          const r = route.startsWith('/') ? route : `/${route}`;
          navigate(r, { replace: true });
        };
        if (profileData?.user_type === 'student') {
          go('/student-dashboard');
        } else if (['admin', 'department_admin'].includes(profileData?.user_type ?? '')) {
          go('/admin-dashboard');
        } else if (profileData?.user_type === 'teacher') {
          go('/teacher-dashboard');
        } else {
          go('/student-dashboard');
        }
      }

      return { data, error: null };
    } catch (error: unknown) {
      const errorObj = error instanceof Error ? error : new Error('Unknown error');
      logger.error('Sign in error:', error);
      const isTimeout =
        errorObj.message?.toLowerCase().includes('timed out') ||
        errorObj.name === 'AbortError' ||
        errorObj.message?.toLowerCase().includes('network');

      toast({
        title: "Error",
        description: isTimeout
          ? "Connection timed out. Please check your internet connection and try again."
          : errorObj.message || "Failed to sign in",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // Continue even if this fails
      }
      
      window.location.replace(appHomeUrl());
    } catch (error: unknown) {
      logger.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const cleanupAuthState = () => {
    // Clear Supabase auth keys from localStorage and sessionStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return { error: 'No user logged in' };

    try {
      // Validate + sanitize inputs (trim strings, strip unknown keys)
      let validatedUpdates: Partial<UserProfile>;
      try {
        validatedUpdates = profileUpdateSchema.parse(updates) as Partial<UserProfile>;
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          throw new Error(validationError.issues[0]?.message ?? 'Validation failed');
        }
        throw validationError;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(validatedUpdates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data as UserProfile);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      return { data, error: null };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Profile update error:', error);
      toast({
        title: "Error",
        description: message || "Failed to update profile",
        variant: "destructive",
      });
      return { data: null, error };
    }
  };

  return {
    user,
    session,
    profile,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    loadUserProfile,
  };
};