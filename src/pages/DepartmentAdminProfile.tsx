import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Lock } from 'lucide-react';
import { ThemeColorPicker, getContrastColor } from '@/components/ThemeColorPicker';
import { LoadingScreen } from '@/components/ui/loading-screen';

interface Department {
  dept_id: string;
  dept_name: string;
}

const DepartmentAdminProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    dept_id: '',
    contact_no: '',
    theme_color: '#020817'  // Default theme color
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadProfile();
    loadDepartments();
  }, []);

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
      if (!user) {
        navigate('/auth');
        return;
      }

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
        theme_color: (profileData as any).theme_color || '#020817'  // Default theme color
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

      // Department admins can't change their department - only super admin can
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
      
      loadProfile();
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

  if (loading) {
    return <LoadingScreen message="Loading profile..." variant="default" />;
  }

  const getDepartmentName = (deptId: string | null | undefined) => {
    if (!deptId) return 'N/A (Super Admin)';
    const dept = departments.find(d => d.dept_id === deptId);
    return dept ? dept.dept_name : 'Not Assigned';
  };

  return (
    <div 
      className="min-h-screen p-4 transition-colors duration-300"
      style={{ backgroundColor: formData.theme_color || undefined }}
    >
      <div className="max-w-2xl mx-auto">
        <Button
          onClick={() => navigate('/admin-dashboard')}
          variant="outline"
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="animate-fade-in transition-all duration-300 bg-card/90 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <User className="w-5 h-5" />
              My Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!profile?.is_approved && (
              <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  ⏳ Your account is pending approval by a super administrator.
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contact_no">Contact Number</Label>
                <Input
                  id="contact_no"
                  type="tel"
                  value={formData.contact_no}
                  onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <Label>Department</Label>
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">{getDepartmentName(formData.dept_id)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Only super administrators can change your department
                  </p>
                </div>
              </div>

              {/* Theme Color Picker */}
              <div className="pt-2 border-t">
                <ThemeColorPicker 
                  color={formData.theme_color} 
                  onChange={(color) => setFormData({ ...formData, theme_color: color })}
                />
              </div>

              {/* Update Password Button */}
              <div className="pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => navigate('/update-password')}
                >
                  <Lock className="w-4 h-4" />
                  Update Password
                </Button>
              </div>

              <Button 
                type="submit" 
                className="w-full"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DepartmentAdminProfile;
