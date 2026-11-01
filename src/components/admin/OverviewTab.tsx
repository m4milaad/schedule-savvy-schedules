import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDay, parseIsoDay, relativeDays, summariseExamDates } from "@/lib/examDates";

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
  examDates?: string[];
  setActiveTab: (tab: string) => void;
  className?: string;
}

const MAX_DAYS_SHOWN = 10;

/**
 * The overview answers one question: "When is the next exam, and is the datesheet ready?"
 * The datesheet strip is the biggest block and carries the one data hue (the next exam day).
 * Below it, every record count in one divided card, each a link to its screen.
 */
export const OverviewTab: React.FC<OverviewTabProps> = ({ role, counts, examDates = [], setActiveTab, className }) => {
  const { upcoming, next, daysUntilNext, last } = summariseExamDates(examDates);
  const shown = upcoming.slice(0, MAX_DAYS_SHOWN);
  const hidden = upcoming.length - shown.length;
  const isAdmin = role === "admin";

  const records = [
    ...(isAdmin
      ? [
          { label: "Schools", value: counts.schools, tab: "schools" },
          { label: "Departments", value: counts.departments, tab: "departments" },
        ]
      : []),
    { label: "Courses", value: counts.courses, tab: "courses" },
    { label: "Teachers", value: counts.teachers, tab: "teachers" },
    { label: "Students", value: counts.students, tab: "students" },
    { label: "Exam venues", value: counts.venues, tab: "venues" },
    { label: "Sessions", value: counts.sessions, tab: "sessions" },
    { label: "Holidays", value: counts.holidays, tab: "holidays" },
  ];
  // 8 records → 4 columns × 2 rows; 6 → 3 × 2. Phone: 2 columns (both counts are even).
  const cols = records.length % 4 === 0 ? "lg:grid-cols-4" : "lg:grid-cols-3";

  return (
    <div className={cn("space-y-4", className)}>
      {/* Datesheet: the screen's question */}
      <section aria-labelledby="datesheet-h" className="overflow-hidden rounded-lg border bg-card">
        <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5">
          <div>
            <h2 id="datesheet-h" className="text-base font-semibold">Datesheet</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {next
                ? `${upcoming.length} exam ${upcoming.length === 1 ? "day" : "days"}, ${formatDay(next, { day: "numeric", month: "short" })} – ${formatDay(last!, { day: "numeric", month: "short", year: "numeric" })}`
                : "No upcoming exam days"}
            </p>
          </div>
          <div className="flex gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" className="h-8" onClick={() => setActiveTab("generator")}>
                Open generator
              </Button>
            )}
            <Button size="sm" className="h-8" onClick={() => setActiveTab("seating")} disabled={!next}>
              Plan seating
            </Button>
          </div>
        </div>

        {next ? (
          <ol className="-mb-px -mr-px mt-5 grid auto-cols-[minmax(88px,1fr)] grid-flow-col overflow-x-auto border-t">
            {shown.map((d) => {
              const isNext = d === next;
              const date = parseIsoDay(d);
              return (
                <li
                  key={d}
                  className={cn("border-b border-r px-4 py-3", isNext && "shadow-[inset_0_2px_0_var(--data)]")}
                  aria-current={isNext ? "date" : undefined}
                >
                  <div className="text-xs text-muted-foreground">
                    {date.toLocaleDateString("en-GB", { weekday: "short" })}
                  </div>
                  <div
                    className="text-2xl tabular-nums leading-tight"
                    style={isNext ? { color: "var(--data)" } : undefined}
                  >
                    {date.getDate()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isNext && daysUntilNext !== null
                      ? relativeDays(daysUntilNext)
                      : date.toLocaleDateString("en-GB", { month: "short" })}
                  </div>
                </li>
              );
            })}
            {hidden > 0 && (
              <li className="flex items-center border-b border-r px-4 py-3 text-sm text-muted-foreground">
                +{hidden} more
              </li>
            )}
          </ol>
        ) : (
          <div className="mx-5 mb-5 mt-4 rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
            {examDates.length > 0 ? "Every exam day on the datesheet has passed." : "Nothing is on the datesheet yet."}{" "}
            {isAdmin && (
              <button className="text-foreground underline-offset-4 hover:underline" onClick={() => setActiveTab("generator")}>
                {examDates.length > 0 ? "Generate a new one" : "Generate one"}
              </button>
            )}
          </div>
        )}
      </section>

      {/* Records: one divided card, each count links to its screen */}
      <section aria-labelledby="records-h" className="overflow-hidden rounded-lg border bg-card">
        <h2 id="records-h" className="px-5 pt-5 text-base font-semibold">Records</h2>
        <div className={cn("-mb-px -mr-px mt-3 grid grid-cols-2 border-t", cols)}>
          {records.map((r) => (
            <button
              key={r.tab}
              type="button"
              onClick={() => setActiveTab(r.tab)}
              className="border-b border-r px-5 py-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <div className="text-sm text-muted-foreground">{r.label}</div>
              <div className={cn("mt-1 text-2xl tabular-nums", r.value === 0 && "text-muted-foreground")}>
                {r.value.toLocaleString("en-IN")}
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
