import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AdminPanel, RowActions } from "./AdminPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Upload } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Department, School } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";
import logger from '@/lib/logger';


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
            logger.error('Error adding department:', error);
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
            logger.error('Error updating department:', error);
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
            logger.error('Error deleting department:', error);
            toast.error('Failed to delete department');
        }
    };

    const handleBulkUpload = async (data: Record<string, unknown>[]) => {
        try {
            const { error } = await supabase.from('departments').insert(data);
            if (error) throw error;
            onRefresh();
        } catch (error) {
            logger.error('Bulk upload error:', error);
            throw error;
        }
    };

    const openEditDialog = (dept: Department) => {
        setEditingDept(dept);
        setEditDeptName(dept.dept_name);
        setEditDeptSchoolId(dept.school_id || "");
        setIsEditDialogOpen(true);
    };

    const getSchoolName = (schoolId: string) => {
        const school = schools.find((s) => s.school_id === schoolId);
        return school ? school.school_name : 'Unknown School';
    };

    return (
        <AdminPanel>
            <div className="admin-toolbar">
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
            </div>

            <div>
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
                                            {getSchoolName(dept.school_id || "")}
                                        </td>
                                        <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                                            {new Date(dept.created_at || "").toLocaleDateString()}
                                        </td>
                                        <td className="linear-td">
                                            <div className="flex justify-end gap-2">
                                                <RowActions onEdit={() => openEditDialog(dept)} onDelete={() => handleDeleteDepartment(dept.dept_id)} title="Delete department?" description={<>Are you sure you want to delete "{dept.dept_name}"? This will also delete all associated courses, teachers, and students.</>} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

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
        </AdminPanel>
    );
};
