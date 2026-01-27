import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, Search, Download, Eye, Bookmark, BookmarkCheck, 
  FileText, Video, Presentation, File, FolderOpen 
} from 'lucide-react';
import { format } from 'date-fns';

interface StudentResourcesTabProps {
  studentId: string;
}

interface Resource {
  id: string;
  title: string;
  description: string;
  resource_type: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
  course?: {
    course_code: string;
    course_name: string;
  };
  isBookmarked?: boolean;
}

export const StudentResourcesTab: React.FC<StudentResourcesTabProps> = ({ studentId }) => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookmarkedIds, setBookmarkedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [courses, setCourses] = useState<{ course_id: string; course_code: string }[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [studentId]);

  const loadData = async () => {
    try {
      // Get enrolled courses
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('course_id, courses:course_id (course_code)')
        .eq('student_id', studentId)
        .eq('is_active', true);

      const courseList = (enrollments || []).map((e: any) => ({
        course_id: e.course_id,
        course_code: e.courses?.course_code
      }));
      setCourses(courseList);

      const courseIds = courseList.map(c => c.course_id);

      if (courseIds.length === 0) {
        setResources([]);
        setLoading(false);
        return;
      }

      // Get resources for enrolled courses
      const { data: resourcesData, error } = await supabase
        .from('resources')
        .select(`
          *,
          courses:course_id (course_code, course_name)
        `)
        .in('course_id', courseIds)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get bookmarks
      const { data: bookmarks } = await supabase
        .from('resource_bookmarks')
        .select('resource_id')
        .eq('student_id', studentId);

      const bookmarkSet = new Set((bookmarks || []).map(b => b.resource_id));
      setBookmarkedIds(bookmarkSet);

      const resourcesWithBookmarks = (resourcesData || []).map(r => ({
        ...r,
        course: r.courses,
        isBookmarked: bookmarkSet.has(r.id)
      }));

      setResources(resourcesWithBookmarks);
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

  const toggleBookmark = async (resourceId: string) => {
    const isCurrentlyBookmarked = bookmarkedIds.has(resourceId);

    try {
      if (isCurrentlyBookmarked) {
        await supabase
          .from('resource_bookmarks')
          .delete()
          .eq('student_id', studentId)
          .eq('resource_id', resourceId);

        setBookmarkedIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(resourceId);
          return newSet;
        });
      } else {
        await supabase
          .from('resource_bookmarks')
          .insert({ student_id: studentId, resource_id: resourceId });

        setBookmarkedIds(prev => new Set([...prev, resourceId]));
      }

      setResources(prev => prev.map(r => 
        r.id === resourceId ? { ...r, isBookmarked: !isCurrentlyBookmarked } : r
      ));

      toast({
        title: isCurrentlyBookmarked ? 'Bookmark removed' : 'Bookmarked',
        description: isCurrentlyBookmarked ? 'Resource removed from bookmarks' : 'Resource added to bookmarks',
      });
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video': return <Video className="h-4 w-4" />;
      case 'presentation': return <Presentation className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <File className="h-4 w-4" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'video': return 'bg-red-500';
      case 'presentation': return 'bg-orange-500';
      case 'document': return 'bg-blue-500';
      case 'lecture_notes': return 'bg-green-500';
      default: return 'bg-muted';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const filteredResources = resources.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         r.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || r.resource_type?.toLowerCase() === typeFilter;
    const matchesSubject = subjectFilter === 'all' || r.course?.course_code === subjectFilter;
    return matchesSearch && matchesType && matchesSubject;
  });

  const bookmarkedResources = resources.filter(r => r.isBookmarked);

  const resourceTypes = [...new Set(resources.map(r => r.resource_type))].filter(Boolean);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const ResourceCard = ({ resource }: { resource: Resource }) => (
    <Card key={resource.id} className="linear-surface overflow-hidden">
      <CardContent className="pt-4">
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            {getTypeIcon(resource.resource_type)}
            <Badge variant="outline">{resource.course?.course_code}</Badge>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleBookmark(resource.id)}
          >
            {resource.isBookmarked ? (
              <BookmarkCheck className="h-4 w-4 text-primary" />
            ) : (
              <Bookmark className="h-4 w-4" />
            )}
          </Button>
        </div>
        <h3 className="font-semibold mb-1">{resource.title}</h3>
        {resource.description && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {resource.description}
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Badge className={getTypeBadgeColor(resource.resource_type)}>
            {resource.resource_type}
          </Badge>
          <span>{formatFileSize(resource.file_size)}</span>
          <span>{format(new Date(resource.created_at), 'MMM dd')}</span>
        </div>
        <div className="flex gap-2">
          {resource.file_url && (
            <>
              <Button size="sm" variant="outline" className="flex-1" onClick={() => window.open(resource.file_url, '_blank')}>
                <Eye className="h-4 w-4 mr-1" />
                Preview
              </Button>
              <Button size="sm" className="flex-1" asChild>
                <a href={resource.file_url} download>
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </a>
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Resources ({resources.length})</TabsTrigger>
          <TabsTrigger value="bookmarked">Bookmarked ({bookmarkedResources.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          {/* Filters */}
          <Card className="mb-4 linear-surface overflow-hidden">
            <CardContent className="pt-4">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search resources..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {resourceTypes.map(type => (
                      <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    {courses.map(c => (
                      <SelectItem key={c.course_id} value={c.course_code}>{c.course_code}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {filteredResources.length === 0 ? (
            <Card className="linear-surface overflow-hidden">
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No resources found</p>
                  <p className="text-sm">Resources from your enrolled courses will appear here</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredResources.map(resource => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookmarked">
          {bookmarkedResources.length === 0 ? (
            <Card className="linear-surface overflow-hidden">
              <CardContent className="py-8">
                <div className="text-center text-muted-foreground">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No bookmarked resources</p>
                  <p className="text-sm">Click the bookmark icon on any resource to save it here</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bookmarkedResources.map(resource => (
                <ResourceCard key={resource.id} resource={resource} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};