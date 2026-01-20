import React from 'react';
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Bell,
    BookOpen,
    ClipboardCheck,
    FileText,
    FolderOpen,
    Calendar,
    User,
    LogOut,
    ChevronLeft,
    ChevronRight,
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion, AnimatePresence } from "framer-motion";
import { Separator } from "@/components/ui/separator";

interface TeacherSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isCollapsed: boolean;
    toggleSidebar: () => void;
    onLogout: () => void;
    onEditProfile: () => void;
}

export const TeacherSidebar: React.FC<TeacherSidebarProps> = ({
    activeTab,
    setActiveTab,
    isCollapsed,
    toggleSidebar,
    onLogout,
    onEditProfile
}) => {

    const menuItems = [
        { id: "notices", label: "Notices", icon: Bell },
        { id: "marks", label: "Marks", icon: BookOpen },
        { id: "attendance", label: "Attendance", icon: ClipboardCheck },
        { id: "assignments", label: "Assignments", icon: FileText },
        { id: "resources", label: "Resources", icon: FolderOpen },
        { id: "leave-management", label: "Leave Mgmt", icon: Calendar },
        { id: "apply-leave", label: "Apply Leave", icon: User },
    ];

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
                            <span className="tracking-tight">Teacher Portal</span>
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
                    <div className="px-2 pb-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                            Dashboard
                        </div>
                    </div>
                )}

                {menuItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                        {index === 4 && !isCollapsed && (
                            <div className="py-2">
                                <Separator className="opacity-60" />
                                <div className="px-2 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                                    Management
                                </div>
                            </div>
                        )}

                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start transition-all duration-200 mb-1 relative overflow-hidden group",
                                activeTab === item.id
                                    ? "bg-sidebar-accent text-foreground shadow-sm"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40",
                                isCollapsed ? "px-0 justify-center h-10 w-10 mx-auto rounded-xl" : "px-3 rounded-xl"
                            )}
                            onClick={() => setActiveTab(item.id)}
                            title={isCollapsed ? item.label : undefined}
                        >
                            {activeTab === item.id && !isCollapsed && (
                                <motion.div
                                    layoutId="teacherActiveTabIndicator"
                                    className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full"
                                />
                            )}
                            <item.icon
                                className={cn(
                                    "h-5 w-5",
                                    !isCollapsed && "mr-3",
                                    activeTab === item.id
                                        ? "text-primary"
                                        : "text-muted-foreground group-hover:text-foreground"
                                )}
                            />
                            {!isCollapsed && <span className="truncate">{item.label}</span>}
                        </Button>
                    </React.Fragment>
                ))}
            </div>

            {/* Bottom Actions */}
            <div className="p-3 border-t border-border/40 space-y-1">
                <Button
                    variant="ghost"
                    className={cn(
                        "w-full justify-start text-muted-foreground hover:text-foreground hover:bg-muted/40",
                        isCollapsed ? "justify-center px-0" : "px-3"
                    )}
                    onClick={onEditProfile}
                    title="Edit Profile"
                >
                    <User className={cn("h-5 w-5", !isCollapsed && "mr-3")} />
                    {!isCollapsed && "Profile"}
                </Button>

                <div className={cn("flex items-center gap-2 pt-2", isCollapsed ? "flex-col" : "justify-between px-1")}>
                    <ThemeToggle />
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={onLogout}
                        title="Logout"
                    >
                        <LogOut className="h-5 w-5" />
                    </Button>
                </div>
            </div>
        </motion.div>
    );
};
