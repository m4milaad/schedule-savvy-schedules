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
import { Teacher, Department } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";

interface TeachersTabProps {
    teachers: Teacher[];
    departments: Department[];
    onRefresh: () => void;
}

export const TeachersTab = ({ teachers, departments, onRefresh }: TeachersTabProps) => {
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

    const getDepartmentName = (deptId: string) => {
        const dept = departments.find(d => d.dept_id === deptId);
        return dept ? dept.dept_name : 'Unknown Department';
    };

    return (
        <Card className="w-full shadow-md">
            <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg font-bold">
                    Teachers ({teachers.length})
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
            </CardHeader>

            {/* ✅ No more internal scroll */}
            <CardContent className="overflow-visible space-y-2">
                {teachers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        No teachers available. Add one to get started.
                    </div>
                ) : (
                    teachers.map((teacher) => (
                        <div
                            key={teacher.teacher_id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2 animate-fade-in"
                        >
                            <div>
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
                            </div>
                            <div className="flex gap-2">
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

            <BulkUploadModal
                isOpen={showBulkUpload}
                onClose={() => setShowBulkUpload(false)}
                type="teachers"
                onUpload={handleBulkUpload}
            />
        </Card>
    );
};
