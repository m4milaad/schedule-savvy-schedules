import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from 'react-router-dom';
import { customBackground } from '@/lib/adminBackground';
import { BackgroundSwatches } from '@/components/admin/BackgroundSwatches';
import { Field, ProfileSection, optional } from '@/components/ProfileEditDialog';
import logger from '@/lib/logger';


interface Department {
  dept_id: string;
  dept_name: string;
}

interface TeacherProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  departments: Department[];
  onUpdate: (updates: Partial<UserProfile>) => Promise<Record<string, unknown>>;
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
    theme_color: customBackground((profile as Record<string, unknown>).theme_color),
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
        logger.error('Error loading teacher data:', error);
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
      logger.error('Error in loadTeacherData:', error);
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
      const profileUpdates: Record<string, unknown> = {
        full_name: formData.full_name,
        email: formData.email || null,
        dept_id: formData.dept_id || null,
        theme_color: formData.theme_color,
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
        logger.error('Error updating teacher data:', teacherError);
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
      logger.error('Error updating profile:', error);
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
      <DialogContent className="max-h-[90vh] max-w-2xl gap-0 overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Your profile</DialogTitle>
          <DialogDescription>Shown to students on notices, marks and leave requests.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <ProfileSection title="Details">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="full_name" label="Full name">
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                />
              </Field>
              <Field id="designation" label={<>Designation {optional}</>}>
                <Input
                  id="designation"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                  placeholder="e.g. Assistant Professor"
                />
              </Field>
              <Field id="email" label="Email">
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </Field>
              <Field id="contact_no" label={<>Contact number {optional}</>}>
                <Input
                  id="contact_no"
                  type="tel"
                  value={formData.contact_no}
                  onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
                />
              </Field>
              <Field id="dept_id" label="Department" className="sm:col-span-2">
                <Select value={formData.dept_id} onValueChange={(value) => setFormData({ ...formData, dept_id: value })}>
                  <SelectTrigger id="dept_id">
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
              </Field>
              <Field id="address" label={<>Address {optional}</>} className="sm:col-span-2">
                <Textarea
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                />
              </Field>
            </div>
          </ProfileSection>

          <Separator />

          <ProfileSection title="Background" description="The colour behind your dashboard. Only you see it.">
            <BackgroundSwatches value={formData.theme_color} onChange={(c) => setFormData({ ...formData, theme_color: c })} />
          </ProfileSection>

          <Separator />

          <ProfileSection title="Password" description="Opens the password page.">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => {
                onClose();
                navigate('/update-password');
              }}
            >
              Change password
            </Button>
          </ProfileSection>

          <DialogFooter className="gap-2 border-t px-6 py-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving…' : 'Save profile'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
