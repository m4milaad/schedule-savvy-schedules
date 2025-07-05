
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
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Query the login_tbl table with the correct column names
      const { data: loginUsers, error } = await supabase
        .from('login_tbl')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'Admin');

      if (error) {
        console.error('Database query error:', error);
        toast.error('Login failed: ' + error.message);
        return;
      }

      if (!loginUsers || loginUsers.length === 0) {
        toast.error('Invalid user ID or password');
        return;
      }

      const loginUser = loginUsers[0];
      
      // Check password (in production, use proper password hashing)
      if (password !== loginUser.password) {
        toast.error('Invalid user ID or password');
        return;
      }
      
      // Store admin session in localStorage
      localStorage.setItem('adminSession', JSON.stringify({
        id: loginUser.user_id,
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
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  type="text"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  required
                  placeholder="Enter user ID"
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
            
            <div className="mt-4 text-sm text-gray-600">
              <p>For demo purposes:</p>
              <p>Check the login_tbl table for available admin user IDs and passwords</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLogin;
