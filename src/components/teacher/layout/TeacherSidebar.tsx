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
import { motion, AnimatePresence } from "framer-motion";

interface TeacherSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isCollapsed: boolean;
    toggleSidebar: () => void;
    onLogout: () => void;
    onEditProfile: () => void;
    isInsideSheet?: boolean;
}

export const TeacherSidebar: React.FC<TeacherSidebarProps> = ({
    activeTab,
    setActiveTab,
    isCollapsed,
    toggleSidebar,
    onLogout,
    onEditProfile,
    isInsideSheet = false,
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
                "flex flex-col border-r bg-sidebar/80 backdrop-blur-xl z-20 shadow-lg",
                isInsideSheet ? "relative w-full h-screen" : "fixed left-0 top-[env(safe-area-inset-top,0)] bottom-[env(safe-area-inset-bottom,0)]",
                isInsideSheet ? "" : (isCollapsed ? "w-20" : "w-64")
            )}
            initial={false}
            animate={{
                width: isInsideSheet ? "100%" : (isCollapsed ? 80 : 256),
                boxShadow: isCollapsed
                    ? "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)"
                    : "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
            }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 h-16 border-b border-border/40">
                <AnimatePresence mode="wait" initial={false}>
                    {!isCollapsed ? (
                        <motion.div
                            key="expanded-header"
                            initial={{ opacity: 0, x: -12, scale: 0.95 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: -12, scale: 0.95 }}
                            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                            className="flex items-center gap-2 font-bold text-xl text-primary truncate"
                        >
                            <motion.img
                                src="/CUKLogo.ico"
                                alt="CUK Logo"
                                className="w-8 h-8 object-contain"
                                initial={{ rotate: -10, scale: 0.8 }}
                                animate={{ rotate: 0, scale: 1 }}
                                exit={{ rotate: 10, scale: 0.8 }}
                                transition={{ duration: 0.3, type: "spring", stiffness: 400, damping: 25 }}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (target.src.includes('CUKLogo')) {
                                        target.src = '/favicon.ico';
                                    }
                                }}
                            />
                            <motion.span
                                initial={{ opacity: 0, x: -5 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 5 }}
                                transition={{ duration: 0.2, delay: 0.1 }}
                                className="tracking-tight"
                            >
                                Teacher Portal
                            </motion.span>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="collapsed-logo"
                            initial={{ opacity: 0, scale: 0, rotate: -15 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0, rotate: 15 }}
                            transition={{ duration: 0.25, type: "spring", stiffness: 500, damping: 30 }}
                            className="w-full flex justify-center"
                        >
                            <motion.img
                                src="/CUKLogo.ico"
                                alt="CUK Logo"
                                className="w-8 h-8 object-contain"
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                transition={{ duration: 0.2 }}
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    if (target.src.includes('CUKLogo')) {
                                        target.src = '/favicon.ico';
                                    }
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>

                {!isCollapsed && (
                    <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="h-8 w-8 rounded-full bg-muted/50 hover:bg-muted text-muted-foreground"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    </motion.div>
                )}
            </div>

            {/* Toggle button for collapsed state */}
            <AnimatePresence>
                {isCollapsed && (
                    <motion.div
                        key="expand-btn"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        transition={{ duration: 0.2, type: "spring", stiffness: 500, damping: 30 }}
                        className="absolute -right-3 top-20"
                    >
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={toggleSidebar}
                            className="h-6 w-6 rounded-full bg-primary text-primary-foreground shadow-lg z-50 hover:bg-primary/90"
                        >
                            <ChevronRight className="h-3 w-3" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Navigation Items */}
            <motion.div
                className="flex-1 overflow-y-auto py-4 space-y-1 px-3 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600"
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
            >
                {!isCollapsed && (
                    <div className="px-2 pb-3">
                        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground/50">
                            Dashboard
                        </div>
                    </div>
                )}

                <motion.div
                    initial={false}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                >
                {menuItems.map((item, index) => (
                    <React.Fragment key={item.id}>
                        {index === 4 && !isCollapsed && (
                            <motion.div
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2, delay: 0.05 }}
                                className="py-2"
                            >
                                <div className="h-px bg-border/30 mx-2" />
                                <div className="px-2 pt-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/50">
                                    Management
                                </div>
                            </motion.div>
                        )}

                        <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ x: 2 }}
                            transition={{ duration: 0.2, delay: index * 0.03 }}
                            className="mb-0.5"
                        >
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-full transition-all duration-200 relative overflow-hidden group",
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
                                        layoutId="teacherActiveTabIndicator"
                                        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                                        className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary/80 rounded-r-full"
                                    />
                                )}
                                <motion.span
                                    initial={false}
                                    animate={{ scale: activeTab === item.id ? 1.08 : 1 }}
                                    whileHover={{ scale: 1.1 }}
                                    transition={{ duration: 0.15 }}
                                    className={cn(
                                        "h-4 w-4",
                                        !isCollapsed && "mr-3",
                                        activeTab === item.id
                                            ? "text-foreground"
                                            : "text-muted-foreground/60 group-hover:text-foreground"
                                    )}
                                >
                                    <item.icon />
                                </motion.span>
                                {!isCollapsed && (
                                    <motion.span
                                        initial={{ opacity: 0, x: -4 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        whileHover={{ x: 1 }}
                                        transition={{ duration: 0.15 }}
                                        className="truncate text-sm"
                                    >
                                        {item.label}
                                    </motion.span>
                                )}
                            </Button>
                        </motion.div>
                    </React.Fragment>
                ))}
                </motion.div>
            </motion.div>

            {/* Bottom Actions */}
            <motion.div
                className="p-3 border-t border-border/30 space-y-1"
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.1 }}
            >
                {isCollapsed ? (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.2, delay: 0.3 }}
                        className="space-y-1 pt-2"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: 0.32 }}
                        >
                            <Button
                                variant="ghost"
                                className="w-10 h-10 p-0 mx-auto rounded-md flex items-center justify-center text-muted-foreground/70 hover:text-foreground hover:bg-muted/20"
                                onClick={onEditProfile}
                                title="Edit Profile"
                            >
                                <motion.div
                                    animate={{ scale: 1 }}
                                    whileHover={{ scale: 1.1 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <User className="h-4 w-4 text-muted-foreground/60" />
                                </motion.div>
                            </Button>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: 0.35 }}
                        >
                            <Button
                                variant="ghost"
                                className="w-10 h-10 p-0 mx-auto rounded-md flex items-center justify-center text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                onClick={onLogout}
                                title="Logout"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <LogOut className="h-4 w-4" />
                                </motion.div>
                            </Button>
                        </motion.div>
                    </motion.div>
                ) : (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                        transition={{ duration: 0.2, delay: 0.3 }}
                        className="flex items-center justify-between pt-2"
                    >
                        <motion.div
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.2, delay: 0.32 }}
                        >
                            <Button
                                variant="ghost"
                                className="flex-1 justify-start text-muted-foreground/70 hover:text-foreground hover:bg-muted/20 px-3 h-8"
                                onClick={onEditProfile}
                                title="Edit Profile"
                            >
                                <motion.span
                                    animate={{ scale: 1 }}
                                    whileHover={{ scale: 1.08 }}
                                    transition={{ duration: 0.15 }}
                                    className="h-4 w-4 mr-3 text-muted-foreground/60"
                                >
                                    <User />
                                </motion.span>
                                <motion.span
                                    initial={{ opacity: 0, x: -3 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    whileHover={{ x: 1 }}
                                    transition={{ duration: 0.15 }}
                                    className="text-sm"
                                >
                                    Profile
                                </motion.span>
                            </Button>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.2, delay: 0.35 }}
                        >
                            <Button
                                variant="ghost"
                                size="icon"
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 ml-2 h-8 w-8"
                                onClick={onLogout}
                                title="Logout"
                            >
                                <motion.div
                                    whileHover={{ scale: 1.1, rotate: 5 }}
                                    transition={{ duration: 0.15 }}
                                >
                                    <LogOut className="h-4 w-4" />
                                </motion.div>
                            </Button>
                        </motion.div>
                    </motion.div>
                )}
            </motion.div>
        </motion.div>
    );
};
