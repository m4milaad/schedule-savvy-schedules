import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Home, Eye, EyeOff } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { hashPassword } from "@/utils/passwordUtils";

interface AdminUser {
  user_id: string;
  username: string;
  type: string;
  created_at: string;
}

const AdminUsers = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [newUserType, setNewUserType] = useState('Admin');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editUserType, setEditUserType] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showNewConfirmPassword, setShowNewConfirmPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showEditConfirmPassword, setShowEditConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is authenticated as admin
    const adminSession = localStorage.getItem('adminSession');
    if (!adminSession) {
      toast({
        title: "Access Denied",
        description: "Please log in as an administrator",
        variant: "destructive",
      });
      navigate('/admin-login');
      return;
    }

    loadAdminUsers();
  }, [navigate, toast]);

  const loadAdminUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('login_tbl')
        .select('user_id, username, type, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAdminUsers(data || []);
    } catch (error) {
      console.error('Error loading admin users:', error);
      toast({
        title: "Error",
        description: 'Failed to load admin users',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const validatePasswords = (password: string, confirmPassword: string) => {
    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: 'Passwords do not match',
        variant: "destructive",
      });
      return false;
    }
    if (password.length < 6) {
      toast({
        title: "Error",
        description: 'Password must be at least 6 characters long',
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleAddUser = async () => {
    if (!newUsername.trim() || !newPassword || !newConfirmPassword) {
      toast({
        title: "Error",
        description: 'Please fill in all fields',
        variant: "destructive",
      });
      return;
    }

    if (!validatePasswords(newPassword, newConfirmPassword)) {
      return;
    }

    try {
      const hashedPassword = await hashPassword(newPassword);
      
      const { error } = await supabase
        .from('login_tbl')
        .insert({
          username: newUsername.trim(),
          password: hashedPassword,
          type: newUserType
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: 'Admin user added successfully',
      });
      setNewUsername('');
      setNewPassword('');
      setNewConfirmPassword('');
      setNewUserType('Admin');
      setIsAddDialogOpen(false);
      loadAdminUsers();
    } catch (error) {
      console.error('Error adding admin user:', error);
      toast({
        title: "Error",
        description: 'Failed to add admin user',
        variant: "destructive",
      });
    }
  };

  const handleEditUser = async () => {
    if (!editingUser || !editUsername.trim()) {
      toast({
        title: "Error",
        description: 'Please enter a username',
        variant: "destructive",
      });
      return;
    }

    // If password is being changed, validate it
    if (editPassword || editConfirmPassword) {
      if (!validatePasswords(editPassword, editConfirmPassword)) {
        return;
      }
    }

    try {
      const updateData: any = {
        username: editUsername.trim(),
        type: editUserType
      };

      // Only update password if a new one is provided
      if (editPassword) {
        updateData.password = await hashPassword(editPassword);
      }

      const { error } = await supabase
        .from('login_tbl')
        .update(updateData)
        .eq('user_id', editingUser.user_id);

      if (error) throw error;

      toast({
        title: "Success",
        description: 'Admin user updated successfully',
      });
      setEditingUser(null);
      setEditUsername('');
      setEditPassword('');
      setEditConfirmPassword('');
      setEditUserType('');
      setIsEditDialogOpen(false);
      loadAdminUsers();
    } catch (error) {
      console.error('Error updating admin user:', error);
      toast({
        title: "Error",
        description: 'Failed to update admin user',
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('login_tbl')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Success",
        description: 'Admin user deleted successfully',
      });
      loadAdminUsers();
    } catch (error) {
      console.error('Error deleting admin user:', error);
      toast({
        title: "Error",
        description: 'Failed to delete admin user',
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (user: AdminUser) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword('');
    setEditConfirmPassword('');
    setEditUserType(user.type);
    setIsEditDialogOpen(true);
  };

  const resetAddForm = () => {
    setNewUsername('');
    setNewPassword('');
    setNewConfirmPassword('');
    setNewUserType('Admin');
    setShowNewPassword(false);
    setShowNewConfirmPassword(false);
  };

  const resetEditForm = () => {
    setEditingUser(null);
    setEditUsername('');
    setEditPassword('');
    setEditConfirmPassword('');
    setEditUserType('');
    setShowEditPassword(false);
    setShowEditConfirmPassword(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading admin users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin User Management</h1>
            <p className="text-gray-600">Manage administrator accounts and permissions</p>
          </div>
          <Button
            onClick={() => navigate('/admin-dashboard')}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Admin Users ({adminUsers.length})</CardTitle>
              <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
                setIsAddDialogOpen(open);
                if (!open) resetAddForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Admin User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Admin User</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="new-username">Username</Label>
                      <Input
                        id="new-username"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Enter username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter password (min 6 characters)"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="new-confirm-password">Confirm Password</Label>
                      <div className="relative">
                        <Input
                          id="new-confirm-password"
                          type={showNewConfirmPassword ? "text" : "password"}
                          value={newConfirmPassword}
                          onChange={(e) => setNewConfirmPassword(e.target.value)}
                          placeholder="Re-enter password"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowNewConfirmPassword(!showNewConfirmPassword)}
                        >
                          {showNewConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="new-user-type">User Type</Label>
                      <Select value={newUserType} onValueChange={setNewUserType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select user type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="Teacher">Teacher</SelectItem>
                          <SelectItem value="Student">Student</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleAddUser} className="flex-1">Add User</Button>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">Cancel</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {adminUsers.map((user) => (
                <div key={user.user_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{user.username}</div>
                    <div className="text-sm text-gray-500">
                      Type: {user.type}
                    </div>
                    <div className="text-sm text-gray-500">
                      Created: {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Admin User</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the user "{user.username}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDeleteUser(user.user_id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) resetEditForm();
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Admin User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-username">Username</Label>
                <Input
                  id="edit-username"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Enter username"
                />
              </div>
              <div>
                <Label htmlFor="edit-password">New Password (leave blank to keep current)</Label>
                <div className="relative">
                  <Input
                    id="edit-password"
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Enter new password (optional)"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                  >
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-confirm-password">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="edit-confirm-password"
                    type={showEditConfirmPassword ? "text" : "password"}
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowEditConfirmPassword(!showEditConfirmPassword)}
                  >
                    {showEditConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="edit-user-type">User Type</Label>
                <Select value={editUserType} onValueChange={setEditUserType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select user type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                    <SelectItem value="Student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleEditUser} className="flex-1">Update User</Button>
                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">Cancel</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminUsers;