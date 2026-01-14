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
import { Plus, Edit2, Trash2, Upload } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { School } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";

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
            console.error('Error adding school:', error);
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
            console.error('Error updating school:', error);
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
            console.error('Error deleting school:', error);
            toast.error('Failed to delete school');
        }
    };

    const handleBulkUpload = async (data: any[]) => {
        try {
            const { error } = await supabase.from('schools').insert(data);
            if (error) throw error;
            onRefresh();
        } catch (error) {
            console.error('Bulk upload error:', error);
            throw error;
        }
    };

    const openEditDialog = (school: School) => {
        setEditingSchool(school);
        setEditSchoolName(school.school_name);
        setIsEditDialogOpen(true);
    };

    return (
        <Card className="linear-surface overflow-hidden">
            <CardHeader className="linear-toolbar flex flex-col gap-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <div className="linear-kicker">Configuration</div>
                        <CardTitle className="text-base font-semibold">
                            Schools
                        </CardTitle>
                    </div>
                    <div className="linear-pill">
                        <span className="font-medium text-foreground">{schools.length}</span>
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
            </CardHeader>

            <CardContent className="p-0">
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
                                                <Button variant="outline" size="sm" onClick={() => openEditDialog(school)}>
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
                                                            <AlertDialogTitle>Delete School</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Are you sure you want to delete "{school.school_name}"? This will also delete all associated departments and data.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteSchool(school.school_id)}>
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
        </Card>
    );
};
