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
  const [activeTab, setActiveTab] = useState<'apply' | 'applications'>('apply');

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
      case 'sick_leave':
        return <Badge variant="outline" className="border-red-500 text-red-500">Sick Leave</Badge>;
      case 'personal':
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Personal</Badge>;
      case 'emergency':
        return <Badge variant="outline" className="border-orange-500 text-orange-500">Emergency</Badge>;
      case 'medical':
        return <Badge variant="outline" className="border-purple-500 text-purple-500">Medical</Badge>;
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
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Leave</div>
              <CardTitle className="text-base font-semibold">
                Leave Management
              </CardTitle>
              <CardDescription>
                Apply for leave and track your applications in one place.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="linear-pill">
                <span className="font-medium text-foreground">
                  {applications.length}
                </span>
                <span>total</span>
              </div>
              <div className="linear-pill">
                <span className="font-medium text-foreground">
                  {approvedCount}
                </span>
                <span>approved</span>
              </div>
              <div className="linear-pill">
                <span className="font-medium text-foreground">
                  {totalDays}
                </span>
                <span>days used</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'apply' | 'applications')}
            className="space-y-4"
          >
            <div className="flex justify-end">
              <TabsList className="bg-muted/40 rounded-full h-9 px-1 py-1">
                <TabsTrigger
                  value="apply"
                  className="rounded-full px-3 py-1 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  Apply for Leave
                </TabsTrigger>
                <TabsTrigger
                  value="applications"
                  className="rounded-full px-3 py-1 text-xs sm:text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
                >
                  My Applications ({applications.length})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="apply">
              <div className="space-y-4 rounded-xl border border-border/40 bg-background/40 p-4">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold tracking-tight">
                    New Leave Application
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Fill in the details to apply for leave.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Leave Type *</Label>
                    <Select value={leaveType} onValueChange={setLeaveType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sick_leave">Sick Leave</SelectItem>
                        <SelectItem value="personal">Personal Leave</SelectItem>
                        <SelectItem value="emergency">Emergency</SelectItem>
                        <SelectItem value="medical">
                          Medical Appointment
                        </SelectItem>
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
                            'w-full justify-start text-left font-normal',
                            !startDate && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={startDate}
                          onSelect={setStartDate}
                          initialFocus
                          disabled={(date) => { const today = new Date(); today.setHours(0,0,0,0); return date < today; }}
                          className="pointer-events-auto"
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
                            'w-full justify-start text-left font-normal',
                            !endDate && 'text-muted-foreground',
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={endDate}
                          onSelect={setEndDate}
                          initialFocus
                          disabled={(date) => { const today = new Date(); today.setHours(0,0,0,0); return date < today; }}
                          className="pointer-events-auto"
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
              </div>
            </TabsContent>

            <TabsContent value="applications">
              <div className="space-y-4 rounded-xl border border-border/40 bg-background/40 p-4">
                {applications.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">
                    <CalendarDays className="mx-auto mb-4 h-12 w-12 opacity-50" />
                    <p className="text-sm font-medium">No leave applications yet</p>
                    <p className="mt-1 text-xs">
                      Once you apply for leave, your requests will appear in this
                      table.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-border/30 bg-background/40">
                    <table className="linear-table">
                      <thead>
                        <tr>
                          <th className="linear-th">Leave</th>
                          <th className="linear-th hidden md:table-cell">Dates</th>
                          <th className="linear-th hidden lg:table-cell">Status</th>
                          <th className="linear-th text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {applications.map((app) => {
                          const days =
                            differenceInDays(
                              new Date(app.end_date),
                              new Date(app.start_date),
                            ) + 1;

                          return (
                            <tr key={app.id} className="linear-tr align-top">
                              <td className="linear-td">
                                <div className="flex flex-col gap-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    {getLeaveTypeBadge(app.leave_type)}
                                    <Badge
                                      variant="outline"
                                      className="text-[11px]"
                                    >
                                      {days} day{days > 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                                    {app.reason}
                                  </p>
                                  {app.review_remarks && (
                                    <div
                                      className={cn(
                                        'mt-2 rounded-md border px-2 py-1 text-xs',
                                        app.status === 'approved'
                                          ? 'border-green-500/40 bg-green-50 dark:bg-green-950/20'
                                          : 'border-red-500/40 bg-red-50 dark:bg-red-950/20',
                                      )}
                                    >
                                      <span className="font-medium">
                                        Remarks:
                                      </span>{' '}
                                      {app.review_remarks}
                                    </div>
                                  )}
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    Applied:{' '}
                                    {format(
                                      new Date(app.created_at),
                                      'MMM dd, yyyy',
                                    )}
                                  </p>
                                </div>
                              </td>
                              <td className="linear-td hidden md:table-cell text-sm">
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                                  <span>
                                    {format(
                                      new Date(app.start_date),
                                      'MMM dd',
                                    )}{' '}
                                    -{' '}
                                    {format(
                                      new Date(app.end_date),
                                      'MMM dd, yyyy',
                                    )}
                                  </span>
                                </div>
                              </td>
                              <td className="linear-td hidden lg:table-cell">
                                {getStatusBadge(app.status)}
                              </td>
                              <td className="linear-td">
                                <div className="flex justify-end">
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
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};