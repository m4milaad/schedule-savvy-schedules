import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FolderOpen, Plus, Trash2, Edit, Download, Eye, FileText, Video, Presentation, File } from 'lucide-react';

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
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [resourceType, setResourceType] = useState('document');
  const [accessLevel, setAccessLevel] = useState('enrolled_students');
  const [fileUrl, setFileUrl] = useState('');

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
    setEditingResource(null);
    setShowForm(false);
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
      const resourceData = {
        teacher_id: teacherId,
        title: title.trim(),
        description: description.trim(),
        course_id: courseId,
        resource_type: resourceType,
        access_level: accessLevel,
        file_url: fileUrl,
        file_name: title.trim(),
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Resources</h2>
          <p className="text-muted-foreground">Upload and manage teaching materials</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Upload Resource
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingResource ? 'Edit Resource' : 'Upload New Resource'}</CardTitle>
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

              <div className="space-y-2">
                <Label htmlFor="fileUrl">File URL (External Link)</Label>
                <Input
                  id="fileUrl"
                  value={fileUrl}
                  onChange={(e) => setFileUrl(e.target.value)}
                  placeholder="https://drive.google.com/... or external file link"
                />
                <p className="text-xs text-muted-foreground">
                  Enter a URL to an externally hosted file (Google Drive, Dropbox, etc.)
                </p>
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
                <Button type="submit">
                  {editingResource ? 'Update Resource' : 'Upload Resource'}
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
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Resources</CardTitle>
          <CardDescription>View and manage all your resources</CardDescription>
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
