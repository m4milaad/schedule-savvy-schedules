import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, Search, Edit2, Trash2, Upload } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BulkUploadModal from "./BulkUploadModal";

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
  const [showBulkUpload, setShowBulkUpload] = useState(false);
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
    
    if (!formData.student_name.trim() || !formData.student_enrollment_no.trim()) {
      toast({
        title: "Error",
        description: "Please fill in required fields (name and enrollment number)",
        variant: "destructive",
      });
      return;
    }
    
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
        description: error.message || "Failed to save student",
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
        description: error.message || "Failed to delete student",
        variant: "destructive",
      });
    }
  };

  const handleBulkUpload = async (data: any[]) => {
    try {
      const { error } = await supabase
        .from('students')
        .insert(data);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Bulk upload error:', error);
      throw error;
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
            Students ({students.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setShowBulkUpload(true)} variant="outline" size="sm" className="transition-all duration-300 hover:scale-105">
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => resetForm()} size="sm" className="transition-all duration-300 hover:scale-105">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 transition-colors duration-300" />
            <Input
              placeholder="Search students by name, enrollment number, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="dark:text-gray-300 transition-colors duration-300">Name</TableHead>
                <TableHead className="dark:text-gray-300 transition-colors duration-300">Enrollment No</TableHead>
                <TableHead className="dark:text-gray-300 transition-colors duration-300">Email</TableHead>
                <TableHead className="dark:text-gray-300 transition-colors duration-300">Department</TableHead>
                <TableHead className="dark:text-gray-300 transition-colors duration-300">Year</TableHead>
                <TableHead className="dark:text-gray-300 transition-colors duration-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student, index) => (
                <TableRow 
                  key={student.student_id} 
                  className="transition-all duration-300 hover:bg-muted/50 hover:scale-[1.01] animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <TableCell className="font-medium dark:text-gray-200 transition-colors duration-300">{student.student_name}</TableCell>
                  <TableCell className="dark:text-gray-300 transition-colors duration-300">{student.student_enrollment_no}</TableCell>
                  <TableCell className="dark:text-gray-300 transition-colors duration-300">{student.student_email || 'N/A'}</TableCell>
                  <TableCell className="dark:text-gray-300 transition-colors duration-300">{getDepartmentName(student.dept_id)}</TableCell>
                  <TableCell className="dark:text-gray-300 transition-colors duration-300">{student.student_year} Year</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(student)}
                        className="transition-all duration-300 hover:scale-110 hover:shadow-md"
                      >
                        <Edit2 className="w-3 h-3" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="transition-all duration-300 hover:scale-110 hover:shadow-md text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Student</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{student.student_name}"? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(student.student_id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredStudents.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 dark:text-gray-400 py-8 transition-colors duration-300">
                    {searchTerm ? 'No students found matching your search.' : 'No students found. Click "Add Student" to create the first student record.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingStudent ? 'Edit Student' : 'Add New Student'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="student_name" className="dark:text-gray-300 transition-colors duration-300">Student Name *</Label>
                  <Input
                    id="student_name"
                    value={formData.student_name}
                    onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                    placeholder="Enter student name"
                    className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
                    required
                  />
                </div>
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
                  <Label htmlFor="student_email" className="dark:text-gray-300 transition-colors duration-300">Email</Label>
                  <Input
                    id="student_email"
                    type="email"
                    value={formData.student_email}
                    onChange={(e) => setFormData({ ...formData, student_email: e.target.value })}
                    placeholder="Enter email address"
                    className="transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
                  />
                </div>
                <div>
                  <Label htmlFor="student_address" className="dark:text-gray-300 transition-colors duration-300">Address</Label>
                  <Input
                    id="student_address"
                    value={formData.student_address}
                    onChange={(e) => setFormData({ ...formData, student_address: e.target.value })}
                    placeholder="Enter address"
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
                <div>
                  <Label htmlFor="student_year" className="dark:text-gray-300 transition-colors duration-300">Year</Label>
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
                  <Button type="submit" className="flex-1 transition-all duration-300 hover:scale-105 hover:shadow-lg">
                    {editingStudent ? 'Update' : 'Add'} Student
                  </Button>
                  <Button type="button" variant="outline" onClick={resetForm} className="transition-all duration-300 hover:scale-105">
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

        <BulkUploadModal
          isOpen={showBulkUpload}
          onClose={() => setShowBulkUpload(false)}
          type="students"
          onUpload={handleBulkUpload}
        />
    </Card>
  );
};