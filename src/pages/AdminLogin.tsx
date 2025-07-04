
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Home } from 'lucide-react';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Query the new login_tbl table
      const { data: loginUsers, error } = await supabase
        .from('login_tbl')
        .select('*')
        .eq('username', username)
        .eq('user_type', 'Admin')
        .eq('is_active', true);

      if (error) {
        toast.error('Login failed: ' + error.message);
        return;
      }

      if (!loginUsers || loginUsers.length === 0) {
        toast.error('Invalid username or password');
        return;
      }

      const loginUser = loginUsers[0];
      
      // In production, you should use proper password hashing/verification
      // For now, we'll do a simple comparison (this should be improved)
      if (password !== 'password') { // Default password for demo
        toast.error('Invalid username or password');
        return;
      }
      
      // Update last login time
      await supabase
        .from('login_tbl')
        .update({ last_login: new Date().toISOString() })
        .eq('id', loginUser.id);

      // Store admin session in localStorage
      localStorage.setItem('adminSession', JSON.stringify({
        id: loginUser.id,
        username: loginUser.username,
        userType: loginUser.user_type,
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
                  placeholder="Enter username (try: admin)"
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
                  placeholder="Enter password (try: password)"
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Logging in...' : 'Login'}
              </Button>
            </form>
            
            <div className="mt-4 text-sm text-gray-600">
              <p>Default credentials:</p>
              <p>Username: admin</p>
              <p>Password: password</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
