import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Edit2, Trash2, Upload } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Department, School } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";

interface DepartmentsTabProps {
    departments: Department[];
    schools: School[];
    onRefresh: () => void;
}

export const DepartmentsTab = ({ departments, schools, onRefresh }: DepartmentsTabProps) => {
    const [newDeptName, setNewDeptName] = useState('');
    const [newDeptSchoolId, setNewDeptSchoolId] = useState('');
    const [editingDept, setEditingDept] = useState<Department | null>(null);
    const [editDeptName, setEditDeptName] = useState('');
    const [editDeptSchoolId, setEditDeptSchoolId] = useState('');
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleAddDepartment = async () => {
        if (!newDeptName.trim() || !newDeptSchoolId) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            const { error } = await supabase
                .from('departments')
                .insert({
                    dept_name: newDeptName.trim(),
                    school_id: newDeptSchoolId
                });

            if (error) throw error;

            toast.success('Department added successfully');
            setNewDeptName('');
            setNewDeptSchoolId('');
            setIsAddDialogOpen(false);
            onRefresh();
        } catch (error) {
            console.error('Error adding department:', error);
            toast.error('Failed to add department');
        }
    };

    const handleEditDepartment = async () => {
        if (!editingDept || !editDeptName.trim() || !editDeptSchoolId) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            const { error } = await supabase
                .from('departments')
                .update({
                    dept_name: editDeptName.trim(),
                    school_id: editDeptSchoolId
                })
                .eq('dept_id', editingDept.dept_id);

            if (error) throw error;

            toast.success('Department updated successfully');
            setEditingDept(null);
            setEditDeptName('');
            setEditDeptSchoolId('');
            setIsEditDialogOpen(false);
            onRefresh();
        } catch (error) {
            console.error('Error updating department:', error);
            toast.error('Failed to update department');
        }
    };

    const handleDeleteDepartment = async (deptId: string) => {
        try {
            const { error } = await supabase
                .from('departments')
                .delete()
                .eq('dept_id', deptId);

            if (error) throw error;

            toast.success('Department deleted successfully');
            onRefresh();
        } catch (error) {
            console.error('Error deleting department:', error);
            toast.error('Failed to delete department');
        }
    };

    const handleBulkUpload = async (data: any[]) => {
        try {
            const { error } = await supabase.from('departments').insert(data);
            if (error) throw error;
            onRefresh();
        } catch (error) {
            console.error('Bulk upload error:', error);
            throw error;
        }
    };

    const openEditDialog = (dept: Department) => {
        setEditingDept(dept);
        setEditDeptName(dept.dept_name);
        setEditDeptSchoolId(dept.school_id);
        setIsEditDialogOpen(true);
    };

    const getSchoolName = (schoolId: string) => {
        const school = schools.find((s) => s.school_id === schoolId);
        return school ? school.school_name : 'Unknown School';
    };

    return (
        <Card className="w-full shadow-md">
            <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg font-bold">
                    Departments ({departments.length})
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
                                Add Department
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Department</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="dept-name">Department Name</Label>
                                    <Input
                                        id="dept-name"
                                        value={newDeptName}
                                        onChange={(e) => setNewDeptName(e.target.value)}
                                        placeholder="Enter department name"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="dept-school">School</Label>
                                    <Select value={newDeptSchoolId} onValueChange={setNewDeptSchoolId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select a school" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {schools.map((school) => (
                                                <SelectItem key={school.school_id} value={school.school_id}>
                                                    {school.school_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleAddDepartment} className="flex-1">Add Department</Button>
                                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">Cancel</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            {/* 🧠 Fix: Removed max-h & overflow; content now expands naturally */}
            <CardContent className="overflow-visible space-y-2">
                {departments.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        No departments available. Add one to get started.
                    </div>
                ) : (
                    departments.map((dept) => (
                        <div
                            key={dept.dept_id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2"
                        >
                            <div>
                                <div className="font-medium">{dept.dept_name}</div>
                                <div className="text-sm text-gray-500">
                                    School: {getSchoolName(dept.school_id)}
                                </div>
                                <div className="text-sm text-gray-500">
                                    Created: {new Date(dept.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditDialog(dept)}>
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
                                            <AlertDialogTitle>Delete Department</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete "{dept.dept_name}"? This will also delete all associated courses, teachers, and students.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteDepartment(dept.dept_id)}>
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
                        <DialogTitle>Edit Department</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-dept-name">Department Name</Label>
                            <Input
                                id="edit-dept-name"
                                value={editDeptName}
                                onChange={(e) => setEditDeptName(e.target.value)}
                                placeholder="Enter department name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-dept-school">School</Label>
                            <Select value={editDeptSchoolId} onValueChange={setEditDeptSchoolId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a school" />
                                </SelectTrigger>
                                <SelectContent>
                                    {schools.map((school) => (
                                        <SelectItem key={school.school_id} value={school.school_id}>
                                            {school.school_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleEditDepartment} className="flex-1">Update Department</Button>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">Cancel</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <BulkUploadModal
                isOpen={showBulkUpload}
                onClose={() => setShowBulkUpload(false)}
                type="departments"
                onUpload={handleBulkUpload}
            />
        </Card>
    );
};
