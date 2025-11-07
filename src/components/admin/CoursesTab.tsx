import React, { useState } from 'react';
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
import { Plus, Edit2, Trash2, Upload } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Course, Department } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";

interface CoursesTabProps {
    courses: Course[];
    departments: Department[];
    onRefresh: () => void;
}

export const CoursesTab = ({ courses, departments, onRefresh }: CoursesTabProps) => {
    const [newCourseName, setNewCourseName] = useState('');
    const [newCourseCode, setNewCourseCode] = useState('');
    const [newCourseCredits, setNewCourseCredits] = useState('3');
    const [newCourseType, setNewCourseType] = useState('Theory');
    const [newCourseDeptId, setNewCourseDeptId] = useState('');
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [editCourseName, setEditCourseName] = useState('');
    const [editCourseCode, setEditCourseCode] = useState('');
    const [editCourseCredits, setEditCourseCredits] = useState('');
    const [editCourseType, setEditCourseType] = useState('');
    const [editCourseDeptId, setEditCourseDeptId] = useState('');
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleAddCourse = async () => {
        if (!newCourseName.trim() || !newCourseCode.trim() || !newCourseDeptId) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const { error } = await supabase
                .from('courses')
                .insert({
                    course_name: newCourseName.trim(),
                    course_code: newCourseCode.trim(),
                    course_credits: parseInt(newCourseCredits),
                    course_type: newCourseType,
                    dept_id: newCourseDeptId
                });

            if (error) throw error;

            toast.success('Course added successfully');
            setNewCourseName('');
            setNewCourseCode('');
            setNewCourseCredits('3');
            setNewCourseType('Theory');
            setNewCourseDeptId('');
            setIsAddDialogOpen(false);
            onRefresh();
        } catch (error) {
            console.error('Error adding course:', error);
            toast.error('Failed to add course');
        }
    };

    const handleEditCourse = async () => {
        if (!editingCourse || !editCourseName.trim() || !editCourseCode.trim() || !editCourseDeptId) {
            toast.error('Please fill in all required fields');
            return;
        }

        try {
            const { error } = await supabase
                .from('courses')
                .update({
                    course_name: editCourseName.trim(),
                    course_code: editCourseCode.trim(),
                    course_credits: parseInt(editCourseCredits),
                    course_type: editCourseType,
                    dept_id: editCourseDeptId
                })
                .eq('course_id', editingCourse.course_id);

            if (error) throw error;

            toast.success('Course updated successfully');
            setEditingCourse(null);
            setIsEditDialogOpen(false);
            onRefresh();
        } catch (error) {
            console.error('Error updating course:', error);
            toast.error('Failed to update course');
        }
    };

    const handleDeleteCourse = async (courseId: string) => {
        try {
            const { error } = await supabase
                .from('courses')
                .delete()
                .eq('course_id', courseId);

            if (error) throw error;

            toast.success('Course deleted successfully');
            onRefresh();
        } catch (error) {
            console.error('Error deleting course:', error);
            toast.error('Failed to delete course');
        }
    };

    const handleBulkUpload = async (data: any[]) => {
        try {
            const { error } = await supabase.from('courses').insert(data);
            if (error) throw error;
            onRefresh();
        } catch (error) {
            console.error('Bulk upload error:', error);
            throw error;
        }
    };

    const openEditDialog = (course: Course) => {
        setEditingCourse(course);
        setEditCourseName(course.course_name);
        setEditCourseCode(course.course_code);
        setEditCourseCredits(course.course_credits.toString());
        setEditCourseType(course.course_type);
        setEditCourseDeptId(course.dept_id);
        setIsEditDialogOpen(true);
    };

    const getDepartmentName = (deptId: string) => {
        const dept = departments.find(d => d.dept_id === deptId);
        return dept ? dept.dept_name : 'Unknown Department';
    };

    return (
        <Card className="w-full shadow-md">
            <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg font-bold">
                    Courses ({courses.length})
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
                                Add Course
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Course</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="course-name">Course Name</Label>
                                    <Input
                                        id="course-name"
                                        value={newCourseName}
                                        onChange={(e) => setNewCourseName(e.target.value)}
                                        placeholder="Enter course name"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="course-code">Course Code</Label>
                                    <Input
                                        id="course-code"
                                        value={newCourseCode}
                                        onChange={(e) => setNewCourseCode(e.target.value)}
                                        placeholder="Enter course code"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="course-credits">Credits</Label>
                                    <Input
                                        id="course-credits"
                                        type="number"
                                        value={newCourseCredits}
                                        onChange={(e) => setNewCourseCredits(e.target.value)}
                                        placeholder="Enter credits"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="course-type">Course Type</Label>
                                    <Select value={newCourseType} onValueChange={setNewCourseType}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select course type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Theory">Theory</SelectItem>
                                            <SelectItem value="Practical">Practical</SelectItem>
                                            <SelectItem value="Lab">Lab</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="course-dept">Department</Label>
                                    <Select value={newCourseDeptId} onValueChange={setNewCourseDeptId}>
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
                                <div className="flex gap-2">
                                    <Button onClick={handleAddCourse} className="flex-1">Add Course</Button>
                                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">Cancel</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            {/* ✅ FIXED: No internal scroll, full expansion */}
            <CardContent className="overflow-visible space-y-2">
                {courses.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        No courses available. Add one to get started.
                    </div>
                ) : (
                    courses.map((course) => (
                        <div key={course.course_id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2">
                            <div>
                                <div className="font-medium">{course.course_code} - {course.course_name}</div>
                                <div className="text-sm text-gray-500">
                                    {course.course_credits} credits • {course.course_type}
                                </div>
                                <div className="text-sm text-gray-500">
                                    Department: {getDepartmentName(course.dept_id)}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditDialog(course)}>
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
                                            <AlertDialogTitle>Delete Course</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete "{course.course_name}"? This will also delete related data.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteCourse(course.course_id)}>
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

            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Course</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-course-name">Course Name</Label>
                            <Input
                                id="edit-course-name"
                                value={editCourseName}
                                onChange={(e) => setEditCourseName(e.target.value)}
                                placeholder="Enter course name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-course-code">Course Code</Label>
                            <Input
                                id="edit-course-code"
                                value={editCourseCode}
                                onChange={(e) => setEditCourseCode(e.target.value)}
                                placeholder="Enter course code"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-course-credits">Credits</Label>
                            <Input
                                id="edit-course-credits"
                                type="number"
                                value={editCourseCredits}
                                onChange={(e) => setEditCourseCredits(e.target.value)}
                                placeholder="Enter credits"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-course-type">Course Type</Label>
                            <Select value={editCourseType} onValueChange={setEditCourseType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select course type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Theory">Theory</SelectItem>
                                    <SelectItem value="Practical">Practical</SelectItem>
                                    <SelectItem value="Lab">Lab</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="edit-course-dept">Department</Label>
                            <Select value={editCourseDeptId} onValueChange={setEditCourseDeptId}>
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
                        <div className="flex gap-2">
                            <Button onClick={handleEditCourse} className="flex-1">Update Course</Button>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">Cancel</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <BulkUploadModal
                isOpen={showBulkUpload}
                onClose={() => setShowBulkUpload(false)}
                type="courses"
                onUpload={handleBulkUpload}
            />
        </Card>
    );
};
