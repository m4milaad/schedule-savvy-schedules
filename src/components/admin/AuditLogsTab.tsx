import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { FileText, RefreshCw, Download, Trash2, Search, Filter, History } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from 'date-fns';
import { LoadingScreen } from "@/components/ui/loading-screen";
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
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface AuditLog {
  id: string;
  user_id: string;
  user_type: string;
  action: string;
  table_name: string;
  description: string;
  created_at: string;
  old_data?: Record<string, any> | null;
  new_data?: Record<string, any> | null;
  profiles?: {
    full_name: string;
    email: string;
  };
}

export const AuditLogsTab = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      setLoading(true);

      // Get total count first
      const { count, error: countError } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true });

      if (!countError && count !== null) {
        setTotalCount(count);
      }

      // Fetch audit logs (latest 100)
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) throw logsError;

      if (!logsData || logsData.length === 0) {
        setLogs([]);
        setTotalCount(0);
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
    const variants: { [key: string]: string } = {
      INSERT: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/15',
      UPDATE: 'bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/15',
      DELETE: 'bg-rose-500/10 text-rose-600 border-rose-500/20 hover:bg-rose-500/15',
    };
    return (
      <Badge variant="outline" className={cn("font-mono text-[10px] uppercase font-semibold", variants[action] || 'text-muted-foreground')}>
        {action}
      </Badge>
    );
  };

  const getUserTypeBadge = (userType: string) => {
    const variants: { [key: string]: string } = {
      admin: 'bg-primary/10 text-primary border-primary/20',
      department_admin: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      student: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
    };
    return (
      <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border", variants[userType] || 'bg-muted text-muted-foreground')}>
        {userType === 'department_admin' ? 'Dept Admin' : userType}
      </span>
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
        .gte('created_at', '1970-01-01'); // Delete all records

      if (error) throw error;

      setLogs([]);
      setTotalCount(0);
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

  const formatFieldName = (field: string): string => {
    return field
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\bid\b/gi, 'ID')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return 'empty';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'object') return JSON.stringify(value);
    const str = String(value);
    return str.length > 50 ? str.substring(0, 47) + '...' : str;
  };

  const getChangedFields = (oldData: Record<string, any> | null | undefined, newData: Record<string, any> | null | undefined): string[] => {
    const changes: string[] = [];
    const ignoredFields = ['updated_at', 'created_at', 'id', 'user_id', 'student_id', 'course_id', 'dept_id', 'venue_id', 'teacher_id', 'session_id', 'school_id'];

    if (!oldData && newData) {
      // INSERT - show key fields that were set
      const keyFields = ['full_name', 'email', 'student_name', 'course_name', 'course_code', 'venue_name', 'teacher_name', 'dept_name', 'school_name', 'session_name', 'holiday_name', 'student_enrollment_no', 'semester', 'is_active'];
      for (const field of keyFields) {
        if (newData[field] !== undefined && newData[field] !== null && newData[field] !== '') {
          changes.push(`${formatFieldName(field)}: ${formatValue(newData[field])}`);
        }
      }
      return changes.slice(0, 3); // Limit to 3 fields for readability
    }

    if (oldData && !newData) {
      // DELETE - show what was deleted
      const keyFields = ['full_name', 'student_name', 'course_name', 'course_code', 'venue_name', 'teacher_name', 'student_enrollment_no'];
      for (const field of keyFields) {
        if (oldData[field]) {
          changes.push(`${formatFieldName(field)}: ${formatValue(oldData[field])}`);
          break; // Just show the main identifier
        }
      }
      return changes;
    }

    if (oldData && newData) {
      // UPDATE - show what changed
      for (const key of Object.keys(newData)) {
        if (ignoredFields.includes(key)) continue;
        const oldVal = oldData[key];
        const newVal = newData[key];
        if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
          changes.push(`${formatFieldName(key)}: "${formatValue(oldVal)}" → "${formatValue(newVal)}"`);
        }
      }
    }

    return changes.slice(0, 4); // Limit to 4 changes for readability
  };

  const getDetailedDescription = (log: AuditLog): React.ReactNode => {
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
    const changes = getChangedFields(log.old_data, log.new_data);

    if (changes.length > 0) {
      return (
        <div className="space-y-1.5">
          <div className="font-medium text-xs">
            {log.action === 'INSERT' && `Created ${friendlyTable}`}
            {log.action === 'UPDATE' && `Updated ${friendlyTable}`}
            {log.action === 'DELETE' && `Deleted ${friendlyTable}`}
          </div>
          <ul className="text-[10px] text-muted-foreground space-y-0.5">
            {changes.map((change, i) => (
              <li key={i} className="flex items-start gap-1">
                <span className="w-1 h-1 rounded-full bg-border mt-1.5 flex-shrink-0" />
                {change}
              </li>
            ))}
          </ul>
        </div>
      );
    }

    // Fallback to basic description
    return (
      <span className="text-xs font-medium">
        {log.description || `${friendlyTable} ${log.action.toLowerCase()}`}
      </span>
    );
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const lowerTerm = searchTerm.toLowerCase();
    return (
      log.description?.toLowerCase().includes(lowerTerm) ||
      log.table_name?.toLowerCase().includes(lowerTerm) ||
      log.profiles?.full_name?.toLowerCase().includes(lowerTerm) ||
      log.profiles?.email?.toLowerCase().includes(lowerTerm)
    );
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 max-w-[1600px] mx-auto"
    >
      <Card className="prof-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl font-semibold tracking-tight">
                <History className="w-5 h-5 text-primary" />
                System Audit Logs
              </CardTitle>
              <CardDescription className="mt-1">
                Track and monitor system-wide activities, data changes, and access records.
              </CardDescription>
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search logs..."
                  className="pl-8 h-8 text-xs bg-muted/40"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={loadLogs} variant="outline" size="sm" className="h-8">
                <RefreshCw className={cn("w-3.5 h-3.5 mr-2", loading && "animate-spin")} />
                Refresh
              </Button>
              <Button
                onClick={exportToCSV}
                variant="outline"
                size="sm"
                className="h-8"
                disabled={logs.length === 0}
              >
                <Download className="w-3.5 h-3.5 mr-2" />
                Export
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    disabled={logs.length === 0 || clearing}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Clear
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Clear History?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete all {totalCount} audit log entries. This cannot be undone.
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
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {loading ? (
            <div className="py-20">
              <LoadingScreen
                message="Loading records..."
                variant="cascade"
                size="sm"
                fullScreen={false}
              />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-20 px-4">
              <div className="bg-muted/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <History className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <p className="font-medium text-foreground">No audit logs found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchTerm ? "Try adjusting your search query." : "Activity will appear here when changes are made."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="hover:bg-transparent border-b border-border/60">
                    <TableHead className="w-[160px] text-xs uppercase tracking-wide font-semibold pl-6">Timestamp</TableHead>
                    <TableHead className="w-[200px] text-xs uppercase tracking-wide font-semibold">User</TableHead>
                    <TableHead className="w-[120px] text-xs uppercase tracking-wide font-semibold">Action</TableHead>
                    <TableHead className="w-[140px] text-xs uppercase tracking-wide font-semibold">Entity</TableHead>
                    <TableHead className="min-w-[300px] text-xs uppercase tracking-wide font-semibold">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02, duration: 0.2 }}
                      className="group transition-colors border-b border-border/40 hover:bg-muted/30"
                    >
                      <TableCell className="font-mono text-[10px] text-muted-foreground pl-6 py-3">
                        {format(new Date(log.created_at), 'MMM dd, yyyy')}
                        <div className="text-foreground/80 font-medium">
                          {format(new Date(log.created_at), 'HH:mm:ss')}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium leading-none text-foreground/90">
                            {log.profiles?.full_name || 'Unknown User'}
                          </span>
                          <span className="text-[10px] text-muted-foreground mt-1 truncate max-w-[180px]">
                            {log.profiles?.email || log.user_id}
                          </span>
                          <div className="mt-1.5">
                            {getUserTypeBadge(log.user_type)}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge variant="secondary" className="font-normal text-[10px] text-foreground/80 bg-muted/60">
                          {log.table_name}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 pr-6">
                        {getDetailedDescription(log)}
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-center text-muted-foreground py-2">
        Showing {filteredLogs.length} of {totalCount} total records
      </div>
    </motion.div>
  );
};
