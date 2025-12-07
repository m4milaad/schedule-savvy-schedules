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
import { Plus, Edit2, Trash2, Upload } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";

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
            console.error('Error adding session:', error);
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
            console.error('Error updating session:', error);
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
            console.error('Error deleting session:', error);
            toast.error('Failed to delete session');
        }
    };

    const handleBulkUpload = async (data: any[]) => {
        try {
            const { error } = await supabase.from('sessions').insert(data);
            if (error) throw error;
            onRefresh();
        } catch (error) {
            console.error('Bulk upload error:', error);
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
        <Card className="w-full shadow-2xl border border-white/30 bg-white/30 dark:bg-black/30 backdrop-blur-xl transition-all duration-300 hover:shadow-lg animate-fade-in">
            <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg font-bold">
                    Sessions ({sessions.length})
                </CardTitle>
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
            </CardHeader>

            {/* ✅ FIXED: Removed internal scroll */}
            <CardContent className="overflow-visible space-y-2">
                {sessions.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        No sessions available. Add one to get started.
                    </div>
                ) : (
                    sessions.map((session) => (
                        <div
                            key={session.session_id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2 animate-fade-in"
                        >
                            <div>
                                <div className="font-medium">{session.session_name}</div>
                                <div className="text-sm text-gray-500">Year: {session.session_year}</div>
                                <div className="text-sm text-gray-500">
                                    Created: {new Date(session.created_at).toLocaleDateString()}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditDialog(session)}>
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
                                            <AlertDialogTitle>Delete Session</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete "{session.session_name}"?
                                                This will also delete all associated exam schedules.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteSession(session.session_id)}>
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
        </Card>
    );
};
