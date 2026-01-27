import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { Lock, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { PasswordStrengthChecker } from '@/components/PasswordStrengthChecker';

interface Department {
  dept_id: string;
  dept_name: string;
}

const presetColors = [
  '#020817', // Default dark
  '#1e293b', // Slate
  '#1f2937', // Gray
  '#374151', // Cool gray
  '#1e40af', // Blue
  '#059669', // Emerald
  '#7c3aed', // Violet
  '#dc2626', // Red
  '#ea580c', // Orange
  '#ca8a04', // Yellow
  '#be185d', // Pink
  '#0891b2', // Cyan
];

export const AdminProfileTab: React.FC = () => {
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
  
  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
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
    if (!deptId) return 'Super Admin';
    const dept = departments.find(d => d.dept_id === deptId);
    return dept ? dept.dept_name : 'Not Assigned';
  };

  const getRoleBadge = (deptId: string | null | undefined) => {
    return deptId ? 'Department Admin' : 'Super Admin';
  };

  const isPasswordStrong = (password: string) => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password)
    );
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      toast({
        title: "Error",
        description: "Please enter your current password",
        variant: "destructive",
      });
      return;
    }

    if (!isPasswordStrong(newPassword)) {
      toast({
        title: "Error",
        description: "New password does not meet the strength requirements",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (currentPassword === newPassword) {
      toast({
        title: "Error",
        description: "New password must be different from current password",
        variant: "destructive",
      });
      return;
    }

    setPasswordLoading(true);

    try {
      // First verify current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('User not found');
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        toast({
          title: "Error",
          description: "Current password is incorrect",
          variant: "destructive",
        });
        setPasswordLoading(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: "Success",
        description: "Password updated successfully",
      });

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update password",
        variant: "destructive",
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Account</div>
              <CardTitle className="text-base font-semibold">
                Profile Settings
              </CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          <div className="border-b border-border/40 mb-8">
            <div className="flex space-x-0">
              <div className="h-10 px-4 pb-3 pt-2">
                <div className="h-4 w-12 bg-muted/30 rounded"></div>
              </div>
              <div className="h-10 px-4 pb-3 pt-2">
                <div className="h-4 w-16 bg-muted/20 rounded"></div>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column Skeleton */}
            <div className="space-y-6">
              <div>
                <div className="h-4 w-36 bg-muted/30 rounded mb-4"></div>
                <div className="space-y-4">
                  <div>
                    <div className="h-3 w-16 bg-muted/20 rounded mb-2"></div>
                    <div className="h-9 bg-muted/20 rounded-md"></div>
                  </div>
                  <div>
                    <div className="h-3 w-20 bg-muted/20 rounded mb-2"></div>
                    <div className="h-9 bg-muted/20 rounded-md"></div>
                  </div>
                  <div>
                    <div className="h-3 w-24 bg-muted/20 rounded mb-2"></div>
                    <div className="h-9 bg-muted/20 rounded-md"></div>
                  </div>
                  <div className="pt-4">
                    <div className="h-8 w-24 bg-muted/30 rounded-md"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column Skeleton */}
            <div className="space-y-6">
              {/* Department Section */}
              <div>
                <div className="h-4 w-32 bg-muted/30 rounded mb-4"></div>
                <div className="p-3 rounded-lg bg-muted/10 border border-border/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="h-4 w-28 bg-muted/20 rounded"></div>
                    <div className="h-5 w-20 bg-muted/20 rounded-md"></div>
                  </div>
                  <div className="h-3 w-48 bg-muted/15 rounded"></div>
                </div>
              </div>

              {/* Theme Section */}
              <div>
                <div className="h-4 w-24 bg-muted/30 rounded mb-4"></div>
                <div className="space-y-3">
                  <div className="grid grid-cols-6 gap-2">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div key={i} className="w-full h-8 bg-muted/20 rounded-md"></div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-20 bg-muted/20 rounded-md"></div>
                    <div className="w-8 h-8 bg-muted/20 rounded-md"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="linear-surface overflow-hidden">
      <CardHeader className="linear-toolbar">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="linear-kicker">Account</div>
            <CardTitle className="text-base font-semibold">
              Profile Settings
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-8">
        {/* Approval Status */}
        {!profile?.is_approved && (
          <div className="mb-8 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                Account pending approval by super administrator
              </span>
            </div>
          </div>
        )}

        <Tabs defaultValue="profile" className="w-full">
          <div className="border-b border-border/40 mb-8">
            <TabsList className="h-auto p-0 bg-transparent">
              <TabsTrigger 
                value="profile" 
                className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-all hover:bg-transparent hover:text-foreground focus-visible:bg-transparent focus-visible:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Profile
              </TabsTrigger>
              <TabsTrigger 
                value="security" 
                className="relative h-10 rounded-none border-b-2 border-transparent bg-transparent px-4 pb-3 pt-2 font-medium text-muted-foreground shadow-none transition-all hover:bg-transparent hover:text-foreground focus-visible:bg-transparent focus-visible:text-foreground focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                Security
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="profile" className="space-y-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Personal Information */}
              <div className="space-y-6">
                <div>
                  <h2 className="text-sm font-medium text-foreground mb-4">Personal Information</h2>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <Label htmlFor="full_name" className="text-xs text-muted-foreground/70 uppercase tracking-wide mb-2 block">
                        Full Name
                      </Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        className="border-0 bg-muted/30 focus:bg-muted/50 focus:ring-1 focus:ring-primary/50 rounded-md h-9 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="email" className="text-xs text-muted-foreground/70 uppercase tracking-wide mb-2 block">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="border-0 bg-muted/30 focus:bg-muted/50 focus:ring-1 focus:ring-primary/50 rounded-md h-9 text-sm"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="contact_no" className="text-xs text-muted-foreground/70 uppercase tracking-wide mb-2 block">
                        Contact Number
                      </Label>
                      <Input
                        id="contact_no"
                        type="tel"
                        value={formData.contact_no}
                        onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
                        className="border-0 bg-muted/30 focus:bg-muted/50 focus:ring-1 focus:ring-primary/50 rounded-md h-9 text-sm"
                        placeholder="Optional"
                      />
                    </div>

                    <div className="pt-4">
                      <Button 
                        type="submit" 
                        size="sm"
                        className="h-8 px-3 text-xs bg-primary/90 hover:bg-primary text-primary-foreground rounded-md"
                        disabled={saving}
                      >
                        {saving ? (
                          <>
                            <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Department Assignment */}
                <div>
                  <h2 className="text-sm font-medium text-foreground mb-4">Department & Role</h2>
                  <div className="p-3 rounded-lg bg-muted/20 border border-border/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-foreground">{getDepartmentName(formData.dept_id)}</span>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-xs text-primary font-medium">
                        {getRoleBadge(formData.dept_id)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground/60">
                      Department assignments are managed by super administrators
                    </p>
                  </div>
                </div>

                {/* Theme Color */}
                <div>
                  <h2 className="text-sm font-medium text-foreground mb-4">Theme Color</h2>
                  <div className="space-y-3">
                    <div className="grid grid-cols-6 gap-2">
                      {presetColors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          className={`w-full h-8 rounded-md border-2 transition-all ${
                            formData.theme_color === color 
                              ? 'border-primary ring-1 ring-primary/30' 
                              : 'border-border/40 hover:border-border'
                          }`}
                          style={{ backgroundColor: color }}
                          onClick={() => setFormData({ ...formData, theme_color: color })}
                          title={color}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="text"
                        value={formData.theme_color}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                            setFormData({ ...formData, theme_color: value });
                          }
                        }}
                        className="border-0 bg-muted/30 focus:bg-muted/50 focus:ring-1 focus:ring-primary/50 rounded-md h-8 text-xs font-mono w-20"
                        placeholder="#020817"
                        maxLength={7}
                      />
                      <div 
                        className="w-8 h-8 rounded-md border border-border/40"
                        style={{ backgroundColor: formData.theme_color }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-0">
            <div className="max-w-md">
              <h2 className="text-sm font-medium text-foreground mb-4">Change Password</h2>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="currentPassword" className="text-xs text-muted-foreground/70 uppercase tracking-wide mb-2 block">
                    Current Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="border-0 bg-muted/30 focus:bg-muted/50 focus:ring-1 focus:ring-primary/50 rounded-md h-9 text-sm pr-10"
                      placeholder="Enter current password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="newPassword" className="text-xs text-muted-foreground/70 uppercase tracking-wide mb-2 block">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="border-0 bg-muted/30 focus:bg-muted/50 focus:ring-1 focus:ring-primary/50 rounded-md h-9 text-sm pr-10"
                      placeholder="Enter new password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  {newPassword && <PasswordStrengthChecker password={newPassword} />}
                </div>

                <div>
                  <Label htmlFor="confirmPassword" className="text-xs text-muted-foreground/70 uppercase tracking-wide mb-2 block">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="border-0 bg-muted/30 focus:bg-muted/50 focus:ring-1 focus:ring-primary/50 rounded-md h-9 text-sm pr-10"
                      placeholder="Confirm new password"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                  )}
                  {confirmPassword && newPassword === confirmPassword && newPassword.length > 0 && (
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">Passwords match ✓</p>
                  )}
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    size="sm"
                    className="h-8 px-3 text-xs bg-primary/90 hover:bg-primary text-primary-foreground rounded-md"
                    disabled={passwordLoading || !isPasswordStrong(newPassword) || newPassword !== confirmPassword}
                  >
                    {passwordLoading ? (
                      <>
                        <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 mr-2" />
                        Update Password
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};