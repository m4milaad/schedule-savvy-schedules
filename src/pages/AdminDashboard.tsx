import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Home, Menu, Shield, User, List, Lock } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
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
import { Footer } from "@/components/Footer";
import { AuditLogsTab } from "@/components/admin/AuditLogsTab";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";

const AdminDashboard: React.FC = () => {
    const [schools, setSchools] = useState<School[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [venues, setVenues] = useState<Venue[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [holidays, setHolidays] = useState<Holiday[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [userRole, setUserRole] = useState<"admin" | "department_admin" | null>(null);
    const [profileData, setProfileData] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<string>("courses"); // safe default

    const navigate = useNavigate();
    const { toast } = useToast();
    const isMobile = useIsMobile();

    useEffect(() => {
        checkUserRole();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Ensure activeTab updates sensibly after userRole known
    useEffect(() => {
        if (!userRole) return;
        // Prefer "schools" for admin, otherwise "courses"
        setActiveTab(userRole === "admin" ? "schools" : "courses");
    }, [userRole]);

    const checkUserRole = async () => {
        try {
            const { data } = await supabase.auth.getUser();
            const user = data?.user;
            if (!user) {
                // not signed in, redirect
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
                
                // Pass role and profile directly to avoid state timing issues
                await loadAllData(role, profile);
            } else {
                // no roles - sign out for safety
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

    // Data loaders (kept defensive)
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

            // Filter by department for department admins
            if (currentRole === 'department_admin' && currentProfile?.dept_id) {
                studentsQuery = studentsQuery.eq('dept_id', currentProfile.dept_id);
                profilesQuery = profilesQuery.eq('dept_id', currentProfile.dept_id);
            }

            // Get all students from students table
            const { data: studentsData, error: studentsError } = await studentsQuery.order('student_name');

            if (studentsError) {
                console.error('Error loading students:', studentsError);
                throw studentsError;
            }

            // Also get profiles that are students but don't have student records
            const { data: profilesData, error: profilesError } = await profilesQuery;

            if (profilesError) {
                console.error('Error loading profiles:', profilesError);
            }

            // Create a set of student IDs we already have in students table
            const existingStudentIds = new Set(studentsData?.map((s: any) => s.student_id) || []);

            // Add profile-only students to the list
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
                    <p>Loading admin dashboard...</p>
                </div>
            </div>
        );
    }

    // top nav buttons (responsive)
    const navigationButtons = (
        <div className="flex flex-wrap justify-center md:justify-end gap-2 md:gap-3">
            <ThemeToggle />
            {userRole === "admin" && (
                <>
                    <Button onClick={() => navigate("/manage-admins")} variant="outline" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base hover:scale-105 transition-all">
                        <Shield className="w-4 h-4" />
                        Manage Admins
                    </Button>
                    <Button onClick={() => navigate("/schedule-generator")} variant="outline" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base hover:scale-105 transition-all">
                        <Home className="w-4 h-4" />
                        Schedule Generator
                    </Button>
                    <Button onClick={() => navigate("/admin-logs")} variant="outline" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base hover:scale-105 transition-all">
                        <List className="w-4 h-4" />
                        View Logs
                    </Button>
                    <Button onClick={() => navigate("/update-password")} variant="outline" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base hover:scale-105 transition-all">
                        <Lock className="w-4 h-4" />
                        Update Password
                    </Button>
                </>
            )}
            {userRole === "department_admin" && (
                <Button onClick={() => navigate("/department-admin-profile")} variant="outline" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base hover:scale-105 transition-all">
                    <User className="w-4 h-4" />
                    My Profile
                </Button>
            )}
            <Button onClick={handleLogout} variant="outline" className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm sm:text-base hover:scale-105 transition-all">
                <Home className="w-4 h-4" />
                Logout
            </Button>
        </div>
    );

    return (
        <div 
            className="min-h-screen bg-background flex flex-col transition-colors duration-500"
            style={profileData?.theme_color ? { backgroundColor: profileData.theme_color } : undefined}
        >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
                {/* Enhanced Header with Glassmorphism */}
                <div className="mb-6 md:mb-8 p-4 md:p-6 rounded-xl shadow-2xl border border-white/30 bg-white/30 dark:bg-black/30 backdrop-blur-xl animate-fade-in">
                    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                        <div className="text-center md:text-left">
                            <div className="flex justify-center md:justify-start items-center gap-3 mb-2">
                                <img src="/favicon.ico" alt="CUK Logo" className="hidden md:block w-10 h-10 transition-transform hover:scale-110" />
                                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Dashboard</h1>
                            </div>
                            <p className="text-muted-foreground text-sm md:text-base">Manage university data and settings</p>
                        </div>

                    {/* Desktop navigation */}
                    {!isMobile && navigationButtons}

                    {/* Mobile sheet */}
                    {isMobile && (
                        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                            <SheetTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Menu className="w-4 h-4" />
                                </Button>
                            </SheetTrigger>
                            <SheetContent side="right" className="w-72">
                                <div className="flex flex-col gap-4 mt-6">
                                    <div className="flex items-center gap-3 mb-4">
                                        <img src="/favicon.ico" alt="CUK Logo" className="hidden md:block w-8 h-8" />
                                        <span className="font-semibold">Admin Menu</span>
                                    </div>
                                    {navigationButtons}
                                </div>
                            </SheetContent>
                        </Sheet>
                    )}
                    </div>
                </div>

                {/* Tabs area: desktop uses Tabs component (controlled), mobile uses Select dropdown */}
                {isMobile ? (
                    <div className="mb-4">
                        <Select value={activeTab} onValueChange={(val) => setActiveTab(val)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a section" />
                            </SelectTrigger>
                            <SelectContent>
                                {userRole === "admin" && (
                                    <>
                                        <SelectItem value="schools">Schools</SelectItem>
                                        <SelectItem value="departments">Departments</SelectItem>
                                    </>
                                )}
                                <SelectItem value="courses">Courses</SelectItem>
                                <SelectItem value="teachers">Teachers</SelectItem>
                                <SelectItem value="venues">Venues</SelectItem>
                                <SelectItem value="sessions">Sessions</SelectItem>
                                <SelectItem value="holidays">Holidays</SelectItem>
                                <SelectItem value="students">Students</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    // Controlled Tabs (activeTab drives which content is visible)
                    <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val)}>
                        <TabsList className="inline-flex flex-wrap justify-center gap-2 p-2 rounded-xl bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/30 shadow-lg mb-4 w-auto">
                            {userRole === "admin" && (
                                <>
                                    <TabsTrigger value="schools">Schools</TabsTrigger>
                                    <TabsTrigger value="departments">Departments</TabsTrigger>
                                </>
                            )}
                            <TabsTrigger value="courses">Courses</TabsTrigger>
                            <TabsTrigger value="teachers">Teachers</TabsTrigger>
                            <TabsTrigger value="venues">Venues</TabsTrigger>
                            {userRole === "admin" && (
                                <>
                                    <TabsTrigger value="sessions">Sessions</TabsTrigger>
                                    <TabsTrigger value="holidays">Holidays</TabsTrigger>
                                </>
                            )}
                            <TabsTrigger value="students">Students</TabsTrigger>
                        </TabsList>
                    </Tabs>
                )}

                <div className="mt-4 p-4 md:p-6 rounded-xl bg-white/30 dark:bg-black/30 backdrop-blur-xl border border-white/30 shadow-lg">
                    {/* Render content based on activeTab */}
                    {activeTab === "schools" && <SchoolsTab schools={schools} onRefresh={loadSchools} />}
                    {activeTab === "departments" && <DepartmentsTab departments={departments} schools={schools} onRefresh={loadDepartments} />}
                    {activeTab === "courses" && <CoursesTab courses={courses} departments={departments} onRefresh={loadCourses} />}
                    {activeTab === "teachers" && <TeachersTab teachers={teachers} departments={departments} onRefresh={loadTeachers} />}
                    {activeTab === "venues" && <VenuesTab venues={venues} onRefresh={loadVenues} userDeptId={profileData?.dept_id} />}
                    {activeTab === "sessions" && <SessionsTab sessions={sessions} onRefresh={loadSessions} />}
                    {activeTab === "holidays" && <HolidaysTab holidays={holidays} onRefresh={loadHolidays} />}
                    {activeTab === "students" && <StudentsTab students={students} departments={departments} onRefresh={loadStudents} />}
                </div>
            </div>

            <Footer />
        </div>
    );
};

export default AdminDashboard;
