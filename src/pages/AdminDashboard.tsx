import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
import { LoadingScreen } from "@/components/ui/loading-screen";
import { AdminSidebar } from "@/components/admin/layout/AdminSidebar";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { PageTransition } from "@/components/layout/PageTransition";
import { AdminTopbar } from "@/components/admin/layout/AdminTopbar";
import { OverviewTab } from "@/components/admin/OverviewTab";
import { cn } from "@/lib/utils";

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
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<"admin" | "department_admin" | null>(null);
    const [profileData, setProfileData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<string>("overview");
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const navigate = useNavigate();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    useEffect(() => {
        checkUserRole();
    }, []);

    useEffect(() => {
        if (!userRole) return;
        setActiveTab("overview");
    }, [userRole]);

    const checkUserRole = async () => {
        try {
            const { data } = await supabase.auth.getUser();
            const user = data?.user;
            if (!user) {
                navigate("/auth");
                return;
            }

            const { data: roles } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id);

            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("user_id", user.id)
                .single();

            setProfileData(profile || null);

            if (roles && roles.length > 0) {
                const role = roles[0].role as "admin" | "department_admin";
                setUserRole(role);

                if (role === "department_admin" && profile && !profile.is_approved) {
                    toast({
                        title: "Pending Approval",
                        description: "Your account is pending approval by a super administrator.",
                        variant: "destructive",
                    });
                    await supabase.auth.signOut();
                    navigate("/auth");
                    return;
                }
                
                await loadAllData(role, profile);
            } else {
                await supabase.auth.signOut();
                navigate("/auth");
                return;
            }
        } catch (err) {
            console.error("Error checking user role:", err);
            toast({
                title: "Error",
                description: "Unable to verify user role.",
                variant: "destructive",
            });
            navigate("/auth");
        }
    };

    const loadAllData = async (role?: "admin" | "department_admin" | null, profile?: any) => {
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
            ]);
        } catch (err) {
            console.error("Error loading data:", err);
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
        navigate("/auth");
    };

    const loadSchools = async () => {
        const { data, error } = await supabase.from("schools").select("*").order("school_name");
        if (error) throw error;
        setSchools(data || []);
    };
    const loadDepartments = async () => {
        const { data, error } = await supabase.from("departments").select("*").order("dept_name");
        if (error) throw error;
        setDepartments(data || []);
    };
    const loadCourses = async (role?: "admin" | "department_admin" | null, profile?: any) => {
        const currentRole = role ?? userRole;
        const currentProfile = profile ?? profileData;
        let q = supabase.from("courses").select("*");
        if (currentRole === "department_admin" && currentProfile?.dept_id) {
            q = q.eq("dept_id", currentProfile.dept_id);
        }
        const { data, error } = await q.order("course_name");
        if (error) throw error;
        setCourses(data || []);
    };
    const loadTeachers = async (role?: "admin" | "department_admin" | null, profile?: any) => {
        const currentRole = role ?? userRole;
        const currentProfile = profile ?? profileData;
        let q = supabase.from("teachers").select("*");
        if (currentRole === "department_admin" && currentProfile?.dept_id) {
            q = q.eq("dept_id", currentProfile.dept_id);
        }
        const { data, error } = await q.order("teacher_name");
        if (error) throw error;
        setTeachers(data || []);
    };
    const loadVenues = async () => {
        const { data, error } = await supabase.from("venues").select("*").order("venue_name");
        if (error) throw error;
        setVenues(data || []);
    };
    const loadSessions = async () => {
        const { data, error } = await supabase.from("sessions").select("*").order("session_year", { ascending: false });
        if (error) throw error;
        setSessions(data || []);
    };
    const loadHolidays = async () => {
        const { data, error } = await supabase.from("holidays").select("*").order("holiday_date");
        if (error) throw error;
        const transformed = (data || []).map((h: any) => ({
            id: h.holiday_id,
            holiday_date: h.holiday_date,
            holiday_name: h.holiday_name,
            description: h.holiday_description,
            is_recurring: h.is_recurring,
        }));
        setHolidays(transformed);
    };
    const loadStudents = async (role?: "admin" | "department_admin" | null, profile?: any) => {
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

            const existingStudentIds = new Set(studentsData?.map((s: any) => s.student_id) || []);

            const profileOnlyStudents = (profilesData || [])
                .filter((p: any) => !existingStudentIds.has(p.id))
                .map((p: any) => ({
                    student_id: p.id,
                    student_name: p.full_name || 'Unknown',
                    student_enrollment_no: p.student_enrollment_no || `PENDING-${p.id}`,
                    student_email: p.email,
                    student_address: p.address,
                    dept_id: p.dept_id,
                    student_year: 1,
                    semester: p.semester || 1,
                    abc_id: p.abc_id,
                    contact_no: null,
                    created_at: p.created_at,
                    updated_at: p.updated_at
                }));

            const allStudents = [...(studentsData || []), ...profileOnlyStudents];
            setStudents(allStudents);
        } catch (error) {
            console.error('Failed to load students:', error);
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
        return <LoadingScreen message="Loading dashboard..." variant="morphing" size="lg" />;
    }

    const renderContent = () => {
        switch (activeTab) {
            case "overview":
                return (
                    <OverviewTab
                        role={userRole}
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
            default: return null;
        }
    };

    const getTabTitle = () => {
        const titles: {[key: string]: string} = {
            overview: "Overview",
            schools: "School Management",
            departments: "Department Management",
            courses: "Course Catalog",
            teachers: "Faculty Directory",
            venues: "Exam Venues",
            sessions: "Academic Sessions",
            holidays: "Holiday Calendar",
            students: "Student Records",
            seating: "Seating Arrangement",
        };
        return titles[activeTab] || "Dashboard";
    };

    const getTabDescription = () => {
        const descs: {[key: string]: string} = {
            overview: "Quick access to your most important admin tools and stats",
            schools: "Manage university schools and faculties",
            departments: "Configure academic departments",
            courses: "View and manage all course offerings",
            teachers: "Manage faculty members and assignments",
            venues: "Configure exam halls and seating capacities",
            sessions: "Set up academic years and terms",
            holidays: "Manage non-working days",
            students: "Manage student enrollments and profiles",
            seating: "Generate and view exam seating plans",
        };
        return descs[activeTab] || "Manage university data";
    };

    return (
        <div className="flex min-h-screen bg-gradient-to-b from-background to-muted/30 overflow-hidden">
            {/* Mobile Sidebar Sheet */}
            {isMobile && (
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                    <SheetContent side="left" className="p-0 w-72">
                        <AdminSidebar
                            activeTab={activeTab}
                            setActiveTab={(tab) => {
                                setActiveTab(tab);
                                setIsMobileMenuOpen(false);
                            }}
                            userRole={userRole}
                            isCollapsed={false}
                            toggleSidebar={() => {}}
                            onLogout={handleLogout}
                            onNavigate={(path) => {
                                navigate(path);
                                setIsMobileMenuOpen(false);
                            }}
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
                />
            )}

            {/* Main Content */}
            <div className={cn(
                "flex min-w-0 flex-1 flex-col",
                !isMobile && (isSidebarCollapsed ? "ml-20" : "ml-64")
            )}>
                <AdminTopbar
                    title={getTabTitle()}
                    description={getTabDescription()}
                    userLabel={profileData?.full_name || profileData?.email || undefined}
                    isMobile={isMobile}
                    onOpenSidebar={() => setIsMobileMenuOpen(true)}
                    onLogout={handleLogout}
                    onRefresh={() => loadAllData()}
                    onNavigate={(path) => navigate(path)}
                />

                <main className="min-w-0 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
                    <div className="mx-auto w-full max-w-[1680px] px-4 py-6 md:px-8 md:py-8">
                        <AnimatePresence mode="wait">
                            <PageTransition key={activeTab}>
                                <div className="overflow-hidden rounded-2xl border bg-card/70 shadow-sm backdrop-blur">
                                    {renderContent()}
                                </div>
                            </PageTransition>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
