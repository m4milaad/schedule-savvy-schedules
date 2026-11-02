import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AdminPanel, RowActions } from "./AdminPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Plus, Upload } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { School } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";
import logger from '@/lib/logger';
import type { TablesInsert } from '@/integrations/supabase/types';


interface SchoolsTabProps {
    schools: School[];
    onRefresh: () => void;
}

export const SchoolsTab = ({ schools, onRefresh }: SchoolsTabProps) => {
    const [newSchoolName, setNewSchoolName] = useState('');
    const [editingSchool, setEditingSchool] = useState<School | null>(null);
    const [editSchoolName, setEditSchoolName] = useState('');
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleAddSchool = async () => {
        if (!newSchoolName.trim()) {
            toast.error('Please enter a school name');
            return;
        }

        try {
            const { error } = await supabase
                .from('schools')
                .insert({ school_name: newSchoolName.trim() });

            if (error) throw error;

            toast.success('School added successfully');
            setNewSchoolName('');
            setIsAddDialogOpen(false);
            onRefresh();
        } catch (error) {
            logger.error('Error adding school:', error);
            toast.error('Failed to add school');
        }
    };

    const handleEditSchool = async () => {
        if (!editingSchool || !editSchoolName.trim()) {
            toast.error('Please enter a school name');
            return;
        }

        try {
            const { error } = await supabase
                .from('schools')
                .update({ school_name: editSchoolName.trim() })
                .eq('school_id', editingSchool.school_id);

            if (error) throw error;

            toast.success('School updated successfully');
            setEditingSchool(null);
            setEditSchoolName('');
            setIsEditDialogOpen(false);
            onRefresh();
        } catch (error) {
            logger.error('Error updating school:', error);
            toast.error('Failed to update school');
        }
    };

    const handleDeleteSchool = async (schoolId: string) => {
        try {
            const { error } = await supabase
                .from('schools')
                .delete()
                .eq('school_id', schoolId);

            if (error) throw error;

            toast.success('School deleted successfully');
            onRefresh();
        } catch (error) {
            logger.error('Error deleting school:', error);
            toast.error('Failed to delete school');
        }
    };

    const handleBulkUpload = async (data: Record<string, unknown>[]) => {
        try {
            const { error } = await supabase.from('schools').insert(data as TablesInsert<'schools'>[]); // template columns; the database rejects bad rows
            if (error) throw error;
            onRefresh();
        } catch (error) {
            logger.error('Bulk upload error:', error);
            throw error;
        }
    };

    const openEditDialog = (school: School) => {
        setEditingSchool(school);
        setEditSchoolName(school.school_name);
        setIsEditDialogOpen(true);
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
                                Add School
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New School</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="school-name">School Name</Label>
                                    <Input
                                        id="school-name"
                                        value={newSchoolName}
                                        onChange={(e) => setNewSchoolName(e.target.value)}
                                        placeholder="Enter school name"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <Button onClick={handleAddSchool} className="flex-1">Add School</Button>
                                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">Cancel</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div>
                {schools.length === 0 ? (
                    <div className="py-14 text-center">
                        <div className="text-sm font-medium">No schools yet</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            Add your first school to start organizing departments.
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="linear-table">
                            <thead>
                                <tr>
                                    <th className="linear-th">Name</th>
                                    <th className="linear-th hidden md:table-cell">Created</th>
                                    <th className="linear-th text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {schools.map((school) => (
                                    <tr key={school.school_id} className="linear-tr">
                                        <td className="linear-td">
                                            <div className="font-medium">{school.school_name}</div>
                                        </td>
                                        <td className="linear-td hidden md:table-cell text-sm text-muted-foreground">
                                            {new Date(school.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="linear-td">
                                            <div className="flex justify-end gap-2">
                                                <RowActions onEdit={() => openEditDialog(school)} onDelete={() => handleDeleteSchool(school.school_id)} title="Delete school?" description={<>Are you sure you want to delete "{school.school_name}"? This will also delete all associated departments and data.</>} />
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
                        <DialogTitle>Edit School</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-school-name">School Name</Label>
                            <Input
                                id="edit-school-name"
                                value={editSchoolName}
                                onChange={(e) => setEditSchoolName(e.target.value)}
                                placeholder="Enter school name"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleEditSchool} className="flex-1">Update School</Button>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">Cancel</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <BulkUploadModal
                isOpen={showBulkUpload}
                onClose={() => setShowBulkUpload(false)}
                type="schools"
                onUpload={handleBulkUpload}
            />
        </AdminPanel>
    );
};
