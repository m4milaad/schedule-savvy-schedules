import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Trash2, UserPlus, GraduationCap, Search, Edit2 } from 'lucide-react';
import { LoadingScreen } from '@/components/ui/loading-screen';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";

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

export const ManageAdminsTab = () => {
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
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const { toast } = useToast();
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

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
            const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('user_id, role')
                .in('role', ['admin', 'department_admin']);

            if (roleError) throw roleError;

            if (!roleData || roleData.length === 0) {
                setAdmins([]);
                return;
            }

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
            const { data: roleData, error: roleError } = await supabase
                .from('user_roles')
                .select('user_id, role')
                .eq('role', 'teacher');

            if (roleError) throw roleError;

            if (!roleData || roleData.length === 0) {
                setTeachers([]);
                return;
            }

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

        if (password.length < 12) {
            toast({
                title: "Error",
                description: "Password must be at least 12 characters long",
                variant: "destructive",
            });
            return;
        }

        if ((role === 'department_admin' || role === 'teacher') && !deptId) {
            toast({
                title: "Error",
                description: "Please select a department",
                variant: "destructive",
            });
            return;
        }

        try {
            setCreating(true);

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email.trim(),
                password: password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                    },
                },
            });

            if (authError) throw authError;

            if (!authData.user) {
                throw new Error("Failed to create user account");
            }

            const roleToAssign = role;

            const { error: roleError } = await supabase
                .from('user_roles')
                .insert({
                    user_id: authData.user.id,
                    role: roleToAssign,
                });

            if (roleError) throw roleError;

            const { error: profileError } = await supabase
                .from('profiles')
                .upsert({
                    user_id: authData.user.id,
                    email: email.trim(),
                    full_name: fullName.trim(),
                    user_type: roleToAssign,
                    is_approved: roleToAssign === 'admin',
                    dept_id: roleToAssign === 'admin' ? null : deptId,
                });

            if (profileError) {
                console.error('Profile error:', profileError);
            }

            toast({
                title: "Success",
                description: `${roleToAssign === 'teacher' ? 'Teacher' : 'Admin'} user created successfully`,
            });

            setEmail('');
            setPassword('');
            setFullName('');
            setDeptId('');
            setRole('department_admin');
            setIsAddDialogOpen(false);
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
                title: "Access Revoked",
                description: `${full_name}'s access has been revoked`,
            });

            loadData();
        } catch (error: any) {
            console.error('Error revoking user:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to revoke access",
                variant: "destructive",
            });
        }
    };

    const removeUser = async (userId: string, email: string, roleToRemove: string) => {
        try {
            const { error: roleError } = await supabase
                .from('user_roles')
                .delete()
                .eq('user_id', userId)
                .eq('role', roleToRemove as 'admin' | 'department_admin' | 'teacher');

            if (roleError) throw roleError;

            toast({
                title: "Success",
                description: `Removed ${roleToRemove} access for ${email}`,
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

    const allUsers = [...admins, ...teachers].filter(user => user.user_id !== currentUserId);
    const filteredUsers = allUsers.filter(user => {
        const query = searchQuery.toLowerCase();
        return (
            user.full_name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.role.toLowerCase().includes(query) ||
            user.dept_name?.toLowerCase().includes(query)
        );
    });

    return (
        <Card className="linear-surface overflow-hidden">
            <CardHeader className="linear-toolbar flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="linear-kicker">Settings</div>
                        <CardTitle className="text-base font-semibold">
                            Manage Administrators
                        </CardTitle>
                    </div>
                    <div className="linear-pill">
                        <span className="font-medium text-foreground">{filteredUsers.length}</span>
                        <span className="hidden sm:inline">shown</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-medium text-foreground">{allUsers.length}</span>
                        <span className="hidden sm:inline">total</span>
                    </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users…"
                            className="w-full pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <UserPlus className="w-4 h-4 mr-2" /> Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New User</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={createAdmin} className="space-y-4">
                                <div>
                                    <Label htmlFor="fullName">Full Name *</Label>
                                    <Input
                                        id="fullName"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        placeholder="Enter full name"
                                        required
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="email">Email *</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="user@example.com"
                                        required
                                    />
                                </div>
                                <div>
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
                                <div>
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
                                    <div>
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
                                    {creating ? "Creating..." : "Create User"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {loading ? (
                    <div className="py-14 text-center">
                        <LoadingScreen
                            message="Loading users..."
                            variant="cascade"
                            size="sm"
                            fullScreen={false}
                        />
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="py-14 text-center">
                        <div className="text-sm font-medium">
                            {searchQuery ? 'No matching users' : 'No users yet'}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            {searchQuery ? 'Try a different search.' : 'Add administrators using the button above.'}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="linear-table">
                            <thead>
                                <tr>
                                    <th className="linear-th">User</th>
                                    <th className="linear-th hidden md:table-cell">Role</th>
                                    <th className="linear-th hidden lg:table-cell">Department</th>
                                    <th className="linear-th hidden lg:table-cell">Status</th>
                                    <th className="linear-th text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map((user) => (
                                    <tr key={user.user_id} className="linear-tr">
                                        <td className="linear-td">
                                            <div className="font-medium">{user.full_name}</div>
                                            <div className="text-sm text-muted-foreground">{user.email}</div>
                                        </td>
                                        <td className="linear-td hidden md:table-cell">
                                            <Badge variant="secondary">
                                                {user.role === 'admin' ? 'Super Admin' : user.role === 'department_admin' ? 'Dept Admin' : 'Teacher'}
                                            </Badge>
                                        </td>
                                        <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                                            {user.role === 'admin' ? 'All' : user.dept_name}
                                        </td>
                                        <td className="linear-td hidden lg:table-cell">
                                            {user.role === 'admin' ? (
                                                <Badge variant="default" className="bg-green-600">Active</Badge>
                                            ) : user.is_approved ? (
                                                <Badge variant="default" className="bg-green-600">Approved</Badge>
                                            ) : (
                                                <Badge variant="destructive">Pending</Badge>
                                            )}
                                        </td>
                                        <td className="linear-td">
                                            <div className="flex justify-end gap-2">
                                                {user.role !== 'admin' && !user.is_approved && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => approveUser(user.user_id, user.full_name, user.role === 'department_admin' ? 'department admin' : 'teacher')}
                                                        className="text-green-600 hover:text-green-700"
                                                    >
                                                        Approve
                                                    </Button>
                                                )}
                                                {user.role !== 'admin' && user.is_approved && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => revokeUser(user.user_id, user.full_name)}
                                                        className="text-orange-600 hover:text-orange-700"
                                                    >
                                                        Revoke
                                                    </Button>
                                                )}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Remove User</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to remove "{user.full_name}"'s access?
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => removeUser(user.user_id, user.email, user.role)}>
                                                                Remove
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
