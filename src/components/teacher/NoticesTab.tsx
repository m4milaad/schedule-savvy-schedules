import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/ui/date-picker';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Bell, Plus, Trash2, Edit, Eye, Send } from 'lucide-react';
import { format } from 'date-fns';
import { TabLoader } from '@/components/ui/loading-screen';

interface NoticesTabProps {
  teacherId: string;
  courses: any[];
  deptId?: string;
}

interface Notice {
  id: string;
  title: string;
  content: string;
  priority: string;
  target_audience: string;
  target_course_id?: string;
  expiry_date?: string;
  views_count: number;
  notifications_sent: number;
  is_active: boolean;
  created_at: string;
}

export const NoticesTab: React.FC<NoticesTabProps> = ({ teacherId, courses, deptId }) => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('normal');
  const [targetAudience, setTargetAudience] = useState('all_students');
  const [targetCourseId, setTargetCourseId] = useState('');
  const [expiryDate, setExpiryDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    loadNotices();
  }, [teacherId]);

  const loadNotices = async () => {
    try {
      const { data, error } = await supabase
        .from('notices')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotices(data || []);
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

  const resetForm = () => {
    setTitle('');
    setContent('');
    setPriority('normal');
    setTargetAudience('all_students');
    setTargetCourseId('');
    setExpiryDate(undefined);
    setEditingNotice(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast({
        title: 'Error',
        description: 'Title and content are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const noticeData = {
        teacher_id: teacherId,
        title: title.trim(),
        content: content.trim(),
        priority,
        target_audience: targetAudience,
        target_course_id: targetAudience === 'subject_students' ? targetCourseId : null,
        target_dept_id: targetAudience === 'all_students' ? deptId : null,
        expiry_date: expiryDate ? format(expiryDate, 'yyyy-MM-dd') : null,
      };

      if (editingNotice) {
        const { error } = await supabase
          .from('notices')
          .update(noticeData)
          .eq('id', editingNotice.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Notice updated successfully' });
      } else {
        const { error } = await supabase
          .from('notices')
          .insert(noticeData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Notice created successfully' });
      }

      resetForm();
      loadNotices();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save notice',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (notice: Notice) => {
    setEditingNotice(notice);
    setTitle(notice.title);
    setContent(notice.content);
    setPriority(notice.priority);
    setTargetAudience(notice.target_audience);
    setTargetCourseId(notice.target_course_id || '');
    setExpiryDate(notice.expiry_date ? new Date(notice.expiry_date) : undefined);
    setShowForm(true);
  };

  const handleDelete = async (noticeId: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return;

    try {
      const { error } = await supabase
        .from('notices')
        .delete()
        .eq('id', noticeId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Notice deleted successfully' });
      loadNotices();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete notice',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (notice: Notice) => {
    try {
      const { error } = await supabase
        .from('notices')
        .update({ is_active: !notice.is_active })
        .eq('id', notice.id);

      if (error) throw error;
      loadNotices();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update notice status',
        variant: 'destructive',
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'important': return 'default';
      default: return 'secondary';
    }
  };

  if (loading) {
    return <TabLoader message="Loading notices..." />;
  }

  return (
    <div className="space-y-6">
      {showForm && (
        <Card className="linear-surface overflow-hidden">
          <CardHeader className="linear-toolbar flex flex-col gap-3">
            <div>
              <div className="linear-kicker">Form</div>
              <CardTitle className="text-base font-semibold">{editingNotice ? 'Edit Notice' : 'Create New Notice'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Notice Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter notice title"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="important">Important</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="audience">Target Audience</Label>
                  <Select value={targetAudience} onValueChange={setTargetAudience}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all_students">All Students</SelectItem>
                      <SelectItem value="specific_class">Specific Class</SelectItem>
                      <SelectItem value="subject_students">Subject Students</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {targetAudience === 'subject_students' && (
                  <div className="space-y-2">
                    <Label htmlFor="course">Select Course</Label>
                    <Select value={targetCourseId} onValueChange={setTargetCourseId}>
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent className="z-[100] bg-background border shadow-lg">
                        {courses.length === 0 ? (
                          <SelectItem value="no-courses" disabled>
                            No courses assigned
                          </SelectItem>
                        ) : (
                          courses.map((course) => (
                            <SelectItem key={course.course_id} value={course.course_id}>
                              {course.course_code} - {course.course_name}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <DatePicker
                    date={expiryDate}
                    onDateChange={setExpiryDate}
                    placeholder="Select expiry date (optional)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Notice Content *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter notice content"
                  rows={5}
                  required
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingNotice ? 'Update Notice' : 'Publish Notice'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Published Notices */}
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Communication</div>
              <CardTitle className="text-base font-semibold">
                Published Notices
              </CardTitle>
            </div>
            <div className="linear-pill">
              <span className="font-medium text-foreground">{notices.length}</span>
              <span>total</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? 'Cancel' : 'Create Notice'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {notices.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-sm font-medium">No notices created yet</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Create your first notice to communicate with students.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="linear-table">
                <thead>
                  <tr>
                    <th className="linear-th">Notice</th>
                    <th className="linear-th hidden md:table-cell">Priority</th>
                    <th className="linear-th hidden lg:table-cell">Target</th>
                    <th className="linear-th hidden lg:table-cell">Views</th>
                    <th className="linear-th hidden lg:table-cell">Status</th>
                    <th className="linear-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {notices.map((notice) => (
                    <tr key={notice.id} className={`linear-tr ${!notice.is_active ? 'opacity-60' : ''}`}>
                      <td className="linear-td">
                        <div className="font-medium">{notice.title}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {notice.content}
                        </div>
                      </td>
                      <td className="linear-td hidden md:table-cell">
                        <Badge variant={getPriorityColor(notice.priority)}>
                          {notice.priority}
                        </Badge>
                      </td>
                      <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                        {notice.target_audience.replace('_', ' ')}
                      </td>
                      <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {notice.views_count}
                        </div>
                      </td>
                      <td className="linear-td hidden lg:table-cell">
                        {notice.is_active ? (
                          <Badge variant="default" className="bg-green-600">Active</Badge>
                        ) : (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </td>
                      <td className="linear-td">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleActive(notice)}
                          >
                            {notice.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(notice)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(notice.id)}
                          >
                            <Trash2 className="w-4 h-4" />
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
    </div>
  );
};
