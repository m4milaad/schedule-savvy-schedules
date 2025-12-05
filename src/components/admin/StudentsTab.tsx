import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";

import { Plus, Search, Edit2, Trash2, Upload, KeyRound, BookOpen } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import BulkUploadModal from "./BulkUploadModal";
import { useSearchShortcut } from "@/hooks/useSearchShortcut";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkActionsBar } from "@/components/ui/bulk-actions-bar";

interface Student {
    student_id: string;
    student_name: string;
    student_enrollment_no: string; 
    student_email: string | null;
    student_address: string | null;
    contact_no: string | null;
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
    const [hoveredStudentId, setHoveredStudentId] = useState<string | null>(null);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // Bulk selection
    const {
        selectedItems,
        isSelected,
        toggleSelection,
        selectAll,
        clearSelection,
        selectedCount,
        hasSelection
    } = useBulkSelection<string>();
    
    useSearchShortcut(searchInputRef);
    
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

    // Load enrolled subjects for all students
    React.useEffect(() => {
        loadStudentEnrollments();
    }, [students]);

    const loadStudentEnrollments = async () => {
        try {
            // Get all student enrollments with course details
            const { data: enrollmentsData, error: enrollmentsError} = await supabase
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

    const getDepartmentName = (deptId: string | null) => {
        if (!deptId) return 'N/A';
        const dept = departments.find(d => d.dept_id === deptId);
        return dept ? dept.dept_name : 'Unknown';
    };

    const filteredStudents = students.filter(student =>
        student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.student_enrollment_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (student.student_email && student.student_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.contact_no && student.contact_no.includes(searchTerm)) ||
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
                abc_id: formData.abc_id || null,
                dept_id: formData.dept_id || null  // Allow null department
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

    const handleBulkDelete = async () => {
        if (selectedCount === 0) return;
        
        try {
            const selectedIds = Array.from(selectedItems);
            const { error } = await supabase
                .from('students')
                .delete()
                .in('student_id', selectedIds);

            if (error) throw error;

            toast({
                title: "Success",
                description: `${selectedCount} student(s) deleted successfully`,
            });
            clearSelection();
            onRefresh();
        } catch (error: any) {
            console.error('Error bulk deleting students:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to delete students",
                variant: "destructive",
            });
        }
    };

    const handleSelectAll = () => {
        if (selectedCount === filteredStudents.length) {
            clearSelection();
        } else {
            selectAll(filteredStudents.map(s => s.student_id));
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
                            ref={searchInputRef}
                            placeholder="Type / to search"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    searchInputRef.current?.blur();
                                }
                            }}
                            className="pl-10 transition-all duration-300 hover:border-blue-400 focus:scale-[1.02]"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-left p-2 font-medium w-10">
                                        <Checkbox 
                                            checked={filteredStudents.length > 0 && selectedCount === filteredStudents.length}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </th>
                                    <th className="text-left p-2 font-medium">Name / Enrollment</th>
                                    <th className="text-left p-2 font-medium">ABC ID</th>
                                    <th className="text-left p-2 font-medium hidden sm:table-cell">Email</th>
                                    <th className="text-left p-2 font-medium hidden md:table-cell">Contact</th>
                                    <th className="text-left p-2 font-medium hidden lg:table-cell">Department</th>
                                    <th className="text-left p-2 font-medium">Year/Sem</th>
                                    <th className="text-left p-2 font-medium hidden xl:table-cell">Courses</th>
                                    <th className="text-right p-2 font-medium">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.length === 0 ? (
                                    <tr>
                                        <td colSpan={9} className="text-center p-8 text-muted-foreground">
                                            {searchTerm ? 'No students match your search.' : 'No students available. Add one to get started.'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredStudents.map((student) => (
                                    <tr key={student.student_id} className={`border-b hover:bg-muted/50 ${isSelected(student.student_id) ? 'bg-primary/5' : ''}`}>
                                        <td className="p-2">
                                            <Checkbox 
                                                checked={isSelected(student.student_id)}
                                                onCheckedChange={() => toggleSelection(student.student_id)}
                                            />
                                        </td>
                                        <td className="p-2">
                                            <div className="flex flex-col">
                                                <span className="font-medium">{student.student_name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    {student.student_enrollment_no}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="p-2 text-sm">
                                            {student.abc_id || (
                                                <span className="text-muted-foreground italic">N/A</span>
                                            )}
                                        </td>
                                        <td className="p-2 text-sm hidden sm:table-cell">{student.student_email || 'N/A'}</td>
                                        <td className="p-2 text-sm hidden md:table-cell">{student.contact_no || 'N/A'}</td>
                                        <td className="p-2 text-sm hidden lg:table-cell">{getDepartmentName(student.dept_id)}</td>
                                        <td className="p-2">
                                            <div className="flex gap-1">
                                                <Badge variant="secondary" className="text-xs">Y{student.student_year}</Badge>
                                                <Badge variant="outline" className="text-xs">S{student.semester || 1}</Badge>
                                            </div>
                                        </td>
                                        <td className="p-2 hidden xl:table-cell">
                                            {studentEnrollments[student.student_id]?.length > 0 ? (
                                                <div 
                                                    className="inline-block"
                                                    onMouseEnter={() => setHoveredStudentId(student.student_id)}
                                                    onMouseLeave={() => setHoveredStudentId(null)}
                                                >
                                                    <Badge variant="outline" className="cursor-help bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors">
                                                        <BookOpen className="w-3 h-3 mr-1" />
                                                        {studentEnrollments[student.student_id].length}
                                                    </Badge>
                                                    {hoveredStudentId === student.student_id && createPortal(
                                                        <div 
                                                            className="fixed z-[9999] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[280px] max-w-[400px] animate-in fade-in-0 zoom-in-95 duration-200"
                                                            style={{
                                                                top: '50%',
                                                                left: '50%',
                                                                transform: 'translate(-50%, -50%)'
                                                            }}
                                                            onMouseEnter={() => setHoveredStudentId(student.student_id)}
                                                            onMouseLeave={() => setHoveredStudentId(null)}
                                                        >
                                                            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                                                                <BookOpen className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                                <div className="font-semibold text-sm text-gray-900 dark:text-gray-100">Enrolled Courses</div>
                                                            </div>
                                                            <div className="space-y-2 max-h-[300px] overflow-y-auto">
                                                                {studentEnrollments[student.student_id].map((enrollment, idx) => (
                                                                    <div key={idx} className="flex items-start gap-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                                        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5"></div>
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="font-medium text-xs text-gray-900 dark:text-gray-100">{enrollment.course_code}</div>
                                                                            <div className="text-xs text-gray-600 dark:text-gray-400">{enrollment.course_name}</div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>,
                                                        document.body
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs">None</span>
                                            )}
                                        </td>
                                        <td className="p-2">
                                            <div className="flex gap-1 justify-end">
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(student)} className="h-8 w-8 p-0" title="Edit">
                                                    <Edit2 className="w-3 h-3" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={async () => {
                                                        if (student.student_email) {
                                                            try {
                                                                const { error } = await supabase.auth.resetPasswordForEmail(student.student_email, {
                                                                    redirectTo: `${window.location.origin}/reset-password`,
                                                                });
                                                                if (error) throw error;
                                                                toast({
                                                                    title: "Success",
                                                                    description: `Password reset email sent to ${student.student_email}`,
                                                                });
                                                            } catch (error: any) {
                                                                toast({
                                                                    title: "Error",
                                                                    description: error.message || "Failed to send reset email",
                                                                    variant: "destructive",
                                                                });
                                                            }
                                                        } else {
                                                            toast({
                                                                title: "Error",
                                                                description: "Student has no email address",
                                                                variant: "destructive",
                                                            });
                                                        }
                                                    }}
                                                    className="h-8 w-8 p-0"
                                                    title="Reset Password"
                                                >
                                                    <KeyRound className="w-3 h-3" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 h-8 w-8 p-0">
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
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
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

            <BulkActionsBar
                selectedCount={selectedCount}
                onClear={clearSelection}
                onDelete={() => setShowBulkDeleteConfirm(true)}
            />

            <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedCount} Student(s)</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedCount} selected student(s)? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => {
                            handleBulkDelete();
                            setShowBulkDeleteConfirm(false);
                        }} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
};