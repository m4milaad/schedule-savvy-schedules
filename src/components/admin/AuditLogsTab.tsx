import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, RefreshCw, Download, Trash2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";

interface AuditLog {
  id: string;
  user_id: string;
  user_type: string;
  action: string;
  table_name: string;
  description: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export const AuditLogsTab = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);
      
      // Fetch audit logs
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      if (!logsData || logsData.length === 0) {
        setLogs([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(logsData.map(log => log.user_id))];
      
      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', userIds);

      if (profilesError) {
        console.warn('Could not load profile data:', profilesError);
      }

      // Merge profile data with logs
      const logsWithProfiles = logsData.map(log => ({
        ...log,
        profiles: profilesData?.find(p => p.user_id === log.user_id) || null
      }));

      setLogs(logsWithProfiles as any);
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      toast({
        title: "Error",
        description: "Failed to load audit logs",
        variant: "destructive",
      });
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const getActionBadge = (action: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' } = {
      INSERT: 'default',
      UPDATE: 'secondary',
      DELETE: 'destructive',
    };
    return <Badge variant={variants[action] || 'default'}>{action}</Badge>;
  };

  const getUserTypeBadge = (userType: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'outline' } = {
      admin: 'default',
      department_admin: 'secondary',
      student: 'outline',
    };
    return (
      <Badge variant={variants[userType] || 'outline'}>
        {userType === 'department_admin' ? 'Dept Admin' : userType}
      </Badge>
    );
  };

  const exportToCSV = () => {
    if (logs.length === 0) {
      toast({
        title: "No Data",
        description: "No logs available to export",
        variant: "destructive",
      });
      return;
    }

    const headers = ['Timestamp', 'User Name', 'User Email', 'User Type', 'Action', 'Table', 'Description'];
    const csvData = logs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.profiles?.full_name || 'Unknown',
      log.profiles?.email || log.user_id,
      log.user_type,
      log.action,
      log.table_name,
      log.description || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd_HH-mm')}.csv`;
    link.click();

    toast({
      title: "Export Complete",
      description: `Exported ${logs.length} log entries to CSV`,
    });
  };

  const clearAllLogs = async () => {
    setClearing(true);
    try {
      const { error } = await supabase
        .from('audit_logs')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      if (error) throw error;

      setLogs([]);
      toast({
        title: "Logs Cleared",
        description: "All audit logs have been deleted",
      });
    } catch (error: any) {
      console.error('Error clearing logs:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to clear logs",
        variant: "destructive",
      });
    } finally {
      setClearing(false);
    }
  };

  const getDetailedDescription = (log: AuditLog): string => {
    // Try to provide more meaningful descriptions based on table and action
    const tableFriendlyNames: { [key: string]: string } = {
      'profiles': 'Profile',
      'students': 'Student',
      'student_enrollments': 'Course Enrollment',
      'courses': 'Course',
      'teachers': 'Teacher',
      'venues': 'Venue',
      'datesheets': 'Exam Schedule',
      'seat_assignments': 'Seat Assignment',
      'departments': 'Department',
      'schools': 'School',
      'sessions': 'Session',
      'holidays': 'Holiday',
    };

    const friendlyTable = tableFriendlyNames[log.table_name] || log.table_name;

    if (log.description && log.description !== `${log.table_name} record ${log.action.toLowerCase()}d`) {
      return log.description;
    }

    switch (log.action) {
      case 'INSERT':
        return `Created new ${friendlyTable.toLowerCase()}`;
      case 'UPDATE':
        return `Updated ${friendlyTable.toLowerCase()} details`;
      case 'DELETE':
        return `Deleted ${friendlyTable.toLowerCase()}`;
      default:
        return log.description || `${friendlyTable} ${log.action.toLowerCase()}`;
    }
  };

  return (
    <Card className="transition-all duration-300 hover:shadow-md shadow-sm bg-white/40 dark:bg-black/40 backdrop-blur-xl border border-border/50 animate-fade-in">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <FileText className="w-5 h-5" />
            System Audit Logs ({logs.length})
          </CardTitle>
          <div className="flex gap-2">
            <Button
              onClick={exportToCSV}
              variant="outline"
              size="sm"
              disabled={logs.length === 0}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={logs.length === 0 || clearing}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {clearing ? 'Clearing...' : 'Clear Logs'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear All Audit Logs</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {logs.length} audit log entries. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={clearAllLogs} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Delete All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button
              onClick={loadLogs}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading logs...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No audit logs found</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Timestamp</TableHead>
                  <TableHead className="min-w-[150px]">User</TableHead>
                  <TableHead className="min-w-[100px]">User Type</TableHead>
                  <TableHead className="min-w-[100px]">Action</TableHead>
                  <TableHead className="min-w-[120px]">Table</TableHead>
                  <TableHead className="min-w-[250px]">Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log, index) => (
                  <TableRow
                    key={log.id}
                    className="transition-all duration-300 hover:bg-muted/50 animate-fade-in"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <TableCell className="font-mono text-xs">
                      {format(new Date(log.created_at), 'MMM dd, yyyy HH:mm:ss')}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {log.profiles?.full_name || (
                            <span className="text-foreground/50 italic">
                              {log.action === 'DELETE' ? 'Deleted User' : 'Unknown User'}
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-foreground/70">
                          {log.profiles?.email || log.user_id.substring(0, 8) + '...'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getUserTypeBadge(log.user_type)}
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {log.table_name}
                      </code>
                    </TableCell>
                    <TableCell className="text-sm">
                      {getDetailedDescription(log)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};