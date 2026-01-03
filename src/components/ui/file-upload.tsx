import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, FileText, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  bucket: string;
  path: string;
  accept?: string;
  maxSize?: number; // in MB
  onUploadComplete: (url: string, fileName: string, fileSize: number) => void;
  onError?: (error: string) => void;
  className?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  bucket,
  path,
  accept = '*',
  maxSize = 10,
  onUploadComplete,
  onError,
  className,
}) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      onError?.(`File size must be less than ${maxSize}MB`);
      return;
    }

    setUploading(true);
    setFileName(file.name);
    setProgress(0);
    setUploadComplete(false);

    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const uniqueFileName = `${path}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Simulate progress (Supabase doesn't provide upload progress)
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(uniqueFileName, file);

      clearInterval(progressInterval);

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(uniqueFileName);

      setProgress(100);
      setUploadComplete(true);
      onUploadComplete(urlData.publicUrl, file.name, file.size);
    } catch (error: any) {
      console.error('Upload error:', error);
      onError?.(error.message || 'Failed to upload file');
      setFileName(null);
    } finally {
      setUploading(false);
    }
  };

  const handleClear = () => {
    setFileName(null);
    setProgress(0);
    setUploadComplete(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          uploading ? 'border-primary bg-primary/5' : 'hover:border-primary',
          uploadComplete && 'border-green-500 bg-green-50 dark:bg-green-950/20'
        )}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        {uploading ? (
          <div className="space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Uploading {fileName}...</p>
            <Progress value={progress} className="h-2" />
          </div>
        ) : uploadComplete ? (
          <div className="flex items-center justify-center gap-2">
            <Check className="h-8 w-8 text-green-500" />
            <div className="text-left">
              <p className="font-medium text-green-600">{fileName}</p>
              <p className="text-xs text-muted-foreground">Upload complete</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-muted-foreground">
              Max file size: {maxSize}MB
            </p>
          </>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};
