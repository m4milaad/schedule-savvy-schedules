import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trash2, Edit, Plus, Upload, Download, FileSpreadsheet, CalendarIcon, CalendarDays } from 'lucide-react';
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import * as XLSX from 'xlsx';

interface Holiday {
  id: string;
  holiday_date: string;
  holiday_name: string;
  description: string | null;
  is_recurring: boolean;
  created_at: string;
  updated_at: string;
}

interface HolidaysManagerProps {
  onHolidaysChange: (holidays: Date[]) => void;
}

const HolidaysManager: React.FC<HolidaysManagerProps> = ({ onHolidaysChange }) => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [formData, setFormData] = useState({
    holiday_name: '',
    description: '',
    is_recurring: false
  });
  const [bulkData, setBulkData] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHolidays();
  }, []);

  useEffect(() => {
    // Convert holidays to Date objects and notify parent
    const holidayDates = holidays.map(holiday => new Date(holiday.holiday_date));
    onHolidaysChange(holidayDates);
  }, [holidays, onHolidaysChange]);

  const fetchHolidays = async () => {
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .order('holiday_date', { ascending: true });

      if (error) {
        toast.error('Failed to fetch holidays: ' + error.message);
        return;
      }

      setHolidays(data || []);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      toast.error('Failed to fetch holidays');
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedDate) {
      toast.error('Please select a date');
      return;
    }

    try {
      const { error } = await supabase
        .from('holidays')
        .insert([{
          holiday_date: selectedDate.toISOString().split('T')[0],
          holiday_name: formData.holiday_name,
          description: formData.description || null,
          is_recurring: formData.is_recurring
        }]);

      if (error) {
        toast.error('Failed to add holiday: ' + error.message);
        return;
      }

      toast.success('Holiday added successfully');
      setIsAddDialogOpen(false);
      setSelectedDate(undefined);
      setFormData({ holiday_name: '', description: '', is_recurring: false });
      fetchHolidays();
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast.error('Failed to add holiday');
    }
  };

  const handleEditHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingHoliday || !selectedDate) return;

    try {
      const { error } = await supabase
        .from('holidays')
        .update({
          holiday_date: selectedDate.toISOString().split('T')[0],
          holiday_name: formData.holiday_name,
          description: formData.description || null,
          is_recurring: formData.is_recurring,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingHoliday.id);

      if (error) {
        toast.error('Failed to update holiday: ' + error.message);
        return;
      }

      toast.success('Holiday updated successfully');
      setIsEditDialogOpen(false);
      setEditingHoliday(null);
      setSelectedDate(undefined);
      setFormData({ holiday_name: '', description: '', is_recurring: false });
      fetchHolidays();
    } catch (error) {
      console.error('Error updating holiday:', error);
      toast.error('Failed to update holiday');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;

    try {
      const { error } = await supabase
        .from('holidays')
        .delete()
        .eq('id', id);

      if (error) {
        toast.error('Failed to delete holiday: ' + error.message);
        return;
      }

      toast.success('Holiday deleted successfully');
      fetchHolidays();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('Failed to delete holiday');
    }
  };

  const openEditDialog = (holiday: Holiday) => {
    setEditingHoliday(holiday);
    setSelectedDate(new Date(holiday.holiday_date));
    setFormData({
      holiday_name: holiday.holiday_name,
      description: holiday.description || '',
      is_recurring: holiday.is_recurring || false
    });
    setIsEditDialogOpen(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Validate and transform data
        const transformedData = jsonData.map((row: any, index) => {
          const holidayDate = row['Holiday Date'] || row['holiday_date'];
          const holidayName = row['Holiday Name'] || row['holiday_name'];
          const description = row['Description'] || row['description'] || '';
          const isRecurring = row['Is Recurring'] || row['is_recurring'] || false;
          
          if (!holidayDate || !holidayName) {
            throw new Error(`Row ${index + 2}: Missing required fields (Holiday Date, Holiday Name)`);
          }
          
          // Parse date
          let parsedDate;
          if (typeof holidayDate === 'number') {
            // Excel date serial number
            parsedDate = new Date((holidayDate - 25569) * 86400 * 1000);
          } else {
            parsedDate = new Date(holidayDate);
          }
          
          if (isNaN(parsedDate.getTime())) {
            throw new Error(`Row ${index + 2}: Invalid date format`);
          }

          return {
            holiday_date: parsedDate.toISOString().split('T')[0],
            holiday_name: holidayName,
            description: description,
            is_recurring: Boolean(isRecurring)
          };
        });
        
        setBulkData(transformedData);
        toast.success(`${transformedData.length} holidays loaded for preview`);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Error parsing file: ' + (error as Error).message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleBulkInsert = async () => {
    if (bulkData.length === 0) {
      toast.error('No data to insert');
      return;
    }

    try {
      const { error } = await supabase
        .from('holidays')
        .insert(bulkData);

      if (error) {
        toast.error('Failed to bulk insert: ' + error.message);
        return;
      }

      toast.success(`Successfully inserted ${bulkData.length} holidays`);
      setBulkData([]);
      setIsBulkUploadDialogOpen(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      fetchHolidays();
    } catch (error) {
      console.error('Error bulk inserting:', error);
      toast.error('Failed to bulk insert');
    }
  };

  const downloadExcelTemplate = () => {
    const templateData = [
      {
        'Holiday Date': '2024-01-26',
        'Holiday Name': 'Republic Day',
        'Description': 'National holiday celebrating the adoption of the Constitution of India',
        'Is Recurring': true
      },
      {
        'Holiday Date': '2024-12-25',
        'Holiday Name': 'Christmas Day',
        'Description': 'Christian holiday celebrating the birth of Jesus Christ',
        'Is Recurring': true
      }
    ];
    
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template');
    XLSX.writeFile(workbook, 'holidays_template.xlsx');
    toast.success('Template downloaded successfully');
  };

  const downloadCurrentData = () => {
    if (holidays.length === 0) {
      toast.error('No data to download');
      return;
    }

    const exportData = holidays.map(holiday => ({
      'Holiday Date': holiday.holiday_date,
      'Holiday Name': holiday.holiday_name,
      'Description': holiday.description || '',
      'Is Recurring': holiday.is_recurring
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Holidays');
    XLSX.writeFile(workbook, 'holidays_data.xlsx');
    toast.success('Data downloaded successfully');
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Holidays Management
            </CardTitle>
            <CardDescription>
              Manage holidays that will be excluded from exam scheduling
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Bulk Upload
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Bulk Upload Holidays</DialogTitle>
                  <DialogDescription>
                    Upload an Excel file with columns: Holiday Date, Holiday Name, Description, Is Recurring
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button onClick={downloadExcelTemplate} variant="outline">
                      <FileSpreadsheet className="w-4 h-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="excel_file">Select Excel File</Label>
                    <Input
                      id="excel_file"
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={handleFileUpload}
                      ref={fileInputRef}
                    />
                  </div>
                  {bulkData.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label>Preview ({bulkData.length} holidays)</Label>
                        <Button onClick={handleBulkInsert}>
                          Insert All Holidays
                        </Button>
                      </div>
                      <div className="max-h-60 overflow-y-auto border rounded">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Recurring</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {bulkData.slice(0, 10).map((row, index) => (
                              <TableRow key={index}>
                                <TableCell>{new Date(row.holiday_date).toLocaleDateString()}</TableCell>
                                <TableCell>{row.holiday_name}</TableCell>
                                <TableCell>{row.description}</TableCell>
                                <TableCell>{row.is_recurring ? 'Yes' : 'No'}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {bulkData.length > 10 && (
                          <div className="p-2 text-center text-gray-500">
                            ... and {bulkData.length - 10} more holidays
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={downloadCurrentData} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Download Excel
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
                  <DialogDescription>
                    Add a holiday that will be excluded from exam scheduling
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleAddHoliday} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Holiday Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !selectedDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={selectedDate}
                          onSelect={setSelectedDate}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="holiday_name">Holiday Name</Label>
                    <Input
                      id="holiday_name"
                      value={formData.holiday_name}
                      onChange={(e) => setFormData({ ...formData, holiday_name: e.target.value })}
                      required
                      placeholder="e.g., Republic Day"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of the holiday"
                      rows={3}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_recurring"
                      checked={formData.is_recurring}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked as boolean })}
                    />
                    <Label htmlFor="is_recurring">Recurring annually</Label>
                  </div>
                  <Button type="submit" className="w-full">Add Holiday</Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Holiday Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No holidays configured. Add holidays to exclude them from exam scheduling.
                  </TableCell>
                </TableRow>
              ) : (
                holidays.map((holiday) => (
                  <TableRow key={holiday.id}>
                    <TableCell className="font-medium">
                      {new Date(holiday.holiday_date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{holiday.holiday_name}</TableCell>
                    <TableCell>{holiday.description || '-'}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        holiday.is_recurring ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {holiday.is_recurring ? 'Recurring' : 'One-time'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditDialog(holiday)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteHoliday(holiday.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Holiday</DialogTitle>
            <DialogDescription>
              Update the holiday information
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditHoliday} className="space-y-4">
            <div className="space-y-2">
              <Label>Holiday Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_holiday_name">Holiday Name</Label>
              <Input
                id="edit_holiday_name"
                value={formData.holiday_name}
                onChange={(e) => setFormData({ ...formData, holiday_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description (Optional)</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="edit_is_recurring"
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked as boolean })}
              />
              <Label htmlFor="edit_is_recurring">Recurring annually</Label>
            </div>
            <Button type="submit" className="w-full">Update Holiday</Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default HolidaysManager;