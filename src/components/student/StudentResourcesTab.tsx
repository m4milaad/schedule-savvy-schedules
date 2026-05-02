import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Search, Download, Eye, Bookmark, BookmarkCheck, FileText, Video, Presentation, File } from 'lucide-react';
import { format } from 'date-fns';
import logger from '@/lib/logger';


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
  const [activeTab, setActiveTab] = useState<'all' | 'bookmarked'>('all');
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const loadData = async () => {
    try {
      // Get enrolled courses
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('course_id, courses:course_id (course_code)')
        .eq('student_id', studentId)
        .eq('is_active', true);

      const courseList = (enrollments || []).map((e: Record<string, unknown>) => ({
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
    } catch (error: unknown) {
      logger.error('Error loading resources:', error);
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
      logger.error('Error toggling bookmark:', error);
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

  return (
    <div>
      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as 'all' | 'bookmarked')}
        className="w-full"
      >
        <Card className="linear-surface overflow-hidden">
          <CardHeader className="linear-toolbar flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="linear-kicker">Resources</div>
                <CardTitle className="text-base font-semibold">
                  Study Materials
                </CardTitle>
              </div>
              <div className="flex gap-2">
                <div className="linear-pill">
                  <span className="font-medium text-foreground">{resources.length}</span>
                  <span>total</span>
                </div>
                {bookmarkedResources.length > 0 && (
                  <div className="linear-pill border-primary/50 bg-primary/10">
                    <span className="font-medium text-primary">{bookmarkedResources.length}</span>
                    <span>bookmarked</span>
                  </div>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  All:{' '}
                  <span className="font-medium text-foreground">
                    {resources.length}
                  </span>
                </span>
                <span className="hidden sm:inline">•</span>
                <span>
                  Bookmarked:{' '}
                  <span className="font-medium text-foreground">
                    {bookmarkedResources.length}
                  </span>
                </span>
              </div>
              <TabsList className="bg-muted/40 rounded-full h-9 px-1 py-1 w-full sm:w-auto">
                <TabsTrigger
                  value="all"
                  className="rounded-full px-3 py-1 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 sm:flex-none"
                >
                  All Resources ({resources.length})
                </TabsTrigger>
                <TabsTrigger
                  value="bookmarked"
                  className="rounded-full px-3 py-1 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm flex-1 sm:flex-none"
                >
                  Bookmarked ({bookmarkedResources.length})
                </TabsTrigger>
              </TabsList>
            </div>
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
          </CardHeader>

          <CardContent className="p-0">
            <TabsContent value="all" className="mt-0">
              {filteredResources.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="text-sm font-medium">No resources found</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {searchTerm || typeFilter !== 'all' || subjectFilter !== 'all' 
                      ? 'Try adjusting your filters.' 
                      : 'Resources from your enrolled courses will appear here.'}
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="linear-table">
                    <thead>
                      <tr>
                        <th className="linear-th">Resource</th>
                        <th className="linear-th hidden md:table-cell">Type</th>
                        <th className="linear-th hidden lg:table-cell">Course</th>
                        <th className="linear-th hidden lg:table-cell">Size</th>
                        <th className="linear-th hidden xl:table-cell">Date</th>
                        <th className="linear-th text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredResources.map((resource) => (
                        <tr key={resource.id} className="linear-tr">
                          <td className="linear-td">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(resource.resource_type)}
                              <div>
                                <div className="font-medium">{resource.title}</div>
                                {resource.description && (
                                  <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                    {resource.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="linear-td hidden md:table-cell">
                            <Badge className={getTypeBadgeColor(resource.resource_type)}>
                              {resource.resource_type}
                            </Badge>
                          </td>
                          <td className="linear-td hidden lg:table-cell">
                            <Badge variant="outline">{resource.course?.course_code}</Badge>
                          </td>
                          <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                            {formatFileSize(resource.file_size)}
                          </td>
                          <td className="linear-td hidden xl:table-cell text-sm text-muted-foreground">
                            {format(new Date(resource.created_at), 'MMM dd, yyyy')}
                          </td>
                          <td className="linear-td">
                            <div className="flex justify-end gap-1">
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
                              {resource.file_url && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => window.open(resource.file_url, '_blank')}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    asChild
                                  >
                                    <a href={resource.file_url} download>
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="bookmarked" className="mt-0">
              {bookmarkedResources.length === 0 ? (
                <div className="py-14 text-center">
                  <div className="text-sm font-medium">No bookmarked resources</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Click the bookmark icon on any resource to save it here.
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="linear-table">
                    <thead>
                      <tr>
                        <th className="linear-th">Resource</th>
                        <th className="linear-th hidden md:table-cell">Type</th>
                        <th className="linear-th hidden lg:table-cell">Course</th>
                        <th className="linear-th hidden lg:table-cell">Size</th>
                        <th className="linear-th hidden xl:table-cell">Date</th>
                        <th className="linear-th text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookmarkedResources.map((resource) => (
                        <tr key={resource.id} className="linear-tr">
                          <td className="linear-td">
                            <div className="flex items-center gap-2">
                              {getTypeIcon(resource.resource_type)}
                              <div>
                                <div className="font-medium">{resource.title}</div>
                                {resource.description && (
                                  <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                                    {resource.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="linear-td hidden md:table-cell">
                            <Badge className={getTypeBadgeColor(resource.resource_type)}>
                              {resource.resource_type}
                            </Badge>
                          </td>
                          <td className="linear-td hidden lg:table-cell">
                            <Badge variant="outline">{resource.course?.course_code}</Badge>
                          </td>
                          <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                            {formatFileSize(resource.file_size)}
                          </td>
                          <td className="linear-td hidden xl:table-cell text-sm text-muted-foreground">
                            {format(new Date(resource.created_at), 'MMM dd, yyyy')}
                          </td>
                          <td className="linear-td">
                            <div className="flex justify-end gap-1">
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
                              {resource.file_url && (
                                <>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => window.open(resource.file_url, '_blank')}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    asChild
                                  >
                                    <a href={resource.file_url} download>
                                      <Download className="h-4 w-4" />
                                    </a>
                                  </Button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
};