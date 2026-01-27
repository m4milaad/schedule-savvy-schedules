import React, { useState, useEffect } from "react";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  MapPin,
  School,
  Users,
  Armchair,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight,
  Clock,
  Zap,
  Activity,
  CheckCircle2,
  Info
} from "lucide-react";

type AdminRole = "admin" | "department_admin" | null;

interface OverviewTabProps {
  role: AdminRole;
  adminName?: string;
  counts: {
    schools: number;
    departments: number;
    courses: number;
    teachers: number;
    venues: number;
    sessions: number;
    holidays: number;
    students: number;
    examDates: number;
  };
  setActiveTab: (tab: string) => void;
  className?: string;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  role,
  adminName,
  counts,
  setActiveTab,
  className,
}) => {
  const [greeting, setGreeting] = useState("Good morning");

  useEffect(() => {
    const hours = new Date().getHours();
    if (hours < 12) setGreeting("Good morning");
    else if (hours < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);

  const primaryCards =
    role === "admin"
      ? ([
        {
          title: "Schools",
          value: counts.schools,
          description: "Faculties & schools",
          icon: School,
          tab: "schools",
        },
        {
          title: "Departments",
          value: counts.departments,
          description: "Academic units",
          icon: Building2,
          tab: "departments",
        },
        {
          title: "Courses",
          value: counts.courses,
          description: "Active catalog",
          icon: BookOpen,
          tab: "courses",
        },
        {
          title: "Students",
          value: counts.students,
          description: "Enrolled profiles",
          icon: GraduationCap,
          tab: "students",
        },
      ] as const)
      : ([
        {
          title: "Courses",
          value: counts.courses,
          description: "Department offerings",
          icon: BookOpen,
          tab: "courses",
        },
        {
          title: "Teachers",
          value: counts.teachers,
          description: "Active faculty",
          icon: Users,
          tab: "teachers",
        },
        {
          title: "Students",
          value: counts.students,
          description: "Department students",
          icon: GraduationCap,
          tab: "students",
        },
        {
          title: "Venues",
          value: counts.venues,
          description: "Allocated halls",
          icon: MapPin,
          tab: "venues",
        },
      ] as const);

  const secondaryCards = [
    { title: "Sessions", value: counts.sessions, icon: Calendar, tab: "sessions" },
    { title: "Holidays", value: counts.holidays, icon: CalendarDays, tab: "holidays" },
    { title: "Exam Dates", value: counts.examDates, icon: Clock, tab: "seating" },
  ] as const;

  const quickActions = [
    { icon: Sparkles, label: "Generate Seating", tab: "seating" }, // Added back
    { icon: Armchair, label: "View Seating Plan", tab: "seating" }, // Added back
    { icon: BookOpen, label: "Manage Courses", tab: "courses" },
    { icon: Users, label: "Manage Teachers", tab: "teachers" },
    { icon: GraduationCap, label: "View Students", tab: "students" },
    { icon: MapPin, label: "Venues & Capacity", tab: "venues" },
  ];

  if (role === "admin") {
    quickActions.push({ icon: CalendarDays, label: "Configure Holidays", tab: "holidays" });
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <motion.div
      className={cn("max-w-7xl mx-auto p-6 space-y-8", className)}
      variants={container}
      initial="hidden"
      animate="show"
    >
      {/* Subtle Header */}
      <motion.div variants={item} className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            {greeting}, {adminName || 'Admin'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Overview of your system performance and academic data.
          </p>
        </div>
        {/* Buttons removed from here */}
      </motion.div>

      {/* Primary Stats Grid */}
      <motion.div variants={item}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Dashboard Metrics</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {primaryCards.map((c, i) => (
            <div key={i} onClick={() => setActiveTab(c.tab)} className="cursor-pointer h-28">
              <StatsCard
                title={c.title}
                value={c.value}
                description={c.description}
                icon={c.icon}
                // trend removed
                className="h-full"
              />
            </div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Actions Panel */}
        <motion.div variants={item} className="lg:col-span-2 space-y-5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-foreground/70" />
            <h2 className="text-base font-semibold">Quick Actions</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {quickActions.map((action, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(action.tab)}
                className="flex items-center p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/40 hover:border-border transition-all duration-200 group text-left"
              >
                <div className="p-2 rounded-md bg-muted text-foreground/70 group-hover:text-foreground">
                  <action.icon className="h-4 w-4" />
                </div>
                <div className="ml-3 flex-1">
                  <span className="block text-sm font-medium text-foreground">{action.label}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200" />
              </button>
            ))}
          </div>

          <div className="pt-4">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="h-4 w-4 text-foreground/70" />
              <h2 className="text-base font-semibold">Secondary Metrics</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {secondaryCards.map((c, i) => (
                <div key={i} onClick={() => setActiveTab(c.tab)} className="cursor-pointer">
                  <Card className="prof-card hover:bg-muted/30 border-dashed">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">{c.title}</p>
                        <p className="text-xl font-semibold mt-0.5">{c.value}</p>
                      </div>
                      <c.icon className="h-4 w-4 text-muted-foreground/60" />
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* System Health / Logs */}
        <motion.div variants={item} className="space-y-5">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-foreground/70" />
            <h2 className="text-base font-semibold">System Health</h2>
          </div>

          <Card className="prof-card h-full bg-muted/10">
            <CardContent className="p-0">
              <div className="p-4 border-b border-border/50">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                  All systems operational
                </div>
              </div>

              <div className="p-4 space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3 text-sm">
                    <div className="mt-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium">Database Synced</p>
                      <p className="text-xs text-muted-foreground">Updated 2 minutes ago</p>
                    </div>
                  </div>
                  <div className="flex gap-3 text-sm">
                    <div className="mt-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-medium">Exam Engine v2.4.0</p>
                      <p className="text-xs text-muted-foreground">Running stable</p>
                    </div>
                  </div>
                </div>

                <Separator className="bg-border/60" />

                <div>
                  <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">Recent Alerts</h4>
                  <div className="space-y-3">
                    <div className="text-sm p-2 bg-background rounded border border-border/50 text-muted-foreground">
                      <span className="text-xs font-mono text-primary mr-2">TIP</span>
                      Refresh dashboard after bulk CSV uploads.
                    </div>
                    <div className="text-sm p-2 bg-background rounded border border-border/50 text-muted-foreground">
                      <span className="text-xs font-mono text-amber-500 mr-2">WARN</span>
                      Venue A-102 capacity near limit (95%).
                    </div>
                  </div>
                </div>
              </div>


            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

