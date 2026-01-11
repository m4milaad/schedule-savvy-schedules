import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FileText, Upload, Clock, CheckCircle, AlertCircle, Download, X } from 'lucide-react';
import { format } from 'date-fns';
import { TabLoader } from '@/components/ui/loading-screen';

interface StudentAssignmentsTabProps {
  studentId: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  course_id: string;
  due_date: string;
  max_marks: number;
  is_active: boolean;
  course?: {
    course_code: string;
    course_name: string;
  };
  submission?: {
    id: string;
    file_url: string;
    status: string;
    marks_obtained: number | null;
    feedback: string | null;
    submission_date: string;
  };
}

export const StudentAssignmentsTab: React.FC<StudentAssignmentsTabProps> = ({ studentId }) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadAssignments();
  }, [studentId]);

  const loadAssignments = async () => {
    try {
      // First get enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .eq('is_active', true);

      if (enrollError) throw enrollError;

      if (!enrollments || enrollments.length === 0) {
        setAssignments([]);
        setLoading(false);
        return;
      }

      const courseIds = enrollments.map(e => e.course_id);

      // Get active assignments for enrolled courses
      const { data: assignmentsData, error } = await supabase
        .from('assignments')
        .select(`
          *,
          courses:course_id (course_code, course_name)
        `)
        .in('course_id', courseIds)
        .eq('is_active', true)
        .order('due_date', { ascending: true });

      if (error) throw error;

      // Get submissions for these assignments
      const assignmentIds = (assignmentsData || []).map(a => a.id);
      
      const { data: submissions } = await supabase
        .from('assignment_submissions')
        .select('*')
        .eq('student_id', studentId)
        .in('assignment_id', assignmentIds);

      // Merge submissions with assignments
      const assignmentsWithSubmissions = (assignmentsData || []).map(assignment => {
        const submission = submissions?.find(s => s.assignment_id === assignment.id);
        return {
          ...assignment,
          submission: submission ? {
            id: submission.id,
            file_url: submission.file_url,
            status: submission.status,
            marks_obtained: submission.marks_obtained,
            feedback: submission.feedback,
            submission_date: submission.submission_date,
          } : undefined,
        };
      });

      setAssignments(assignmentsWithSubmissions);
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

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: 'Error',
          description: 'File size must be less than 10MB',
          variant: 'destructive',
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!selectedAssignment || !selectedFile) {
      toast({
        title: 'Error',
        description: 'Please select a file to upload',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${studentId}/${selectedAssignment.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('assignments')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('assignments')
        .getPublicUrl(fileName);

      // Create or update submission
      if (selectedAssignment.submission) {
        // Update existing submission
        const { error } = await supabase
          .from('assignment_submissions')
          .update({
            file_url: urlData.publicUrl,
            submission_date: new Date().toISOString(),
            status: 'submitted',
          })
          .eq('id', selectedAssignment.submission.id);

        if (error) throw error;
      } else {
        // Create new submission
        const { error } = await supabase
          .from('assignment_submissions')
          .insert({
            assignment_id: selectedAssignment.id,
            student_id: studentId,
            file_url: urlData.publicUrl,
            status: 'submitted',
          });

        if (error) throw error;
      }

      toast({
        title: 'Success',
        description: 'Assignment submitted successfully',
      });

      setSubmitDialogOpen(false);
      setSelectedFile(null);
      setSelectedAssignment(null);
      loadAssignments();
    } catch (error: any) {
      console.error('Error submitting assignment:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit assignment',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (assignment: Assignment) => {
    if (assignment.submission) {
      if (assignment.submission.status === 'graded') {
        return <Badge className="bg-green-500">Graded</Badge>;
      }
      return <Badge className="bg-blue-500">Submitted</Badge>;
    }
    if (isOverdue(assignment.due_date)) {
      return <Badge variant="destructive">Overdue</Badge>;
    }
    return <Badge variant="outline">Pending</Badge>;
  };

  if (loading) {
    return <TabLoader message="Loading assignments..." />;
  }

  const pendingCount = assignments.filter(a => !a.submission && !isOverdue(a.due_date)).length;
  const submittedCount = assignments.filter(a => a.submission).length;
  const overdueCount = assignments.filter(a => !a.submission && isOverdue(a.due_date)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">My Assignments</h2>
          <p className="text-muted-foreground">View and submit your assignments</p>
        </div>
        <div className="flex gap-4">
          <Card className="px-3 py-2 bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">{pendingCount} Pending</span>
            </div>
          </Card>
          <Card className="px-3 py-2 bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">{submittedCount} Submitted</span>
            </div>
          </Card>
          {overdueCount > 0 && (
            <Card className="px-3 py-2 bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">{overdueCount} Overdue</span>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Assignments
          </CardTitle>
          <CardDescription>All assignments from your enrolled courses</CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No assignments available</p>
              <p className="text-sm">Assignments from your enrolled courses will appear here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className={`p-4 border rounded-lg ${isOverdue(assignment.due_date) && !assignment.submission ? 'border-red-200 bg-red-50 dark:bg-red-950/20' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{assignment.title}</h3>
                        <Badge variant="outline">{assignment.course?.course_code}</Badge>
                        {getStatusBadge(assignment)}
                      </div>
                      {assignment.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                          {assignment.description}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Due: {format(new Date(assignment.due_date), 'MMM dd, yyyy')}
                        </span>
                        <span>Max Marks: {assignment.max_marks}</span>
                        {assignment.submission?.marks_obtained !== null && (
                          <span className="font-medium text-green-600">
                            Score: {assignment.submission.marks_obtained}/{assignment.max_marks}
                          </span>
                        )}
                      </div>
                      {assignment.submission?.feedback && (
                        <div className="mt-2 p-2 bg-muted rounded text-sm">
                          <strong>Feedback:</strong> {assignment.submission.feedback}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {assignment.submission?.file_url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(assignment.submission?.file_url, '_blank')}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {!assignment.submission?.marks_obtained && (
                        <Dialog open={submitDialogOpen && selectedAssignment?.id === assignment.id} onOpenChange={(open) => {
                          setSubmitDialogOpen(open);
                          if (!open) {
                            setSelectedFile(null);
                            setSelectedAssignment(null);
                          }
                        }}>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant={assignment.submission ? 'outline' : 'default'}
                              onClick={() => setSelectedAssignment(assignment)}
                            >
                              <Upload className="h-4 w-4 mr-2" />
                              {assignment.submission ? 'Resubmit' : 'Submit'}
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Submit Assignment: {assignment.title}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Upload File</Label>
                                <div 
                                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
                                  onClick={() => fileInputRef.current?.click()}
                                >
                                  {selectedFile ? (
                                    <div className="flex items-center justify-center gap-2">
                                      <FileText className="h-8 w-8 text-primary" />
                                      <div className="text-left">
                                        <p className="font-medium">{selectedFile.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedFile(null);
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
                                        PDF, DOC, DOCX, PPT, PPTX (Max 10MB)
                                      </p>
                                    </>
                                  )}
                                </div>
                                <input
                                  ref={fileInputRef}
                                  type="file"
                                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                                  onChange={handleFileSelect}
                                  className="hidden"
                                />
                              </div>
                              <Button 
                                className="w-full" 
                                onClick={handleSubmit}
                                disabled={!selectedFile || uploading}
                              >
                                {uploading ? 'Uploading...' : 'Submit Assignment'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
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
