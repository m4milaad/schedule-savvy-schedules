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
import { TabLoader } from '@/components/ui/loading-screen';
import logger from '@/lib/logger';


interface StudentNoticesTabProps {
  studentId: string;
  studentDeptId?: string;
  studentSemester?: number | null;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  priority: string;
  target_audience: string;
  target_course_id?: string | null;
  created_at: string;
  expiry_date: string | null;
  views_count?: number;
  teacher?: {
    full_name: string;
    user_type: string;
  };
  course?: {
    course_code: string;
    course_name: string;
  } | null;
  teacher_course_code?: string | null;
  isRead?: boolean;
}

export const StudentNoticesTab: React.FC<StudentNoticesTabProps> = ({ studentId, studentDeptId, studentSemester }) => {
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
          profiles:teacher_id (full_name, user_type),
          courses:target_course_id (course_code, course_name)
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
        
        // specific_class: match dept AND semester (if notice has target_semester set)
        if (notice.target_audience === 'specific_class') {
          const deptMatch = notice.target_dept_id ? notice.target_dept_id === studentDeptId : true;
          const semMatch = notice.target_semester != null
            ? notice.target_semester === studentSemester
            : true;
          return deptMatch && semMatch;
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

      // Fetch teacher course codes for display
      const teacherIds = [...new Set(filteredNotices.map(n => (n as Record<string, unknown>).teacher_id).filter(Boolean))];
      const teacherCourseMap = new Map<string, string>();
      if (teacherIds.length > 0) {
        const { data: tcData } = await supabase
          .from('teacher_courses')
          .select('teacher_id, courses:course_id (course_code)')
          .in('teacher_id', teacherIds);
        // Use first course per teacher
        (tcData || []).forEach((tc: Record<string, unknown>) => {
          if (!teacherCourseMap.has(tc.teacher_id)) {
            teacherCourseMap.set(tc.teacher_id, tc.courses?.course_code || '');
          }
        });
      }

      const noticesWithRead = filteredNotices.map(notice => ({
        ...notice,
        teacher: (notice as Record<string, unknown>).profiles as Record<string, unknown>,
        course: (notice as Record<string, unknown>).courses as Record<string, unknown>,
        teacher_course_code: (notice as Record<string, unknown>).target_course_id
          ? ((notice as Record<string, unknown>).courses as Record<string, unknown>)?.course_code
          : teacherCourseMap.get((notice as Record<string, unknown>).teacher_id) || null,
        isRead: readIds.has(notice.id)
      }));

      setNotices(noticesWithRead as Record<string, unknown>);
    } catch (error: unknown) {
      logger.error('Error loading notices:', error);
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
      logger.error('Error marking notice as read:', error);
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
    return <TabLoader message="Loading notices..." />;
  }

  return (
    <div className="space-y-6">
      {/* Notices List */}
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Announcements</div>
              <CardTitle className="text-base font-semibold">
                Notices
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <div className="linear-pill">
                <span className="font-medium text-foreground">{notices.length}</span>
                <span>total</span>
              </div>
              {unreadCount > 0 && (
                <div className="linear-pill border-primary/50 bg-primary/10">
                  <span className="font-medium text-primary">{unreadCount}</span>
                  <span>unread</span>
                </div>
              )}
            </div>
          </div>
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
        </CardHeader>
        <CardContent className="p-0">
          {filteredNotices.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-sm font-medium">No notices found</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {searchTerm || priorityFilter !== 'all' || statusFilter !== 'all' 
                  ? 'Try adjusting your filters.' 
                  : 'You\'ll see announcements here when they\'re posted.'}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="linear-table">
                <thead>
                  <tr>
                    <th className="linear-th">Notice</th>
                    <th className="linear-th hidden md:table-cell">Priority</th>
                    <th className="linear-th hidden lg:table-cell">Posted By</th>
                    <th className="linear-th hidden lg:table-cell">Date</th>
                    <th className="linear-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNotices.map((notice) => (
                    <tr 
                      key={notice.id} 
                      className={`linear-tr cursor-pointer ${!notice.isRead ? 'bg-primary/5' : ''}`}
                      onClick={() => openNotice(notice)}
                    >
                      <td className="linear-td">
                        <div className="flex items-center gap-2">
                          {!notice.isRead && (
                            <span className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
                          )}
                          <div>
                            <div className={`font-medium ${!notice.isRead ? 'text-primary' : ''}`}>
                              {notice.title}
                            </div>
                            <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                              {notice.content}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="linear-td hidden md:table-cell">
                        {getPriorityBadge(notice.priority)}
                      </td>
                      <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                        <div>
                          <span className="font-medium text-foreground">{notice.teacher?.full_name || 'Unknown'}</span>
                          {notice.teacher_course_code && (
                            <span className="text-xs ml-1 text-muted-foreground">({notice.teacher_course_code})</span>
                          )}
                        </div>
                      </td>
                      <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                        {format(new Date(notice.created_at), 'MMM dd, yyyy')}
                      </td>
                      <td className="linear-td">
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notice Detail Dialog */}
      <Dialog open={!!selectedNotice} onOpenChange={() => setSelectedNotice(null)}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden rounded-2xl border-white/10 bg-gradient-to-br from-white/10 to-white/5 dark:from-black/40 dark:to-black/20 backdrop-blur-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          {/* Header Section with Glass Effect */}
          <div className="relative px-6 py-5 border-b border-white/10 bg-gradient-to-b from-white/5 to-transparent backdrop-blur-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-3">
                <div className="flex items-center gap-2">
                  {selectedNotice && getPriorityBadge(selectedNotice.priority)}
                  {selectedNotice?.isRead && (
                    <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30 backdrop-blur-sm">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Read
                    </Badge>
                  )}
                </div>
                <h2 className="text-xl font-semibold leading-tight pr-8 text-foreground">
                  {selectedNotice?.title}
                </h2>
                <div className="flex items-center gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-primary/20 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/20">
                        <span className="text-xs font-medium text-primary">
                          {(selectedNotice?.teacher?.full_name || 'Admin').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-foreground">
                          {selectedNotice?.teacher?.full_name || 'Unknown'}
                          {selectedNotice?.teacher_course_code && (
                            <span className="text-xs font-normal text-muted-foreground ml-1">
                              ({selectedNotice.teacher_course_code})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {selectedNotice && format(new Date(selectedNotice.created_at), 'MMMM dd, yyyy • h:mm a')}
                        </div>
                      </div>
                    </div>
                </div>
              </div>
            </div>
          </div>

          {/* Content Section with Glass Background */}
          <div className="px-6 py-6 bg-white/5 dark:bg-black/10 backdrop-blur-sm">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground/90">
                {selectedNotice?.content}
              </div>
            </div>
          </div>

          {/* Footer Section with Glass Effect */}
          {selectedNotice?.expiry_date && (
            <div className="px-6 py-4 bg-white/5 dark:bg-black/10 backdrop-blur-md border-t border-white/10">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertCircle className="h-4 w-4" />
                <span>
                  This notice expires on {format(new Date(selectedNotice.expiry_date), 'MMMM dd, yyyy')}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};