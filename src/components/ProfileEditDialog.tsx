import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { UserProfile } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface Department {
  dept_id: string;
  dept_name: string;
}

interface ProfileEditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  departments: Department[];
  onUpdate: (updates: Partial<UserProfile>) => Promise<any>;
}

export const ProfileEditDialog: React.FC<ProfileEditDialogProps> = ({
  isOpen,
  onClose,
  profile,
  departments,
  onUpdate
}) => {
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

  // Load student data on mount if user is a student
  React.useEffect(() => {
    if (profile.user_type === 'student' && profile.id) {
      loadStudentData();
    }
  }, [profile.id, profile.user_type]);

  const loadStudentData = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('student_enrollment_no, abc_id, student_address, student_email, contact_no')
        .eq('student_id', profile.id)
        .maybeSingle();

      if (error) {
        console.error('Error loading student data:', error);
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
      console.error('Error in loadStudentData:', error);
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
      // Update profile data
      const profileUpdates = {
        full_name: formData.full_name,
        email: formData.email,
        dept_id: formData.dept_id,
        semester: formData.semester
      };
      
      await onUpdate(profileUpdates);

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
          console.error('Error updating student data:', studentError);
          toast({
            title: "Warning",
            description: "Profile updated but student details may not have saved",
            variant: "destructive",
          });
        }
      }
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAbcIdChange = (value: string) => {
    // Only allow numeric input
    const numericValue = value.replace(/\D/g, '');
    setFormData({ ...formData, abc_id: numericValue });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="dark:text-gray-100 transition-colors duration-300">
            Complete Your Profile
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

          {profile.user_type === 'student' && (
            <>
              <div>
                <Label htmlFor="student_enrollment_no" className="dark:text-gray-300 transition-colors duration-300">Enrollment Number *</Label>
                <Input
                  id="student_enrollment_no"
                  value={formData.student_enrollment_no}
                  onChange={(e) => setFormData({ ...formData, student_enrollment_no: e.target.value })}
                  placeholder="Enter enrollment number"
                  className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
                  required
                />
              </div>

              <div>
                <Label htmlFor="abc_id" className="dark:text-gray-300 transition-colors duration-300">ABC ID (Numeric Only)</Label>
                <Input
                  id="abc_id"
                  value={formData.abc_id}
                  onChange={(e) => handleAbcIdChange(e.target.value)}
                  placeholder="Enter ABC ID (numbers only)"
                  className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
                  pattern="[0-9]*"
                  inputMode="numeric"
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
            </>
          )}

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

          {profile.user_type === 'student' && (
            <div>
              <Label htmlFor="semester" className="dark:text-gray-300 transition-colors duration-300">Current Semester</Label>
              <Select value={formData.semester.toString()} onValueChange={(value) => setFormData({ ...formData, semester: parseInt(value) })}>
                <SelectTrigger>
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
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button 
              type="submit" 
              className="flex-1 transition-all duration-300 hover:scale-105 hover:shadow-lg" 
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Profile'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={onClose} 
              className="transition-all duration-300 hover:scale-105"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};