import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FolderOpen, Plus, Trash2, Edit, Download, Eye, FileText, Video, Presentation, File, Upload, X, Check } from 'lucide-react';

interface ResourcesTabProps {
  teacherId: string;
  courses: any[];
}

interface Resource {
  id: string;
  title: string;
  description: string;
  course_id: string;
  resource_type: string;
  access_level: string;
  file_url: string;
  file_name: string;
  file_size: number;
  file_type: string;
  download_count: number;
  view_count: number;
  is_active: boolean;
  created_at: string;
  course?: {
    course_code: string;
    course_name: string;
  };
}

export const ResourcesTab: React.FC<ResourcesTabProps> = ({ teacherId, courses }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [resourceType, setResourceType] = useState('document');
  const [accessLevel, setAccessLevel] = useState('enrolled_students');
  const [fileUrl, setFileUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadComplete, setUploadComplete] = useState(false);

  useEffect(() => {
    loadResources();
  }, [teacherId]);

  const loadResources = async () => {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select(`
          *,
          courses:course_id (course_code, course_name)
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResources(data || []);
    } catch (error: any) {
      console.error('Error loading resources:', error);
      toast({
        title: 'Error',
        description: 'Failed to load resources',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCourseId('');
    setResourceType('document');
    setAccessLevel('enrolled_students');
    setFileUrl('');
    setFileName('');
    setFileSize(0);
    setSelectedFile(null);
    setUploadComplete(false);
    setEditingResource(null);
    setShowForm(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit for resources
        toast({
          title: 'Error',
          description: 'File size must be less than 50MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
      setFileSize(file.size);
      // Auto-detect resource type based on file extension
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (['pdf', 'doc', 'docx'].includes(ext || '')) {
        setResourceType('document');
      } else if (['ppt', 'pptx'].includes(ext || '')) {
        setResourceType('presentation');
      } else if (['mp4', 'mov', 'avi', 'webm'].includes(ext || '')) {
        setResourceType('video_tutorial');
      }
    }
  };

  const uploadFile = async (): Promise<string | null> => {
    if (!selectedFile) return null;

    setUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const uniqueFileName = `${teacherId}/${courseId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90));
      }, 100);

      const { data, error } = await supabase.storage
        .from('resources')
        .upload(uniqueFileName, selectedFile);

      clearInterval(progressInterval);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('resources')
        .getPublicUrl(uniqueFileName);

      setUploadProgress(100);
      setUploadComplete(true);
      return urlData.publicUrl;
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: 'Upload Error',
        description: error.message || 'Failed to upload file',
        variant: 'destructive',
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !courseId) {
      toast({
        title: 'Error',
        description: 'Title and course are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      let finalFileUrl = fileUrl;
      let finalFileName = fileName;
      let finalFileSize = fileSize;

      // Upload file if selected
      if (selectedFile && !uploadComplete) {
        const uploadedUrl = await uploadFile();
        if (uploadedUrl) {
          finalFileUrl = uploadedUrl;
          finalFileName = selectedFile.name;
          finalFileSize = selectedFile.size;
        } else {
          return; // Upload failed
        }
      }

      const resourceData = {
        teacher_id: teacherId,
        title: title.trim(),
        description: description.trim(),
        course_id: courseId,
        resource_type: resourceType,
        access_level: accessLevel,
        file_url: finalFileUrl,
        file_name: finalFileName || title.trim(),
        file_size: finalFileSize,
        file_type: selectedFile?.type || '',
      };

      if (editingResource) {
        const { error } = await supabase
          .from('resources')
          .update(resourceData)
          .eq('id', editingResource.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Resource updated successfully' });
      } else {
        const { error } = await supabase
          .from('resources')
          .insert(resourceData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Resource created successfully' });
      }

      resetForm();
      loadResources();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save resource',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource);
    setTitle(resource.title);
    setDescription(resource.description || '');
    setCourseId(resource.course_id);
    setResourceType(resource.resource_type);
    setAccessLevel(resource.access_level);
    setFileUrl(resource.file_url || '');
    setFileName(resource.file_name || '');
    setFileSize(resource.file_size || 0);
    setShowForm(true);
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm('Are you sure you want to delete this resource?')) return;

    try {
      const { error } = await supabase
        .from('resources')
        .delete()
        .eq('id', resourceId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Resource deleted successfully' });
      loadResources();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete resource',
        variant: 'destructive',
      });
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case 'lecture_notes':
        return <FileText className="h-5 w-5" />;
      case 'presentation':
        return <Presentation className="h-5 w-5" />;
      case 'video_tutorial':
        return <Video className="h-5 w-5" />;
      default:
        return <File className="h-5 w-5" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {showForm && (
        <Card className="linear-surface overflow-hidden">
          <CardHeader className="linear-toolbar flex flex-col gap-3">
            <div className="linear-kicker">Upload</div>
            <CardTitle className="text-base font-semibold">{editingResource ? 'Edit Resource' : 'Upload New Resource'}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Resource Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter resource title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="course">Subject *</Label>
                  <Select value={courseId} onValueChange={setCourseId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course.course_id} value={course.course_id}>
                          {course.course_code} - {course.course_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Resource Type</Label>
                  <Select value={resourceType} onValueChange={setResourceType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lecture_notes">Lecture Notes</SelectItem>
                      <SelectItem value="presentation">Presentation</SelectItem>
                      <SelectItem value="video_tutorial">Video Tutorial</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="access">Access Level</Label>
                  <Select value={accessLevel} onValueChange={setAccessLevel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_students">All Students</SelectItem>
                      <SelectItem value="enrolled_students">Enrolled Students Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="space-y-2">
                <Label>Upload File</Label>
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    uploading ? 'border-primary bg-primary/5' : uploadComplete ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : 'hover:border-primary'
                  }`}
                  onClick={() => !uploading && fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
                      <p className="text-sm text-muted-foreground">Uploading {fileName}...</p>
                      <Progress value={uploadProgress} className="h-2" />
                    </div>
                  ) : selectedFile || uploadComplete ? (
                    <div className="flex items-center justify-center gap-2">
                      {uploadComplete ? (
                        <Check className="h-8 w-8 text-green-500" />
                      ) : (
                        <FileText className="h-8 w-8 text-primary" />
                      )}
                      <div className="text-left">
                        <p className={`font-medium ${uploadComplete ? 'text-green-600' : ''}`}>{fileName}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(fileSize)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                          setFileName('');
                          setFileSize(0);
                          setUploadComplete(false);
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
                        PDF, DOC, PPT, MP4, etc. (Max 50MB)
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov,.avi,.webm,.txt,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Or use external URL */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or use external URL</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileUrl">External URL</Label>
                <Input
                  id="fileUrl"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or external file link"
                  disabled={!!selectedFile}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter resource description"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={uploading}>
                  {uploading ? 'Uploading...' : editingResource ? 'Update Resource' : 'Upload Resource'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Resources List */}
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Library</div>
              <CardTitle className="text-base font-semibold">Uploaded Resources</CardTitle>
              <CardDescription>View and manage all your resources</CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {showForm ? 'Cancel' : 'Upload Resource'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {resources.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No resources uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {resources.map((resource) => (
                <div
                  key={resource.id}
                  className={`p-4 border rounded-lg ${!resource.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-muted rounded-lg">
                      {getResourceIcon(resource.resource_type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{resource.title}</h3>
                        <Badge variant="outline">
                          {resource.course?.course_code}
                        </Badge>
                        <Badge variant="secondary">
                          {resource.resource_type.replace('_', ' ')}
                        </Badge>
                      </div>
                      {resource.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {resource.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Access: {resource.access_level.replace('_', ' ')}</span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {resource.view_count} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3 w-3" /> {resource.download_count} downloads
                        </span>
                        {resource.file_size > 0 && (
                          <span>{formatFileSize(resource.file_size)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {resource.file_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(resource.file_url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(resource)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(resource.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
