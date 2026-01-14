import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Trash2, UserPlus, ArrowLeft, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { LoadingScreen } from '@/components/ui/loading-screen';
import { cn } from "@/lib/utils";

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
  const [teachers, setTeachers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'admin' | 'department_admin' | 'teacher'>('department_admin');
  const [deptId, setDeptId] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [themeColor, setThemeColor] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    await Promise.all([loadAdmins(), loadTeachers(), loadDepartments(), loadCurrentUser()]);
    setLoading(false);
  };

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);

      const { data: profile } = await supabase
        .from('profiles')
        .select('theme_color')
        .eq('user_id', user.id)
        .single();

      if (profile?.theme_color) {
        setThemeColor(profile.theme_color);
      }
    }
  };

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
    }
  };

  const loadTeachers = async () => {
    try {
      // Get all users with teacher role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('role', 'teacher');

      if (roleError) throw roleError;

      if (!roleData || roleData.length === 0) {
        setTeachers([]);
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
          is_approved: profile?.is_approved ?? false,
          dept_id: profile?.dept_id,
          dept_name: (profile as any)?.departments?.dept_name || 'N/A',
        };
      });

      setTeachers(combinedData);
    } catch (error: any) {
      console.error('Error loading teachers:', error);
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

    if ((role === 'department_admin' || role === 'teacher') && !deptId) {
      toast({
        title: "Error",
        description: `Please select a department for ${role === 'teacher' ? 'teacher' : 'department admin'}`,
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
            ...(role !== 'admin' && { dept_id: deptId }),
          }
        }
      });

      if (authError) throw authError;

      // The triggers will automatically create the profile and user_role
      await new Promise(resolve => setTimeout(resolve, 1000));

      toast({
        title: "Success",
        description: `${role === 'teacher' ? 'Teacher' : 'Admin'} user created successfully. They will receive a confirmation email.`,
      });

      // Reset form
      setEmail('');
      setPassword('');
      setFullName('');
      setRole('department_admin');
      setDeptId('');

      // Reload data
      loadData();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const approveUser = async (userId: string, full_name: string, userType: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: true })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${full_name} has been approved as ${userType}`,
      });

      loadData();
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve user",
        variant: "destructive",
      });
    }
  };

  const revokeUser = async (userId: string, full_name: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_approved: false })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${full_name}'s approval has been revoked`,
      });

      loadData();
    } catch (error: any) {
      console.error('Error revoking user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to revoke user",
        variant: "destructive",
      });
    }
  };

  const removeUser = async (userId: string, email: string, roleToRemove: string) => {
    if (!confirm(`Are you sure you want to remove ${roleToRemove} access from ${email}?`)) {
      return;
    }

    try {
      // Remove role - cast to the expected type
      const roleValue = roleToRemove as 'admin' | 'department_admin' | 'student' | 'teacher';
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', roleValue);

      if (roleError) throw roleError;

      // Update profile to student
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ user_type: 'student' })
        .eq('user_id', userId);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: `${roleToRemove} access removed successfully`,
      });

      loadData();
    } catch (error: any) {
      console.error('Error removing user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to remove access",
        variant: "destructive",
      });
    }
  };

  const renderUserList = (users: AdminUser[], userType: 'admin' | 'teacher') => {
    const filteredUsers = users.filter(user => user.user_id !== currentUserId);

    if (filteredUsers.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          {userType === 'admin' ? (
            <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
          ) : (
            <GraduationCap className="w-12 h-12 mx-auto mb-4 opacity-50" />
          )}
          <p>No {userType === 'admin' ? 'admin' : 'teacher'} users found</p>
          <p className="text-sm mt-2">Create one using the form</p>
        </div>
      );
    }

    return (
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredUsers.map((user) => (
          <div
            key={user.user_id}
            className="flex items-center justify-between p-3 border rounded-lg bg-card"
          >
            <div className="flex-1">
              <div className="font-medium">{user.full_name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant="secondary">
                  {user.role === 'admin' ? 'Super Admin' : user.role === 'department_admin' ? 'Department Admin' : 'Teacher'}
                </Badge>
                {user.role !== 'admin' && (
                  <>
                    <Badge variant="outline">{user.dept_name}</Badge>
                    {user.is_approved ? (
                      <Badge variant="default" className="bg-green-600">Approved</Badge>
                    ) : (
                      <Badge variant="destructive">Pending</Badge>
                    )}
                  </>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              {user.role !== 'admin' && !user.is_approved && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => approveUser(user.user_id, user.full_name, user.role === 'department_admin' ? 'department admin' : 'teacher')}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Approve
                </Button>
              )}
              {user.role !== 'admin' && user.is_approved && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => revokeUser(user.user_id, user.full_name)}
                  className="text-orange-600 hover:text-orange-700 border-orange-300"
                >
                  Revoke
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeUser(user.user_id, user.email, user.role)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "min-h-screen p-6 transition-colors duration-500",
        !themeColor && "bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
      )}
      style={{ backgroundColor: themeColor || undefined }}
    >
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
          {/* Create User Form */}
          <Card className="prof-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5" />
                Create User
              </CardTitle>
              <CardDescription>
                Add new admin, department admin, or teacher users
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
                    placeholder="user@cukashmir.ac.in"
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
                      <SelectItem value="teacher">Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(role === 'department_admin' || role === 'teacher') && (
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
                  {creating ? "Creating..." : `Create ${role === 'teacher' ? 'Teacher' : 'Admin'} User`}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* User Lists */}
          <Card className="prof-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Manage Users
              </CardTitle>
              <CardDescription>
                Approve, revoke, or remove admin and teacher access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <LoadingScreen
                  message="Loading users..."
                  variant="cascade"
                  size="sm"
                  fullScreen={false}
                  className="py-8"
                />
              ) : (
                <Tabs defaultValue="admins">
                  <TabsList className="grid w-full grid-cols-2 mb-4">
                    <TabsTrigger value="admins" className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Admins ({admins.filter(a => a.user_id !== currentUserId).length})
                    </TabsTrigger>
                    <TabsTrigger value="teachers" className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4" />
                      Teachers ({teachers.length})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="admins">
                    {renderUserList(admins, 'admin')}
                  </TabsContent>
                  <TabsContent value="teachers">
                    {renderUserList(teachers, 'teacher')}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Info Card */}
        <Card className="prof-card mt-6">
          <CardHeader>
            <CardTitle>Role Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>
              <strong>Super Admin:</strong> Full system access to all departments and settings
            </p>
            <p>
              <strong>Department Admin:</strong> Department-specific admin access (requires approval)
            </p>
            <p>
              <strong>Teacher:</strong> Can manage courses, marks, attendance, assignments, and resources (requires approval)
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ManageAdmins;
