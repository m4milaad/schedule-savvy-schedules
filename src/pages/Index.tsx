import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Save, Download, RefreshCw, Calendar, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { DropResult } from "react-beautiful-dnd";
import { createWorkbook, addWorksheetFromJson, downloadWorkbook } from "@/utils/excelUtils";
import { normalizeCourseCode } from "@/utils/courseUtils";
import { useExamData } from "@/hooks/useExamData";
import { CourseTeacher, Holiday } from "@/types/examSchedule";
import { getExamTimeSlot } from "@/utils/scheduleUtils";
import { ScheduleTable } from "@/components/exam-schedule/ScheduleTable";
import { ScheduleSettings } from "@/components/exam-schedule/ScheduleSettings";
import { supabase } from "@/integrations/supabase/client";
import { CourseEnrollmentCard } from "@/components/exam-schedule/CourseEnrollmentCard";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { AdminTopbar } from "@/components/admin/layout/AdminTopbar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/layout/PageTransition";
import logger from "@/lib/logger";

interface IndexProps {
  embedded?: boolean;
}

export default function Index({ embedded = false }: IndexProps) {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [selectedCourseTeachers, setSelectedCourseTeachers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingGap, setEditingGap] = useState<string | null>(null);
  const [tempGapValue, setTempGapValue] = useState<number>(0);
  const [courseEnrollmentCounts, setCourseEnrollmentCounts] = useState<Record<string, number>>({});
  const [studentCourseMap, setStudentCourseMap] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<"selection" | "schedule">("selection");
  const [profileData, setProfileData] = useState<Record<string, unknown> | null>(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .single();
        setProfileData(profile || null);
      }
    };
    void loadProfile();
  }, []);

  const {
    courseTeachers,
    holidays,
    holidaysData,
    generatedSchedule,
    setGeneratedSchedule,
    isScheduleGenerated,
    setIsScheduleGenerated,
    loadingLastSchedule,
    loadLastSchedule,
    updateCourseGap,
    saveScheduleToDatabase,
  } = useExamData();

  useEffect(() => {
    if (courseTeachers.length > 0) void loadEnrollmentCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseTeachers]);

  const calculateMinimumDaysForEndDate = () => {
    const allSelected = courseTeachers.filter(ct => selectedCourseTeachers.includes(ct.id));
    if (allSelected.length === 0) return 30;
    const unique = new Map<string, CourseTeacher>();
    allSelected.forEach(c => {
      const code = normalizeCourseCode(c.course_code);
      if (!unique.has(code)) unique.set(code, c);
    });
    const merged = Array.from(unique.values());
    const bySem = merged.reduce((acc, c) => {
      if (!acc[c.semester]) acc[c.semester] = [];
      acc[c.semester]?.push(c);
      return acc;
    }, {} as Record<number, CourseTeacher[]>);
    const reqs = Object.values(bySem).map(cs => {
      const maxGap = Math.max(...cs.map(c => c.gap_days || 2));
      return Math.max(cs.length, (cs.length - 1) * maxGap + 1);
    });
    return Math.max(...reqs);
  };

  useEffect(() => {
    if (startDate && !endDate) {
      const days = calculateMinimumDaysForEndDate();
      const end = new Date(startDate);
      end.setDate(end.getDate() + Math.ceil(days * 1.5));
      setEndDate(end);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, selectedCourseTeachers]);

  const loadEnrollmentCounts = async () => {
    try {
      const { data, error } = await supabase
        .from("student_enrollments")
        .select("course_id, student_id")
        .eq("is_active", true);
      if (error) throw error;
      const counts: Record<string, Set<string>> = {};
      data?.forEach((e: Record<string, unknown>) => {
        if (typeof e.course_id === 'string' && typeof e.student_id === 'string') {
          if (!counts[e.course_id]) counts[e.course_id] = new Set();
          counts[e.course_id]?.add(e.student_id);
        }
      });
      const nums: Record<string, number> = {};
      Object.keys(counts).forEach(id => { nums[id] = counts[id]?.size || 0; });
      setCourseEnrollmentCounts(nums);
      setSelectedCourseTeachers(
        courseTeachers.filter(ct => (nums[ct.course_id] ?? 0) > 0).map(ct => ct.id)
      );
    } catch (err) {
      logger.error("Error loading enrollment counts:", err);
    }
  };

  const getDateRangeInfo = () => {
    if (!startDate || !endDate) return null;
    let totalDays = 0, workingDays = 0, weekendDays = 0;
    const holidaysInRange: Holiday[] = [];
    const cur = new Date(startDate);
    while (cur <= endDate) {
      totalDays++;
      const dow = cur.getDay();
      const isWeekend = dow === 0 || dow === 6;
      const holiday = holidaysData.find(h => new Date(h.holiday_date).toDateString() === cur.toDateString());
      if (holiday) holidaysInRange.push(holiday);
      if (isWeekend) weekendDays++;
      else if (!holiday) workingDays++;
      cur.setDate(cur.getDate() + 1);
    }
    return { totalDays, workingDays, weekendDays, holidaysInRange, holidayCount: holidaysInRange.length };
  };

  const calculateMinimumRequiredDays = () => {
    if (!startDate || !endDate) return null;
    const allSelected = courseTeachers.filter(ct => selectedCourseTeachers.includes(ct.id));
    if (allSelected.length === 0) return null;
    const unique = new Map<string, CourseTeacher>();
    allSelected.forEach(c => {
      const code = normalizeCourseCode(c.course_code);
      if (!unique.has(code)) unique.set(code, c);
    });
    const merged = Array.from(unique.values());
    const totalCourses = merged.length;
    const avgGap = merged.reduce((s, c) => s + (c.gap_days || 2), 0) / totalCourses;
    const minimumDays = totalCourses === 1 ? 1 : Math.ceil(totalCourses + (avgGap * (totalCourses - 1)) / 2);
    return {
      totalCourses,
      minimumDays,
      studentBreakdown: merged.map(c => ({
        courseCode: c.course_code,
        studentCount: courseEnrollmentCounts[c.course_id] || 0,
        gapDays: c.gap_days || 2,
      })),
    };
  };

  const getAllAvailableCourses = () =>
    [...courseTeachers].sort((a, b) => {
      const aS = selectedCourseTeachers.includes(a.id);
      const bS = selectedCourseTeachers.includes(b.id);
      if (aS !== bS) return aS ? -1 : 1;
      return (courseEnrollmentCounts[b.course_id] || 0) - (courseEnrollmentCounts[a.course_id] || 0);
    });

  const handleEditGap = (courseId: string, currentGap: number) => {
    setEditingGap(courseId);
    setTempGapValue(currentGap);
  };

  const handleSaveGap = async (courseId: string) => {
    if (tempGapValue < 0 || tempGapValue > 10) {
      toast({ title: "Invalid Value", description: "Gap days must be between 0 and 10", variant: "destructive" });
      return;
    }
    await updateCourseGap(courseId, tempGapValue);
    setEditingGap(null);
  };

  const handleCancelGap = () => { setEditingGap(null); setTempGapValue(0); };

  const generateSchedule = async () => {
    if (!startDate || !endDate) {
      toast({ title: "Error", description: "Please select both start and end dates", variant: "destructive" });
      return;
    }
    if (endDate < startDate) {
      toast({ title: "Error", description: "End date must be after start date", variant: "destructive" });
      return;
    }
    const minInfo = calculateMinimumRequiredDays();
    const rangeInfo = getDateRangeInfo();
    if (minInfo && rangeInfo && rangeInfo.workingDays < minInfo.minimumDays) {
      const shortfall = minInfo.minimumDays - rangeInfo.workingDays;
      toast({
        title: "Insufficient Time Range",
        description: `Need at least ${minInfo.minimumDays} working days for ${minInfo.totalCourses} courses, but only ${rangeInfo.workingDays} available. Extend end date by ${shortfall} more working days.`,
        variant: "destructive",
      });
      return;
    }
    const allSelected = courseTeachers.filter(ct => selectedCourseTeachers.includes(ct.id));
    if (allSelected.length === 0) {
      toast({ title: "Error", description: "Please select at least one course", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      const { data: enrollments, error: enrollErr } = await supabase
        .from("student_enrollments").select("student_id, course_id").eq("is_active", true);
      if (enrollErr) logger.error("Enrollment load error:", enrollErr);
      const codeById = new Map(courseTeachers.map(ct => [ct.course_id, ct.course_code]));
      const newMap: Record<string, string[]> = {};
      enrollments?.forEach((e: Record<string, unknown>) => {
        if (typeof e.course_id !== 'string') return;
        const code = codeById.get(e.course_id);
        if (typeof e.student_id === 'string' && code) {
          if (!newMap[e.student_id]) newMap[e.student_id] = [];
          newMap[e.student_id]?.push(code);
        }
      });
      setStudentCourseMap(newMap);
      const { generateEnhancedSchedule } = await import("@/utils/scheduleAlgorithm");
      const schedule = generateEnhancedSchedule(allSelected, startDate, endDate, holidays, newMap);
      setGeneratedSchedule(schedule);
      setIsScheduleGenerated(true);
      setActiveTab("schedule");
      toast({ title: "Success", description: `Generated schedule for ${schedule.length} exams` });
    } catch (err) {
      logger.error("Schedule generation error:", err);
      toast({ title: "Error", description: err instanceof Error ? err.message : "Failed to generate schedule", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const performMove = (draggableId: string, targetDate: Date) => {
    const updated = generatedSchedule.map(exam =>
      exam.id === draggableId
        ? {
            ...exam,
            date: targetDate,
            exam_date: targetDate.toISOString().split("T")[0] ?? '',
            dayOfWeek: targetDate.toLocaleDateString("en-US", { weekday: "long" }),
            day_of_week: targetDate.toLocaleDateString("en-US", { weekday: "long" }),
            timeSlot: getExamTimeSlot(targetDate),
            time_slot: getExamTimeSlot(targetDate),
          }
        : exam
    );
    updated.sort((a, b) => a.date.getTime() - b.date.getTime());
    setGeneratedSchedule(updated);
    const moved = generatedSchedule.find(e => e.id === draggableId);
    toast({ title: "Exam Moved", description: `${moved?.courseCode} moved to ${targetDate.toLocaleDateString()}` });
  };

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;
    const dragged = generatedSchedule.find(e => e.id === draggableId);
    if (!dragged) return;
    const targetDate = new Date(destination.droppableId.replace("date-", ""));
    const onTarget = generatedSchedule.filter(e => e.date.toDateString() === targetDate.toDateString() && e.id !== dragged.id);
    const draggedCode = normalizeCourseCode(dragged.course_code);
    const draggedStudents = Object.keys(studentCourseMap).filter(sid =>
      (studentCourseMap[sid] ?? []).some(c => normalizeCourseCode(c) === draggedCode)
    );
    for (const exam of onTarget) {
      const examCode = normalizeCourseCode(exam.course_code);
      const examStudents = Object.keys(studentCourseMap).filter(sid =>
        (studentCourseMap[sid] ?? []).some(c => normalizeCourseCode(c) === examCode)
      );
      const conflicts = draggedStudents.filter(sid => examStudents.includes(sid));
      if (conflicts.length > 0) {
        toast({
          title: "Cannot Move Exam",
          description: `${conflicts.length} student(s) enrolled in both courses. Would create a conflict.`,
          variant: "destructive",
          action: <Button variant="outline" size="sm" onClick={() => performMove(draggableId, targetDate)}>Override</Button>,
        });
        return;
      }
    }
    if (onTarget.length >= 4) {
      toast({
        title: "Cannot Move Exam",
        description: `Maximum 4 exams per day. ${targetDate.toLocaleDateString()} is full.`,
        variant: "destructive",
        action: <Button variant="outline" size="sm" onClick={() => performMove(draggableId, targetDate)}>Override</Button>,
      });
      return;
    }
    if (!dragged.is_first_paper) {
      const draggedNorm = normalizeCourseCode(dragged.course_code);
      const draggedStu = Object.keys(studentCourseMap).filter(sid =>
        (studentCourseMap[sid] ?? []).some(c => normalizeCourseCode(c) === draggedNorm)
      );
      for (const exam of generatedSchedule) {
        if (exam.id === dragged.id) continue;
        const examNorm = normalizeCourseCode(exam.course_code);
        const examStu = Object.keys(studentCourseMap).filter(sid =>
          (studentCourseMap[sid] ?? []).some(c => normalizeCourseCode(c) === examNorm)
        );
        const shared = draggedStu.filter(sid => examStu.includes(sid));
        if (shared.length > 0) {
          const diff = Math.abs(Math.floor((targetDate.getTime() - new Date(exam.exam_date).getTime()) / 86400000));
          if (diff < dragged.gap_days) {
            toast({
              title: "Gap Requirement Not Met",
              description: `${shared.length} student(s) have ${exam.course_code} with only ${diff} day gap. Requires ${dragged.gap_days}.`,
              variant: "destructive",
              action: <Button variant="outline" size="sm" onClick={() => performMove(draggableId, targetDate)}>Override</Button>,
            });
            return;
          }
        }
      }
    }
    performMove(draggableId, targetDate);
  };

  const handleSaveSchedule = async () => {
    if (generatedSchedule.length === 0) {
      toast({ title: "Error", description: "Please generate a schedule first", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      await saveScheduleToDatabase(generatedSchedule);
    } catch (err) {
      logger.error("Save error:", err);
      toast({ title: "Error", description: "Failed to save exam schedule", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (generatedSchedule.length === 0) {
      toast({ title: "Error", description: "Please generate a schedule first", variant: "destructive" });
      return;
    }
    try {
      const excelData = [...generatedSchedule]
        .sort((a, b) => new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime())
        .map(exam => ({
          Date: new Date(exam.exam_date).toLocaleDateString(),
          Day: exam.day_of_week,
          Time: exam.time_slot,
          "Course Code": exam.course_code,
          "Teacher Name": exam.teacher_name,
          Semester: exam.semester,
          Program: exam.program_type,
          "Gap Days": exam.gap_days,
          "First Paper": exam.is_first_paper ? "Yes" : "No",
          Venue: exam.venue_name,
        }));
      const columns = [
        { key: "Date", label: "Date", width: 12 },
        { key: "Day", label: "Day", width: 10 },
        { key: "Time", label: "Time", width: 18 },
        { key: "Course Code", label: "Course Code", width: 12 },
        { key: "Teacher Name", label: "Teacher Name", width: 15 },
        { key: "Semester", label: "Semester", width: 10 },
        { key: "Program", label: "Program", width: 10 },
        { key: "Gap Days", label: "Gap Days", width: 10 },
        { key: "First Paper", label: "First Paper", width: 12 },
        { key: "Venue", label: "Venue", width: 15 },
      ];
      const workbook = createWorkbook();
      addWorksheetFromJson(workbook, "Exam Schedule", excelData, columns as unknown as { key: string; label: string; width?: number }[]);
      await downloadWorkbook(workbook, `exam-schedule-${new Date().toISOString().split("T")[0]}.xlsx`);
      toast({ title: "Success", description: "Excel file downloaded successfully!" });
    } catch (err) {
      logger.error("Excel error:", err);
      toast({ title: "Error", description: "Failed to generate Excel file", variant: "destructive" });
    }
  };

  const toggleCourseTeacher = (id: string) =>
    setSelectedCourseTeachers(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const selectAllCourses = () => setSelectedCourseTeachers(courseTeachers.map(ct => ct.id));
  const deselectAllCourses = () => setSelectedCourseTeachers([]);
  const selectEnrolledCourses = () =>
    setSelectedCourseTeachers(courseTeachers.filter(ct => (courseEnrollmentCounts[ct.course_id] || 0) > 0).map(ct => ct.id));

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const dateRangeInfo = getDateRangeInfo();
  const minimumDaysInfo = calculateMinimumRequiredDays();

  const renderGeneratorTabs = () => (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "selection" | "schedule")}>

      {/* ── Toolbar card with tabs + actions ── */}
      <Card className="linear-surface overflow-hidden mb-6">
        <CardHeader className="linear-toolbar">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Exam Planner</div>
              <CardTitle className="text-base font-semibold">Schedule Generator</CardTitle>
            </div>
            <div className="flex items-center gap-3">
              <TabsList>
                <TabsTrigger value="selection" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="hidden sm:inline">Course Selection</span>
                  <span className="sm:hidden">Courses</span>
                </TabsTrigger>
                <TabsTrigger value="schedule" disabled={!isScheduleGenerated} className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span className="hidden sm:inline">Date Sheet</span>
                  <span className="sm:hidden">Sheet</span>
                  {isScheduleGenerated && (
                    <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full leading-none">
                      {generatedSchedule.length}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void loadLastSchedule();
                  }}
                  disabled={loadingLastSchedule}
                >
                  <RefreshCw className={cn("w-4 h-4", loadingLastSchedule && "animate-spin")} />
                  <span className="hidden sm:inline ml-2">Reload Last</span>
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* ── Course Selection Tab ── */}
      <TabsContent value="selection" className="mt-0">
        <Card className="linear-surface overflow-hidden">
          <CardHeader className="linear-toolbar">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="linear-pill">
                <span className="font-medium text-foreground">{selectedCourseTeachers.length}</span>
                <span className="text-muted-foreground">/</span>
                <span className="font-medium text-foreground">{courseTeachers.length}</span>
                <span className="hidden sm:inline text-muted-foreground">courses selected</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={selectEnrolledCourses}>With Students</Button>
                <Button variant="outline" size="sm" onClick={selectAllCourses}>Select All</Button>
                <Button variant="outline" size="sm" onClick={deselectAllCourses}>Clear</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <div className="grid lg:grid-cols-4 gap-6">
              <ScheduleSettings
                startDate={startDate}
                endDate={endDate}
                holidays={holidays}
                dateRangeInfo={dateRangeInfo}
                minimumDaysInfo={minimumDaysInfo}
                isScheduleGenerated={isScheduleGenerated}
                loading={loading}
                onStartDateChange={setStartDate}
                onEndDateChange={setEndDate}
                onGenerateSchedule={() => {
                  void generateSchedule();
                }}
                onSaveSchedule={() => {
                  void handleSaveSchedule();
                }}
                onDownloadExcel={() => {
                  void handleDownloadExcel();
                }}
              />
              <div className="lg:col-span-3">
                {courseTeachers.length === 0 ? (
                  <div className="py-14 text-center">
                    <div className="text-sm font-medium">No courses found</div>
                    <div className="mt-1 text-sm text-muted-foreground">Add courses in the admin panel first.</div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {getAllAvailableCourses().map(ct => (
                      <CourseEnrollmentCard
                        key={ct.id}
                        courseTeacher={ct}
                        isSelected={selectedCourseTeachers.includes(ct.id)}
                        onToggle={() => toggleCourseTeacher(ct.id)}
                        editingGap={editingGap}
                        tempGapValue={tempGapValue}
                        onEditGap={handleEditGap}
                        onSaveGap={(courseId) => {
                          void handleSaveGap(courseId);
                        }}
                        onCancelGap={handleCancelGap}
                        onTempGapChange={setTempGapValue}
                        enrollmentCount={courseEnrollmentCounts[ct.course_id] || 0}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── Date Sheet Tab ── */}
      <TabsContent value="schedule" className="mt-0">
        <Card className="linear-surface overflow-hidden">
          <CardHeader className="linear-toolbar">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="linear-kicker">Output</div>
                <CardTitle className="text-base font-semibold">Generated Date Sheet</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    void handleSaveSchedule();
                  }}
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void handleDownloadExcel();
                  }}
                >
                  <Download className="w-4 h-4 mr-2" />Excel
                </Button>
                <div className="linear-pill">
                  <span className="font-medium text-foreground">{generatedSchedule.length}</span>
                  <span className="hidden sm:inline text-muted-foreground">exams</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScheduleTable generatedSchedule={generatedSchedule} onDragEnd={onDragEnd} />
          </CardContent>
        </Card>
      </TabsContent>

    </Tabs>
  );

  if (embedded) {
    return (
      <TooltipProvider>
        <div className="w-full">
          {renderGeneratorTabs()}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex min-h-screen overflow-hidden transition-colors duration-300",
          !profileData?.theme_color && "bg-gradient-to-b from-background to-muted/30"
        )}
        style={{ backgroundColor: profileData?.theme_color || undefined }}
      >
        {/* Mobile Sidebar Sheet */}
        {isMobile && (
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetContent side="left" className="p-0 w-72 [&>button]:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
              <AdminSidebar
                activeTab="generator"
                setActiveTab={(tab) => { navigate(`/admin-dashboard?tab=${tab}`); setIsMobileMenuOpen(false); }}
                userRole={profileData?.user_type === "admin" ? "admin" : "department_admin"}
                isCollapsed={false}
                toggleSidebar={() => setIsMobileMenuOpen(false)}
                onLogout={() => {
              void handleLogout();
            }}
                onNavigate={(path) => { navigate(path); setIsMobileMenuOpen(false); }}
                isInsideSheet
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Desktop Sidebar */}
        {!isMobile && (
          <AdminSidebar
            activeTab="generator"
            setActiveTab={(tab) => navigate(`/admin-dashboard?tab=${tab}`)}
            userRole={profileData?.user_type === "admin" ? "admin" : "department_admin"}
            isCollapsed={isSidebarCollapsed}
            toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            onLogout={() => {
              void handleLogout();
            }}
            onNavigate={navigate}
          />
        )}

        {/* Main Content */}
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col transition-[margin] duration-300 ease-out",
            !isMobile && (isSidebarCollapsed ? "ml-20" : "ml-64")
          )}
        >
          <AdminTopbar
            title="Schedule Generator"
            description="Generate and manage exam schedules"
            userLabel={profileData?.full_name || profileData?.email || undefined}
            userId={profileData?.user_id}
            isMobile={isMobile}
            onOpenSidebar={() => setIsMobileMenuOpen(true)}
            onLogout={() => {
              void handleLogout();
            }}
            onRefresh={() => {
              void loadLastSchedule();
            }}
            onNavigate={navigate}
          />

          <main className="min-w-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
            <div className="mx-auto w-full max-w-[1680px] px-4 py-6 md:px-8 md:py-8">
              <AnimatePresence mode="wait">
                <PageTransition key="generator">
                  {renderGeneratorTabs()}
                </PageTransition>
              </AnimatePresence>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
