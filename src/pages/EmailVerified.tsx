import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2 } from 'lucide-react';
import { ThemeToggle } from "@/components/ThemeToggle";
import DotGrid from "@/components/DotGrid";

const EmailVerified = () => {
  const navigate = useNavigate();

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
        <DotGrid 
          dotSize={4}
          gap={24}
          className="w-full h-full"
        />
      </div>
      
      <div className="relative z-10 w-full max-w-md p-4">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>
        
        <Card className="animate-scale-in shadow-2xl backdrop-blur-sm bg-background/95">
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
            <div className="space-y-3">
              <Button 
                onClick={() => navigate('/auth')} 
                className="w-full transition-all duration-300 hover:scale-105"
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
