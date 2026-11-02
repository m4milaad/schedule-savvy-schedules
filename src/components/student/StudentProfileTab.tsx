import React, { useState } from 'react';
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

interface StudentProfileTabProps {
  profile: UserProfile;
  departments: Department[];
  onUpdate: (updates: ProfileUpdateInput) => Promise<{ error: unknown }>;
}

/** The student's profile page, laid out like the admin one (AdminProfileTab). */
export const StudentProfileTab: React.FC<StudentProfileTabProps> = ({ profile, departments, onUpdate }) => {
  const [formData, setFormData] = useState({
    full_name: profile.full_name || '',
    email: profile.email || '',
    dept_id: profile.dept_id || '',
    semester: profile.semester || 1,
    // Student-specific fields (stored in students table)
    student_enrollment_no: '',
    abc_id: '',
    contact_no: '',
    address: ''
  });
  const [background, setBackground] = useState(customBackground(profile.theme_color));
  const [savingBackground, setSavingBackground] = useState(false);

  // Load student data and populate enrollment number from signup if available
  React.useEffect(() => {
    if (profile.user_type === 'student' && profile.id) {
      loadStudentData();
    }
    // Pre-fill enrollment number from profile if it exists
    if (profile.student_enrollment_no && !profile.student_enrollment_no.startsWith('PENDING-')) {
      setFormData(prev => ({ ...prev, student_enrollment_no: profile.student_enrollment_no || '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, profile.user_type, profile.student_enrollment_no]);

  const loadStudentData = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('student_enrollment_no, abc_id, student_address, student_email, contact_no')
        .eq('student_id', profile.id)
        .maybeSingle();

      if (error) {
        logger.error('Error loading student data:', error);
        return;
      }

      if (data) {
        setFormData(prev => ({
          ...prev,
          student_enrollment_no: data.student_enrollment_no || '',
          abc_id: data.abc_id || '',
          contact_no: data.contact_no || '',
          address: data.student_address || ''
        }));
      }
    } catch (error) {
      logger.error('Error in loadStudentData:', error);
    }
  };
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

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

    // Validate ABC ID is numeric only
    if (formData.abc_id && !/^\d+$/.test(formData.abc_id)) {
      toast({
        title: "Error",
        description: "ABC ID must contain only numbers",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // updateProfile toasts its own errors.
      const { error } = await onUpdate({
        full_name: formData.full_name,
        email: formData.email,
        dept_id: formData.dept_id || null,
        semester: formData.semester,
      });
      if (error) return;

      // If student, also update students table
      if (profile.user_type === 'student' && profile.id) {
        const { error: studentError } = await supabase
          .from('students')
          .update({
            student_enrollment_no: formData.student_enrollment_no,
            abc_id: formData.abc_id || null,
            student_address: formData.address,
            student_email: formData.email,
            contact_no: formData.contact_no
          })
          .eq('student_id', profile.id);

        if (studentError) {
          logger.error('Error updating student data:', studentError);
          toast({
            title: "Warning",
            description: "Profile updated but student details may not have saved",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      logger.error('Error updating profile:', error);
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

  const handleAbcIdChange = (value: string) => {
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, '');
    setFormData({ ...formData, abc_id: numericValue });
  };

  const isStudent = profile.user_type === 'student';

  return (
    <>
      <Section title="Profile" description="Keep these details current so your marks and results match your record.">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field id="full_name" label="Full name">
            <Input
              id="full_name"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
          </Field>

          {isStudent && (
            <>
              <Field id="student_enrollment_no" label="Enrollment number">
                <Input
                  id="student_enrollment_no"
                  value={formData.student_enrollment_no}
                  onChange={(e) => setFormData({ ...formData, student_enrollment_no: e.target.value })}
                  required
                />
              </Field>
              <Field id="abc_id" label={<>ABC ID {optional}</>}>
                <Input
                  id="abc_id"
                  value={formData.abc_id}
                  onChange={(e) => handleAbcIdChange(e.target.value)}
                  placeholder="Numbers only"
                  pattern="[0-9]*"
                  inputMode="numeric"
                />
              </Field>
            </>
          )}

          <Field id="email" label="Email">
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </Field>

          {isStudent && (
            <Field id="contact_no" label={<>Contact number {optional}</>}>
              <Input
                id="contact_no"
                type="tel"
                value={formData.contact_no}
                onChange={(e) => setFormData({ ...formData, contact_no: e.target.value })}
              />
            </Field>
          )}

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

          {isStudent && (
            <Field id="semester" label="Current semester">
              <Select value={formData.semester.toString()} onValueChange={(value) => setFormData({ ...formData, semester: parseInt(value) })}>
                <SelectTrigger id="semester">
                  <SelectValue placeholder="Select semester" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(sem => (
                    <SelectItem key={sem} value={sem.toString()}>
                      Semester {sem}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {isStudent && (
            <Field id="address" label={<>Address {optional}</>}>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </Field>
          )}

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
