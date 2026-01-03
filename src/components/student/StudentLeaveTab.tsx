import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  CalendarDays, Send, Clock, CheckCircle, XCircle, 
  AlertCircle, FileText, Calendar as CalendarIcon, Edit, Trash2 
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface StudentLeaveTabProps {
  studentId: string;
  profileId: string;
}

interface LeaveApplication {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  contact_info: string;
  status: string;
  review_remarks: string | null;
  created_at: string;
  reviewed_at: string | null;
}

export const StudentLeaveTab: React.FC<StudentLeaveTabProps> = ({ studentId, profileId }) => {
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [leaveType, setLeaveType] = useState('');
  const [reason, setReason] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadApplications();
  }, [profileId]);

  const loadApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .select('*')
        .eq('applicant_id', profileId)
        .eq('applicant_type', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      console.error('Error loading applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leave applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!startDate || !endDate || !leaveType || !reason) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (startDate > endDate) {
      toast({
        title: 'Error',
        description: 'End date must be after start date',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('leave_applications')
        .insert({
          applicant_id: profileId,
          applicant_type: 'student',
          leave_type: leaveType,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          reason,
          contact_info: contactInfo,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Leave application submitted successfully',
      });

      // Reset form
      setStartDate(undefined);
      setEndDate(undefined);
      setLeaveType('');
      setReason('');
      setContactInfo('');
      loadApplications();
    } catch (error: any) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to submit application',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const cancelApplication = async (id: string) => {
    try {
      const { error } = await supabase
        .from('leave_applications')
        .delete()
        .eq('id', id)
        .eq('status', 'pending');

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Application cancelled',
      });
      loadApplications();
    } catch (error: any) {
      console.error('Error cancelling application:', error);
      toast({
        title: 'Error',
        description: 'Failed to cancel application',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const getLeaveTypeBadge = (type: string) => {
    switch (type?.toLowerCase()) {
      case 'sick':
        return <Badge variant="outline" className="border-red-500 text-red-500">Sick Leave</Badge>;
      case 'personal':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Personal</Badge>;
      case 'family':
        return <Badge variant="outline" className="border-purple-500 text-purple-500">Family</Badge>;
      case 'emergency':
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Emergency</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  const pendingCount = applications.filter(a => a.status === 'pending').length;
  const approvedCount = applications.filter(a => a.status === 'approved').length;
  const totalDays = applications
    .filter(a => a.status === 'approved')
    .reduce((sum, a) => sum + differenceInDays(new Date(a.end_date), new Date(a.start_date)) + 1, 0);

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
          <h2 className="text-2xl font-bold">Leave Applications</h2>
          <p className="text-muted-foreground">Apply for leave and track your applications</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{applications.length}</p>
                <p className="text-xs text-muted-foreground">Total Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <CalendarDays className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalDays}</p>
                <p className="text-xs text-muted-foreground">Days Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="apply" className="space-y-4">
        <TabsList>
          <TabsTrigger value="apply">Apply for Leave</TabsTrigger>
          <TabsTrigger value="applications">My Applications ({applications.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="apply">
          <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                New Leave Application
              </CardTitle>
              <CardDescription>Fill in the details to apply for leave</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Leave Type *</Label>
                  <Select value={leaveType} onValueChange={setLeaveType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select leave type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="personal">Personal Leave</SelectItem>
                      <SelectItem value="family">Family Emergency</SelectItem>
                      <SelectItem value="medical">Medical Appointment</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Contact Info (During Leave)</Label>
                  <Input
                    placeholder="Phone number or email"
                    value={contactInfo}
                    onChange={(e) => setContactInfo(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>From Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>To Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Reason *</Label>
                  <Textarea
                    placeholder="Explain the reason for your leave application..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="md:col-span-2">
                  <Button 
                    onClick={handleSubmit} 
                    disabled={submitting}
                    className="w-full md:w-auto"
                  >
                    {submitting ? 'Submitting...' : 'Submit Application'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications">
          <Card className="bg-white/40 dark:bg-black/40 backdrop-blur-xl border-border/50">
            <CardHeader>
              <CardTitle>My Leave Applications</CardTitle>
              <CardDescription>Track the status of your leave applications</CardDescription>
            </CardHeader>
            <CardContent>
              {applications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No leave applications yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications.map((app) => {
                    const days = differenceInDays(new Date(app.end_date), new Date(app.start_date)) + 1;
                    
                    return (
                      <div key={app.id} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            {getLeaveTypeBadge(app.leave_type)}
                            {getStatusBadge(app.status)}
                          </div>
                          {app.status === 'pending' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => cancelApplication(app.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                              {format(new Date(app.start_date), 'MMM dd')} - {format(new Date(app.end_date), 'MMM dd, yyyy')}
                            </span>
                            <Badge variant="outline">{days} day{days > 1 ? 's' : ''}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{app.reason}</p>
                          {app.review_remarks && (
                            <div className={`text-sm p-2 rounded ${
                              app.status === 'approved' ? 'bg-green-50 dark:bg-green-950/20' : 'bg-red-50 dark:bg-red-950/20'
                            }`}>
                              <strong>Remarks:</strong> {app.review_remarks}
                            </div>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Applied: {format(new Date(app.created_at), 'MMM dd, yyyy')}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};