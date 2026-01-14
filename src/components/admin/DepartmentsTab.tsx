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
        <Card className="linear-surface overflow-hidden">
            <CardHeader className="linear-toolbar flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="linear-kicker">Configuration</div>
                        <CardTitle className="text-base font-semibold">
                            Departments
                        </CardTitle>
                    </div>
                    <div className="linear-pill">
                        <span className="font-medium text-foreground">{departments.length}</span>
                        <span>total</span>
                    </div>
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

            <CardContent className="p-0">
                {departments.length === 0 ? (
                    <div className="py-14 text-center">
                        <div className="text-sm font-medium">No departments yet</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            Create departments so courses, teachers and students can be organized.
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="linear-table">
                            <thead>
                                <tr>
                                    <th className="linear-th">Department</th>
                                    <th className="linear-th hidden md:table-cell">School</th>
                                    <th className="linear-th hidden lg:table-cell">Created</th>
                                    <th className="linear-th text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {departments.map((dept) => (
                                    <tr key={dept.dept_id} className="linear-tr">
                                        <td className="linear-td">
                                            <div className="font-medium">{dept.dept_name}</div>
                                        </td>
                                        <td className="linear-td hidden md:table-cell text-sm text-muted-foreground">
                                            {getSchoolName(dept.school_id)}
                                        </td>
                                        <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                                            {new Date(dept.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="linear-td">
                                            <div className="flex justify-end gap-2">
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
