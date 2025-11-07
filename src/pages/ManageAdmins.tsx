import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Trash2, UserPlus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AdminUser {
  email: string;
  full_name: string;
  role: string;
  created_at: string;
  user_id: string;
  is_approved?: boolean;
  dept_id?: string;
  dept_name?: string;
}

const ManageAdmins = () => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'department_admin'>('department_admin');
  const [deptId, setDeptId] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadAdmins();
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('dept_id, dept_name')
        .order('dept_name');

      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadAdmins = async () => {
    try {
      setLoading(true);
      
      // Get all users with admin roles
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'department_admin']);

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        setAdmins([]);
        return;
      }

      // Get profile info for these users with department
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          user_id, 
          full_name, 
          email, 
          is_approved, 
          dept_id,
          departments:dept_id (dept_name)
        `)
        .in('user_id', roleData.map(r => r.user_id));

      if (profileError) throw profileError;

      // Combine the data
      const combinedData = roleData.map(role => {
        const profile = profileData?.find(p => p.user_id === role.user_id);
        return {
          user_id: role.user_id,
          role: role.role,
          email: profile?.email || 'N/A',
          full_name: profile?.full_name || 'N/A',
          created_at: new Date().toISOString(),
          is_approved: profile?.is_approved ?? true,
          dept_id: profile?.dept_id,
          dept_name: (profile as any)?.departments?.dept_name || 'N/A',
        };
      });

      setAdmins(combinedData);
    } catch (error: any) {
      console.error('Error loading admins:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to load admin users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim() || !fullName.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (role === 'department_admin' && !deptId) {
      toast({
        title: "Error",
        description: "Please select a department for department admin",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 12) {
      toast({
        title: "Error",
        description: "Password must be at least 12 characters",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    try {
      // Create user through Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/admin-login`,
          data: {
            full_name: fullName.trim(),
            user_type: role,
            ...(role === 'department_admin' && { dept_id: deptId }),
          }
        }
      });

      if (authError) throw authError;

      // The triggers will automatically create the profile and user_role
      // But we need to wait a moment for them to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Success",
        description: `Admin user created successfully. They will receive a confirmation email.`,
      });

      // Reset form
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('department_admin');
      setDeptId('');

      // Reload admin list
      loadAdmins();
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create admin user",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const approveAdmin = async (userId: string, email: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${email} has been approved as department admin`,
      });

      loadAdmins();
    } catch (error: any) {
      console.error('Error approving admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve admin",
        variant: "destructive",
      });
    }
  };

  const removeAdmin = async (userId: string, email: string) => {
    if (!confirm(`Are you sure you want to remove admin access from ${email}?`)) {
      return;
    }

    try {
      // Remove admin role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .in('role', ['admin', 'department_admin']);

      if (roleError) throw roleError;

      // Update profile to student
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ user_type: 'student' })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "Admin access removed successfully",
      });

      loadAdmins();
    } catch (error: any) {
      console.error('Error removing admin:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin access",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6 transition-colors duration-500">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <Button
            onClick={() => navigate('/admin-dashboard')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Create Admin Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Create Admin User
              </CardTitle>
              <CardDescription>
                Add new admin or department admin users to the system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={createAdmin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@cukashmir.ac.in"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password * (min 12 chars)</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select value={role} onValueChange={(value: any) => setRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="department_admin">Department Admin</SelectItem>
                      <SelectItem value="admin">Super Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {role === 'department_admin' && (
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select value={deptId} onValueChange={setDeptId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map((dept) => (
                          <SelectItem key={dept.dept_id} value={dept.dept_id}>
                            {dept.dept_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? "Creating..." : "Create Admin User"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Admin List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Admin Users
              </CardTitle>
              <CardDescription>
                Manage existing admin and department admin users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p>Loading admins...</p>
                </div>
              ) : admins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No admin users found</p>
                  <p className="text-sm mt-2">Create the first admin using the form</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {admins.map((admin) => (
                    <div
                      key={admin.user_id}
                      className="flex items-center justify-between p-3 border rounded-lg bg-card"
                    >
                      <div className="flex-1">
                        <div className="font-medium">{admin.full_name}</div>
                        <div className="text-sm text-muted-foreground">{admin.email}</div>
                        <div className="flex gap-2 mt-2 flex-wrap">
                          <Badge variant="secondary">
                            {admin.role === 'admin' ? 'Super Admin' : 'Department Admin'}
                          </Badge>
                          {admin.role === 'department_admin' && (
                            <>
                              <Badge variant="outline">{admin.dept_name}</Badge>
                              {admin.is_approved ? (
                                <Badge variant="default" className="bg-green-600">Approved</Badge>
                              ) : (
                                <Badge variant="destructive">Pending</Badge>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {admin.role === 'department_admin' && !admin.is_approved && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => approveAdmin(admin.user_id, admin.email)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Approve
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeAdmin(admin.user_id, admin.email)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Important Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Super Admin:</strong> Full system access to all departments and settings
            </p>
            <p>
              <strong>Department Admin:</strong> Department-specific admin access
            </p>
            <p className="text-muted-foreground">
              Note: New admin users will receive an email confirmation. Make sure email settings are configured in Supabase.
            </p>
            <p className="text-muted-foreground">
              For testing, you can disable email confirmation in Supabase Auth settings.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageAdmins;
