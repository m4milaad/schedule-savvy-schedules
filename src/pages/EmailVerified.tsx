import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from "@/components/ThemeToggle";
import Squares from "@/components/Squares";
import { supabase } from '@/integrations/supabase/client';

const EmailVerified = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const exchangeSession = async () => {
      try {
        if (typeof window === 'undefined') {
          setIsProcessing(false);
          return;
        }

        const url = window.location.href;
        const hash = window.location.hash;
        const hasAccessToken =
          hash.includes('access_token') || hash.includes('refresh_token');
        const hasCodeParam =
          hash.includes('code=') || window.location.search.includes('code=');

        if (hasAccessToken) {
          // Session already set from hash parameters, just clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } else if (hasCodeParam) {
          const { error } = await supabase.auth.exchangeCodeForSession(url);
          if (error) {
            console.error('Email verification session exchange failed:', error);
            setErrorMessage(error.message || 'Verification completed, but we could not establish a session. Please sign in manually.');
          } else {
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        } else {
          setErrorMessage('Verification link is missing required parameters. Please try again from your email.');
        }
      } catch (error: any) {
        console.error('Unexpected verification error:', error);
        setErrorMessage(error.message || 'Something went wrong while verifying your email.');
      } finally {
        setIsProcessing(false);
      }
    };

    exchangeSession();
  }, []);

  useEffect(() => {
    // Auto redirect after 5 seconds
    const timer = setTimeout(() => {
      navigate('/auth');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Squares
          speed={0.5}
          squareSize={40}
          direction='diagonal'
          borderColor='rgb(39,30,55)'
          hoverFillColor='rgb(34,34,34)'
        />
      </div>
      
      <div className="relative z-10 w-full max-w-md p-4">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        
        <Card className="animate-scale-in shadow-sm backdrop-blur-sm bg-background/95">
          <CardHeader>
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-4 animate-pulse">
                <CheckCircle2 className="w-16 h-16 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle className="text-2xl text-center">Email Verified!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 text-center">
            <p className="text-muted-foreground">
              Your email has been successfully verified. You can now access the CUK Exam System.
            </p>
            {isProcessing && (
              <p className="text-sm text-muted-foreground">
                Finalizing your session...
              </p>
            )}
            {errorMessage && (
              <p className="text-sm text-destructive">
                {errorMessage}
              </p>
            )}
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-full"
              >
                Go to Sign In
              </Button>
              <p className="text-sm text-muted-foreground">
                Redirecting automatically in 5 seconds...
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmailVerified;
