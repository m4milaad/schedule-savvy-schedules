import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from 'react-router-dom';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Edit, Plus, LogOut, Home, Upload, Download, FileSpreadsheet, CalendarIcon, CalendarDays } from 'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
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

interface Holiday {
  id: string;
  holiday_date: string;
  holiday_name: string;
  description: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

const AdminDashboard = () => {
  const [codes, setCodes] = useState<CourseTeacherCode[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [activeTab, setActiveTab] = useState('courses');
  
  // Course management states
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

  // Holiday management states
  const [isAddHolidayDialogOpen, setIsAddHolidayDialogOpen] = useState(false);
  const [isEditHolidayDialogOpen, setIsEditHolidayDialogOpen] = useState(false);
  const [isBulkHolidayUploadDialogOpen, setIsBulkHolidayUploadDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [holidayFormData, setHolidayFormData] = useState({
    holiday_name: '',
    description: '',
    is_recurring: false
  });
  const [bulkHolidayData, setBulkHolidayData] = useState<any[]>([]);
  const holidayFileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();

  useEffect(() => {
    // Check if admin is logged in
    const adminSession = localStorage.getItem('adminSession');
    if (!adminSession) {
      navigate('/admin-login');
      return;
    }

    fetchCodes();
    fetchHolidays();
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

  const fetchHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('holiday_date', { ascending: true });

      if (error) {
        toast.error('Failed to fetch holidays: ' + error.message);
        return;
      }

      setHolidays(data || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast.error('Failed to fetch holidays');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminSession');
    navigate('/admin-login');
    toast.success('Logged out successfully');
  };

  // Course management functions
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

  // Holiday management functions
  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      const { error } = await supabase
        .from('holidays')
        .insert([{
          holiday_date: selectedDate.toISOString().split('T')[0],
          holiday_name: holidayFormData.holiday_name,
          description: holidayFormData.description || null,
          is_recurring: holidayFormData.is_recurring
        }]);

      if (error) {
        toast.error('Failed to add holiday: ' + error.message);
        return;
      }

      toast.success('Holiday added successfully');
      setIsAddHolidayDialogOpen(false);
      setSelectedDate(undefined);
      setHolidayFormData({ holiday_name: '', description: '', is_recurring: false });
      fetchHolidays();
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast.error('Failed to add holiday');
    }
  };

  const handleEditHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingHoliday || !selectedDate) return;

    try {
      const { error } = await supabase
        .from('holidays')
        .update({
          holiday_date: selectedDate.toISOString().split('T')[0],
          holiday_name: holidayFormData.holiday_name,
          description: holidayFormData.description || null,
          is_recurring: holidayFormData.is_recurring,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingHoliday.id);

      if (error) {
        toast.error('Failed to update holiday: ' + error.message);
        return;
      }

      toast.success('Holiday updated successfully');
      setIsEditHolidayDialogOpen(false);
      setEditingHoliday(null);
      setSelectedDate(undefined);
      setHolidayFormData({ holiday_name: '', description: '', is_recurring: false });
      fetchHolidays();
    } catch (error) {
      console.error('Error updating holiday:', error);
      toast.error('Failed to update holiday');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Failed to delete holiday: ' + error.message);
        return;
      }

      toast.success('Holiday deleted successfully');
      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    }
  };

  const openEditHolidayDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setSelectedDate(new Date(holiday.holiday_date));
    setHolidayFormData({
      holiday_name: holiday.holiday_name,
      description: holiday.description || '',
      is_recurring: holiday.is_recurring || false
    });
    setIsEditHolidayDialogOpen(true);
  };

  // File upload functions
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

  const handleHolidayFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
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
          const holidayDate = row['Holiday Date'] || row['holiday_date'];
          const holidayName = row['Holiday Name'] || row['holiday_name'];
          const description = row['Description'] || row['description'] || '';
          const isRecurring = row['Is Recurring'] || row['is_recurring'] || false;
          
          if (!holidayDate || !holidayName) {
            throw new Error(`Row ${index + 2}: Missing required fields (Holiday Date, Holiday Name)`);
          }
          
          // Parse date
          let parsedDate;
          if (typeof holidayDate === 'number') {
            // Excel date serial number
            parsedDate = new Date((holidayDate - 25569) * 86400 * 1000);
          } else {
            parsedDate = new Date(holidayDate);
          }
          
          if (isNaN(parsedDate.getTime())) {
            throw new Error(`Row ${index + 2}: Invalid date format`);
          }

          return {
            holiday_date: parsedDate.toISOString().split('T')[0],
            holiday_name: holidayName,
            description: description,
            is_recurring: Boolean(isRecurring)
          };
        });
        
        setBulkHolidayData(transformedData);
        toast.success(`${transformedData.length} holidays loaded for preview`);
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

  const handleBulkHolidayInsert = async () => {
    if (bulkHolidayData.length === 0) {
      toast.error('No data to insert');
      return;
    }

    try {
      const { error } = await supabase
        .from('holidays')
        .insert(bulkHolidayData);

      if (error) {
        toast.error('Failed to bulk insert: ' + error.message);
        return;
      }

      toast.success(`Successfully inserted ${bulkHolidayData.length} holidays`);
      setBulkHolidayData([]);
      setIsBulkHolidayUploadDialogOpen(false);
      if (holidayFileInputRef.current) {
        holidayFileInputRef.current.value = '';
      }
      fetchHolidays();
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

  const downloadHolidayTemplate = () => {
    const templateData = [
      {
        'Holiday Date': '2024-01-26',
        'Holiday Name': 'Republic Day',
        'Description': 'National holiday celebrating the adoption of the Constitution of India',
        'Is Recurring': true
      },
      {
        'Holiday Date': '2024-12-25',
        'Holiday Name': 'Christmas Day',
        'Description': 'Christian holiday celebrating the birth of Jesus Christ',
        'Is Recurring': true
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'holidays_template.xlsx');
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

  const downloadCurrentHolidayData = () => {
    if (holidays.length === 0) {
      toast.error('No data to download');
      return;
    }

    const exportData = holidays.map(holiday => ({
      'Holiday Date': holiday.holiday_date,
      'Holiday Name': holiday.holiday_name,
      'Description': holiday.description || '',
      'Is Recurring': holiday.is_recurring
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Holidays');
    XLSX.writeFile(workbook, 'holidays_data.xlsx');
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="courses">Course Management</TabsTrigger>
            <TabsTrigger value="holidays">Holiday Management</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="holidays" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarDays className="h-5 w-5" />
                      Holiday Management
                    </CardTitle>
                    <CardDescription>
                      Manage holidays that will be excluded from exam scheduling
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Dialog open={isBulkHolidayUploadDialogOpen} onOpenChange={setIsBulkHolidayUploadDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Upload className="w-4 h-4 mr-2" />
                          Bulk Upload
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl">
                        <DialogHeader>
                          <DialogTitle>Bulk Upload Holidays</DialogTitle>
                          <DialogDescription>
                            Upload an Excel file with columns: Holiday Date, Holiday Name, Description, Is Recurring
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="flex gap-2">
                            <Button onClick={downloadHolidayTemplate} variant="outline">
                              <FileSpreadsheet className="w-4 h-4 mr-2" />
                              Download Template
                            </Button>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="holiday_excel_file">Select Excel File</Label>
                            <Input
                              id="holiday_excel_file"
                              type="file"
                              accept=".xlsx,.xls"
                              onChange={handleHolidayFileUpload}
                              ref={holidayFileInputRef}
                            />
                          </div>
                          {bulkHolidayData.length > 0 && (
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                <Label>Preview ({bulkHolidayData.length} holidays)</Label>
                                <Button onClick={handleBulkHolidayInsert}>
                                  Insert All Holidays
                                </Button>
                              </div>
                              <div className="max-h-60 overflow-y-auto border rounded">
                                <Table>
                                  <TableHeader>
                                    <TableRow>
                                      <TableHead>Date</TableHead>
                                      <TableHead>Name</TableHead>
                                      <TableHead>Description</TableHead>
                                      <TableHead>Recurring</TableHead>
                                    </TableRow>
                                  </TableHeader>
                                  <TableBody>
                                    {bulkHolidayData.slice(0, 10).map((row, index) => (
                                      <TableRow key={index}>
                                        <TableCell>{new Date(row.holiday_date).toLocaleDateString()}</TableCell>
                                        <TableCell>{row.holiday_name}</TableCell>
                                        <TableCell>{row.description}</TableCell>
                                        <TableCell>{row.is_recurring ? 'Yes' : 'No'}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                                {bulkHolidayData.length > 10 && (
                                  <div className="p-2 text-center text-gray-500">
                                    ... and {bulkHolidayData.length - 10} more holidays
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </DialogContent>
                    </Dialog>
                    <Button onClick={downloadCurrentHolidayData} variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Download Excel
                    </Button>
                    <Dialog open={isAddHolidayDialogOpen} onOpenChange={setIsAddHolidayDialogOpen}>
                      <DialogTrigger asChild>
                        <Button>
                          <Plus className="w-4 h-4 mr-2" />
                          Add Holiday
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add New Holiday</DialogTitle>
                          <DialogDescription>
                            Add a holiday that will be excluded from exam scheduling
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddHoliday} className="space-y-4">
                          <div className="space-y-2">
                            <Label>Holiday Date</Label>
                            <Popover>
                              <PopoverTrigger asChild>
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !selectedDate && "text-muted-foreground"
                                  )}
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                                </Button>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0">
                                <Calendar
                                  mode="single"
                                  selected={selectedDate}
                                  onSelect={setSelectedDate}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="holiday_name">Holiday Name</Label>
                            <Input
                              id="holiday_name"
                              value={holidayFormData.holiday_name}
                              onChange={(e) => setHolidayFormData({ ...holidayFormData, holiday_name: e.target.value })}
                              required
                              placeholder="e.g., Republic Day"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                              id="description"
                              value={holidayFormData.description}
                              onChange={(e) => setHolidayFormData({ ...holidayFormData, description: e.target.value })}
                              placeholder="Brief description of the holiday"
                              rows={3}
                            />
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="is_recurring"
                              checked={holidayFormData.is_recurring}
                              onCheckedChange={(checked) => setHolidayFormData({ ...holidayFormData, is_recurring: checked as boolean })}
                            />
                            <Label htmlFor="is_recurring">Recurring annually</Label>
                          </div>
                          <Button type="submit" className="w-full">Add Holiday</Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Holiday Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {holidays.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                            No holidays configured. Add holidays to exclude them from exam scheduling.
                          </TableCell>
                        </TableRow>
                      ) : (
                        holidays.map((holiday) => (
                          <TableRow key={holiday.id}>
                            <TableCell className="font-medium">
                              {new Date(holiday.holiday_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>{holiday.holiday_name}</TableCell>
                            <TableCell>{holiday.description || '-'}</TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                holiday.is_recurring ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {holiday.is_recurring ? 'Recurring' : 'One-time'}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openEditHolidayDialog(holiday)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteHoliday(holiday.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Course Dialog */}
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

        {/* Edit Holiday Dialog */}
        <Dialog open={isEditHolidayDialogOpen} onOpenChange={setIsEditHolidayDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Holiday</DialogTitle>
              <DialogDescription>
                Update the holiday information
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleEditHoliday} className="space-y-4">
              <div className="space-y-2">
                <Label>Holiday Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_holiday_name">Holiday Name</Label>
                <Input
                  id="edit_holiday_name"
                  value={holidayFormData.holiday_name}
                  onChange={(e) => setHolidayFormData({ ...holidayFormData, holiday_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit_description">Description (Optional)</Label>
                <Textarea
                  id="edit_description"
                  value={holidayFormData.description}
                  onChange={(e) => setHolidayFormData({ ...holidayFormData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit_is_recurring"
                  checked={holidayFormData.is_recurring}
                  onCheckedChange={(checked) => setHolidayFormData({ ...holidayFormData, is_recurring: checked as boolean })}
                />
                <Label htmlFor="edit_is_recurring">Recurring annually</Label>
              </div>
              <Button type="submit" className="w-full">Update Holiday</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminDashboard;