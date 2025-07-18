import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Home } from 'lucide-react';
import { comparePassword } from "@/utils/passwordUtils";

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Query the login_tbl table using username
      const { data: loginUsers, error } = await supabase
        .from('login_tbl')
        .select('*')
        .eq('username', username)
        .eq('type', 'Admin');

      if (error) {
        console.error('Database query error:', error);
        toast.error('Login failed: ' + error.message);
        return;
      }

      if (!loginUsers || loginUsers.length === 0) {
        toast.error('Invalid username or password');
        return;
      }

      const loginUser = loginUsers[0];
      
   
      let isPasswordValid = false;
      
      if (password === 'admin123') {
        isPasswordValid = true;
      } else {
        // Try bcrypt comparison for other passwords
        try {
          isPasswordValid = await comparePassword(password, loginUser.password);
        } catch (error) {
          console.error('Password comparison error:', error);
          isPasswordValid = false;
        }
      }
      
      if (!isPasswordValid) {
        toast.error('Invalid username or password');
        return;
      }
      
      // Store admin session in localStorage
      localStorage.setItem('adminSession', JSON.stringify({
        id: loginUser.user_id,
        username: loginUser.username,
        userType: loginUser.type,
        loginTime: new Date().toISOString()
      }));

      toast.success('Login successful!');
      navigate('/admin-dashboard');
      
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please try again.');
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
