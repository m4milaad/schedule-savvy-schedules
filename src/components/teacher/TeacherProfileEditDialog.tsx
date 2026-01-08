import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { ThemeColorPicker } from '@/components/ThemeColorPicker';

interface Department {
  dept_id: string;
  dept_name: string;
}

interface TeacherProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  departments: Department[];
  onUpdate: (updates: Partial<UserProfile>) => Promise<any>;
}

export const TeacherProfileEditDialog: React.FC<TeacherProfileEditDialogProps> = ({
  isOpen,
  onClose,
  profile,
  departments,
  onUpdate
}) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    email: profile.email || '',
    dept_id: profile.dept_id || '',
    theme_color: (profile as any).theme_color || '#3b82f6',
    // Teacher-specific fields (stored in teachers table)
    contact_no: '',
    address: '',
    designation: ''
  });

  // Load teacher data from teachers table
  useEffect(() => {
    if (profile.id && isOpen) {
      loadTeacherData();
    }
  }, [profile.id, isOpen]);

  const loadTeacherData = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('contact_no, teacher_address, designation, teacher_email')
        .eq('teacher_id', profile.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading teacher data:', error);
        return;
      }

      if (data) {
        setFormData(prev => ({
          ...prev,
          contact_no: data.contact_no || '',
          address: data.teacher_address || '',
          designation: data.designation || ''
        }));
      }
    } catch (error) {
      console.error('Error in loadTeacherData:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name.trim()) {
      toast({
        title: "Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Update profile data including theme_color
      const profileUpdates: any = {
        full_name: formData.full_name,
        email: formData.email,
        dept_id: formData.dept_id || null,
        theme_color: formData.theme_color
      };
      
      await onUpdate(profileUpdates);

      // Also update teachers table
      const { error: teacherError } = await supabase
        .from('teachers')
        .update({
          teacher_name: formData.full_name,
          teacher_address: formData.address || null,
          teacher_email: formData.email,
          contact_no: formData.contact_no || null,
          designation: formData.designation || null,
          dept_id: formData.dept_id || null
        })
        .eq('teacher_id', profile.id);

      if (teacherError) {
        console.error('Error updating teacher data:', teacherError);
        toast({
          title: "Warning",
          description: "Profile updated but teacher details may not have saved",
          variant: "destructive",
        });
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-100 transition-colors duration-300">
            Edit Profile
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="full_name" className="dark:text-gray-300 transition-colors duration-300">Full Name *</Label>
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Enter your full name"
              className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
              required
            />
          </div>

          <div>
            <Label htmlFor="email" className="dark:text-gray-300 transition-colors duration-300">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
              className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
            />
          </div>

          <div>
            <Label htmlFor="designation" className="dark:text-gray-300 transition-colors duration-300">Designation</Label>
            <Input
              id="designation"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              placeholder="e.g., Assistant Professor"
              className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
            />
          </div>

          <div>
            <Label htmlFor="contact_no" className="dark:text-gray-300 transition-colors duration-300">Contact Number</Label>
            <Input
              id="contact_no"
              value={formData.contact_no}
              onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
              placeholder="Enter contact number"
              className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
            />
          </div>

          <div>
            <Label htmlFor="address" className="dark:text-gray-300 transition-colors duration-300">Address</Label>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter your address"
              className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="dept_id" className="dark:text-gray-300 transition-colors duration-300">Department</Label>
            <Select value={formData.dept_id} onValueChange={(value) => setFormData({ ...formData, dept_id: value })}>
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
              onClick={() => {
                onClose();
                navigate('/update-password');
              }}
            >
              <Lock className="w-4 h-4" />
              Update Password
            </Button>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              className="flex-1" 
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
