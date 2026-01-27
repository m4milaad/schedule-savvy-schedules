import React from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    School,
    Building2,
    BookOpen,
    Users,
    MapPin,
    Calendar,
    CalendarDays,
    GraduationCap,
    Armchair,
    LogOut,
    Shield,
    FileText,
    ChevronLeft,
    ChevronRight,
    User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AdminSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    userRole: "admin" | "department_admin" | null;
    isCollapsed: boolean;
    toggleSidebar: () => void;
    onLogout: () => void;
    onNavigate: (path: string) => void;
    onEditProfile?: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
    activeTab,
    setActiveTab,
    userRole,
    isCollapsed,
    toggleSidebar,
    onLogout,
    onNavigate,
    onEditProfile
}) => {

    const menuItems = [
        { id: "overview", label: "Overview", icon: LayoutDashboard, role: "all" },
        { id: "schools", label: "Schools", icon: School, role: "admin" },
        { id: "departments", label: "Departments", icon: Building2, role: "admin" },
        { id: "courses", label: "Courses", icon: BookOpen, role: "all" },
        { id: "teachers", label: "Teachers", icon: Users, role: "all" },
        { id: "venues", label: "Venues", icon: MapPin, role: "all" },
        { id: "sessions", label: "Sessions", icon: Calendar, role: "admin" },
        { id: "holidays", label: "Holidays", icon: CalendarDays, role: "admin" },
        { id: "students", label: "Students", icon: GraduationCap, role: "all" },
        { id: "seating", label: "Seating", icon: Armchair, role: "all" },
    ];

    const filteredItems = menuItems.filter(item => item.role === "all" || item.role === userRole);

    return (
        <motion.div
            className={cn(
                "fixed left-0 top-0 flex flex-col h-screen border-r bg-sidebar/80 backdrop-blur-xl transition-all duration-300 z-20",
                isCollapsed ? "w-20" : "w-64"
            )}
            initial={false}
            animate={{ width: isCollapsed ? 80 : 256 }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 h-16 border-b border-border/40">
                <AnimatePresence mode="wait">
                    {!isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -10 }}
                            className="flex items-center gap-2 font-bold text-xl text-primary truncate"
                        >
                            <img src="/favicon.ico" alt="Logo" className="w-8 h-8" />
                            <span className="tracking-tight">Admin Console</span>
                        </motion.div>
                    )}
                </AnimatePresence>
                {isCollapsed && (
                    <div className="w-full flex justify-center">
                        <img src="/favicon.ico" alt="Logo" className="w-8 h-8" />
                    </div>
                )}

                {!isCollapsed && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={toggleSidebar}
                        className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground"
                    >
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Toggle button for collapsed state - positioned absolutely */}
            {isCollapsed && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleSidebar}
                    className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-primary text-primary-foreground shadow-md z-50 hover:bg-primary/90"
                >
                    <ChevronRight className="h-3 w-3" />
                </Button>
            )}

            {/* Navigation Items */}
            <div className="flex-1 overflow-y-auto py-4 space-y-1 px-3 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600">
                {!isCollapsed && (
                    <div className="px-2 pb-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground/50">
                            Workspace
                        </div>
                    </div>
                )}

                {filteredItems.map((item) => (
                    <React.Fragment key={item.id}>
                        {item.id === "courses" && !isCollapsed && (
                            <div className="py-2">
                                <div className="h-px bg-border/30 mx-2" />
                                <div className="px-2 pt-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/50">
                                    Manage
                                </div>
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full transition-all duration-200 mb-0.5 relative overflow-hidden group",
                                activeTab === item.id
                                    ? "bg-muted/40 text-foreground"
                                    : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/20",
                                isCollapsed 
                                    ? "h-10 w-10 p-0 mx-auto rounded-md flex items-center justify-center" 
                                    : "h-8 px-3 rounded-md justify-start"
                            )}
                            onClick={() => setActiveTab(item.id)}
                            title={isCollapsed ? item.label : undefined}
                        >
                            {activeTab === item.id && !isCollapsed && (
                                <motion.div
                                    layoutId="activeTabIndicator"
                                    className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/80 rounded-r-full"
                                />
                            )}
                            <item.icon
                                className={cn(
                                    "h-4 w-4",
                                    !isCollapsed && "mr-3",
                                    activeTab === item.id
                                        ? "text-foreground"
                                        : "text-muted-foreground/60 group-hover:text-foreground"
                                )}
                            />
                            {!isCollapsed && <span className="truncate text-sm">{item.label}</span>}
                        </Button>
                    </React.Fragment>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-border/30 space-y-1">
                {userRole === "admin" && (
                    <>
                        {/* Audit Logs Button moved here */}
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full transition-all duration-200",
                                activeTab === 'logs'
                                    ? "bg-muted/40 text-foreground"
                                    : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/20",
                                isCollapsed 
                                    ? "h-10 w-10 p-0 mx-auto rounded-md flex items-center justify-center" 
                                    : "h-8 px-3 rounded-md justify-start"
                            )}
                            onClick={() => setActiveTab("logs")}
                            title="Audit Logs"
                        >
                            <FileText className={cn(
                                "h-4 w-4",
                                !isCollapsed && "mr-3",
                                activeTab === 'logs' ? "text-foreground" : "text-muted-foreground/60"
                            )} />
                            {!isCollapsed && <span className="text-sm">Logs</span>}
                        </Button>

                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full transition-all duration-200",
                                activeTab === 'admins'
                                    ? "bg-muted/40 text-foreground"
                                    : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/20",
                                isCollapsed 
                                    ? "h-10 w-10 p-0 mx-auto rounded-md flex items-center justify-center" 
                                    : "h-8 px-3 rounded-md justify-start"
                            )}
                            onClick={() => setActiveTab("admins")}
                            title="Manage Admins"
                        >
                            <Shield className={cn(
                                "h-4 w-4",
                                !isCollapsed && "mr-3",
                                activeTab === 'admins' ? "text-foreground" : "text-muted-foreground/60"
                            )} />
                            {!isCollapsed && <span className="text-sm">Admins</span>}
                        </Button>
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full text-muted-foreground/70 hover:text-foreground hover:bg-muted/20",
                                isCollapsed 
                                    ? "h-10 w-10 p-0 mx-auto rounded-md flex items-center justify-center" 
                                    : "h-8 px-3 rounded-md justify-start"
                            )}
                            onClick={() => onNavigate("/schedule-generator")}
                            title="Schedule Generator"
                        >
                            <LayoutDashboard className={cn("h-4 w-4", !isCollapsed && "mr-3")} />
                            {!isCollapsed && <span className="text-sm">Generator</span>}
                        </Button>
                    </>
                )}

                {/* Profile and Logout Actions */}
                {isCollapsed ? (
                    <div className="space-y-1 pt-2">
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-10 h-10 p-0 mx-auto rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/20",
                                activeTab === "profile" && "bg-muted/40 text-foreground"
                            )}
                            onClick={() => setActiveTab("profile")}
                            title="Profile"
                        >
                            <User className={cn(
                                "h-4 w-4",
                                activeTab === "profile" ? "text-foreground" : "text-muted-foreground/60"
                            )} />
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-10 h-10 p-0 mx-auto rounded-md flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={onLogout}
                            title="Logout"
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between pt-2">
                        <Button
                            variant="ghost"
                            className={cn(
                                "flex-1 justify-start text-muted-foreground/70 hover:text-foreground hover:bg-muted/20 px-3 h-8",
                                activeTab === "profile" && "bg-muted/40 text-foreground"
                            )}
                            onClick={() => setActiveTab("profile")}
                            title="Profile"
                        >
                            <User className={cn(
                                "h-4 w-4 mr-3",
                                activeTab === "profile" ? "text-foreground" : "text-muted-foreground/60"
                            )} />
                            <span className="text-sm">Profile</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-2 h-8 w-8"
                            onClick={onLogout}
                            title="Logout"
                        >
                            <LogOut className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
