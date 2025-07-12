import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit2, Trash2, Upload } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Venue } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";

interface VenuesTabProps {
  venues: Venue[];
  onRefresh: () => void;
}

export const VenuesTab = ({ venues, onRefresh }: VenuesTabProps) => {
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');
  const [newVenueCapacity, setNewVenueCapacity] = useState('50');
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);
  const [editVenueName, setEditVenueName] = useState('');
  const [editVenueAddress, setEditVenueAddress] = useState('');
  const [editVenueCapacity, setEditVenueCapacity] = useState('');
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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
          venue_capacity: parseInt(newVenueCapacity) || 50
        });

      if (error) throw error;

      toast.success('Venue added successfully');
      setNewVenueName('');
      setNewVenueAddress('');
      setNewVenueCapacity('50');
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
          venue_capacity: parseInt(editVenueCapacity) || 50
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
      const { error } = await supabase
        .from('venues')
        .insert(data);

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
    setIsEditDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Venues ({venues.length})</CardTitle>
          <div className="flex gap-2">
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
                    <Label htmlFor="venue-name">Venue Name</Label>
                    <Input
                      id="venue-name"
                      value={newVenueName}
                      onChange={(e) => setNewVenueName(e.target.value)}
                      placeholder="Enter venue name"
                    />
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
                  <div className="flex gap-2">
                    <Button onClick={handleAddVenue} className="flex-1">Add Venue</Button>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="flex-1">Cancel</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {venues.map((venue) => (
            <div key={venue.venue_id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{venue.venue_name}</div>
                <div className="text-sm text-gray-500">
                  Capacity: {venue.venue_capacity} students
                </div>
                {venue.venue_address && (
                  <div className="text-sm text-gray-500">{venue.venue_address}</div>
                )}
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
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Venue</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{venue.venue_name}"? This will affect any scheduled exams at this venue.
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
          ))}
        </div>
      </CardContent>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Venue</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-venue-name">Venue Name</Label>
              <Input
                id="edit-venue-name"
                value={editVenueName}
                onChange={(e) => setEditVenueName(e.target.value)}
                placeholder="Enter venue name"
              />
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
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">Cancel</Button>
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
    </Card>
  );
};