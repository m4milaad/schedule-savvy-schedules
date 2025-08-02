import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Home } from 'lucide-react';
import bcrypt from 'bcryptjs';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Query the login_tbl table using username
      const { data: loginUsers, error } = await supabase
        .from('login_tbl')
        .select('*')
        .eq('username', username)
        .ilike('type', 'Admin');

      if (error) {
        console.error('Database query error:', error);
        toast({
          title: "Error",
          description: 'Login failed: ' + error.message,
          variant: "destructive",
        });
        return;
      }

      if (!loginUsers || loginUsers.length === 0) {
        toast({
          title: "Error",
          description: 'Invalid username or password',
          variant: "destructive",
        });
        return;
      }

      const loginUser = loginUsers[0];
      
      // Check if password is already hashed (starts with $2a$, $2b$, or $2y$)
      let isPasswordValid = false;
      
      if (loginUser.password.startsWith('$2a$') || 
          loginUser.password.startsWith('$2b$') || 
          loginUser.password.startsWith('$2y$')) {
        // Password is bcrypt hashed
        try {
          isPasswordValid = await bcrypt.compare(password, loginUser.password);
        } catch (error) {
          console.error('Bcrypt comparison error:', error);
          isPasswordValid = false;
        }
      } else {
        // Password might be plain text (for development/testing)
        console.warn('Plain text password detected in database - this should be hashed in production');
        isPasswordValid = password === loginUser.password;
      }
      
      if (!isPasswordValid) {
        toast({
          title: "Error",
          description: 'Invalid username or password',
          variant: "destructive",
        });
        return;
      }
      
      // Store admin session in localStorage
      localStorage.setItem('adminSession', JSON.stringify({
        id: loginUser.user_id,
        username: loginUser.username,
        userType: loginUser.type,
        loginTime: new Date().toISOString()
      }));

      toast({
        title: "Success",
        description: 'Login successful!',
      });
      navigate('/admin-dashboard');
      
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Error",
        description: 'Login failed. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        {/* Home Button */}
        <div className="mb-4">
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              Enter your admin credentials to access the dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  placeholder="Enter username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
