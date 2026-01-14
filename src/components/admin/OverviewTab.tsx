import React from "react";
import { StatsCard } from "@/components/ui/stats-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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
} from "lucide-react";

type AdminRole = "admin" | "department_admin" | null;

interface OverviewTabProps {
  role: AdminRole;
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
  counts,
  setActiveTab,
  className,
}) => {
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
            description: "Academic departments",
            icon: Building2,
            tab: "departments",
          },
          {
            title: "Courses",
            value: counts.courses,
            description: "Course catalog",
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
            description: "Your department",
            icon: BookOpen,
            tab: "courses",
          },
          {
            title: "Teachers",
            value: counts.teachers,
            description: "Faculty members",
            icon: Users,
            tab: "teachers",
          },
          {
            title: "Students",
            value: counts.students,
            description: "In your dept",
            icon: GraduationCap,
            tab: "students",
          },
          {
            title: "Venues",
            value: counts.venues,
            description: "Exam halls",
            icon: MapPin,
            tab: "venues",
          },
        ] as const);

  const secondaryCards = [
    { title: "Sessions", value: counts.sessions, icon: Calendar, tab: "sessions" },
    { title: "Holidays", value: counts.holidays, icon: CalendarDays, tab: "holidays" },
    { title: "Exam dates", value: counts.examDates, icon: CalendarDays, tab: "seating" },
    { title: "Seating", value: "Generate", icon: Armchair, tab: "seating" },
  ] as const;

  return (
    <div className={cn("p-4 md:p-6", className)}>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {primaryCards.map((c) => (
          <button
            key={c.title}
            onClick={() => setActiveTab(c.tab)}
            className="text-left focus:outline-none"
          >
            <StatsCard
              title={c.title}
              value={c.value}
              description={c.description}
              icon={c.icon}
              className="glass-card glass-hover hover-lift rounded-2xl"
            />
          </button>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="glass-card glass-hover lg:col-span-2 rounded-2xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Button
                variant="secondary"
                className="justify-start bg-background/40 hover:bg-background/55 border border-white/20 dark:border-white/10"
                onClick={() => setActiveTab("courses")}
              >
                <BookOpen className="mr-2 h-4 w-4" />
                Manage courses
              </Button>
              <Button
                variant="secondary"
                className="justify-start bg-background/40 hover:bg-background/55 border border-white/20 dark:border-white/10"
                onClick={() => setActiveTab("teachers")}
              >
                <Users className="mr-2 h-4 w-4" />
                Manage teachers
              </Button>
              <Button
                variant="secondary"
                className="justify-start bg-background/40 hover:bg-background/55 border border-white/20 dark:border-white/10"
                onClick={() => setActiveTab("students")}
              >
                <GraduationCap className="mr-2 h-4 w-4" />
                View students
              </Button>
              <Button
                variant="secondary"
                className="justify-start bg-background/40 hover:bg-background/55 border border-white/20 dark:border-white/10"
                onClick={() => setActiveTab("venues")}
              >
                <MapPin className="mr-2 h-4 w-4" />
                Venues & capacity
              </Button>
              {role === "admin" && (
                <Button
                  variant="secondary"
                  className="justify-start bg-background/40 hover:bg-background/55 border border-white/20 dark:border-white/10"
                  onClick={() => setActiveTab("holidays")}
                >
                  <CalendarDays className="mr-2 h-4 w-4" />
                  Configure holidays
                </Button>
              )}
              <Button
                variant="default"
                className="justify-start shadow-sm"
                onClick={() => setActiveTab("seating")}
              >
                <Armchair className="mr-2 h-4 w-4" />
                Seating arrangement
              </Button>
            </div>

            <Separator className="my-5" />

            <div className="flex flex-col gap-1">
              <div className="text-sm font-medium">Tip</div>
              <div className="text-sm text-muted-foreground">
                Use “Refresh” in the top bar after bulk uploads or database changes to
                sync the dashboard.
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          {secondaryCards.map((c) => (
            <button
              key={c.title}
              onClick={() => setActiveTab(c.tab)}
              className="text-left focus:outline-none"
            >
              <StatsCard
                title={c.title}
                value={c.value}
                icon={c.icon}
                className="glass-card glass-hover hover-lift rounded-2xl"
              />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

