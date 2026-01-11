import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell, Search, Eye, Download, AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface StudentNoticesTabProps {
  studentId: string;
  studentDeptId?: string;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  expiry_date: string | null;
  views_count?: number;
  teacher?: {
    full_name: string;
  };
  isRead?: boolean;
}

export const StudentNoticesTab: React.FC<StudentNoticesTabProps> = ({ studentId, studentDeptId }) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [readNotices, setReadNotices] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedNotice, setSelectedNotice] = useState<Notice | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadNotices();
  }, [studentId, studentDeptId]);

  const loadNotices = async () => {
    try {
      // First get student's enrolled courses
      const { data: enrollments } = await supabase
        .from('student_enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('is_active', true);
      
      const enrolledCourseIds = (enrollments || []).map(e => e.course_id);

      // Load notices with filtering
      const { data: noticesData, error } = await supabase
        .from('notices')
        .select(`
          *,
          profiles:teacher_id (full_name)
        `)
        .eq('is_active', true)
        .or('expiry_date.is.null,expiry_date.gte.' + new Date().toISOString().split('T')[0])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter notices based on target audience
      const filteredNotices = (noticesData || []).filter(notice => {
        // all_students: Show only if target_dept_id matches student's dept OR target_dept_id is null (legacy)
        if (notice.target_audience === 'all_students') {
          // If notice has target_dept_id, check if it matches student's dept
          if (notice.target_dept_id) {
            return notice.target_dept_id === studentDeptId;
          }
          // Legacy notices without target_dept_id - show to all (backward compatibility)
          return true;
        }
        
        // subject_students: Show only if student is enrolled in the target course
        if (notice.target_audience === 'subject_students') {
          return notice.target_course_id && enrolledCourseIds.includes(notice.target_course_id);
        }
        
        // specific_class: Show if matches student's dept (or semester in future)
        if (notice.target_audience === 'specific_class') {
          if (notice.target_dept_id) {
            return notice.target_dept_id === studentDeptId;
          }
          return true;
        }
        
        return true;
      });

      // Load read status
      const { data: readsData } = await supabase
        .from('student_notice_reads')
        .select('notice_id')
        .eq('student_id', studentId);

      const readIds = new Set((readsData || []).map(r => r.notice_id));
      setReadNotices(readIds);

      const noticesWithRead = filteredNotices.map(notice => ({
        ...notice,
        teacher: notice.profiles,
        isRead: readIds.has(notice.id)
      }));

      setNotices(noticesWithRead);
    } catch (error: any) {
      console.error('Error loading notices:', error);
      toast({
        title: 'Error',
        description: 'Failed to load notices',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (noticeId: string) => {
    if (readNotices.has(noticeId)) return;

    try {
      await supabase
        .from('student_notice_reads')
        .insert({ student_id: studentId, notice_id: noticeId });

      // Update views count
      await supabase
        .from('notices')
        .update({ views_count: notices.find(n => n.id === noticeId)?.views_count || 0 + 1 })
        .eq('id', noticeId);

      setReadNotices(prev => new Set([...prev, noticeId]));
      setNotices(prev => prev.map(n => n.id === noticeId ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Error marking notice as read:', error);
    }
  };

  const openNotice = (notice: Notice) => {
    setSelectedNotice(notice);
    markAsRead(notice.id);
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'urgent':
        return <Badge variant="destructive" className="flex items-center gap-1"><AlertCircle className="h-3 w-3" /> Urgent</Badge>;
      case 'important':
        return <Badge className="bg-yellow-500 flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Important</Badge>;
      default:
        return <Badge variant="outline" className="flex items-center gap-1"><Info className="h-3 w-3" /> Normal</Badge>;
    }
  };

  const filteredNotices = notices.filter(notice => {
    const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         notice.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || notice.priority?.toLowerCase() === priorityFilter;
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'read' && notice.isRead) ||
                          (statusFilter === 'unread' && !notice.isRead);
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const unreadCount = notices.filter(n => !n.isRead).length;

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
          <h2 className="text-2xl font-bold">Notices</h2>
          <p className="text-muted-foreground">Stay updated with announcements</p>
        </div>
        <div className="flex gap-3">
          <Card className="px-3 py-2 bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span className="text-sm">{notices.length} Total</span>
            </div>
          </Card>
          {unreadCount > 0 && (
            <Card className="px-3 py-2 border-primary bg-white/40 dark:bg-black/40 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <Badge variant="default">{unreadCount}</Badge>
                <span className="text-sm">Unread</span>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
                <SelectItem value="important">Important</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="unread">Unread</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notices List */}
      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            All Notices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notices found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotices.map((notice) => (
                <div
                  key={notice.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    !notice.isRead ? 'bg-primary/5 border-primary/30' : ''
                  }`}
                  onClick={() => openNotice(notice)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!notice.isRead && (
                          <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                        )}
                        <h3 className={`font-semibold truncate ${!notice.isRead ? 'text-primary' : ''}`}>
                          {notice.title}
                        </h3>
                        {getPriorityBadge(notice.priority)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {notice.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>By: {notice.teacher?.full_name || 'Admin'}</span>
                        <span>{format(new Date(notice.created_at), 'MMM dd, yyyy')}</span>
                        {notice.expiry_date && (
                          <span>Expires: {format(new Date(notice.expiry_date), 'MMM dd, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notice Detail Dialog */}
      <Dialog open={!!selectedNotice} onOpenChange={() => setSelectedNotice(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <DialogTitle>{selectedNotice?.title}</DialogTitle>
              {selectedNotice && getPriorityBadge(selectedNotice.priority)}
            </div>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>Posted by: {selectedNotice?.teacher?.full_name || 'Admin'}</span>
              <span>{selectedNotice && format(new Date(selectedNotice.created_at), 'MMMM dd, yyyy')}</span>
            </div>
            <div className="prose dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{selectedNotice?.content}</p>
            </div>
            {selectedNotice?.isRead && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>Read</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};