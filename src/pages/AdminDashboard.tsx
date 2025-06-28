
import React, { useState, useEffect, useRef } from 'react';
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
import { Trash2, Edit, Plus, LogOut, Home, Upload, Download, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';

interface CourseTeacherCode {
  id: string;
  course_code: string;
  teacher_code: string;
  course_name: string | null;
  teacher_name: string | null;
  semester: number;
  program_type: string;
  gap_days: number;
}

const AdminDashboard = () => {
  const [codes, setCodes] = useState<CourseTeacherCode[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<CourseTeacherCode | null>(null);
  const [formData, setFormData] = useState({
    course_code: '',
    teacher_code: '',
    course_name: '',
    teacher_name: '',
    semester: 1,
    program_type: 'B.Tech',
    gap_days: 2
  });
  const [bulkData, setBulkData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
        .order('program_type', { ascending: true })
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
      setFormData({ course_code: '', teacher_code: '', course_name: '', teacher_name: '', semester: 1, program_type: 'B.Tech', gap_days: 2 });
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
      setFormData({ course_code: '', teacher_code: '', course_name: '', teacher_name: '', semester: 1, program_type: 'B.Tech', gap_days: 2 });
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
      semester: code.semester,
      program_type: code.program_type || 'B.Tech',
      gap_days: code.gap_days || 2
    });
    setIsEditDialogOpen(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Validate and transform data
        const transformedData = jsonData.map((row: any, index) => {
          const courseCode = row['Course Code'] || row['course_code'];
          const teacherCode = row['Teacher Code'] || row['teacher_code'];
          const semester = parseInt(row['Semester'] || row['semester']);
          const courseName = row['Course Name'] || row['course_name'] || '';
          const teacherName = row['Teacher Name'] || row['teacher_name'] || '';
          
          if (!courseCode || !teacherCode || !semester) {
            throw new Error(`Row ${index + 2}: Missing required fields (Course Code, Teacher Code, Semester)`);
          }
          
          if (semester < 1 || semester > 12) {
            throw new Error(`Row ${index + 2}: Semester must be between 1 and 12`);
          }

          return {
            course_code: courseCode,
            teacher_code: teacherCode,
            semester: semester,
            course_name: courseName,
            teacher_name: teacherName,
            program_type: semester <= 8 ? 'B.Tech' : 'M.Tech',
            gap_days: 2
          };
        });
        
        setBulkData(transformedData);
        toast.success(`${transformedData.length} records loaded for preview`);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Error parsing file: ' + (error as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkInsert = async () => {
    if (bulkData.length === 0) {
      toast.error('No data to insert');
      return;
    }

    try {
      const { error } = await supabase
        .from('course_teacher_codes')
        .insert(bulkData);

      if (error) {
        toast.error('Failed to bulk insert: ' + error.message);
        return;
      }

      toast.success(`Successfully inserted ${bulkData.length} records`);
      setBulkData([]);
      setIsBulkUploadDialogOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchCodes();
    } catch (error) {
      console.error('Error bulk inserting:', error);
      toast.error('Failed to bulk insert');
    }
  };

  const downloadExcelTemplate = () => {
    const templateData = [
      {
        'Course Code': 'BT-101',
        'Teacher Code': 'AH',
        'Semester': 1,
        'Course Name': 'Sample Course',
        'Teacher Name': 'Sample Teacher'
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'course_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  const downloadCurrentData = () => {
    if (codes.length === 0) {
      toast.error('No data to download');
      return;
    }

    const exportData = codes.map(code => ({
      'Course Code': code.course_code,
      'Teacher Code': code.teacher_code,
      'Semester': code.semester,
      'Course Name': code.course_name || '',
      'Teacher Name': code.teacher_name || '',
      'Program Type': code.program_type,
      'Gap Days': code.gap_days
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Course Data');
    XLSX.writeFile(workbook, 'course_data.xlsx');
    toast.success('Data downloaded successfully');
  };

  const getSemesterOptions = (programType: string) => {
    if (programType === 'B.Tech') {
      return [1, 2, 3, 4, 5, 6, 7, 8];
    } else {
      return [9, 10, 11, 12];
    }
  };

  const getSemesterDisplay = (semester: number, programType: string) => {
    if (programType === 'B.Tech') {
      return `B.Tech Semester ${semester}`;
    } else {
      const mtechSem = semester - 8;
      return `M.Tech Semester ${mtechSem}`;
    }
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
                  Manage course codes, teacher codes, semester assignments, and preparation gaps for B.Tech (1-8) and M.Tech (9-12) programs
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Upload className="w-4 h-4 mr-2" />
                      Bulk Upload
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl">
                    <DialogHeader>
                      <DialogTitle>Bulk Upload Course Data</DialogTitle>
                      <DialogDescription>
                        Upload an Excel file with columns: Course Code, Teacher Code, Semester, Course Name, Teacher Name
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button onClick={downloadExcelTemplate} variant="outline">
                          <FileSpreadsheet className="w-4 h-4 mr-2" />
                          Download Template
                        </Button>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="excel_file">Select Excel File</Label>
                        <Input
                          id="excel_file"
                          type="file"
                          accept=".xlsx,.xls"
                          onChange={handleFileUpload}
                          ref={fileInputRef}
                        />
                      </div>
                      {bulkData.length > 0 && (
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <Label>Preview ({bulkData.length} records)</Label>
                            <Button onClick={handleBulkInsert}>
                              Insert All Records
                            </Button>
                          </div>
                          <div className="max-h-60 overflow-y-auto border rounded">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Course Code</TableHead>
                                  <TableHead>Teacher Code</TableHead>
                                  <TableHead>Semester</TableHead>
                                  <TableHead>Program</TableHead>
                                  <TableHead>Course Name</TableHead>
                                  <TableHead>Teacher Name</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {bulkData.slice(0, 10).map((row, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{row.course_code}</TableCell>
                                    <TableCell>{row.teacher_code}</TableCell>
                                    <TableCell>{row.semester}</TableCell>
                                    <TableCell>{row.program_type}</TableCell>
                                    <TableCell>{row.course_name}</TableCell>
                                    <TableCell>{row.teacher_name}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                            {bulkData.length > 10 && (
                              <div className="p-2 text-center text-gray-500">
                                ... and {bulkData.length - 10} more records
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Button onClick={downloadCurrentData} variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Download Excel
                </Button>
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="program_type">Program Type</Label>
                          <Select 
                            value={formData.program_type} 
                            onValueChange={(value) => {
                              const newSemester = value === 'B.Tech' ? 1 : 9;
                              setFormData({ ...formData, program_type: value, semester: newSemester });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select program" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="B.Tech">B.Tech</SelectItem>
                              <SelectItem value="M.Tech">M.Tech</SelectItem>
                            </SelectContent>
                          </Select>
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
                              {getSemesterOptions(formData.program_type).map((sem) => (
                                <SelectItem key={sem} value={sem.toString()}>
                                  {getSemesterDisplay(sem, formData.program_type)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="gap_days">Gap Days (0-10)</Label>
                        <Input
                          id="gap_days"
                          type="number"
                          min="0"
                          max="10"
                          value={formData.gap_days}
                          onChange={(e) => setFormData({ ...formData, gap_days: parseInt(e.target.value) || 0 })}
                          placeholder="Number of preparation days between exams"
                        />
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
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course Code</TableHead>
                  <TableHead>Teacher Code</TableHead>
                  <TableHead>Program & Semester</TableHead>
                  <TableHead>Gap Days</TableHead>
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
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        code.program_type === 'B.Tech' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {getSemesterDisplay(code.semester, code.program_type)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {code.gap_days} days
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_program_type">Program Type</Label>
                  <Select 
                    value={formData.program_type} 
                    onValueChange={(value) => {
                      const newSemester = value === 'B.Tech' ? 1 : 9;
                      setFormData({ ...formData, program_type: value, semester: newSemester });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="B.Tech">B.Tech</SelectItem>
                      <SelectItem value="M.Tech">M.Tech</SelectItem>
                    </SelectContent>
                  </Select>
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
                      {getSemesterOptions(formData.program_type).map((sem) => (
                        <SelectItem key={sem} value={sem.toString()}>
                          {getSemesterDisplay(sem, formData.program_type)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_gap_days">Gap Days (0-10)</Label>
                <Input
                  id="edit_gap_days"
                  type="number"
                  min="0"
                  max="10"
                  value={formData.gap_days}
                  onChange={(e) => setFormData({ ...formData, gap_days: parseInt(e.target.value) || 0 })}
                  placeholder="Number of preparation days between exams"
                />
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
