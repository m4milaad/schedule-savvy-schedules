import React, { useState, useRef } from 'react';
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit2, Trash2, Upload, Search } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Course, Department } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";
import { useSearchShortcut } from "@/hooks/useSearchShortcut";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkActionsBar } from "@/components/ui/bulk-actions-bar";

interface CoursesTabProps {
    courses: Course[];
    departments: Department[];
    onRefresh: () => void;
}

export const CoursesTab = ({ courses, departments, onRefresh }: CoursesTabProps) => {
    const [searchQuery, setSearchQuery] = useState('');
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
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    
    // Bulk selection
    const {
        selectedItems,
        isSelected,
        toggleSelection,
        selectAll,
        clearSelection,
        selectedCount,
    } = useBulkSelection<string>();
    
    // Ref for search input
    const searchInputRef = useRef<HTMLInputElement>(null);
    
    // Enable "/" keyboard shortcut to focus search
    useSearchShortcut(searchInputRef);
    
    const handleSelectAll = () => {
        if (selectedCount === filteredCourses.length) {
            clearSelection();
        } else {
            selectAll(filteredCourses.map(c => c.course_id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedCount === 0) return;
        
        try {
            const selectedIds = Array.from(selectedItems);
            const { error } = await supabase
                .from('courses')
                .delete()
                .in('course_id', selectedIds);

            if (error) throw error;

            toast.success(`${selectedCount} course(s) deleted successfully`);
            clearSelection();
            onRefresh();
        } catch (error: any) {
            console.error('Error bulk deleting courses:', error);
            toast.error(error.message || 'Failed to delete courses');
        }
    };

    const getDepartmentName = (deptId: string) => {
        const dept = departments.find(d => d.dept_id === deptId);
        return dept ? dept.dept_name : 'Unknown Department';
    };

    // Filter courses based on search query
    const filteredCourses = courses.filter(course => {
        const query = searchQuery.toLowerCase();
        const deptName = getDepartmentName(course.dept_id).toLowerCase();
        return (
            course.course_name.toLowerCase().includes(query) ||
            course.course_code.toLowerCase().includes(query) ||
            course.course_type.toLowerCase().includes(query) ||
            deptName.includes(query)
        );
    });

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

    return (
        <Card className="linear-surface overflow-hidden">
            <CardHeader className="linear-toolbar flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="linear-kicker">Catalog</div>
                        <CardTitle className="text-base font-semibold">
                            Courses
                        </CardTitle>
                    </div>
                    <div className="linear-pill">
                        <span className="font-medium text-foreground">{filteredCourses.length}</span>
                        <span className="hidden sm:inline">shown</span>
                        <span className="text-muted-foreground">/</span>
                        <span className="font-medium text-foreground">{courses.length}</span>
                        <span className="hidden sm:inline">total</span>
                    </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            ref={searchInputRef}
                            placeholder="Search courses…"
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
                </div>
            </CardHeader>

            <CardContent className="p-0">
                {filteredCourses.length === 0 ? (
                    <div className="py-14 text-center">
                        <div className="text-sm font-medium">
                            {searchQuery ? 'No matching courses' : 'No courses yet'}
                        </div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            {searchQuery ? 'Try a different query.' : 'Add courses to begin building schedules.'}
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="linear-table">
                            <thead>
                                <tr>
                                    <th className="linear-th w-10">
                                        <Checkbox
                                            checked={filteredCourses.length > 0 && selectedCount === filteredCourses.length}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </th>
                                    <th className="linear-th">Course</th>
                                    <th className="linear-th hidden md:table-cell">Department</th>
                                    <th className="linear-th hidden lg:table-cell">Type</th>
                                    <th className="linear-th hidden lg:table-cell">Credits</th>
                                    <th className="linear-th text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCourses.map((course) => (
                                    <tr key={course.course_id} className={`linear-tr ${isSelected(course.course_id) ? 'bg-primary/5' : ''}`}>
                                        <td className="linear-td">
                                            <Checkbox
                                                checked={isSelected(course.course_id)}
                                                onCheckedChange={() => toggleSelection(course.course_id)}
                                            />
                                        </td>
                                        <td className="linear-td">
                                            <div className="font-medium">{course.course_code}</div>
                                            <div className="text-sm text-muted-foreground">{course.course_name}</div>
                                        </td>
                                        <td className="linear-td hidden md:table-cell text-sm text-muted-foreground">
                                            {getDepartmentName(course.dept_id)}
                                        </td>
                                        <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                                            {course.course_type}
                                        </td>
                                        <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                                            {course.course_credits}
                                        </td>
                                        <td className="linear-td">
                                            <div className="flex justify-end gap-2">
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
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
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

            <BulkActionsBar
                selectedCount={selectedCount}
                onClear={clearSelection}
                onDelete={() => setShowBulkDeleteConfirm(true)}
            />

            <AlertDialog open={showBulkDeleteConfirm} onOpenChange={setShowBulkDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selectedCount} Course(s)</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedCount} selected course(s)? This action cannot be undone.
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
