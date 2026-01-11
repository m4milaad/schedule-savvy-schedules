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
import { Bell, Plus, Trash2, Edit, Eye, Send } from 'lucide-react';
import { format } from 'date-fns';

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
  const [expiryDate, setExpiryDate] = useState('');

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
    setExpiryDate('');
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
        expiry_date: expiryDate || null,
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
    setExpiryDate(notice.expiry_date || '');
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
          <p className="text-muted-foreground">Create and manage notices for students</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Notice
        </Button>
      </div>

      {showForm && (
        <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
          <CardHeader>
            <CardTitle>{editingNotice ? 'Edit Notice' : 'Create New Notice'}</CardTitle>
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
                )}
                <div className="space-y-2">
                  <Label htmlFor="expiry">Expiry Date</Label>
                  <Input
                    id="expiry"
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
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
      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle>Published Notices</CardTitle>
          <CardDescription>View and manage all your notices</CardDescription>
        </CardHeader>
        <CardContent>
          {notices.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notices created yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {notices.map((notice) => (
                <div
                  key={notice.id}
                  className={`p-4 border rounded-lg ${!notice.is_active ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{notice.title}</h3>
                        <Badge variant={getPriorityColor(notice.priority)}>
                          {notice.priority}
                        </Badge>
                        {!notice.is_active && (
                          <Badge variant="outline">Inactive</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {notice.content}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Target: {notice.target_audience.replace('_', ' ')}</span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" /> {notice.views_count} views
                        </span>
                        <span className="flex items-center gap-1">
                          <Send className="h-3 w-3" /> {notice.notifications_sent} sent
                        </span>
                        {notice.expiry_date && (
                          <span>Expires: {format(new Date(notice.expiry_date), 'MMM dd, yyyy')}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActive(notice)}
                      >
                        {notice.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(notice)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(notice.id)}
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
