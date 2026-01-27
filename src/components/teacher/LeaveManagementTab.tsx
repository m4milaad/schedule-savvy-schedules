import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';
import { format } from 'date-fns';

interface LeaveManagementTabProps {
  teacherId: string;
}

interface LeaveApplication {
  id: string;
  applicant_id: string;
  applicant_type: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  contact_info: string;
  created_at: string;
  applicant?: {
    full_name: string;
    email: string;
  };
}

export const LeaveManagementTab: React.FC<LeaveManagementTabProps> = ({ teacherId }) => {
  const [applications, setApplications] = useState<LeaveApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('leave_applications')
        .select('*')
        .eq('applicant_type', 'student')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data as any || []);
    } catch (error: any) {
      console.error('Error loading leave applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load leave applications',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (applicationId: string, newStatus: string, remarks?: string) => {
    try {
      const { error } = await supabase
        .from('leave_applications')
        .update({
          status: newStatus,
          reviewed_by: teacherId,
          reviewed_at: new Date().toISOString(),
          review_remarks: remarks,
        })
        .eq('id', applicationId);

      if (error) throw error;
      toast({ title: 'Success', description: `Leave ${newStatus} successfully` });
      loadApplications();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update leave status',
        variant: 'destructive',
      });
    }
  };



  const filteredApplications = applications.filter(app => {
    if (statusFilter !== 'all' && app.status !== statusFilter) return false;
    if (typeFilter !== 'all' && app.leave_type !== typeFilter) return false;
    return true;
  });

  const stats = {
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
    total: applications.length,
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
      {/* Leave Applications */}
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Management</div>
              <CardTitle className="text-base font-semibold">
                Leave Management
              </CardTitle>
            </div>
            <div className="linear-pill">
              <span className="font-medium text-foreground">{filteredApplications.length}</span>
              <span>found</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center justify-between">
            {/* Inline Metrics */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{stats.pending}</span>
                <span className="text-muted-foreground">Pending</span>
              </div>
              <span className="text-muted-foreground/40">·</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{stats.approved}</span>
                <span className="text-muted-foreground">Approved</span>
              </div>
              <span className="text-muted-foreground/40">·</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{stats.rejected}</span>
                <span className="text-muted-foreground">Rejected</span>
              </div>
            </div>
            
            {/* Filters on the right */}
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-8 w-[140px] text-sm">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="revoked">Revoked</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-8 w-[140px] text-sm">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="sick_leave">Sick Leave</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="medical">Medical</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>

              {(statusFilter !== 'all' || typeFilter !== 'all') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setTypeFilter('all');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredApplications.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-sm font-medium">No leave requests yet</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Student leave applications will appear here.
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="linear-table">
                <thead>
                  <tr>
                    <th className="linear-th">Student</th>
                    <th className="linear-th hidden md:table-cell">Type</th>
                    <th className="linear-th hidden lg:table-cell">Duration</th>
                    <th className="linear-th hidden lg:table-cell">Reason</th>
                    <th className="linear-th">Status</th>
                    <th className="linear-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredApplications.map((application) => (
                    <tr key={application.id} className="linear-tr group">
                      <td className="linear-td">
                        <div className="font-medium">
                          {(application.applicant as any)?.full_name || 'Unknown Student'}
                        </div>
                        {application.contact_info && (
                          <div className="text-sm text-muted-foreground mt-1">
                            {application.contact_info}
                          </div>
                        )}
                      </td>
                      <td className="linear-td hidden md:table-cell text-sm text-muted-foreground">
                        {application.leave_type.replace('_', ' ')}
                      </td>
                      <td className="linear-td hidden lg:table-cell text-sm text-muted-foreground">
                        {format(new Date(application.start_date), 'MMM dd')} – {format(new Date(application.end_date), 'MMM dd, yyyy')}
                      </td>
                      <td className="linear-td hidden lg:table-cell text-sm">
                        <div className="max-w-xs truncate">{application.reason}</div>
                      </td>
                      <td className="linear-td">
                        {application.status === 'pending' && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-500"></div>
                            <span className="text-sm">Pending</span>
                          </div>
                        )}
                        {application.status === 'approved' && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                            <span className="text-sm">Approved</span>
                          </div>
                        )}
                        {application.status === 'rejected' && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500"></div>
                            <span className="text-sm">Rejected</span>
                          </div>
                        )}
                        {application.status === 'revoked' && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground"></div>
                            <span className="text-sm">Revoked</span>
                          </div>
                        )}
                      </td>
                      <td className="linear-td">
                        <div className="flex justify-end gap-2">
                          {application.status === 'pending' && (
                            <>
                              <Button
                                size="sm"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => updateStatus(application.id, 'approved')}
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => updateStatus(application.id, 'rejected')}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Reject
                              </Button>
                            </>
                          )}
                          {application.status === 'approved' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(application.id, 'revoked')}
                            >
                              Revoke
                            </Button>
                          )}
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
