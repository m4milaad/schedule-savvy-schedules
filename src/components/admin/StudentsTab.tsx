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
        <Card className="linear-surface overflow-hidden">
            <CardHeader className="linear-toolbar flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="linear-kicker">Enrollment</div>
                        <CardTitle className="text-base font-semibold">
                            Students
                        </CardTitle>
                    </div>
                    <div className="linear-pill">
                        <span className="font-medium text-foreground">{filteredStudents.length}</span>
                        <span className="hidden sm:inline">shown</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-medium text-foreground">{students.length}</span>
                        <span className="hidden sm:inline">total</span>
                    </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            ref={searchInputRef}
                            placeholder="Search students…"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    searchInputRef.current?.blur();
                                }
                            }}
                            className="pl-10"
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => setShowBulkUpload(true)} variant="outline" size="sm">
                            <Upload className="w-4 h-4 mr-2" />
                            Bulk Upload
                        </Button>
                        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild>
                                <Button onClick={() => resetForm()} size="sm">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Student
                                </Button>
                            </DialogTrigger>
                        </Dialog>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-0">
                {filteredStudents.length === 0 ? (
                    <div className="py-14 text-center">
                        <div className="text-sm font-medium">
                            {searchTerm ? 'No matching students' : 'No students yet'}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            {searchTerm ? 'Try a different search.' : 'Add students to enroll them in courses.'}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="linear-table">
                            <thead>
                                <tr>
                                    <th className="linear-th w-10">
                                        <Checkbox
                                            checked={filteredStudents.length > 0 && selectedCount === filteredStudents.length}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </th>
                                    <th className="linear-th">Student</th>
                                    <th className="linear-th hidden sm:table-cell">ABC ID</th>
                                    <th className="linear-th hidden md:table-cell">Email</th>
                                    <th className="linear-th hidden lg:table-cell">Department</th>
                                    <th className="linear-th hidden lg:table-cell">Year/Sem</th>
                                    <th className="linear-th text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map((student) => (
                                    <tr key={student.student_id} className={`linear-tr ${isSelected(student.student_id) ? 'bg-primary/5' : ''}`}>
                                        <td className="linear-td">
                                            <Checkbox
                                                checked={isSelected(student.student_id)}
                                                onCheckedChange={() => toggleSelection(student.student_id)}
                                            />
                                        </td>
                                        <td className="linear-td">
                                            <div className="font-medium">{student.student_name}</div>
                                            <div className="text-sm text-muted-foreground">{student.student_enrollment_no}</div>
                                        </td>
                                        <td className="linear-td hidden sm:table-cell text-sm text-muted-foreground">
                                            {student.abc_id || '—'}
                                        </td>
                                        <td className="linear-td hidden md:table-cell text-sm text-muted-foreground">
                                            {student.student_email || '—'}
                                        </td>
                                        <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                                            {getDepartmentName(student.dept_id)}
                                        </td>
                                        <td className="linear-td hidden lg:table-cell">
                                            <div className="flex gap-1">
                                                <Badge variant="secondary" className="text-xs">Y{student.student_year}</Badge>
                                                <Badge variant="outline" className="text-xs">S{student.semester || 1}</Badge>
                                            </div>
                                        </td>
                                        <td className="linear-td">
                                            <div className="flex justify-end gap-2">
                                                <Button variant="outline" size="sm" onClick={() => handleEdit(student)}>
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Delete Student</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete "{student.student_name}"?
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
                                ))}
                            </tbody>
                        </table>
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
                                className=""
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
                                className=""
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
                                className=""
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
                                className=""
                            />
                        </div>
                        <div>
                            <Label htmlFor="student_address" className="dark:text-gray-300 transition-colors duration-300">Address</Label>
                            <Input
                                id="student_address"
                                value={formData.student_address}
                                onChange={(e) => setFormData({ ...formData, student_address: e.target.value })}
                                placeholder="Enter address"
                                className=""
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