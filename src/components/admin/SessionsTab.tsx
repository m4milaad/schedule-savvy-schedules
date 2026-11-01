import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { AdminPanel, RowActions } from "./AdminPanel";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Upload } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";
import logger from '@/lib/logger';


interface SessionsTabProps {
    sessions: Session[];
    onRefresh: () => void;
}

export const SessionsTab = ({ sessions, onRefresh }: SessionsTabProps) => {
    const [newSessionName, setNewSessionName] = useState('');
    const [newSessionYear, setNewSessionYear] = useState(new Date().getFullYear().toString());
    const [editingSession, setEditingSession] = useState<Session | null>(null);
    const [editSessionName, setEditSessionName] = useState('');
    const [editSessionYear, setEditSessionYear] = useState('');
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

    const handleAddSession = async () => {
        if (!newSessionName.trim() || !newSessionYear) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            const { error } = await supabase
                .from('sessions')
                .insert({
                    session_name: newSessionName.trim(),
                    session_year: parseInt(newSessionYear)
                });

            if (error) throw error;

            toast.success('Session added successfully');
            setNewSessionName('');
            setNewSessionYear(new Date().getFullYear().toString());
            setIsAddDialogOpen(false);
            onRefresh();
        } catch (error) {
            logger.error('Error adding session:', error);
            toast.error('Failed to add session');
        }
    };

    const handleEditSession = async () => {
        if (!editingSession || !editSessionName.trim() || !editSessionYear) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            const { error } = await supabase
                .from('sessions')
                .update({
                    session_name: editSessionName.trim(),
                    session_year: parseInt(editSessionYear)
                })
                .eq('session_id', editingSession.session_id);

            if (error) throw error;

            toast.success('Session updated successfully');
            setEditingSession(null);
            setIsEditDialogOpen(false);
            onRefresh();
        } catch (error) {
            logger.error('Error updating session:', error);
            toast.error('Failed to update session');
        }
    };

    const handleDeleteSession = async (sessionId: string) => {
        try {
            const { error } = await supabase
                .from('sessions')
                .delete()
                .eq('session_id', sessionId);

            if (error) throw error;

            toast.success('Session deleted successfully');
            onRefresh();
        } catch (error) {
            logger.error('Error deleting session:', error);
            toast.error('Failed to delete session');
        }
    };

    const handleBulkUpload = async (data: Record<string, unknown>[]) => {
        try {
            const { error } = await supabase.from('sessions').insert(data);
            if (error) throw error;
            onRefresh();
        } catch (error) {
            logger.error('Bulk upload error:', error);
            throw error;
        }
    };

    const openEditDialog = (session: Session) => {
        setEditingSession(session);
        setEditSessionName(session.session_name);
        setEditSessionYear(session.session_year.toString());
        setIsEditDialogOpen(true);
    };

    return (
        <AdminPanel>
            <div className="admin-toolbar">
                <div className="flex flex-wrap gap-2">
                    <Button onClick={() => setShowBulkUpload(true)} variant="outline" size="sm">
                        <Upload className="w-4 h-4 mr-2" /> Bulk Upload
                    </Button>
                    <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm">
                                <Plus className="w-4 h-4 mr-2" /> Add Session
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Session</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="session-name">Session Name</Label>
                                    <Input
                                        id="session-name"
                                        value={newSessionName}
                                        onChange={(e) => setNewSessionName(e.target.value)}
                                        placeholder="e.g., 2024-2025"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="session-year">Session Year</Label>
                                    <Input
                                        id="session-year"
                                        type="number"
                                        value={newSessionYear}
                                        onChange={(e) => setNewSessionYear(e.target.value)}
                                        placeholder="Enter session year"
                                    />
                                </div>
                                <Button onClick={handleAddSession} className="w-full">Add Session</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div>
                {sessions.length === 0 ? (
                    <div className="py-14 text-center">
                        <div className="text-sm font-medium">No sessions yet</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                            Add sessions to group exam schedules by academic year.
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="linear-table">
                            <thead>
                                <tr>
                                    <th className="linear-th">Session</th>
                                    <th className="linear-th">Year</th>
                                    <th className="linear-th hidden lg:table-cell">Created</th>
                                    <th className="linear-th text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sessions.map((session) => (
                                    <tr key={session.session_id} className="linear-tr">
                                        <td className="linear-td">
                                            <div className="font-medium">{session.session_name}</div>
                                        </td>
                                        <td className="linear-td text-sm text-muted-foreground">
                                            {session.session_year}
                                        </td>
                                        <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                                            {new Date(session.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="linear-td">
                                            <div className="flex justify-end gap-2">
                                                <RowActions onEdit={() => openEditDialog(session)} onDelete={() => handleDeleteSession(session.session_id)} title="Delete session?" description={<>Are you sure you want to delete "{session.session_name}"? This will also delete all associated exam schedules.</>} />
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
                        <DialogTitle>Edit Session</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Label htmlFor="edit-session-name">Session Name</Label>
                        <Input
                            id="edit-session-name"
                            value={editSessionName}
                            onChange={(e) => setEditSessionName(e.target.value)}
                            placeholder="e.g., 2024-2025"
                        />
                        <Label htmlFor="edit-session-year">Session Year</Label>
                        <Input
                            id="edit-session-year"
                            type="number"
                            value={editSessionYear}
                            onChange={(e) => setEditSessionYear(e.target.value)}
                            placeholder="Enter session year"
                        />
                        <div className="flex gap-2">
                            <Button onClick={handleEditSession} className="flex-1">Update Session</Button>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">Cancel</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <BulkUploadModal
                isOpen={showBulkUpload}
                onClose={() => setShowBulkUpload(false)}
                type="sessions"
                onUpload={handleBulkUpload}
            />
        </AdminPanel>
    );
};
