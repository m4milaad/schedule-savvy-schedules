import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Upload, Search, BookOpen } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Teacher, Department, Course } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";
import { useSearchShortcut } from "@/hooks/useSearchShortcut";

interface TeachersTabProps {
    teachers: Teacher[];
    departments: Department[];
    onRefresh: () => void;
}

interface TeacherCourse {
    course_id: string;
    course_code: string;
    course_name: string;
}

interface SimpleCourse {
    course_id: string;
    course_code: string;
    course_name: string;
    dept_id: string | null;
}

export const TeachersTab = ({ teachers, departments, onRefresh }: TeachersTabProps) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [newTeacherName, setNewTeacherName] = useState('');
    const [newTeacherEmail, setNewTeacherEmail] = useState('');
    const [newTeacherContact, setNewTeacherContact] = useState('');
    const [newTeacherDesignation, setNewTeacherDesignation] = useState('');
    const [newTeacherDeptId, setNewTeacherDeptId] = useState('');
    const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
    const [editTeacherName, setEditTeacherName] = useState('');
    const [editTeacherEmail, setEditTeacherEmail] = useState('');
    const [editTeacherContact, setEditTeacherContact] = useState('');
    const [editTeacherDesignation, setEditTeacherDesignation] = useState('');
    const [editTeacherDeptId, setEditTeacherDeptId] = useState('');
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    
    // Course assignment state
    const [isCourseDialogOpen, setIsCourseDialogOpen] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
    const [availableCourses, setAvailableCourses] = useState<SimpleCourse[]>([]);
    const [teacherCourses, setTeacherCourses] = useState<Record<string, TeacherCourse[]>>({});
    const [selectedCourseId, setSelectedCourseId] = useState('');
    
    // Ref for search input
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // Enable "/" keyboard shortcut to focus search
    useSearchShortcut(searchInputRef);

    // Load teacher courses on mount
    useEffect(() => {
        loadTeacherCourses();
        loadAvailableCourses();
    }, [teachers]);

    const loadAvailableCourses = async () => {
        try {
            const { data, error } = await supabase
                .from('courses')
                .select('course_id, course_code, course_name, dept_id')
                .order('course_code');
            
            if (error) throw error;
            setAvailableCourses(data || []);
        } catch (error) {
            console.error('Error loading courses:', error);
        }
    };

    const loadTeacherCourses = async () => {
        try {
            // Get courses assigned to teachers via exam_teachers table
            const { data, error } = await supabase
                .from('exam_teachers')
                .select(`
                    teacher_id,
                    venues (venue_id, venue_name),
                    sessions (session_id, session_name)
                `);
            
            if (error) {
                console.error('Error loading teacher courses:', error);
            }
            
            // For now, we'll use a simple mapping - in a real app you might have a teacher_courses junction table
            // This is a placeholder until we create proper course assignments
            setTeacherCourses({});
        } catch (error) {
            console.error('Error in loadTeacherCourses:', error);
        }
    };

    const getDepartmentName = (deptId: string) => {
        const dept = departments.find(d => d.dept_id === deptId);
        return dept ? dept.dept_name : 'Unknown Department';
    };

    // Filter teachers based on search query
    const filteredTeachers = teachers.filter(teacher => {
        const query = searchQuery.toLowerCase();
        const deptName = getDepartmentName(teacher.dept_id).toLowerCase();
        return (
            teacher.teacher_name.toLowerCase().includes(query) ||
            (teacher.teacher_email && teacher.teacher_email.toLowerCase().includes(query)) ||
            (teacher.contact_no && teacher.contact_no.includes(query)) ||
            (teacher.designation && teacher.designation.toLowerCase().includes(query)) ||
            deptName.includes(query)
        );
    });

    // Filter courses by teacher's department
    const getCoursesForTeacher = (teacher: Teacher): SimpleCourse[] => {
        return availableCourses.filter(c => c.dept_id === teacher.dept_id);
    };

    const handleAddTeacher = async () => {
        if (!newTeacherName.trim() || !newTeacherDeptId) {
            toast.error('Please fill in required fields (name and department)');
            return;
        }

        try {
            const { error } = await supabase
                .from('teachers')
                .insert({
                    teacher_name: newTeacherName.trim(),
                    teacher_email: newTeacherEmail.trim() || null,
                    contact_no: newTeacherContact.trim() || null,
                    designation: newTeacherDesignation.trim() || null,
                    dept_id: newTeacherDeptId
                });

            if (error) throw error;

            toast.success('Teacher added successfully');
            setNewTeacherName('');
            setNewTeacherEmail('');
            setNewTeacherContact('');
            setNewTeacherDesignation('');
            setNewTeacherDeptId('');
            setIsAddDialogOpen(false);
            onRefresh();
        } catch (error) {
            console.error('Error adding teacher:', error);
            toast.error('Failed to add teacher');
        }
    };

    const handleEditTeacher = async () => {
        if (!editingTeacher || !editTeacherName.trim() || !editTeacherDeptId) {
            toast.error('Please fill in required fields (name and department)');
            return;
        }

        try {
            const { error } = await supabase
                .from('teachers')
                .update({
                    teacher_name: editTeacherName.trim(),
                    teacher_email: editTeacherEmail.trim() || null,
                    contact_no: editTeacherContact.trim() || null,
                    designation: editTeacherDesignation.trim() || null,
                    dept_id: editTeacherDeptId
                })
                .eq('teacher_id', editingTeacher.teacher_id);

            if (error) throw error;

            toast.success('Teacher updated successfully');
            setEditingTeacher(null);
            setIsEditDialogOpen(false);
            onRefresh();
        } catch (error) {
            console.error('Error updating teacher:', error);
            toast.error('Failed to update teacher');
        }
    };

    const handleDeleteTeacher = async (teacherId: string) => {
        try {
            const { error } = await supabase
                .from('teachers')
                .delete()
                .eq('teacher_id', teacherId);

            if (error) throw error;

            toast.success('Teacher deleted successfully');
            onRefresh();
        } catch (error) {
            console.error('Error deleting teacher:', error);
            toast.error('Failed to delete teacher');
        }
    };

    const handleBulkUpload = async (data: any[]) => {
        try {
            const { error } = await supabase.from('teachers').insert(data);
            if (error) throw error;
            onRefresh();
        } catch (error) {
            console.error('Bulk upload error:', error);
            throw error;
        }
    };

    const openEditDialog = (teacher: Teacher) => {
        setEditingTeacher(teacher);
        setEditTeacherName(teacher.teacher_name);
        setEditTeacherEmail(teacher.teacher_email || '');
        setEditTeacherContact(teacher.contact_no || '');
        setEditTeacherDesignation(teacher.designation || '');
        setEditTeacherDeptId(teacher.dept_id);
        setIsEditDialogOpen(true);
    };

    const openCourseDialog = (teacher: Teacher) => {
        setSelectedTeacher(teacher);
        setSelectedCourseId('');
        setIsCourseDialogOpen(true);
    };

    const handleAssignCourse = async () => {
        if (!selectedTeacher || !selectedCourseId) {
            toast.error('Please select a course to assign');
            return;
        }

        try {
            // Get current session
            const { data: sessionData } = await supabase
                .from('sessions')
                .select('session_id')
                .order('session_year', { ascending: false })
                .limit(1)
                .single();

            if (!sessionData) {
                toast.error('No active session found. Please create a session first.');
                return;
            }

            // Get a venue (default to first available)
            const { data: venueData } = await supabase
                .from('venues')
                .select('venue_id')
                .limit(1)
                .single();

            if (!venueData) {
                toast.error('No venue found. Please create a venue first.');
                return;
            }

            // Create exam_teacher entry
            const { error } = await supabase
                .from('exam_teachers')
                .insert({
                    teacher_id: selectedTeacher.teacher_id,
                    session_id: sessionData.session_id,
                    venue_id: venueData.venue_id
                });

            if (error) throw error;

            toast.success(`Course assigned to ${selectedTeacher.teacher_name}`);
            setIsCourseDialogOpen(false);
            setSelectedCourseId('');
            loadTeacherCourses();
        } catch (error: any) {
            console.error('Error assigning course:', error);
            if (error.code === '23505') {
                toast.error('This teacher is already assigned to this session');
            } else {
                toast.error('Failed to assign course');
            }
        }
    };

    return (
        <Card className="w-full shadow-md">
            <CardHeader className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                    <CardTitle className="text-lg font-bold">
                        Teachers ({filteredTeachers.length} of {teachers.length})
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setShowBulkUpload(true)} variant="outline" size="sm">
                        <Upload className="w-4 h-4 mr-2" />
                        Bulk Upload
                    </Button>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="w-4 h-4 mr-2" />
                                Add Teacher
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Teacher</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label>Teacher Name *</Label>
                                    <Input value={newTeacherName} onChange={(e) => setNewTeacherName(e.target.value)} />
                                </div>
                                <div>
                                    <Label>Email</Label>
                                    <Input value={newTeacherEmail} onChange={(e) => setNewTeacherEmail(e.target.value)} />
                                </div>
                                <div>
                                    <Label>Contact Number</Label>
                                    <Input value={newTeacherContact} onChange={(e) => setNewTeacherContact(e.target.value)} />
                                </div>
                                <div>
                                    <Label>Designation</Label>
                                    <Input value={newTeacherDesignation} onChange={(e) => setNewTeacherDesignation(e.target.value)} />
                                </div>
                                <div>
                                    <Label>Department *</Label>
                                    <Select value={newTeacherDeptId} onValueChange={setNewTeacherDeptId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a department" />
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
                                <Button onClick={handleAddTeacher} className="w-full">Add Teacher</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        ref={searchInputRef}
                        placeholder="Type / to search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Escape') {
                                searchInputRef.current?.blur();
                            }
                        }}
                        className="w-full pl-10"
                    />
                </div>
            </CardHeader>

            {/* ✅ No more internal scroll */}
            <CardContent className="overflow-visible space-y-2">
                {filteredTeachers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        {searchQuery ? 'No teachers match your search.' : 'No teachers available. Add one to get started.'}
                    </div>
                ) : (
                    filteredTeachers.map((teacher) => (
                        <div
                            key={teacher.teacher_id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2 animate-fade-in"
                        >
                            <div className="flex-1">
                                <div className="font-medium">{teacher.teacher_name}</div>
                                <div className="text-sm text-gray-500">
                                    {teacher.designation && `${teacher.designation} • `}
                                    {getDepartmentName(teacher.dept_id)}
                                </div>
                                {teacher.teacher_email && (
                                    <div className="text-sm text-gray-500">{teacher.teacher_email}</div>
                                )}
                                {teacher.contact_no && (
                                    <div className="text-sm text-gray-500">{teacher.contact_no}</div>
                                )}
                                {/* Show assigned courses count */}
                                {teacherCourses[teacher.teacher_id]?.length > 0 && (
                                    <div className="mt-1">
                                        <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                                            <BookOpen className="w-3 h-3 mr-1" />
                                            {teacherCourses[teacher.teacher_id].length} course(s)
                                        </Badge>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => openCourseDialog(teacher)}
                                    title="Assign Courses"
                                >
                                    <BookOpen className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => openEditDialog(teacher)}>
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
                                            <AlertDialogTitle>Delete Teacher</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete "{teacher.teacher_name}"?
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteTeacher(teacher.teacher_id)}>
                                                Delete
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                    ))
                )}
            </CardContent>

            {/* Edit Teacher Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Teacher</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Label>Teacher Name *</Label>
                        <Input value={editTeacherName} onChange={(e) => setEditTeacherName(e.target.value)} />
                        <Label>Email</Label>
                        <Input value={editTeacherEmail} onChange={(e) => setEditTeacherEmail(e.target.value)} />
                        <Label>Contact</Label>
                        <Input value={editTeacherContact} onChange={(e) => setEditTeacherContact(e.target.value)} />
                        <Label>Designation</Label>
                        <Input value={editTeacherDesignation} onChange={(e) => setEditTeacherDesignation(e.target.value)} />
                        <Label>Department *</Label>
                        <Select value={editTeacherDeptId} onValueChange={setEditTeacherDeptId}>
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
                        <div className="flex gap-2">
                            <Button onClick={handleEditTeacher} className="flex-1">Update</Button>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">Cancel</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Assign Course Dialog */}
            <Dialog open={isCourseDialogOpen} onOpenChange={setIsCourseDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Assign Course to {selectedTeacher?.teacher_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label>Select Course</Label>
                            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a course" />
                                </SelectTrigger>
                                <SelectContent>
                                    {selectedTeacher && getCoursesForTeacher(selectedTeacher).map((course) => (
                                        <SelectItem key={course.course_id} value={course.course_id}>
                                            {course.course_code} - {course.course_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {selectedTeacher && getCoursesForTeacher(selectedTeacher).length === 0 && (
                                <p className="text-sm text-muted-foreground mt-2">
                                    No courses available for {getDepartmentName(selectedTeacher.dept_id)}. Please add courses first.
                                </p>
                            )}
                        </div>
                        
                        {/* Show currently assigned courses */}
                        {selectedTeacher && teacherCourses[selectedTeacher.teacher_id]?.length > 0 && (
                            <div>
                                <Label className="text-sm text-muted-foreground">Currently Assigned:</Label>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {teacherCourses[selectedTeacher.teacher_id].map((tc) => (
                                        <Badge key={tc.course_id} variant="secondary" className="text-xs">
                                            {tc.course_code}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        <div className="flex gap-2">
                            <Button onClick={handleAssignCourse} className="flex-1" disabled={!selectedCourseId}>
                                Assign Course
                            </Button>
                            <Button variant="outline" onClick={() => setIsCourseDialogOpen(false)} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <BulkUploadModal
                isOpen={showBulkUpload}
                onClose={() => setShowBulkUpload(false)}
                type="teachers"
                onUpload={handleBulkUpload}
            />
        </Card>
    );
};