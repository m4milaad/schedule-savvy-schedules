import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Edit2, Trash2, Upload, BookOpen, Grid, List } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BulkUploadModal from "./BulkUploadModal";
import { StudentCardView } from "./StudentCardView";
import { useIsMobile } from "@/hooks/use-mobile";

interface Student {
    student_id: string;
    student_name: string;
    student_enrollment_no: string;
    student_email: string | null;
    student_address: string | null;
    dept_id: string | null;
    student_year: number;
    semester: number;
    abc_id: string | null;
    created_at: string;
    updated_at: string;
}

interface Department {
    dept_id: string;
    dept_name: string;
}

interface StudentEnrollment {
    course_code: string;
    course_name: string;
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
    const [studentEnrollments, setStudentEnrollments] = useState<Record<string, StudentEnrollment[]>>({});
    const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
    const [formData, setFormData] = useState({
        student_name: '',
        student_enrollment_no: '',
        student_email: '',
        student_address: '',
        dept_id: '',
        student_year: 1,
        semester: 1,
        abc_id: ''
    });
    const { toast } = useToast();
    const isMobile = useIsMobile();

    // Load enrolled subjects for all students
    React.useEffect(() => {
        loadStudentEnrollments();
    }, [students]);

    const loadStudentEnrollments = async () => {
        try {
            // Get all student enrollments with course details
            const { data: enrollmentsData, error: enrollmentsError } = await supabase
                .from('student_enrollments')
                .select(`
                    student_id,
                    course_id,
                    courses (
                        course_code,
                        course_name
                    )
                `)
                .eq('is_active', true);

            if (enrollmentsError) {
                console.error('Error loading enrollments:', enrollmentsError);
                return;
            }

            // Build enrollments map by student_id
            const enrollmentsMap: Record<string, StudentEnrollment[]> = {};
            
            (enrollmentsData || []).forEach((item: any) => {
                const studentId = item.student_id;
                
                if (!enrollmentsMap[studentId]) {
                    enrollmentsMap[studentId] = [];
                }
                
                if (item.courses) {
                    enrollmentsMap[studentId].push({
                        course_code: item.courses.course_code,
                        course_name: item.courses.course_name
                    });
                }
            });
            
            setStudentEnrollments(enrollmentsMap);
        } catch (error) {
            console.error('Error in loadStudentEnrollments:', error);
        }
    };

    const filteredStudents = students.filter(student =>
        student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_enrollment_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.student_email && student.student_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.abc_id && student.abc_id.includes(searchTerm))
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

        // Validate ABC ID is numeric only
        if (formData.abc_id && !/^\d+$/.test(formData.abc_id)) {
            toast({
                title: "Error",
                description: "ABC ID must contain only numbers",
                variant: "destructive",
            });
            return;
        }

        try {
            const submitData = {
                ...formData,
                abc_id: formData.abc_id || null
            };

            if (editingStudent) {
                const { error } = await supabase
                    .from('students')
                    .update(submitData)
                    .eq('student_id', editingStudent.student_id);

                if (error) throw error;

                toast({
                    title: "Success",
                    description: "Student updated successfully",
                });
            } else {
                const { error } = await supabase
                    .from('students')
                    .insert(submitData);

                if (error) throw error;

                toast({
                    title: "Success",
                    description: "Student added successfully",
                });
            }

            resetForm();
            onRefresh();
        } catch (error: any) {
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
            student_year: student.student_year,
            semester: student.semester || 1,
            abc_id: student.abc_id || ''
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
        } catch (error: any) {
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
            // Validate ABC IDs are numeric
            const invalidAbcIds = data.filter(item => item.abc_id && !/^\d+$/.test(item.abc_id));
            if (invalidAbcIds.length > 0) {
                throw new Error('ABC ID must contain only numbers');
            }

            const { error } = await supabase
                .from('students')
                .insert(data);

            if (error) throw error;
            onRefresh();
        } catch (error: any) {
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
            student_year: 1,
            semester: 1,
            abc_id: ''
        });
        setEditingStudent(null);
        setIsDialogOpen(false);
    };

    const getDepartmentName = (deptId: string | null) => {
        if (!deptId) return 'N/A';
        const dept = departments.find(d => d.dept_id === deptId);
        return dept ? dept.dept_name : 'Unknown';
    };

    const handleAbcIdChange = (value: string) => {
        // Only allow numeric input
        const numericValue = value.replace(/\D/g, '');
        setFormData({ ...formData, abc_id: numericValue });
    };

    return (
        <Card className="transition-all duration-300 hover:shadow-lg animate-fade-in">
            <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <CardTitle className="flex items-center gap-2 dark:text-gray-100 transition-colors duration-300">
                        Students ({students.length})
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                        {!isMobile && (
                            <div className="flex gap-1 border rounded-md p-1">
                                <Button 
                                    variant={viewMode === 'table' ? 'default' : 'ghost'} 
                                    size="sm" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => setViewMode('table')}
                                >
                                    <List className="w-4 h-4" />
                                </Button>
                                <Button 
                                    variant={viewMode === 'cards' ? 'default' : 'ghost'} 
                                    size="sm" 
                                    className="h-8 w-8 p-0"
                                    onClick={() => setViewMode('cards')}
                                >
                                    <Grid className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                        <Button onClick={() => setShowBulkUpload(true)} variant="outline" size="sm" className="transition-all duration-300 hover:scale-105">
                            <Upload className="w-4 h-4 mr-2" />
                            <span className="hidden sm:inline">Bulk Upload</span>
                            <span className="sm:hidden">Upload</span>
                        </Button>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => resetForm()} size="sm" className="transition-all duration-300 hover:scale-105">
                                    <Plus className="w-4 h-4 mr-2" />
                                    <span className="hidden sm:inline">Add Student</span>
                                    <span className="sm:hidden">Add</span>
                                </Button>
                            </DialogTrigger>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4 transition-colors duration-300" />
                        <Input
                            placeholder="Search students..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
                        />
                    </div>
                </div>

                {(isMobile || viewMode === 'cards') ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {filteredStudents.map((student) => (
                            <StudentCardView
                                key={student.student_id}
                                student={student}
                                departmentName={getDepartmentName(student.dept_id)}
                                enrollments={studentEnrollments[student.student_id] || []}
                                onEdit={() => handleEdit(student)}
                                onDelete={() => handleDelete(student.student_id)}
                            />
                        ))}
                        {filteredStudents.length === 0 && (
                            <div className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">
                                {searchTerm ? 'No students found matching your search.' : 'No students found.'}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="dark:text-gray-300 transition-colors duration-300 min-w-[150px]">Name</TableHead>
                                <TableHead className="dark:text-gray-300 transition-colors duration-300 min-w-[120px]">Enrollment No</TableHead>
                                <TableHead className="dark:text-gray-300 transition-colors duration-300 min-w-[100px]">ABC ID</TableHead>
                                <TableHead className="dark:text-gray-300 transition-colors duration-300 min-w-[150px] hidden md:table-cell">Email</TableHead>
                                <TableHead className="dark:text-gray-300 transition-colors duration-300 min-w-[120px] hidden lg:table-cell">Department</TableHead>
                                <TableHead className="dark:text-gray-300 transition-colors duration-300 min-w-[100px]">Year/Sem</TableHead>
                                <TableHead className="dark:text-gray-300 transition-colors duration-300 min-w-[150px] hidden xl:table-cell">Enrolled Subjects</TableHead>
                                <TableHead className="dark:text-gray-300 transition-colors duration-300 min-w-[100px]">Actions</TableHead>
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
                                    <TableCell className="dark:text-gray-300 transition-colors duration-300">
                                        {student.abc_id ? (
                                            <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800">
                                                {student.abc_id}
                                            </Badge>
                                        ) : (
                                            <span className="text-gray-400 text-xs">N/A</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="dark:text-gray-300 transition-colors duration-300 hidden md:table-cell">{student.student_email || 'N/A'}</TableCell>
                                    <TableCell className="dark:text-gray-300 transition-colors duration-300 hidden lg:table-cell">{getDepartmentName(student.dept_id)}</TableCell>
                                    <TableCell className="dark:text-gray-300 transition-colors duration-300">
                                        <div className="flex flex-col gap-1">
                                            <Badge variant="secondary" className="text-xs">Y{student.student_year}</Badge>
                                            <Badge variant="outline" className="text-xs">S{student.semester || 1}</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="dark:text-gray-300 transition-colors duration-300 hidden xl:table-cell">
                                        <div className="flex flex-wrap gap-1 max-w-48">
                                            {studentEnrollments[student.student_id]?.length > 0 ? (
                                                studentEnrollments[student.student_id].map((enrollment, idx) => (
                                                    <Badge key={idx} variant="outline" className="text-xs bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                                                        {enrollment.course_code}
                                                    </Badge>
                                                ))
                                            ) : (
                                                <span className="text-gray-400 text-xs flex items-center gap-1">
                                                    <BookOpen className="w-3 h-3" />
                                                    None
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex gap-1">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEdit(student)}
                                                className="transition-all duration-300 hover:scale-110 hover:shadow-md h-8 w-8 p-0"
                                            >
                                                <Edit2 className="w-3 h-3" />
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="transition-all duration-300 hover:scale-110 hover:shadow-md text-destructive hover:text-destructive h-8 w-8 p-0"
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
                                    <TableCell colSpan={8} className="text-center text-gray-500 dark:text-gray-400 py-8 transition-colors duration-300">
                                        {searchTerm ? 'No students found matching your search.' : 'No students found. Click "Add Student" to create the first student record.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
                )}
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="dark:text-gray-100 transition-colors duration-300">
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
                        <div className="grid grid-cols-2 gap-4">
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
                            <div>
                                <Label htmlFor="semester" className="dark:text-gray-300 transition-colors duration-300">Semester</Label>
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