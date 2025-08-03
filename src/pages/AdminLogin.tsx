import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { Home, Eye, EyeOff } from 'lucide-react';
import { adminAuth } from '@/utils/adminAuth';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if already logged in
  useEffect(() => {
    if (adminAuth.isLoggedIn()) {
      navigate('/admin-dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('Starting login process...');
      
      // Clear any existing auth state first
      adminAuth.clearAuthState();
      
      const result = await adminAuth.login(username, password);
      
      if (result.success && result.user) {
        toast({
          title: "Login Successful",
          description: `Welcome back, ${result.user.full_name}!`,
        });
        
        console.log('Login successful, redirecting to admin dashboard...');
        navigate('/admin-dashboard');
      } else {
        toast({
          title: "Login Failed",
          description: result.error || 'Invalid username or password',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Unexpected login error:', error);
      toast({
        title: "Error",
        description: 'An unexpected error occurred. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (demoUsername: string, demoPassword: string) => {
    setUsername(demoUsername);
    setPassword(demoPassword);
    
    // Trigger form submission after a short delay
    setTimeout(() => {
      const form = document.querySelector('form');
      if (form) {
        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      }
    }, 100);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-4">
      <div className="w-full max-w-md">
        {/* Home Button */}
        <div className="mb-6">
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            className="flex items-center gap-2 hover:bg-white/80"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
        </div>

        <Card className="shadow-xl border-0 bg-white/95 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-slate-800">Admin Login</CardTitle>
            <CardDescription className="text-slate-600">
              Enter your admin credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-slate-700">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter username"
                  className="border-slate-300 focus:border-blue-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    className="border-slate-300 focus:border-blue-500 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-slate-50 rounded-lg border">
              <p className="text-sm font-medium text-slate-700 mb-3">Demo Credentials:</p>
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left"
                  onClick={() => handleDemoLogin('admin', 'admin123')}
                  disabled={isLoading}
                >
                  <span className="font-mono">admin / admin123</span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-left"
                  onClick={() => handleDemoLogin('m4milaad', 'milad3103')}
                  disabled={isLoading}
                >
                  <span className="font-mono">m4milaad / milad3103</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;