import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit, Trash2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Student {
  student_id: string;
  student_name: string;
  student_enrollment_no: string;
  student_email: string | null;
  student_address: string | null;
  dept_id: string | null;
  student_year: number;
  created_at: string;
  updated_at: string;
}

interface Department {
  dept_id: string;
  dept_name: string;
}

interface StudentsTabProps {
  students: Student[];
  departments: Department[];
  onRefresh: () => void;
}

export const StudentsTab: React.FC<StudentsTabProps> = ({ students, departments, onRefresh }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    student_name: '',
    student_enrollment_no: '',
    student_email: '',
    student_address: '',
    dept_id: '',
    student_year: 1
  });
  const { toast } = useToast();

  const filteredStudents = students.filter(student =>
    student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.student_enrollment_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (student.student_email && student.student_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingStudent) {
        const { error } = await supabase
          .from('students')
          .update(formData)
          .eq('student_id', editingStudent.student_id);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Student updated successfully",
        });
      } else {
        const { error } = await supabase
          .from('students')
          .insert(formData);
        
        if (error) throw error;
        
        toast({
          title: "Success",
          description: "Student added successfully",
        });
      }
      
      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving student:', error);
      toast({
        title: "Error",
        description: "Failed to save student",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (student: Student) => {
    setEditingStudent(student);
    setFormData({
      student_name: student.student_name,
      student_enrollment_no: student.student_enrollment_no,
      student_email: student.student_email || '',
      student_address: student.student_address || '',
      dept_id: student.dept_id || '',
      student_year: student.student_year
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (studentId: string) => {
    if (!confirm('Are you sure you want to delete this student?')) return;
    
    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('student_id', studentId);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Student deleted successfully",
      });
      onRefresh();
    } catch (error) {
      console.error('Error deleting student:', error);
      toast({
        title: "Error",
        description: "Failed to delete student",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      student_name: '',
      student_enrollment_no: '',
      student_email: '',
      student_address: '',
      dept_id: '',
      student_year: 1
    });
    setEditingStudent(null);
    setIsDialogOpen(false);
  };

  const getDepartmentName = (deptId: string | null) => {
    if (!deptId) return 'N/A';
    const dept = departments.find(d => d.dept_id === deptId);
    return dept ? dept.dept_name : 'Unknown';
  };

  return (
    <Card className="transition-all duration-300 hover:shadow-lg">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Manage Students
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => resetForm()} className="transition-all duration-300 hover:scale-105">
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="student_name">Student Name</Label>
                  <Input
                    id="student_name"
                    value={formData.student_name}
                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="student_enrollment_no">Enrollment Number</Label>
                  <Input
                    id="student_enrollment_no"
                    value={formData.student_enrollment_no}
                    onChange={(e) => setFormData({ ...formData, student_enrollment_no: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="student_email">Email</Label>
                  <Input
                    id="student_email"
                    type="email"
                    value={formData.student_email}
                    onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="student_address">Address</Label>
                  <Input
                    id="student_address"
                    value={formData.student_address}
                    onChange={(e) => setFormData({ ...formData, student_address: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="dept_id">Department</Label>
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
                <div>
                  <Label htmlFor="student_year">Year</Label>
                  <Select value={formData.student_year.toString()} onValueChange={(value) => setFormData({ ...formData, student_year: parseInt(value) })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingStudent ? 'Update' : 'Add'} Student
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search students by name, enrollment number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Enrollment No</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.student_id} className="transition-colors duration-200 hover:bg-muted/50">
                  <TableCell className="font-medium">{student.student_name}</TableCell>
                  <TableCell>{student.student_enrollment_no}</TableCell>
                  <TableCell>{student.student_email || 'N/A'}</TableCell>
                  <TableCell>{getDepartmentName(student.dept_id)}</TableCell>
                  <TableCell>{student.student_year} Year</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(student)}
                        className="transition-all duration-200 hover:scale-105"
                      >
                        <Edit className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(student.student_id)}
                        className="transition-all duration-200 hover:scale-105 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    {searchTerm ? 'No students found matching your search.' : 'No students found.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};