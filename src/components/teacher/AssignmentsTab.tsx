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
import { FileText, Plus, Trash2, Edit, Clock, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';

interface AssignmentsTabProps {
  teacherId: string;
  courses: any[];
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  course_id: string;
  due_date: string;
  max_marks: number;
  is_active: boolean;
  created_at: string;
  course?: {
    course_code: string;
    course_name: string;
  };
  submissions_count?: number;
}

export const AssignmentsTab: React.FC<AssignmentsTabProps> = ({ teacherId, courses }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const { toast } = useToast();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');

  useEffect(() => {
    loadAssignments();
  }, [teacherId]);

  const loadAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from('assignments')
        .select(`
          *,
          courses:course_id (course_code, course_name)
        `)
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get submission counts for each assignment
      const assignmentsWithCounts = await Promise.all(
        (data || []).map(async (assignment) => {
          const { count } = await supabase
            .from('assignment_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('assignment_id', assignment.id);

          return {
            ...assignment,
            submissions_count: count || 0,
          };
        })
      );

      setAssignments(assignmentsWithCounts);
    } catch (error: any) {
      console.error('Error loading assignments:', error);
      toast({
        title: 'Error',
        description: 'Failed to load assignments',
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
    setDueDate('');
    setMaxMarks('100');
    setEditingAssignment(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !courseId || !dueDate) {
      toast({
        title: 'Error',
        description: 'Title, course, and due date are required',
        variant: 'destructive',
      });
      return;
    }

    try {
      const assignmentData = {
        teacher_id: teacherId,
        title: title.trim(),
        description: description.trim(),
        course_id: courseId,
        due_date: dueDate,
        max_marks: parseInt(maxMarks) || 100,
      };

      if (editingAssignment) {
        const { error } = await supabase
          .from('assignments')
          .update(assignmentData)
          .eq('id', editingAssignment.id);

        if (error) throw error;
        toast({ title: 'Success', description: 'Assignment updated successfully' });
      } else {
        const { error } = await supabase
          .from('assignments')
          .insert(assignmentData);

        if (error) throw error;
        toast({ title: 'Success', description: 'Assignment created successfully' });
      }

      resetForm();
      loadAssignments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save assignment',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setTitle(assignment.title);
    setDescription(assignment.description || '');
    setCourseId(assignment.course_id);
    setDueDate(assignment.due_date);
    setMaxMarks(assignment.max_marks.toString());
    setShowForm(true);
  };

  const handleDelete = async (assignmentId: string) => {
    if (!confirm('Are you sure you want to delete this assignment?')) return;

    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      toast({ title: 'Success', description: 'Assignment deleted successfully' });
      loadAssignments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete assignment',
        variant: 'destructive',
      });
    }
  };

  const toggleActive = async (assignment: Assignment) => {
    try {
      const { error } = await supabase
        .from('assignments')
        .update({ is_active: !assignment.is_active })
        .eq('id', assignment.id);

      if (error) throw error;
      loadAssignments();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to update assignment status',
        variant: 'destructive',
      });
    }
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showForm && (
        <Card className="linear-surface overflow-hidden">
          <CardHeader className="linear-toolbar flex flex-col gap-3">
            <div>
              <div className="linear-kicker">Form</div>
              <CardTitle className="text-base font-semibold">{editingAssignment ? 'Edit Assignment' : 'Create New Assignment'}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Assignment Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter assignment title"
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
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxMarks">Max Marks</Label>
                  <Input
                    id="maxMarks"
                    type="number"
                    min="1"
                    value={maxMarks}
                    onChange={(e) => setMaxMarks(e.target.value)}
                    placeholder="100"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter assignment description and instructions"
                  rows={4}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingAssignment ? 'Update Assignment' : 'Create Assignment'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Assignments List */}
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Tasks</div>
              <CardTitle className="text-base font-semibold">Existing Assignments</CardTitle>
            </div>
            <div className="linear-pill">
              <span className="font-medium text-foreground">{assignments.length}</span>
              <span>total</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setShowForm(!showForm)} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {showForm ? 'Cancel' : 'Create Assignment'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {assignments.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-sm font-medium">No assignments created yet</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Create your first assignment to start managing student tasks.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="linear-table">
                <thead>
                  <tr>
                    <th className="linear-th">Assignment</th>
                    <th className="linear-th hidden md:table-cell">Course</th>
                    <th className="linear-th hidden lg:table-cell">Due Date</th>
                    <th className="linear-th hidden lg:table-cell">Marks</th>
                    <th className="linear-th hidden lg:table-cell">Submissions</th>
                    <th className="linear-th hidden lg:table-cell">Status</th>
                    <th className="linear-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className={`linear-tr ${!assignment.is_active ? 'opacity-60' : ''}`}>
                      <td className="linear-td">
                        <div className="font-medium">{assignment.title}</div>
                        {assignment.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                            {assignment.description}
                          </div>
                        )}
                      </td>
                      <td className="linear-td hidden md:table-cell">
                        <Badge variant="outline">
                          {assignment.course?.course_code}
                        </Badge>
                      </td>
                      <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                        {format(new Date(assignment.due_date), 'MMM dd, yyyy')}
                      </td>
                      <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                        {assignment.max_marks}
                      </td>
                      <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                        {assignment.submissions_count || 0}
                      </td>
                      <td className="linear-td hidden lg:table-cell">
                        {isOverdue(assignment.due_date) ? (
                          <Badge variant="destructive">Overdue</Badge>
                        ) : assignment.is_active ? (
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
                            onClick={() => toggleActive(assignment)}
                          >
                            {assignment.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(assignment)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(assignment.id)}
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
