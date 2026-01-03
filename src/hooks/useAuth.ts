import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Profile } from '@/types/database';
import { signUpSchema, signInSchema, profileUpdateSchema } from '@/lib/validation';
import { z } from 'zod';

export type UserProfile = Profile;

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            loadUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
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
      console.error('Profile loading error:', error);
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
          throw new Error(validationError.issues[0].message);
        }
        throw validationError;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/email-verified`,
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
    } catch (error: any) {
      console.error('Sign up error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
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
          throw new Error(validationError.issues[0].message);
        }
        throw validationError;
      }

      // Clean up any existing auth state
      cleanupAuthState();
      
      // Attempt to sign out first
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }

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
        if (['department_admin', 'teacher'].includes(profileData?.user_type) && !profileData?.is_approved) {
          // Sign out the unapproved user
          await supabase.auth.signOut();
          throw new Error('Your account is pending approval by an administrator. Please wait for approval before logging in.');
        }
        
        // Redirect based on user type
        if (profileData?.user_type === 'student') {
          window.location.href = '/';
        } else if (['admin', 'department_admin'].includes(profileData?.user_type)) {
          window.location.href = '/admin-dashboard';
        } else if (profileData?.user_type === 'teacher') {
          window.location.href = '/teacher-dashboard';
        } else {
          window.location.href = '/';
        }
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Sign in error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
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
      } catch (err) {
        // Continue even if this fails
      }
      
      // Force page reload for clean state
      window.location.href = '/auth';
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const cleanupAuthState = () => {
    // Remove all Supabase auth keys from localStorage
    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        localStorage.removeItem(key);
      }
    });
    
    // Remove from sessionStorage if in use
    Object.keys(sessionStorage || {}).forEach((key) => {
      if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
        sessionStorage.removeItem(key);
      }
    });
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return { error: 'No user logged in' };

    try {
      // Validate inputs
      try {
        profileUpdateSchema.parse(updates);
      } catch (validationError) {
        if (validationError instanceof z.ZodError) {
          throw new Error(validationError.issues[0].message);
        }
        throw validationError;
      }

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
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
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
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