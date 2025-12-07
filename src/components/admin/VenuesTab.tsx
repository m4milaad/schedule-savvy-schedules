import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit2, Trash2, Upload, Grid3X3, Building2 } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Venue, Department } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkActionsBar } from "@/components/ui/bulk-actions-bar";
import { SeatingLayoutEditor } from "./SeatingLayoutEditor";
import { SeatingExportPanel } from "./SeatingExportPanel";

interface VenuesTabProps {
    venues: Venue[];
    onRefresh: () => void;
    userDeptId?: string | null;
}

export const VenuesTab = ({ venues, onRefresh, userDeptId }: VenuesTabProps) => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [newVenueName, setNewVenueName] = useState('');
    const [newVenueAddress, setNewVenueAddress] = useState('');
    const [newVenueCapacity, setNewVenueCapacity] = useState('50');
    const [newVenueDeptId, setNewVenueDeptId] = useState<string>('');
    const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
    const [editVenueName, setEditVenueName] = useState('');
    const [editVenueAddress, setEditVenueAddress] = useState('');
    const [editVenueCapacity, setEditVenueCapacity] = useState('');
    const [editVenueDeptId, setEditVenueDeptId] = useState<string>('');
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [layoutEditorVenue, setLayoutEditorVenue] = useState<Venue | null>(null);

    // Load departments on mount
    useEffect(() => {
        const loadDepartments = async () => {
            const { data, error } = await supabase
                .from('departments')
                .select('*')
                .order('dept_name');
            
            if (!error && data) {
                setDepartments(data);
            }
        };
        loadDepartments();
    }, []);

    // Create a map of dept_id to dept_name for display
    const deptMap = new Map(departments.map(d => [d.dept_id, d.dept_name]));

    // Bulk selection
    const {
        selectedItems,
        isSelected,
        toggleSelection,
        selectAll,
        clearSelection,
        selectedCount,
    } = useBulkSelection<string>();

    // Filter venues by department if user is a department admin
    const filteredVenuesList = userDeptId 
        ? venues.filter(v => v.dept_id === userDeptId)
        : venues;

    const handleSelectAll = () => {
        if (selectedCount === filteredVenuesList.length) {
            clearSelection();
        } else {
            selectAll(filteredVenuesList.map(v => v.venue_id));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedCount === 0) return;
        
        try {
            const selectedIds = Array.from(selectedItems);
            const { error } = await supabase
                .from('venues')
                .delete()
                .in('venue_id', selectedIds);

            if (error) throw error;

            toast.success(`${selectedCount} venue(s) deleted successfully`);
            clearSelection();
            onRefresh();
        } catch (error: any) {
            console.error('Error bulk deleting venues:', error);
            toast.error(error.message || 'Failed to delete venues');
        }
    };

    const handleAddVenue = async () => {
        if (!newVenueName.trim()) {
            toast.error('Please enter a venue name');
            return;
        }

        try {
            const { error } = await supabase
                .from('venues')
                .insert({
                    venue_name: newVenueName.trim(),
                    venue_address: newVenueAddress.trim() || null,
                    venue_capacity: parseInt(newVenueCapacity) || 50,
                    dept_id: newVenueDeptId || null
                });

            if (error) throw error;

            toast.success('Venue added successfully');
            setNewVenueName('');
            setNewVenueAddress('');
            setNewVenueCapacity('50');
            setNewVenueDeptId('');
            setIsAddDialogOpen(false);
            onRefresh();
        } catch (error) {
            console.error('Error adding venue:', error);
            toast.error('Failed to add venue');
        }
    };

    const handleEditVenue = async () => {
        if (!editingVenue || !editVenueName.trim()) {
            toast.error('Please enter a venue name');
            return;
        }

        try {
            const { error } = await supabase
                .from('venues')
                .update({
                    venue_name: editVenueName.trim(),
                    venue_address: editVenueAddress.trim() || null,
                    venue_capacity: parseInt(editVenueCapacity) || 50,
                    dept_id: editVenueDeptId || null
                })
                .eq('venue_id', editingVenue.venue_id);

            if (error) throw error;

            toast.success('Venue updated successfully');
            setEditingVenue(null);
            setIsEditDialogOpen(false);
            onRefresh();
        } catch (error) {
            console.error('Error updating venue:', error);
            toast.error('Failed to update venue');
        }
    };

    const handleDeleteVenue = async (venueId: string) => {
        try {
            const { error } = await supabase
                .from('venues')
                .delete()
                .eq('venue_id', venueId);

            if (error) throw error;

            toast.success('Venue deleted successfully');
            onRefresh();
        } catch (error) {
            console.error('Error deleting venue:', error);
            toast.error('Failed to delete venue');
        }
    };

    const handleBulkUpload = async (data: any[]) => {
        try {
            const { error } = await supabase.from('venues').insert(data);
            if (error) throw error;
            onRefresh();
        } catch (error) {
            console.error('Bulk upload error:', error);
            throw error;
        }
    };

    const openEditDialog = (venue: Venue) => {
        setEditingVenue(venue);
        setEditVenueName(venue.venue_name);
        setEditVenueAddress(venue.venue_address || '');
        setEditVenueCapacity(venue.venue_capacity.toString());
        setEditVenueDeptId(venue.dept_id || '');
        setIsEditDialogOpen(true);
    };

    // Use filtered venues list for display
    const filteredVenues = filteredVenuesList;

    return (
        <div className="space-y-6">
        <SeatingExportPanel userDeptId={userDeptId} />
        <Card className="w-full shadow-2xl border border-white/30 bg-white/30 dark:bg-black/30 backdrop-blur-xl transition-all duration-300 hover:shadow-lg animate-fade-in">
            <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg font-bold">
                    Venues ({filteredVenues.length})
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
                                Add Venue
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Venue</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="venue-name">Venue Name *</Label>
                                    <Input
                                        id="venue-name"
                                        value={newVenueName}
                                        onChange={(e) => setNewVenueName(e.target.value)}
                                        placeholder="Enter venue name"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="venue-dept">Department</Label>
                                    <Select value={newVenueDeptId} onValueChange={setNewVenueDeptId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select department (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">No Department (All students)</SelectItem>
                                            {departments.map(dept => (
                                                <SelectItem key={dept.dept_id} value={dept.dept_id}>
                                                    {dept.dept_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Students will be assigned to venues in their department
                                    </p>
                                </div>
                                <div>
                                    <Label htmlFor="venue-address">Address</Label>
                                    <Input
                                        id="venue-address"
                                        value={newVenueAddress}
                                        onChange={(e) => setNewVenueAddress(e.target.value)}
                                        placeholder="Enter venue address"
                                    />
                                </div>
                                <div>
                                    <Label htmlFor="venue-capacity">Capacity</Label>
                                    <Input
                                        id="venue-capacity"
                                        type="number"
                                        value={newVenueCapacity}
                                        onChange={(e) => setNewVenueCapacity(e.target.value)}
                                        placeholder="Enter venue capacity"
                                    />
                                </div>
                                <Button onClick={handleAddVenue} className="w-full">Add Venue</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>

            <CardContent className="overflow-visible space-y-2">
                {filteredVenues.length > 0 && (
                    <div className="flex items-center gap-2 pb-2 border-b mb-2">
                        <Checkbox
                            checked={filteredVenues.length > 0 && selectedCount === filteredVenues.length}
                            onCheckedChange={handleSelectAll}
                        />
                        <span className="text-sm text-muted-foreground">Select all</span>
                    </div>
                )}
                {filteredVenues.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                        No venues available for your department. Add one to get started.
                    </div>
                ) : (
                    filteredVenues.map((venue) => (
                        <div
                            key={venue.venue_id}
                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-lg gap-2 animate-fade-in ${isSelected(venue.venue_id) ? 'bg-primary/5' : ''}`}
                        >
                            <div className="flex items-start gap-3">
                                <Checkbox
                                    checked={isSelected(venue.venue_id)}
                                    onCheckedChange={() => toggleSelection(venue.venue_id)}
                                    className="mt-1"
                                />
                                <div>
                                    <div className="font-medium flex items-center gap-2">
                                        {venue.venue_name}
                                        {venue.dept_id && deptMap.get(venue.dept_id) && (
                                            <Badge variant="outline" className="text-xs">
                                                <Building2 className="w-3 h-3 mr-1" />
                                                {deptMap.get(venue.dept_id)}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                        Capacity: {venue.venue_capacity} students
                                        {venue.rows_count && venue.columns_count && (
                                            <span className="ml-2">• {venue.rows_count}×{venue.columns_count} layout</span>
                                        )}
                                    </div>
                                    {venue.venue_address && (
                                        <div className="text-sm text-gray-500">{venue.venue_address}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLayoutEditorVenue(venue)}
                                    title="Configure Seating Layout"
                                >
                                    <Grid3X3 className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEditDialog(venue)}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-red-600 hover:text-red-700"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete Venue</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Are you sure you want to delete "{venue.venue_name}"?
                                                This will affect any scheduled exams at this venue.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDeleteVenue(venue.venue_id)}>
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
                        <DialogTitle>Edit Venue</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div>
                            <Label htmlFor="edit-venue-name">Venue Name *</Label>
                            <Input
                                id="edit-venue-name"
                                value={editVenueName}
                                onChange={(e) => setEditVenueName(e.target.value)}
                                placeholder="Enter venue name"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-venue-dept">Department</Label>
                            <Select value={editVenueDeptId} onValueChange={setEditVenueDeptId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select department (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">No Department (All students)</SelectItem>
                                    {departments.map(dept => (
                                        <SelectItem key={dept.dept_id} value={dept.dept_id}>
                                            {dept.dept_name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground mt-1">
                                Students will be assigned to venues in their department
                            </p>
                        </div>
                        <div>
                            <Label htmlFor="edit-venue-address">Address</Label>
                            <Input
                                id="edit-venue-address"
                                value={editVenueAddress}
                                onChange={(e) => setEditVenueAddress(e.target.value)}
                                placeholder="Enter venue address"
                            />
                        </div>
                        <div>
                            <Label htmlFor="edit-venue-capacity">Capacity</Label>
                            <Input
                                id="edit-venue-capacity"
                                type="number"
                                value={editVenueCapacity}
                                onChange={(e) => setEditVenueCapacity(e.target.value)}
                                placeholder="Enter venue capacity"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleEditVenue} className="flex-1">Update Venue</Button>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <BulkUploadModal
                isOpen={showBulkUpload}
                onClose={() => setShowBulkUpload(false)}
                type="venues"
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
                        <AlertDialogTitle>Delete {selectedCount} Venue(s)</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {selectedCount} selected venue(s)? This action cannot be undone.
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

            {/* Seating Layout Editor Dialog */}
            <Dialog open={!!layoutEditorVenue} onOpenChange={(open) => !open && setLayoutEditorVenue(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    {layoutEditorVenue && (
                        <SeatingLayoutEditor
                            venue={{
                                venue_id: layoutEditorVenue.venue_id,
                                venue_name: layoutEditorVenue.venue_name,
                                rows_count: layoutEditorVenue.rows_count || 6,
                                columns_count: layoutEditorVenue.columns_count || 4,
                                joined_columns: layoutEditorVenue.joined_rows || []
                            }}
                            onSave={() => {
                                setLayoutEditorVenue(null);
                                onRefresh();
                            }}
                        />
                    )}
                </DialogContent>
            </Dialog>
        </Card>
        </div>
    );
};
