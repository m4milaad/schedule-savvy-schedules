import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { PasswordStrengthChecker } from '@/components/PasswordStrengthChecker';
import Squares from "@/components/Squares";
import { useTheme } from 'next-themes';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isSessionReady, setIsSessionReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  useEffect(() => {
    const hydrateSession = async () => {
      try {
        if (typeof window === 'undefined') {
          return;
        }

        const url = window.location.href;
        const hash = window.location.hash;
        const hasRecoveryParams =
          hash.includes('type=recovery') ||
          hash.includes('access_token') ||
          hash.includes('refresh_token') ||
          url.includes('code=');

        if (!hasRecoveryParams) {
          console.warn('Reset password page opened without recovery parameters.');
          toast({
            title: "Link Required",
            description: "Please use the password reset link sent to your email.",
            variant: "destructive",
          });
          return;
        }

        if (hash.includes('access_token') || hash.includes('refresh_token')) {
          // Session already set from hash parameters, just clean up URL
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        } else {
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) {
            console.error('Password reset session exchange failed:', error);
            toast({
              title: "Session Error",
              description: error.message || "We couldn't validate your reset link. Please request a new one.",
              variant: "destructive",
            });
            return;
          }
          window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }

        setIsSessionReady(true);
      } catch (error: any) {
        console.error('Unexpected session error:', error);
        toast({
          title: "Error",
          description: error.message || "Something went wrong while preparing the reset form.",
          variant: "destructive",
        });
      }
    };

    hydrateSession();
  }, [toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSessionReady) {
      toast({
        title: "Session Not Ready",
        description: "Please wait for the reset link to be validated.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Error",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    // Check password complexity
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
      toast({
        title: "Error",
        description: "Password must contain uppercase, lowercase, number, and special character",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Password updated successfully! You can now sign in with your new password.",
      });

      setTimeout(() => {
        navigate('/auth');
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Squares
          speed={0.5}
          squareSize={40}
          direction='diagonal'
          borderColor={isDarkMode ? 'rgb(39,30,55)' : 'rgb(200,210,230)'}
          hoverFillColor={isDarkMode ? 'rgb(34,34,34)' : 'rgb(230,235,245)'}
          showVignette={isDarkMode}
        />
      </div>

      <div className="relative z-10 w-full max-w-md p-4">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        <Card className="animate-scale-in shadow-sm backdrop-blur-sm bg-background/95">
          <CardHeader>
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-primary/10 p-4">
                <KeyRound className="w-12 h-12 text-primary" />
              </div>
              <CardTitle className="text-2xl text-center">Reset Your Password</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter new password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <PasswordStrengthChecker password={password} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Confirm new password"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={loading || !isSessionReady}
              >
                {loading ? "Updating..." : isSessionReady ? "Update Password" : "Validating link..."}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
