import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit2, Trash2, Upload } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Holiday } from "@/types/examSchedule";
import BulkUploadModal from "./BulkUploadModal";

interface HolidaysTabProps {
  holidays: Holiday[];
  onRefresh: () => void;
}

export const HolidaysTab = ({ holidays, onRefresh }: HolidaysTabProps) => {
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayDescription, setNewHolidayDescription] = useState('');
  const [newHolidayRecurring, setNewHolidayRecurring] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [editHolidayName, setEditHolidayName] = useState('');
  const [editHolidayDate, setEditHolidayDate] = useState('');
  const [editHolidayDescription, setEditHolidayDescription] = useState('');
  const [editHolidayRecurring, setEditHolidayRecurring] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const handleAddHoliday = async () => {
    if (!newHolidayName.trim() || !newHolidayDate) {
      toast.error('Please fill in required fields (name and date)');
      return;
    }

    try {
      const { error } = await supabase
        .from('holidays')
        .insert({ 
          holiday_name: newHolidayName.trim(),
          holiday_date: newHolidayDate,
          holiday_description: newHolidayDescription.trim() || null,
          is_recurring: newHolidayRecurring
        });

      if (error) throw error;

      toast.success('Holiday added successfully');
      setNewHolidayName('');
      setNewHolidayDate('');
      setNewHolidayDescription('');
      setNewHolidayRecurring(false);
      setIsAddDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast.error('Failed to add holiday');
    }
  };

  const handleEditHoliday = async () => {
    if (!editingHoliday || !editHolidayName.trim() || !editHolidayDate) {
      toast.error('Please fill in required fields (name and date)');
      return;
    }

    try {
      const { error } = await supabase
        .from('holidays')
        .update({ 
          holiday_name: editHolidayName.trim(),
          holiday_date: editHolidayDate,
          holiday_description: editHolidayDescription.trim() || null,
          is_recurring: editHolidayRecurring
        })
        .eq('holiday_id', editingHoliday.id);

      if (error) throw error;

      toast.success('Holiday updated successfully');
      setEditingHoliday(null);
      setIsEditDialogOpen(false);
      onRefresh();
    } catch (error) {
      console.error('Error updating holiday:', error);
      toast.error('Failed to update holiday');
    }
  };

  const handleDeleteHoliday = async (holidayId: string) => {
    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('holiday_id', holidayId);

      if (error) throw error;

      toast.success('Holiday deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    }
  };

  const handleBulkUpload = async (data: any[]) => {
    try {
      const { error } = await supabase
        .from('holidays')
        .insert(data);

      if (error) throw error;
      onRefresh();
    } catch (error) {
      console.error('Bulk upload error:', error);
      throw error;
    }
  };

  const openEditDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setEditHolidayName(holiday.holiday_name);
    setEditHolidayDate(holiday.holiday_date);
    setEditHolidayDescription(holiday.description || '');
    setEditHolidayRecurring(holiday.is_recurring || false);
    setIsEditDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Holidays ({holidays.length})</CardTitle>
          <div className="flex gap-2">
            <Button onClick={() => setShowBulkUpload(true)} variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Holiday
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Holiday</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="holiday-name">Holiday Name</Label>
                    <Input
                      id="holiday-name"
                      value={newHolidayName}
                      onChange={(e) => setNewHolidayName(e.target.value)}
                      placeholder="Enter holiday name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="holiday-date">Date</Label>
                    <Input
                      id="holiday-date"
                      type="date"
                      value={newHolidayDate}
                      onChange={(e) => setNewHolidayDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="holiday-description">Description</Label>
                    <Input
                      id="holiday-description"
                      value={newHolidayDescription}
                      onChange={(e) => setNewHolidayDescription(e.target.value)}
                      placeholder="Enter description (optional)"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="holiday-recurring"
                      checked={newHolidayRecurring}
                      onCheckedChange={(checked) => setNewHolidayRecurring(checked as boolean)}
                    />
                    <Label htmlFor="holiday-recurring">Recurring holiday</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddHoliday} className="flex-1">Add Holiday</Button>
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
          {holidays.map((holiday) => (
            <div key={holiday.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <div className="font-medium">{holiday.holiday_name}</div>
                <div className="text-sm text-gray-500">
                  {new Date(holiday.holiday_date).toLocaleDateString()}
                  {holiday.is_recurring && ' (Recurring)'}
                </div>
                {holiday.description && (
                  <div className="text-sm text-gray-500">{holiday.description}</div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(holiday)}
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
                      <AlertDialogTitle>Delete Holiday</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete "{holiday.holiday_name}"?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteHoliday(holiday.id)}>
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
            <DialogTitle>Edit Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-holiday-name">Holiday Name</Label>
              <Input
                id="edit-holiday-name"
                value={editHolidayName}
                onChange={(e) => setEditHolidayName(e.target.value)}
                placeholder="Enter holiday name"
              />
            </div>
            <div>
              <Label htmlFor="edit-holiday-date">Date</Label>
              <Input
                id="edit-holiday-date"
                type="date"
                value={editHolidayDate}
                onChange={(e) => setEditHolidayDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="edit-holiday-description">Description</Label>
              <Input
                id="edit-holiday-description"
                value={editHolidayDescription}
                onChange={(e) => setEditHolidayDescription(e.target.value)}
                placeholder="Enter description (optional)"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit-holiday-recurring"
                checked={editHolidayRecurring}
                onCheckedChange={(checked) => setEditHolidayRecurring(checked as boolean)}
              />
              <Label htmlFor="edit-holiday-recurring">Recurring holiday</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleEditHoliday} className="flex-1">Update Holiday</Button>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">Cancel</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <BulkUploadModal
        isOpen={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        type="holidays"
        onUpload={handleBulkUpload}
      />
    </Card>
  );
};