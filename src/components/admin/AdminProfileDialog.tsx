import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { User, Lock, X } from 'lucide-react';
import { ThemeColorPicker } from '@/components/ThemeColorPicker';

interface Department {
  dept_id: string;
  dept_name: string;
}

interface AdminProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminProfileDialog: React.FC<AdminProfileDialogProps> = ({
  isOpen,
  onClose
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    dept_id: '',
    contact_no: '',
    theme_color: '#020817'
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadProfile();
      loadDepartments();
    }
  }, [isOpen]);

  const loadDepartments = async () => {
    try {
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .order('dept_name');
      
      if (error) throw error;
      setDepartments(data || []);
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      setProfile(profileData);
      setFormData({
        full_name: profileData.full_name || '',
        email: profileData.email || user.email || '',
        dept_id: profileData.dept_id || '',
        contact_no: (profileData as any).contact_no || '',
        theme_color: (profileData as any).theme_color || '#020817'
      });
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updateData: any = {
        full_name: formData.full_name,
        email: formData.email,
        contact_no: formData.contact_no || null,
        theme_color: formData.theme_color,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      
      onClose();
      // Reload the page to apply theme changes
      window.location.reload();
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getDepartmentName = (deptId: string | null | undefined) => {
    if (!deptId) return 'N/A (Super Admin)';
    const dept = departments.find(d => d.dept_id === deptId);
    return dept ? dept.dept_name : 'Not Assigned';
  };

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="linear-surface max-w-md">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="linear-surface max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="linear-toolbar">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <DialogTitle className="text-lg font-semibold">Profile Settings</DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your account settings and preferences
          </p>
        </DialogHeader>

        <div className="space-y-6 p-6">
          {!profile?.is_approved && (
            <div className="linear-pill bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">
                  Account pending approval by super administrator
                </span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name" className="text-sm font-medium">
                Full Name
              </Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="linear-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="linear-input"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_no" className="text-sm font-medium">
                Contact Number
              </Label>
              <Input
                id="contact_no"
                type="tel"
                value={formData.contact_no}
                onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
                className="linear-input"
                placeholder="Optional"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Department</Label>
              <div className="linear-pill bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{getDepartmentName(formData.dept_id)}</span>
                  <span className="text-xs text-muted-foreground">
                    {formData.dept_id ? 'Department Admin' : 'Super Admin'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Only super administrators can change department assignments
                </p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border/40">
              <ThemeColorPicker 
                color={formData.theme_color} 
                onChange={(color) => setFormData({ ...formData, theme_color: color })}
              />
            </div>

            <div className="pt-2 border-t border-border/40">
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 linear-button"
                onClick={() => {
                  onClose();
                  navigate('/update-password');
                }}
              >
                <Lock className="w-4 h-4" />
                Change Password
              </Button>
            </div>

            <div className="flex gap-2 pt-4">
              <Button 
                type="submit" 
                className="flex-1 linear-button"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                className="linear-button"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};