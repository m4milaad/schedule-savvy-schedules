import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { useToast } from "@/hooks/use-toast";
import { Home, Eye, EyeOff } from 'lucide-react';
import { ThemeToggle } from "@/components/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Check if already logged in
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      // Check if user has admin role
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'department_admin']);

      if (roles && roles.length > 0) {
        navigate('/admin-dashboard', { replace: true });
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Error",
        description: "Please enter both email and password",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Check if user has admin role
        const { data: roles, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .in('role', ['admin', 'department_admin']);

        if (roleError) throw roleError;

        if (!roles || roles.length === 0) {
          await supabase.auth.signOut();
          toast({
            title: "Access Denied",
            description: "You do not have administrator privileges",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Login Successful",
          description: "Welcome back!",
        });
        
        navigate('/admin-dashboard');
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || 'Invalid credentials',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 p-4 transition-colors duration-500">
      <div className="w-full max-w-md">
        {/* Home Button */}
        <div className="mb-6 flex justify-between items-center">
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            className="flex items-center gap-2 hover:bg-white/80 dark:hover:bg-slate-700/80 transition-all duration-300 hover:scale-105"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
          <ThemeToggle />
        </div>

        <Card className="shadow-xl border-0 bg-white/95 dark:bg-slate-800/95 backdrop-blur transition-all duration-500 hover:shadow-2xl animate-fade-in">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4 animate-scale-in">
              <img 
                src="/favicon.ico" 
                alt="CUK Logo" 
                className="w-16 h-16 transition-transform duration-300 hover:scale-110"
              />
            </div>
            <CardTitle className="text-2xl font-bold text-slate-800 dark:text-slate-200 transition-colors duration-300">
              Admin Login
            </CardTitle>
            <CardDescription className="text-slate-600 dark:text-slate-400 transition-colors duration-300">
              Enter your admin credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 dark:text-slate-300 transition-colors duration-300">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="Enter your email"
                  className="border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-300 hover:border-slate-400 dark:hover:border-slate-500"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 dark:text-slate-300 transition-colors duration-300">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter password"
                    className="border-slate-300 dark:border-slate-600 focus:border-blue-500 dark:focus:border-blue-400 pr-10 transition-all duration-300 hover:border-slate-400 dark:hover:border-slate-500"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors duration-300" />
                    ) : (
                      <Eye className="h-4 w-4 text-slate-400 dark:text-slate-500 transition-colors duration-300" />
                    )}
                  </Button>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white transition-all duration-300 hover:scale-105 hover:shadow-lg" 
                disabled={isLoading}
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
