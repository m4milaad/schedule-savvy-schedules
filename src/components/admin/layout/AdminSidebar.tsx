import React from 'react';
import { LegalLinks } from "@/components/LegalLinks";
import { cn } from "@/lib/utils";
import {
    LayoutDashboard,
    School,
    Building2,
    BookOpen,
    Users,
    MapPin,
    Calendar,
    CalendarDays,
    CalendarRange,
    GraduationCap,
    Armchair,
    LogOut,
    Shield,
    FileText,
    MessageSquare,
    PanelLeftClose,
    PanelLeftOpen,
    User,
    type LucideIcon,
} from "lucide-react";

interface AdminSidebarProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
    userRole: "admin" | "department_admin" | null;
    isCollapsed: boolean;
    toggleSidebar: () => void;
    onLogout: () => void;
    isInsideSheet?: boolean;
    onNavigate: (path: string) => void;
    /** Opens the profile; defaults to the "profile" tab. */
    onEditProfile?: () => void;
    userLabel?: string;
    /** Navigation for other dashboards (student, teacher); defaults to the admin menu. */
    groups?: NavGroup[];
    /** Line under the product name; defaults to the admin role. */
    subtitle?: string;
}

type Role = "all" | "admin";
interface NavItem { id: string; label: string; icon: LucideIcon; role?: Role }
export interface NavGroup { label?: string; items: NavItem[] }

const adminGroups: NavGroup[] = [
    { items: [{ id: "overview", label: "Overview", icon: LayoutDashboard, role: "all" }] },
    {
        label: "Academic",
        items: [
            { id: "schools", label: "Schools", icon: School, role: "admin" },
            { id: "departments", label: "Departments", icon: Building2, role: "admin" },
            { id: "courses", label: "Courses", icon: BookOpen, role: "all" },
            { id: "teachers", label: "Teachers", icon: Users, role: "all" },
            { id: "students", label: "Students", icon: GraduationCap, role: "all" },
        ],
    },
    {
        label: "Exams",
        items: [
            { id: "generator", label: "Datesheet generator", icon: CalendarRange, role: "admin" },
            { id: "seating", label: "Seating", icon: Armchair, role: "all" },
            { id: "venues", label: "Venues", icon: MapPin, role: "all" },
            { id: "sessions", label: "Sessions", icon: Calendar, role: "admin" },
            { id: "holidays", label: "Holidays", icon: CalendarDays, role: "admin" },
        ],
    },
    {
        label: "System",
        items: [
            { id: "admins", label: "Administrators", icon: Shield, role: "admin" },
            { id: "logs", label: "Audit log", icon: FileText, role: "admin" },
            { id: "assistant", label: "Assistant", icon: MessageSquare, role: "admin" },
        ],
    },
];

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
    activeTab,
    setActiveTab,
    userRole,
    isCollapsed,
    toggleSidebar,
    onLogout,
    isInsideSheet = false,
    onEditProfile,
    userLabel,
    groups = adminGroups,
    subtitle,
}) => {
    const collapsed = isCollapsed && !isInsideSheet;
    const visible = groups
        .map(g => ({ ...g, items: g.items.filter(i => !i.role || i.role === "all" || i.role === userRole) }))
        .filter(g => g.items.length > 0);

    const row = (id: string, label: string, Icon: LucideIcon, onClick: () => void) => {
        const active = activeTab === id;
        return (
            <button
                key={id}
                type="button"
                onClick={onClick}
                title={collapsed ? label : undefined}
                aria-label={collapsed ? label : undefined}
                aria-current={active ? "page" : undefined}
                className={cn(
                    "flex h-8 w-full items-center gap-2.5 rounded-md text-sm transition-colors",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    collapsed ? "justify-center px-0" : "px-2.5",
                    active
                        ? "bg-sidebar-accent text-foreground"
                        : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
            >
                <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                {!collapsed && <span className="truncate">{label}</span>}
            </button>
        );
    };

    return (
        <nav
            aria-label="Main"
            className={cn(
                "flex flex-col bg-sidebar",
                isInsideSheet
                    ? "relative h-full w-full"
                    : "fixed bottom-[env(safe-area-inset-bottom,0)] left-0 top-[env(safe-area-inset-top,0)] z-20 border-r border-sidebar-border transition-[width] duration-200",
                !isInsideSheet && (collapsed ? "w-16" : "w-60")
            )}
        >
            {/* Product and scope */}
            <div className={cn("flex h-16 items-center gap-2.5", collapsed ? "justify-center px-2" : "px-4")}>
                <img
                    src="./CUKLogo.ico"
                    alt="Central University of Kashmir"
                    className="h-7 w-7 shrink-0 object-contain"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        if (target.src.includes('CUKLogo')) target.src = './favicon.ico';
                    }}
                />
                {!collapsed && (
                    <div className="min-w-0 leading-tight">
                        <div className="truncate text-sm font-semibold">CUK Acadex</div>
                        <div className="truncate text-xs text-muted-foreground">
                            {subtitle ?? (userRole === "admin" ? "Exams office · Super admin" : "Department admin")}
                        </div>
                    </div>
                )}
            </div>

            <div className={cn("flex-1 overflow-y-auto pb-4", collapsed ? "px-2" : "px-3")}>
                {visible.map((group, gi) => (
                    <div key={gi} className={gi > 0 ? "mt-5" : "mt-1"}>
                        {group.label && !collapsed && (
                            <div className="mb-1 px-2.5 text-xs text-muted-foreground">{group.label}</div>
                        )}
                        {group.label && collapsed && <div className="mx-2 mb-2 h-px bg-sidebar-border" />}
                        <div className="space-y-0.5">
                            {group.items.map(item => row(item.id, item.label, item.icon, () => setActiveTab(item.id)))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Account */}
            <div className={cn("space-y-0.5 border-t border-sidebar-border py-3", collapsed ? "px-2" : "px-3")}>
                {row("profile", userLabel || "Profile", User, onEditProfile ?? (() => setActiveTab("profile")))}
                {row("__logout", "Log out", LogOut, onLogout)}
                {!isInsideSheet && row(
                    "__collapse",
                    collapsed ? "Expand sidebar" : "Collapse sidebar",
                    collapsed ? PanelLeftOpen : PanelLeftClose,
                    toggleSidebar
                )}
                {!collapsed && <LegalLinks className="px-2.5 pt-2" />}
            </div>
        </nav>
    );
};
