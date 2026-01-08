
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Upload, Download } from 'lucide-react';
import { toast } from "sonner";
import { createWorkbook, addWorksheetFromJson, downloadWorkbook, readExcelFile } from '@/utils/excelUtils';

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: 'schools' | 'departments' | 'courses' | 'teachers' | 'venues' | 'sessions' | 'holidays' | 'students';
  onUpload: (data: any[]) => Promise<void>;
}

const BulkUploadModal = ({ isOpen, onClose, type, onUpload }: BulkUploadModalProps) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!isOpen) return null;

  const getTemplate = () => {
    const templates = {
      schools: [{ school_name: 'Example School' }],
      departments: [{ dept_name: 'Example Department', school_id: 'school-uuid-here' }],
      courses: [{ 
        course_name: 'Example Course', 
        course_code: 'EX101', 
        course_credits: 3, 
        course_type: 'Theory', 
        dept_id: 'dept-uuid-here' 
      }],
      teachers: [{ 
        teacher_name: 'John Doe', 
        teacher_email: 'john@example.com', 
        contact_no: '1234567890', 
        designation: 'Professor', 
        dept_id: 'dept-uuid-here' 
      }],
      venues: [{ venue_name: 'Main Hall', venue_address: '123 Main St', venue_capacity: 100 }],
      sessions: [{ session_name: '2024-2025', session_year: 2024 }],
      holidays: [{ 
        holiday_name: 'New Year', 
        holiday_date: '2024-01-01', 
        holiday_description: 'New Year Day', 
        is_recurring: true 
      }],
      students: [{ 
        student_name: 'John Doe', 
        student_enrollment_no: 'CUK2024001', 
        student_email: 'john.doe@cukashmir.ac.in', 
        student_address: '123 Main St, Srinagar', 
        dept_id: 'dept-uuid-here',
        student_year: 1,
        semester: 1,
        abc_id: '12345678'
      }]
    };
    return templates[type];
  };

  const downloadTemplate = async () => {
    const template = getTemplate();
    const workbook = createWorkbook();
    addWorksheetFromJson(workbook, type, template as Record<string, any>[]);
    await downloadWorkbook(workbook, `${type}_template.xlsx`);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      const jsonData = await readExcelFile(file);

      if (jsonData.length === 0) {
        toast.error('The file appears to be empty');
        return;
      }

      await onUpload(jsonData);
      toast.success(`Successfully uploaded ${jsonData.length} ${type}`);
      onClose();
      setFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file. Please check the format.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] backdrop-blur-sm">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Bulk Upload {type.charAt(0).toUpperCase() + type.slice(1)}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Download Template</Label>
            <Button 
              variant="outline" 
              className="w-full mt-2" 
              onClick={downloadTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Excel Template
            </Button>
          </div>
          
          <div>
            <Label htmlFor="file-upload">Upload Excel/CSV File</Label>
            <Input
              id="file-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
              className="mt-2"
            />
          </div>

          {file && (
            <div className="text-sm text-gray-600">
              Selected: {file.name}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || uploading}
              className="flex-1"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BulkUploadModal;
