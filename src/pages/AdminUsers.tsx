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
import { adminAuth } from "@/utils/adminAuth";

interface AdminUser {
  id: string;
  username: string;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

const AdminUsers = () => {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newConfirmPassword, setNewConfirmPassword] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
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
    if (!adminAuth.isLoggedIn()) {
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
        .from('admin_users')
        .select('id, username, full_name, email, is_active, created_at')
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
    if (!newUsername.trim() || !newPassword || !newConfirmPassword || !newFullName.trim()) {
      toast({
        title: "Error",
        description: 'Please fill in all required fields',
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
        .from('admin_users')
        .insert({
          username: newUsername.trim(),
          password_hash: hashedPassword,
          full_name: newFullName.trim(),
          email: newEmail.trim() || null,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: 'Admin user added successfully',
      });
      setNewUsername('');
      setNewPassword('');
      setNewConfirmPassword('');
      setNewFullName('');
      setNewEmail('');
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
    if (!editingUser || !editUsername.trim() || !editFullName.trim()) {
      toast({
        title: "Error",
        description: 'Please enter required fields',
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
        full_name: editFullName.trim(),
        email: editEmail.trim() || null
      };

      // Only update password if a new one is provided
      if (editPassword) {
        updateData.password_hash = await hashPassword(editPassword);
      }

      const { error } = await supabase
        .from('admin_users')
        .update(updateData)
        .eq('id', editingUser.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: 'Admin user updated successfully',
      });
      setEditingUser(null);
      setEditUsername('');
      setEditPassword('');
      setEditConfirmPassword('');
      setEditFullName('');
      setEditEmail('');
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
        .from('admin_users')
        .delete()
        .eq('id', userId);

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
    setEditFullName(user.full_name);
    setEditEmail(user.email || '');
    setIsEditDialogOpen(true);
  };

  const resetAddForm = () => {
    setNewUsername('');
    setNewPassword('');
    setNewConfirmPassword('');
    setNewFullName('');
    setNewEmail('');
    setShowNewPassword(false);
    setShowNewConfirmPassword(false);
  };

  const resetEditForm = () => {
    setEditingUser(null);
    setEditUsername('');
    setEditPassword('');
    setEditConfirmPassword('');
    setEditFullName('');
    setEditEmail('');
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
                      <Label htmlFor="new-full-name">Full Name</Label>
                      <Input
                        id="new-full-name"
                        value={newFullName}
                        onChange={(e) => setNewFullName(e.target.value)}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="new-email">Email (optional)</Label>
                      <Input
                        id="new-email"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Enter email address"
                      />
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
                <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{user.username}</div>
                    <div className="text-sm text-gray-500">
                      Name: {user.full_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Email: {user.email || 'Not provided'}
                    </div>
                    <div className="text-sm text-gray-500">
                      Status: {user.is_active ? 'Active' : 'Inactive'}
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
                          <AlertDialogAction onClick={() => handleDeleteUser(user.id)}>
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
                <Label htmlFor="edit-full-name">Full Name</Label>
                <Input
                  id="edit-full-name"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email (optional)</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="Enter email address"
                />
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