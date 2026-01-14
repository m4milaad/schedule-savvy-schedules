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
import { Plus, Edit2, Trash2, Upload, Building2, Database } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Venue, Department } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";
import { useBulkSelection } from "@/hooks/useBulkSelection";
import { BulkActionsBar } from "@/components/ui/bulk-actions-bar";
import { generateDummyVenues } from "@/utils/dummyVenueData";

interface VenuesTabProps {
    venues: Venue[];
    onRefresh: () => void;
    userDeptId?: string | null;
}

export const VenuesTab = ({ venues, onRefresh, userDeptId }: VenuesTabProps) => {
    const [departments, setDepartments] = useState<Department[]>([]);
    const [newVenueName, setNewVenueName] = useState('');
    const [newVenueAddress, setNewVenueAddress] = useState('');
    const [newVenueRows, setNewVenueRows] = useState('4');
    const [newVenueColumns, setNewVenueColumns] = useState('6');
    const [newVenueDeptId, setNewVenueDeptId] = useState<string>('');
    const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
    const [editVenueName, setEditVenueName] = useState('');
    const [editVenueAddress, setEditVenueAddress] = useState('');
    const [editVenueRows, setEditVenueRows] = useState('4');
    const [editVenueColumns, setEditVenueColumns] = useState('6');
    const [editVenueDeptId, setEditVenueDeptId] = useState<string>('');
    const [showBulkUpload, setShowBulkUpload] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [generatingDummy, setGeneratingDummy] = useState(false);

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

        const rows = parseInt(newVenueRows) || 4;
        const columns = parseInt(newVenueColumns) || 6;
        const capacity = rows * columns;

        try {
            const { error } = await supabase
                .from('venues')
                .insert({
                    venue_name: newVenueName.trim(),
                    venue_address: newVenueAddress.trim() || null,
                    venue_capacity: capacity,
                    rows_count: rows,
                    columns_count: columns,
                    dept_id: newVenueDeptId || null
                });

            if (error) throw error;

            toast.success('Venue added successfully');
            setNewVenueName('');
            setNewVenueAddress('');
            setNewVenueRows('4');
            setNewVenueColumns('6');
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

        const rows = parseInt(editVenueRows) || 4;
        const columns = parseInt(editVenueColumns) || 6;
        const capacity = rows * columns;

        try {
            const { error } = await supabase
                .from('venues')
                .update({
                    venue_name: editVenueName.trim(),
                    venue_address: editVenueAddress.trim() || null,
                    venue_capacity: capacity,
                    rows_count: rows,
                    columns_count: columns,
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
        setEditVenueRows((venue.rows_count || 4).toString());
        setEditVenueColumns((venue.columns_count || 6).toString());
        setEditVenueDeptId(venue.dept_id || '');
        setIsEditDialogOpen(true);
    };

    // Use filtered venues list for display
    const filteredVenues = filteredVenuesList;

    const handleGenerateDummyVenues = async () => {
        setGeneratingDummy(true);
        try {
            const result = await generateDummyVenues(userDeptId || undefined);
            if (result.success) {
                toast.success(`Generated ${result.count} dummy venues for testing`);
                onRefresh();
            } else {
                toast.error(result.error || 'Failed to generate venues');
            }
        } catch (error: any) {
            toast.error(error.message || 'Failed to generate venues');
        } finally {
            setGeneratingDummy(false);
        }
    };

    return (
        <div className="space-y-6">
        <Card className="admin-surface">
            <CardHeader className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg font-bold">
                    Venues ({filteredVenues.length})
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                    {!userDeptId && (
                        <Button 
                            onClick={handleGenerateDummyVenues} 
                            variant="outline" 
                            size="sm"
                            disabled={generatingDummy}
                        >
                            <Database className="w-4 h-4 mr-2" />
                            {generatingDummy ? 'Generating...' : 'Add Test Venues'}
                        </Button>
                    )}
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
                                    <Select value={newVenueDeptId || "none"} onValueChange={(val) => setNewVenueDeptId(val === "none" ? "" : val)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select department (optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Department (All students)</SelectItem>
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="venue-rows">Rows</Label>
                                        <Input
                                            id="venue-rows"
                                            type="number"
                                            min="1"
                                            value={newVenueRows}
                                            onChange={(e) => setNewVenueRows(e.target.value)}
                                            placeholder="4"
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="venue-columns">Columns</Label>
                                        <Input
                                            id="venue-columns"
                                            type="number"
                                            min="1"
                                            value={newVenueColumns}
                                            onChange={(e) => setNewVenueColumns(e.target.value)}
                                            placeholder="6"
                                        />
                                    </div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg">
                                    <p className="text-sm text-muted-foreground">
                                        Total Capacity: <span className="font-bold text-foreground">{(parseInt(newVenueRows) || 4) * (parseInt(newVenueColumns) || 6)} seats</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Calculated as Rows × Columns
                                    </p>
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
                            className={`admin-row flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-2 animate-fade-in ${isSelected(venue.venue_id) ? 'bg-primary/5' : ''}`}
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
                                    <div className="text-sm text-foreground/70">
                                        Capacity: {venue.venue_capacity} students
                                        {venue.rows_count && venue.columns_count && (
                                            <span className="ml-2">• {venue.rows_count}×{venue.columns_count} layout</span>
                                        )}
                                    </div>
                                    {venue.venue_address && (
                                        <div className="text-sm text-foreground/70">{venue.venue_address}</div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
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
                            <Select value={editVenueDeptId || "none"} onValueChange={(val) => setEditVenueDeptId(val === "none" ? "" : val)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select department (optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">No Department (All students)</SelectItem>
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
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="edit-venue-rows">Rows</Label>
                                <Input
                                    id="edit-venue-rows"
                                    type="number"
                                    min="1"
                                    value={editVenueRows}
                                    onChange={(e) => setEditVenueRows(e.target.value)}
                                    placeholder="4"
                                />
                            </div>
                            <div>
                                <Label htmlFor="edit-venue-columns">Columns</Label>
                                <Input
                                    id="edit-venue-columns"
                                    type="number"
                                    min="1"
                                    value={editVenueColumns}
                                    onChange={(e) => setEditVenueColumns(e.target.value)}
                                    placeholder="6"
                                />
                            </div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                Total Capacity: <span className="font-bold text-foreground">{(parseInt(editVenueRows) || 4) * (parseInt(editVenueColumns) || 6)} seats</span>
                            </p>
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
        </Card>
        </div>
    );
};
