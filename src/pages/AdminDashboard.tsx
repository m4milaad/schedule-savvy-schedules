
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Edit, Plus, LogOut, Home } from 'lucide-react';

interface CourseTeacherCode {
  id: string;
  course_code: string;
  teacher_code: string;
  course_name: string | null;
  teacher_name: string | null;
  semester: number;
}

const AdminDashboard = () => {
  const [codes, setCodes] = useState<CourseTeacherCode[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<CourseTeacherCode | null>(null);
  const [formData, setFormData] = useState({
    course_code: '',
    teacher_code: '',
    course_name: '',
    teacher_name: '',
    semester: 1
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin is logged in
    const adminSession = localStorage.getItem('adminSession');
    if (!adminSession) {
      navigate('/admin-login');
      return;
    }

    fetchCodes();
  }, [navigate]);

  const fetchCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('course_teacher_codes')
        .select('*')
        .order('semester', { ascending: true })
        .order('course_code', { ascending: true });

      if (error) {
        toast.error('Failed to fetch codes: ' + error.message);
        return;
      }

      setCodes(data || []);
    } catch (error) {
      console.error('Error fetching codes:', error);
      toast.error('Failed to fetch codes');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    navigate('/admin-login');
    toast.success('Logged out successfully');
  };

  const handleAddCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase
        .from('course_teacher_codes')
        .insert([formData]);

      if (error) {
        toast.error('Failed to add code: ' + error.message);
        return;
      }

      toast.success('Code added successfully');
      setIsAddDialogOpen(false);
      setFormData({ course_code: '', teacher_code: '', course_name: '', teacher_name: '', semester: 1 });
      fetchCodes();
    } catch (error) {
      console.error('Error adding code:', error);
      toast.error('Failed to add code');
    }
  };

  const handleEditCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingCode) return;

    try {
      const { error } = await supabase
        .from('course_teacher_codes')
        .update(formData)
        .eq('id', editingCode.id);

      if (error) {
        toast.error('Failed to update code: ' + error.message);
        return;
      }

      toast.success('Code updated successfully');
      setIsEditDialogOpen(false);
      setEditingCode(null);
      setFormData({ course_code: '', teacher_code: '', course_name: '', teacher_name: '', semester: 1 });
      fetchCodes();
    } catch (error) {
      console.error('Error updating code:', error);
      toast.error('Failed to update code');
    }
  };

  const handleDeleteCode = async (id: string) => {
    if (!confirm('Are you sure you want to delete this code?')) return;

    try {
      const { error } = await supabase
        .from('course_teacher_codes')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Failed to delete code: ' + error.message);
        return;
      }

      toast.success('Code deleted successfully');
      fetchCodes();
    } catch (error) {
      console.error('Error deleting code:', error);
      toast.error('Failed to delete code');
    }
  };

  const openEditDialog = (code: CourseTeacherCode) => {
    setEditingCode(code);
    setFormData({
      course_code: code.course_code,
      teacher_code: code.teacher_code,
      course_name: code.course_name || '',
      teacher_name: code.teacher_name || '',
      semester: code.semester
    });
    setIsEditDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/')} variant="outline">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button onClick={handleLogout} variant="outline">
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Course & Teacher Codes Management</CardTitle>
                <CardDescription>
                  Manage course codes, teacher codes, and semester assignments for the exam scheduling system
                </CardDescription>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Code
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Course & Teacher Code</DialogTitle>
                    <DialogDescription>
                      Enter the details for the new course and teacher code combination
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddCode} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="course_code">Course Code</Label>
                        <Input
                          id="course_code"
                          value={formData.course_code}
                          onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                          required
                          placeholder="e.g., BT-102"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="teacher_code">Teacher Code</Label>
                        <Input
                          id="teacher_code"
                          value={formData.teacher_code}
                          onChange={(e) => setFormData({ ...formData, teacher_code: e.target.value })}
                          required
                          placeholder="e.g., AH"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="semester">Semester</Label>
                      <Select 
                        value={formData.semester.toString()} 
                        onValueChange={(value) => setFormData({ ...formData, semester: parseInt(value) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                            <SelectItem key={sem} value={sem.toString()}>
                              Semester {sem}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="course_name">Course Name (Optional)</Label>
                      <Input
                        id="course_name"
                        value={formData.course_name}
                        onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                        placeholder="e.g., Business Technology"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="teacher_name">Teacher Name (Optional)</Label>
                      <Input
                        id="teacher_name"
                        value={formData.teacher_name}
                        onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                        placeholder="e.g., Ahmad Hassan"
                      />
                    </div>
                    <Button type="submit" className="w-full">Add Code</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Code</TableHead>
                  <TableHead>Teacher Code</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Course Name</TableHead>
                  <TableHead>Teacher Name</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((code) => (
                  <TableRow key={code.id}>
                    <TableCell className="font-medium">{code.course_code}</TableCell>
                    <TableCell>{code.teacher_code}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Semester {code.semester}
                      </span>
                    </TableCell>
                    <TableCell>{code.course_name || '-'}</TableCell>
                    <TableCell>{code.teacher_name || '-'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(code)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteCode(code.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Course & Teacher Code</DialogTitle>
              <DialogDescription>
                Update the details for this course and teacher code combination
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditCode} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_course_code">Course Code</Label>
                  <Input
                    id="edit_course_code"
                    value={formData.course_code}
                    onChange={(e) => setFormData({ ...formData, course_code: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_teacher_code">Teacher Code</Label>
                  <Input
                    id="edit_teacher_code"
                    value={formData.teacher_code}
                    onChange={(e) => setFormData({ ...formData, teacher_code: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_semester">Semester</Label>
                <Select 
                  value={formData.semester.toString()} 
                  onValueChange={(value) => setFormData({ ...formData, semester: parseInt(value) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                      <SelectItem key={sem} value={sem.toString()}>
                        Semester {sem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_course_name">Course Name (Optional)</Label>
                <Input
                  id="edit_course_name"
                  value={formData.course_name}
                  onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_teacher_name">Teacher Name (Optional)</Label>
                <Input
                  id="edit_teacher_name"
                  value={formData.teacher_name}
                  onChange={(e) => setFormData({ ...formData, teacher_name: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">Update Code</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;
