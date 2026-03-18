import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  MapPin,
  School,
  Users,
  Armchair,
  Sparkles,
  Building2,
  Calendar,
  ArrowRight,
  Clock,
  CheckCircle2,
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

  const stats =
    role === "admin"
      ? [
          { title: "Schools", value: counts.schools, icon: School, tab: "schools" },
          { title: "Departments", value: counts.departments, icon: Building2, tab: "departments" },
          { title: "Courses", value: counts.courses, icon: BookOpen, tab: "courses" },
          { title: "Students", value: counts.students, icon: GraduationCap, tab: "students" },
          { title: "Teachers", value: counts.teachers, icon: Users, tab: "teachers" },
          { title: "Venues", value: counts.venues, icon: MapPin, tab: "venues" },
          { title: "Sessions", value: counts.sessions, icon: Calendar, tab: "sessions" },
          { title: "Holidays", value: counts.holidays, icon: CalendarDays, tab: "holidays" },
          { title: "Exam Dates", value: counts.examDates, icon: Clock, tab: "seating" },
        ]
      : [
          { title: "Courses", value: counts.courses, icon: BookOpen, tab: "courses" },
          { title: "Teachers", value: counts.teachers, icon: Users, tab: "teachers" },
          { title: "Students", value: counts.students, icon: GraduationCap, tab: "students" },
          { title: "Venues", value: counts.venues, icon: MapPin, tab: "venues" },
          { title: "Sessions", value: counts.sessions, icon: Calendar, tab: "sessions" },
          { title: "Holidays", value: counts.holidays, icon: CalendarDays, tab: "holidays" },
          { title: "Exam Dates", value: counts.examDates, icon: Clock, tab: "seating" },
        ];

  const totalRecords = stats.reduce((sum, s) => sum + s.value, 0);

  return (
    <Card className={cn("linear-surface overflow-hidden", className)}>
      <CardHeader className="linear-toolbar flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="linear-kicker">Dashboard</div>
            <CardTitle className="text-base font-semibold">
              {greeting}, {adminName || "Admin"}
            </CardTitle>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              <span>All systems operational</span>
            </div>
            <div className="linear-pill">
              <span className="font-medium text-foreground">{totalRecords}</span>
              <span>records</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <table className="linear-table">
          <thead>
            <tr>
              <th className="linear-th">Category</th>
              <th className="linear-th text-right">Count</th>
              <th className="linear-th w-8 hidden sm:table-cell"></th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat, i) => (
              <tr
                key={i}
                className="linear-tr cursor-pointer"
                onClick={() => setActiveTab(stat.tab)}
              >
                <td className="linear-td">
                  <div className="flex items-center gap-2">
                    <stat.icon className="h-4 w-4 text-muted-foreground/60" />
                    <span className="font-medium text-sm">{stat.title}</span>
                  </div>
                </td>
                <td className="linear-td text-right">
                  <span className="font-semibold tabular-nums">{stat.value}</span>
                </td>
                <td className="linear-td text-right hidden sm:table-cell">
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Compact quick actions */}
        <div className="border-t border-border/40 px-4 py-3">
          <div className="linear-kicker mb-2">Quick Actions</div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { icon: Sparkles, label: "Generate Seating", tab: "seating" },
              { icon: Armchair, label: "Seating Plan", tab: "seating" },
              { icon: BookOpen, label: "Courses", tab: "courses" },
              { icon: Users, label: "Teachers", tab: "teachers" },
              { icon: GraduationCap, label: "Students", tab: "students" },
              { icon: MapPin, label: "Venues", tab: "venues" },
              ...(role === "admin" ? [{ icon: CalendarDays, label: "Holidays", tab: "holidays" }] : []),
            ].map((a, i) => (
              <button
                key={i}
                onClick={() => setActiveTab(a.tab)}
                className="inline-flex items-center gap-1.5 rounded-md border border-border/30 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-border/50 hover:text-foreground hover:bg-accent/20"
              >
                <a.icon className="h-3 w-3" />
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
