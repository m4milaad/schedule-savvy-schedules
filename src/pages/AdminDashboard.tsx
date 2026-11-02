import React, { useEffect, useState } from "react";
import { motion, MotionConfig } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useNavigate, useSearchParams } from "react-router-dom";
import { School, Department, Course, Teacher, Venue, Session, Holiday, Student } from "@/types/examSchedule";
import { SchoolsTab } from "@/components/admin/SchoolsTab";
import { DepartmentsTab } from "@/components/admin/DepartmentsTab";
import { CoursesTab } from "@/components/admin/CoursesTab";
import { TeachersTab } from "@/components/admin/TeachersTab";
import { VenuesTab } from "@/components/admin/VenuesTab";
import { SessionsTab } from "@/components/admin/SessionsTab";
import { HolidaysTab } from "@/components/admin/HolidaysTab";
import { StudentsTab } from "@/components/admin/StudentsTab";
import { SeatingArrangement } from "@/components/admin/SeatingArrangement";
import { AuditLogsTab } from "@/components/admin/AuditLogsTab";
import { ManageAdminsTab } from "@/components/admin/ManageAdminsTab";
import { AdminProfileTab } from "@/components/admin/AdminProfileTab";
import { AdminShellSkeleton, useAdminTheme } from "@/components/admin/AdminPanel";
import { customBackground } from "@/lib/adminBackground";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminTopbar } from "@/components/admin/layout/AdminTopbar";
import { formatDay, relativeDays, summariseExamDates } from "@/lib/examDates";
import { OverviewTab } from "@/components/admin/OverviewTab";
import Index from "@/pages/Index";
import ChatbotAssistant from "@/pages/ChatbotAssistant";
import { cn } from "@/lib/utils";
import logger from '@/lib/logger';


// Partial: the profile tab may set theme_color before the profile has loaded
type AdminProfile = Partial<Tables<'profiles'>>;

const AdminDashboard: React.FC = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [examDates, setExamDates] = useState<string[]>([]);
    const [pendingApprovals, setPendingApprovals] = useState(0);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<"admin" | "department_admin" | null>(null);
    const [authUserId, setAuthUserId] = useState<string | undefined>(undefined);
    const [profileData, setProfileData] = useState<AdminProfile | null>(null);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    // The open tab lives in the URL, so reload and Back return to it. Replace, so tabs don't fill history.
    const activeTab = searchParams.get("tab") || "overview";
    const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });
    const { toast } = useToast();
    const isMobile = useIsMobile();

    useEffect(() => {
        checkUserRole();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const background = customBackground(profileData?.theme_color);
    useAdminTheme(background);

    const checkUserRole = async () => {
        try {
            // Local session read (the route guard already checked it); RLS guards the data.
            const { data } = await supabase.auth.getSession();
            const user = data?.session?.user;
            if (!user) {
                navigate("/");
                return;
            }

            const [{ data: roles }, { data: profile }] = await Promise.all([
                supabase.from("user_roles").select("role").eq("user_id", user.id),
                supabase.from("profiles").select("*").eq("user_id", user.id).single(),
            ]);

            setProfileData(profile || null);
            setAuthUserId(user.id);

            if (roles && roles.length > 0) {
                const roleObj = roles[0];
                if (!roleObj) return;
                const role = roleObj.role as "admin" | "department_admin";
                setUserRole(role);

                if (role === "department_admin" && profile && !profile.is_approved) {
                    toast({
                        title: "Pending Approval",
                        description: "Your account is pending approval by a super administrator.",
                        variant: "destructive",
                    });
                    await supabase.auth.signOut();
                    navigate("/");
                    return;
                }

                await loadAllData(role, profile);
            } else {
                await supabase.auth.signOut();
                navigate("/");
                return;
            }
        } catch (err) {
            logger.error("Error checking user role:", err);
            toast({
                title: "Error",
                description: "Unable to verify user role.",
                variant: "destructive",
            });
            navigate("/");
        }
    };

    // Department admins and teachers wait for a super admin; surfaced in the bell.
    const loadPendingApprovals = async () => {
        const { count, error } = await supabase
            .from("profiles")
            .select("user_id", { count: "exact", head: true })
            .eq("is_approved", false)
            .in("user_type", ["department_admin", "teacher"]);
        if (error) throw error;
        setPendingApprovals(count ?? 0);
    };

    const loadAllData = async (role?: "admin" | "department_admin" | null, profile?: AdminProfile | null) => {
        const currentRole = role ?? userRole;
        const currentProfile = profile ?? profileData;

        try {
            setLoading(true);
            await Promise.all([
                loadSchools(),
                loadDepartments(),
                loadCourses(currentRole, currentProfile),
                loadTeachers(currentRole, currentProfile),
                loadVenues(),
                loadSessions(),
                loadHolidays(),
                loadStudents(currentRole, currentProfile),
                loadExamDates(),
                currentRole === "admin" ? loadPendingApprovals() : Promise.resolve(),
            ]);
        } catch (err) {
            logger.error("Error loading data:", err);
            toast({
                title: "Error",
                description: "Failed to load some data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        toast({ title: "Success", description: "Logged out successfully" });
        navigate("/");
    };

    const loadSchools = async () => {
        const { data, error } = await supabase.from("schools").select("*").order("school_name");
        if (error) throw error;
        setSchools((data as School[]) || []);
    };
    const loadDepartments = async () => {
        const { data, error } = await supabase.from("departments").select("*").order("dept_name");
        if (error) throw error;
        setDepartments(data || []);
    };
    const loadCourses = async (role?: "admin" | "department_admin" | null, profile?: AdminProfile | null) => {
        const currentRole = role ?? userRole;
        const currentProfile = profile ?? profileData;
        let q = supabase.from("courses").select("*");
        if (currentRole === "department_admin" && currentProfile?.dept_id) {
            q = q.eq("dept_id", currentProfile.dept_id);
        }
        const { data, error } = await q.order("course_name");
        if (error) throw error;
        setCourses((data as Course[]) || []);
    };
    const loadTeachers = async (role?: "admin" | "department_admin" | null, profile?: AdminProfile | null) => {
        const currentRole = role ?? userRole;
        const currentProfile = profile ?? profileData;
        let q = supabase.from("teachers").select("*");
        if (currentRole === "department_admin" && currentProfile?.dept_id) {
            q = q.eq("dept_id", currentProfile.dept_id);
        }
        const { data, error } = await q.order("teacher_name");
        if (error) throw error;
        setTeachers((data as Teacher[]) || []);
    };
    const loadVenues = async () => {
        const { data, error } = await supabase.from("venues").select("*").order("venue_name");
        if (error) throw error;
        setVenues((data as Venue[]) || []);
    };
    const loadSessions = async () => {
        const { data, error } = await supabase.from("sessions").select("*").order("session_year", { ascending: false });
        if (error) throw error;
        setSessions((data as Session[]) || []);
    };
    const loadHolidays = async () => {
        const { data, error } = await supabase.from("holidays").select("*").order("holiday_date");
        if (error) throw error;
        const transformed = (data || []).map((h) => ({
            id: h.holiday_id,
            holiday_date: h.holiday_date,
            holiday_name: h.holiday_name,
            description: h.holiday_description,
            is_recurring: h.is_recurring,
        }));
        setHolidays(transformed);
    };
    const loadStudents = async (role?: "admin" | "department_admin" | null, profile?: AdminProfile | null) => {
        const currentRole = role ?? userRole;
        const currentProfile = profile ?? profileData;
        try {
            let studentsQuery = supabase.from('students').select('*');
            let profilesQuery = supabase.from('profiles').select('*').eq('user_type', 'student');

            if (currentRole === 'department_admin' && currentProfile?.dept_id) {
                studentsQuery = studentsQuery.eq('dept_id', currentProfile.dept_id);
                profilesQuery = profilesQuery.eq('dept_id', currentProfile.dept_id);
            }

            const { data: studentsData, error: studentsError } = await studentsQuery.order('student_name');

            if (studentsError) throw studentsError;

            const { data: profilesData } = await profilesQuery;

            const existingStudentIds = new Set(studentsData?.map((s) => s.student_id) || []);

            const profileOnlyStudents = (profilesData || [])
                .filter((p) => !existingStudentIds.has(p.id))
                .map((p) => ({
                    student_id: p.id,
                    student_name: p.full_name || 'Unknown',
                    // profiles has no enrollment no, address or ABC ID columns
                    student_enrollment_no: `PENDING-${p.id}`,
                    student_email: p.email,
                    student_address: null,
                    dept_id: p.dept_id,
                    student_year: 1,
                    semester: p.semester || 1,
                    abc_id: null,
                    contact_no: null as string | null,
                    created_at: p.created_at,
                    updated_at: p.updated_at
                }));

            const allStudents = [...(studentsData || []), ...profileOnlyStudents];
            setStudents(allStudents as Student[]);
        } catch (error) {
            logger.error('Failed to load students:', error);
            toast({
                title: "Error",
                description: "Failed to load students data",
                variant: "destructive",
            });
        }
    };

    const loadExamDates = async () => {
        const { data } = await supabase
            .from('datesheets')
            .select('exam_date')
            .order('exam_date');
        if (data) {
            const uniqueDates = [...new Set(data.map(d => d.exam_date))];
            setExamDates(uniqueDates);
        }
    };

    if (loading) {
        return <AdminShellSkeleton />;
    }

    const renderContent = () => {
        switch (activeTab) {
            case "overview":
                return (
                    <OverviewTab
                        role={userRole}
                        adminName={profileData?.full_name}
                        examDates={examDates}
                        setActiveTab={setActiveTab}
                        counts={{
                            schools: schools.length,
                            departments: departments.length,
                            courses: courses.length,
                            teachers: teachers.length,
                            venues: venues.length,
                            sessions: sessions.length,
                            holidays: holidays.length,
                            students: students.length,
                            examDates: examDates.length,
                        }}
                    />
                );
            case "schools": return <SchoolsTab schools={schools} onRefresh={loadSchools} />;
            case "departments": return <DepartmentsTab departments={departments} schools={schools} onRefresh={loadDepartments} />;
            case "courses": return <CoursesTab courses={courses} departments={departments} onRefresh={loadCourses} />;
            case "teachers": return <TeachersTab teachers={teachers} departments={departments} onRefresh={loadTeachers} />;
            case "venues": return <VenuesTab venues={venues} onRefresh={loadVenues} userDeptId={profileData?.dept_id} />;
            case "sessions": return <SessionsTab sessions={sessions} onRefresh={loadSessions} />;
            case "holidays": return <HolidaysTab holidays={holidays} onRefresh={loadHolidays} />;
            case "students": return <StudentsTab students={students} departments={departments} onRefresh={loadStudents} />;
            case "seating": return <SeatingArrangement examDates={examDates} userDeptId={profileData?.dept_id} />;
            case "generator": return <Index embedded />;
            case "assistant": return <ChatbotAssistant embedded />;
            case "logs": return <AuditLogsTab />;
            case "admins": return <ManageAdminsTab />;
            case "profile": return <AdminProfileTab onBackgroundChange={(theme_color) => setProfileData((p) => ({ ...(p ?? {}), theme_color }))} />;
            default: return null;
        }
    };

    const getTabTitle = () => {
        const titles: { [key: string]: string } = {
            overview: "Overview",
            schools: "Schools",
            departments: "Departments",
            courses: "Courses",
            teachers: "Teachers",
            venues: "Exam venues",
            sessions: "Sessions",
            holidays: "Holidays",
            students: "Students",
            seating: "Seating",
            generator: "Datesheet generator",
            assistant: "Assistant",
            logs: "Audit log",
            admins: "Administrators",
            profile: "Profile",
        };
        return titles[activeTab] || "Overview";
    };

    // One line about the data on screen, never about the interface.
    const getTabDescription = () => {
        const n = (count: number, one: string, many: string) => `${count.toLocaleString("en-IN")} ${count === 1 ? one : many}`;
        const depts = n(departments.length, "department", "departments");
        const seats = venues.reduce((sum, v) => sum + (v.venue_capacity || 0), 0);
        const { next, daysUntilNext } = summariseExamDates(examDates);
        const descs: { [key: string]: string } = {
            overview: next && daysUntilNext !== null
                ? `Next exam ${formatDay(next)}, ${relativeDays(daysUntilNext)}`
                : "No upcoming exams on the datesheet",
            schools: `${n(schools.length, "school", "schools")}, ${depts}`,
            departments: `${depts} across ${n(schools.length, "school", "schools")}`,
            courses: n(courses.length, "course", "courses"),
            teachers: n(teachers.length, "teacher", "teachers"),
            venues: `${n(venues.length, "venue", "venues")}, ${n(seats, "seat", "seats")} in total`,
            sessions: n(sessions.length, "session", "sessions"),
            holidays: n(holidays.length, "holiday", "holidays"),
            students: n(students.length, "student", "students"),
            seating: n(examDates.length, "exam day", "exam days") + " on the datesheet",
            assistant: "Answers from CUK and UGC documents, with citations",
            generator: `${n(courses.length, "course", "courses")} available to schedule`,
            admins: "Who can sign in to this dashboard, and their approval",
            logs: "Every change made from this dashboard",
            profile: "Your account details and password",
        };
        return descs[activeTab];
    };

    return (
        <div className="flex min-h-screen overflow-hidden bg-background">
            {/* Mobile Sidebar Sheet */}
            {isMobile && (
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetContent side="left" className="p-0 w-72 [&>button]:hidden" aria-describedby={undefined}>
                        <SheetTitle className="sr-only">Navigation</SheetTitle>
                        <AdminSidebar
                            activeTab={activeTab}
                            setActiveTab={(tab) => {
                                setActiveTab(tab);
                                setIsMobileMenuOpen(false);
                            }}
                            userRole={userRole}
                            isCollapsed={false}
                            toggleSidebar={() => setIsMobileMenuOpen(false)}
                            onLogout={handleLogout}
                            onNavigate={(path) => {
                                navigate(path);
                                setIsMobileMenuOpen(false);
                            }}
                            isInsideSheet
                            userLabel={profileData?.full_name || profileData?.email || undefined}
                        />
                    </SheetContent>
                </Sheet>
            )}

            {/* Desktop Sidebar */}
            {!isMobile && (
                <AdminSidebar
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    userRole={userRole}
                    isCollapsed={isSidebarCollapsed}
                    toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    onLogout={handleLogout}
                    onNavigate={navigate}
                    userLabel={profileData?.full_name || profileData?.email || undefined}
                />
            )}

            {/* Main Content */}
            <div
                className={cn(
                    "flex min-w-0 flex-1 flex-col transition-[margin] duration-200 ease-out",
                    !isMobile && (isSidebarCollapsed ? "ml-16" : "ml-60")
                )}
            >
                <AdminTopbar
                    title={getTabTitle()}
                    description={getTabDescription()}
                    userLabel={profileData?.full_name || profileData?.email || undefined}
                    userId={authUserId}
                    isMobile={isMobile}
                    onOpenSidebar={() => setIsMobileMenuOpen(true)}
                    onLogout={handleLogout}
                    onRefresh={() => loadAllData()}
                    onOpenProfile={() => setActiveTab("profile")}
                    notificationsPinned={pendingApprovals > 0 ? [{
                        id: "pending-approvals",
                        title: `${pendingApprovals} ${pendingApprovals === 1 ? "account is" : "accounts are"} waiting for approval`,
                        message: "Review them in Administrators.",
                        onSelect: () => setActiveTab("admins"),
                    }] : undefined}
                />

                <main className="min-w-0 flex-1 overflow-y-auto">
                    <div className="mx-auto w-full max-w-[1440px] px-4 py-4 md:px-8 md:pb-8 md:pt-0">
                        {isMobile && getTabDescription() && (
                            <p className="mb-4 text-sm text-muted-foreground">{getTabDescription()}</p>
                        )}
                        <MotionConfig reducedMotion="user">
                            <motion.div
                                key={activeTab}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.18, ease: "easeOut" }}
                            >
                                {renderContent()}
                            </motion.div>
                        </MotionConfig>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
