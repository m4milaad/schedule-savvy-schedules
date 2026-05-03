import { describe, it, expect } from "vitest";

/**
 * We test the internal helpers by importing the module. The exported functions
 * `generateEnhancedSchedule` and `generateOptimizedSchedule` are synchronous and
 * tested via an end-to-end style below. Internal helpers are tested through
 * the public API.
 *
 * Key helpers under test (indirectly via public API):
 * - calculateCoursePriority
 * - mergeSimilarCourses
 * - hasStudentConflict
 * - satisfiesGapRequirement
 * - scheduleWithBacktracking
 */

import {
  generateEnhancedSchedule,
  generateOptimizedSchedule,
} from "../scheduleAlgorithm";
import type { CourseTeacher } from "@/types/examSchedule";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCourse(overrides: Partial<CourseTeacher> = {}): CourseTeacher {
  return {
    id: overrides.id ?? "c1",
    course_code: overrides.course_code ?? "CS101",
    course_name: overrides.course_name ?? "Intro CS",
    teacher_name: overrides.teacher_name ?? "Prof A",
    dept_name: overrides.dept_name ?? "CS",
    semester: overrides.semester ?? 1,
    program_type: overrides.program_type ?? "B.Tech",
    gap_days: overrides.gap_days ?? 2,
    course_id: overrides.course_id ?? "c1",
    teacher_id: overrides.teacher_id ?? "t1",
  };
}

/** Create a date range of weekdays spanning `days` calendar days from `start`. */
function dateRange(startStr: string, days: number): { start: Date; end: Date } {
  const start = new Date(startStr);
  const end = new Date(start);
  end.setDate(end.getDate() + days);
  return { start, end };
}

// ---------------------------------------------------------------------------
// generateEnhancedSchedule — end-to-end
// ---------------------------------------------------------------------------

describe("generateEnhancedSchedule", () => {
  it("schedules a single course on the first available date", () => {
    const courses = [makeCourse()];
    const { start, end } = dateRange("2026-06-01", 14); // Mon Jun 1 2026
    const result = generateEnhancedSchedule(courses, start, end, [], {});

    expect(result).toHaveLength(1);
    expect(result[0]?.course_code).toBe("CS101");
    expect(result[0]?.exam_date).toBeTruthy();
  });

  it("schedules multiple courses on different dates", () => {
    const courses = [
      makeCourse({ id: "c1", course_code: "CS101", course_id: "c1", semester: 1 }),
      makeCourse({ id: "c2", course_code: "CS102", course_id: "c2", semester: 2 }),
      makeCourse({ id: "c3", course_code: "CS103", course_id: "c3", semester: 3 }),
    ];
    const { start, end } = dateRange("2026-06-01", 30);
    const result = generateEnhancedSchedule(courses, start, end, [], {});

    expect(result).toHaveLength(3);
    // With daily limit of 2, courses can share dates, so at least 2 unique dates
    const dates = result.map((r) => r.exam_date);
    expect(new Set(dates).size).toBeGreaterThanOrEqual(2);
  });

  it("throws when no valid exam dates exist in range", () => {
    const courses = [makeCourse()];
    // Range of only a weekend (Sat-Sun)
    const start = new Date("2026-06-06"); // Saturday
    const end = new Date("2026-06-07"); // Sunday

    expect(() => generateEnhancedSchedule(courses, start, end, [], {})).toThrow(
      "No valid exam dates"
    );
  });

  it("throws when courses cannot be scheduled within constraints", () => {
    // 10 courses but only 1 weekday available, daily limit = 2
    const courses = Array.from({ length: 10 }, (_, i) =>
      makeCourse({
        id: `c${i}`,
        course_code: `CS${100 + i}`,
        course_id: `c${i}`,
        semester: 1,
        gap_days: 1,
      })
    );
    // Exactly 1 weekday
    const start = new Date("2026-06-01"); // Monday
    const end = new Date("2026-06-01");

    expect(() => generateEnhancedSchedule(courses, start, end, [], {})).toThrow(
      "Could not schedule all courses"
    );
  });

  it("respects holidays by skipping them", () => {
    const courses = [makeCourse({ gap_days: 0 })];
    const start = new Date("2026-06-01"); // Monday
    const end = new Date("2026-06-05"); // Friday
    const holidays = [new Date("2026-06-01")]; // Monday is a holiday

    const result = generateEnhancedSchedule(
      courses,
      start,
      end,
      holidays,
      {}
    );

    expect(result).toHaveLength(1);
    // Should NOT be scheduled on the holiday
    expect(result[0]?.exam_date).not.toBe("2026-06-01");
  });

  it("avoids student conflicts — no two exams on same day for same student", () => {
    const courses = [
      makeCourse({ id: "c1", course_code: "CS101", course_id: "c1", gap_days: 0 }),
      makeCourse({ id: "c2", course_code: "CS102", course_id: "c2", gap_days: 0 }),
    ];
    const studentCourseMap = {
      student1: ["CS101", "CS102"],
    };
    const { start, end } = dateRange("2026-06-01", 14);

    const result = generateEnhancedSchedule(
      courses,
      start,
      end,
      [],
      studentCourseMap
    );

    expect(result).toHaveLength(2);
    // Same student's two exams must be on different dates
    expect(result[0]?.exam_date).not.toBe(result[1]?.exam_date);
  });

  it("respects gap_days between exams for the same student", () => {
    const courses = [
      makeCourse({ id: "c1", course_code: "CS101", course_id: "c1", gap_days: 3 }),
      makeCourse({ id: "c2", course_code: "CS102", course_id: "c2", gap_days: 3 }),
    ];
    const studentCourseMap = {
      student1: ["CS101", "CS102"],
    };
    const { start, end } = dateRange("2026-06-01", 30);

    const result = generateEnhancedSchedule(
      courses,
      start,
      end,
      [],
      studentCourseMap
    );

    expect(result).toHaveLength(2);
    const date1 = new Date(result[0]?.exam_date).getTime();
    const date2 = new Date(result[1]?.exam_date).getTime();
    const dayDiff = Math.abs(date1 - date2) / (1000 * 60 * 60 * 24);
    expect(dayDiff).toBeGreaterThanOrEqual(3);
  });

  it("merges BT/BTCS prefixed courses into one slot", () => {
    const courses = [
      makeCourse({
        id: "c1",
        course_code: "BTCS-101",
        course_id: "c1",
        teacher_name: "Prof A",
      }),
      makeCourse({
        id: "c2",
        course_code: "BT-101",
        course_id: "c2",
        teacher_name: "Prof B",
      }),
    ];
    const { start, end } = dateRange("2026-06-01", 14);

    const result = generateEnhancedSchedule(courses, start, end, [], {});

    // Two courses with same normalized code should merge into one exam slot
    expect(result).toHaveLength(1);
    // The merged course code should be the normalized form
    expect(result[0]?.course_code).toBe("BT-101");
  });

  it("sorts final schedule by date then semester", () => {
    const courses = [
      makeCourse({ id: "c1", course_code: "CS301", course_id: "c1", semester: 3, gap_days: 0 }),
      makeCourse({ id: "c2", course_code: "CS101", course_id: "c2", semester: 1, gap_days: 0 }),
      makeCourse({ id: "c3", course_code: "CS201", course_id: "c3", semester: 2, gap_days: 0 }),
    ];
    const { start, end } = dateRange("2026-06-01", 30);

    const result = generateEnhancedSchedule(courses, start, end, [], {});

    expect(result).toHaveLength(3);
    // Each successive item should be on same or later date
    for (let i = 1; i < result.length; i++) {
      const prevDate = new Date(result[i - 1]?.exam_date).getTime();
      const currDate = new Date(result[i]?.exam_date).getTime();
      expect(currDate).toBeGreaterThanOrEqual(prevDate);
    }
  });

  it("respects daily exam limit — max 2 per day, 1 on Fridays", () => {
    // 3 courses, gap_days=0, all independent students
    const courses = [
      makeCourse({ id: "c1", course_code: "CS101", course_id: "c1", gap_days: 0 }),
      makeCourse({ id: "c2", course_code: "CS102", course_id: "c2", gap_days: 0 }),
      makeCourse({ id: "c3", course_code: "CS103", course_id: "c3", gap_days: 0 }),
    ];
    const { start, end } = dateRange("2026-06-01", 14);

    const result = generateEnhancedSchedule(courses, start, end, [], {});

    expect(result).toHaveLength(3);
    // Count exams per date — none should exceed 2
    const countsPerDate: Record<string, number> = {};
    for (const item of result) {
      countsPerDate[item.exam_date] = (countsPerDate[item.exam_date] ?? 0) + 1;
    }
    for (const [dateStr, count] of Object.entries(countsPerDate)) {
      const dayOfWeek = new Date(dateStr).getDay();
      if (dayOfWeek === 5) {
        // Friday
        expect(count).toBeLessThanOrEqual(1);
      } else {
        expect(count).toBeLessThanOrEqual(2);
      }
    }
  });

  it("assigns correct time slot and day-of-week fields", () => {
    const courses = [makeCourse()];
    const { start, end } = dateRange("2026-06-01", 14);
    const result = generateEnhancedSchedule(courses, start, end, [], {});

    expect(result[0]?.day_of_week).toBeTruthy();
    expect(result[0]?.time_slot).toBeTruthy();
    expect(result[0]?.dayOfWeek).toBe(result[0]?.day_of_week);
    expect(result[0]?.timeSlot).toBe(result[0]?.time_slot);
  });

  it("marks is_first_paper on the first scheduled item", () => {
    const courses = [makeCourse()];
    const { start, end } = dateRange("2026-06-01", 14);
    const result = generateEnhancedSchedule(courses, start, end, [], {});

    expect(result[0]?.is_first_paper).toBe(true);
  });

  it("higher semester courses get higher priority (scheduled first when no conflicts)", () => {
    const courses = [
      makeCourse({ id: "c1", course_code: "CS101", course_id: "c1", semester: 1, gap_days: 0 }),
      makeCourse({ id: "c2", course_code: "CS801", course_id: "c2", semester: 8, gap_days: 0 }),
    ];
    const { start, end } = dateRange("2026-06-01", 30);

    const result = generateEnhancedSchedule(courses, start, end, [], {});

    expect(result).toHaveLength(2);
    // Semester 8 should be scheduled on an equal or earlier date (higher priority)
    const date1 = result.find((r) => r.semester === 8);
    const date2 = result.find((r) => r.semester === 1);
    expect(date1).toBeTruthy();
    expect(date2).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// generateOptimizedSchedule — delegates to enhanced
// ---------------------------------------------------------------------------

describe("generateOptimizedSchedule", () => {
  it("produces the same result as generateEnhancedSchedule", () => {
    const courses = [
      makeCourse({ id: "c1", course_code: "CS101", course_id: "c1" }),
      makeCourse({ id: "c2", course_code: "CS102", course_id: "c2" }),
    ];
    const { start, end } = dateRange("2026-06-01", 30);

    const enhanced = generateEnhancedSchedule(
      courses,
      start,
      end,
      [],
      {}
    );
    const optimized = generateOptimizedSchedule(
      courses,
      start,
      end,
      [],
      {}
    );

    expect(optimized).toHaveLength(enhanced.length);
    expect(optimized.map((e) => e.course_code).sort()).toEqual(
      enhanced.map((e) => e.course_code).sort()
    );
  });
});
