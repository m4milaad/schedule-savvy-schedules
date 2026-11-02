import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { customBackground } from '@/lib/adminBackground';
import { BackgroundPicker, Field, PasswordSection, Section, optional } from '@/components/admin/AdminProfileTab';
import type { ProfileUpdateInput } from '@/lib/validation';
import logger from '@/lib/logger';


interface Department {
  dept_id: string;
  dept_name: string;
}

interface TeacherProfileTabProps {
  profile: UserProfile;
  departments: Department[];
  onUpdate: (updates: ProfileUpdateInput) => Promise<{ error: unknown }>;
}

/** The teacher's profile page, laid out like the admin one (AdminProfileTab). */
export const TeacherProfileTab: React.FC<TeacherProfileTabProps> = ({ profile, departments, onUpdate }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    email: profile.email || '',
    dept_id: profile.dept_id || '',
    // Teacher-specific fields (stored in teachers table)
    contact_no: '',
    address: '',
    designation: ''
  });
  const [background, setBackground] = useState(customBackground(profile.theme_color));
  const [savingBackground, setSavingBackground] = useState(false);

  // Load teacher data from teachers table
  useEffect(() => {
    if (profile.id) {
      loadTeacherData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

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
      // updateProfile toasts both success and errors.
      const { error } = await onUpdate({
        full_name: formData.full_name,
        email: formData.email || null,
        dept_id: formData.dept_id || null,
      });
      if (error) return;

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

  // Saves on pick, like the admin profile.
  const saveBackground = async (color: string | null) => {
    const previous = background;
    setBackground(color);
    setSavingBackground(true);
    const { error } = await onUpdate({ theme_color: color });
    if (error) setBackground(previous);
    setSavingBackground(false);
  };

  return (
    <>
      <Section title="Profile" description="Shown to students on notices, marks and leave requests.">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <Field id="dept_id" label="Department">
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
          <Field id="address" label={<>Address {optional}</>}>
            <Textarea
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={2}
            />
          </Field>
          <Button type="submit" size="sm" className="w-fit" disabled={loading}>
            {loading ? 'Saving…' : 'Save profile'}
          </Button>
        </form>
      </Section>

      <Separator />

      <Section title="Background" description="The colour behind your dashboard. Only you see it.">
        <BackgroundPicker value={background} onChange={(c) => void saveBackground(c)} disabled={savingBackground} />
      </Section>

      <Separator />

      <PasswordSection />
    </>
  );
};
