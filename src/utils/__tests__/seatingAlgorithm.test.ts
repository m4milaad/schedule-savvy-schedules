import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";

type QueryResult = { data: unknown; error: unknown };

interface SupabaseChain {
  table: string;
  select: Mock;
  insert: Mock;
  delete: Mock;
  eq: Mock;
  in: Mock;
  order: Mock;
  then: (
    resolve: (value: QueryResult) => unknown
  ) => Promise<unknown>;
}

const mockSupabaseQuery = vi.fn<(chain: SupabaseChain) => QueryResult>();

vi.mock("@/integrations/supabase/client", () => {
  return {
    supabase: {
      from: (table: string) => {
        const chain = {
          table,
          select: vi.fn(),
          insert: vi.fn(),
          delete: vi.fn(),
          eq: vi.fn(),
          in: vi.fn(),
          order: vi.fn(),
        } as SupabaseChain;
        chain.select.mockReturnValue(chain);
        chain.insert.mockReturnValue(chain);
        chain.delete.mockReturnValue(chain);
        chain.eq.mockReturnValue(chain);
        chain.in.mockReturnValue(chain);
        chain.order.mockReturnValue(chain);
        chain.then = (resolve) =>
          Promise.resolve(resolve(mockSupabaseQuery(chain)));
        return chain;
      },
    },
  };
});

vi.mock("@/lib/logger", () => ({
  default: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import {
  generateSeatingArrangement,
  saveSeatingArrangement,
  getSavedSeatingArrangement,
  scatterStudentsIntoGrid,
} from "../seatingAlgorithm";

describe("seatingAlgorithm.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("scatterStudentsIntoGrid", () => {
    it("should return empty grid if no students", () => {
      const grid = scatterStudentsIntoGrid([], 2, 2);
      expect(grid[0]?.[0]).toBeNull();
    });

    it("should fill students following a round-robin column pattern", () => {
      const students = [
        { student_id: "1", student_name: "A1", student_enrollment_no: "E1", course_id: "c1", course_code: "MATH", dept_id: "d1" },
        { student_id: "2", student_name: "A2", student_enrollment_no: "E2", course_id: "c1", course_code: "MATH", dept_id: "d1" },
        { student_id: "3", student_name: "B1", student_enrollment_no: "E3", course_id: "c2", course_code: "PHYS", dept_id: "d1" },
      ];
      const grid = scatterStudentsIntoGrid(students, 2, 2);
      // MATH goes to col 0, PHYS goes to col 1.
      expect(grid[0]?.[0]?.course_code).toBe("MATH");
      expect(grid[1]?.[0]?.course_code).toBe("MATH");
      expect(grid[0]?.[1]?.course_code).toBe("PHYS");
    });

    it("should fallback to other courses when assigned course runs out", () => {
      const students = [
        { student_id: "1", student_name: "A1", student_enrollment_no: "E1", course_id: "c1", course_code: "MATH", dept_id: "d1" },
        { student_id: "2", student_name: "B1", student_enrollment_no: "E2", course_id: "c2", course_code: "PHYS", dept_id: "d1" },
        { student_id: "3", student_name: "B2", student_enrollment_no: "E3", course_id: "c2", course_code: "PHYS", dept_id: "d1" },
      ];
      // Grid is 2x2. Col 0 is MATH, Col 1 is PHYS. MATH has 1 student, PHYS has 2.
      // Col 0, Row 0 -> MATH. Col 0, Row 1 -> MATH empty, falls back to PHYS.
      const grid = scatterStudentsIntoGrid(students, 2, 2);
      expect(grid[0]?.[0]?.course_code).toBe("MATH");
      expect(grid[1]?.[0]?.course_code).toBe("PHYS"); // Fallback placed here
      expect(grid[0]?.[1]?.course_code).toBe("PHYS");
    });
  });

  describe("generateSeatingArrangement", () => {
    it("should return early if no datesheets are found", async () => {
      mockSupabaseQuery.mockReturnValue({ data: [], error: null });
      const res = await generateSeatingArrangement("2024-01-01");
      expect(res.success).toBe(false);
      expect(res.error).toBe("No exams scheduled for this date");
    });

    it("should handle supabase errors gracefully", async () => {
      mockSupabaseQuery.mockReturnValue({ data: null, error: new Error("DB Error") });
      const res = await generateSeatingArrangement("2024-01-01");
      expect(res.success).toBe(false);
      expect(res.error).toBe("DB Error");
    });

    it("should return early if no students enrolled", async () => {
      mockSupabaseQuery.mockImplementation((chain) => {
        if (chain.table === "datesheets") return { data: [{ course_id: "c1", courses: { course_id: "c1", course_code: "MATH", dept_id: "d1" } }], error: null };
        if (chain.table === "student_enrollments") return { data: [], error: null };
        return { data: [], error: null };
      });
      const res = await generateSeatingArrangement("2024-01-01");
      expect(res.success).toBe(false);
      expect(res.error).toBe("No students enrolled in scheduled courses");
    });

    it("should return early if no venues available", async () => {
      mockSupabaseQuery.mockImplementation((chain) => {
        if (chain.table === "datesheets") return { data: [{ course_id: "c1", courses: { course_id: "c1", course_code: "MATH", dept_id: "d1" } }], error: null };
        if (chain.table === "student_enrollments") return { data: [{ course_id: "c1", students: { student_id: "s1", student_name: "John", student_enrollment_no: "123", dept_id: "d1" } }], error: null };
        if (chain.table === "venues") return { data: [], error: null };
        return { data: [], error: null };
      });
      const res = await generateSeatingArrangement("2024-01-01", "d1");
      expect(res.success).toBe(false);
      expect(res.error).toBe("No venues available");
    });

    it("should generate full seating arrangement", async () => {
      mockSupabaseQuery.mockImplementation((chain) => {
        if (chain.table === "datesheets") {
          return { data: [{ course_id: "c1", courses: { course_id: "c1", course_code: "MATH", dept_id: "d1" } }], error: null };
        }
        if (chain.table === "student_enrollments") {
          return { data: [{ course_id: "c1", students: { student_id: "s1", student_name: "John", student_enrollment_no: "123", dept_id: "d1" } }], error: null };
        }
        if (chain.table === "venues") {
          return { data: [{ venue_id: "v1", venue_name: "Hall A", dept_id: "d1", rows_count: 2, columns_count: 2 }], error: null };
        }
        return { data: [], error: null };
      });
      
      const res = await generateSeatingArrangement("2024-01-01");
      expect(res.success).toBe(true);
      expect(res.venues.length).toBe(1);
      expect(res.venues[0]?.seats[0]?.[0]?.student_name).toBe("John");
    });

    it("should handle missing department venues by pushing to unassigned", async () => {
      mockSupabaseQuery.mockImplementation((chain) => {
        if (chain.table === "datesheets") {
          return { data: [{ course_id: "c1", courses: { course_id: "c1", course_code: "MATH", dept_id: "d1" } }], error: null };
        }
        if (chain.table === "student_enrollments") {
          return { data: [{ course_id: "c1", students: { student_id: "s1", student_name: "John", student_enrollment_no: "123", dept_id: "d1" } }], error: null };
        }
        if (chain.table === "venues") {
          return { data: [{ venue_id: "v1", venue_name: "Hall A", dept_id: "d2", rows_count: 2, columns_count: 2 }], error: null };
        }
        return { data: [], error: null };
      });
      
      const res = await generateSeatingArrangement("2024-01-01");
      expect(res.success).toBe(true);
      expect(res.venues.length).toBe(0);
      expect(res.unassigned.length).toBe(1);
      expect(res.unassigned[0]?.student_id).toBe("s1");
    });
  });

  describe("saveSeatingArrangement", () => {
    it("should return success on valid insert", async () => {
      mockSupabaseQuery.mockReturnValue({ data: [], error: null });
      const res = await saveSeatingArrangement("2024-01-01", [{
        venue_id: "v1",
        venue_name: "Hall",
        rows: 2, columns: 2, total_capacity: 4,
        seats: [
          [{ student_id: "s1", student_name: "A", student_enrollment_no: "1", course_id: "c1", course_code: "MATH", seat: { row: 1, column: 1, label: "R1C1" } }, null],
          [null, null]
        ]
      }]);
      expect(res.success).toBe(true);
    });

    it("should return error if delete fails", async () => {
      mockSupabaseQuery.mockImplementation((chain) => {
        if (chain.table === "seat_assignments" && chain.delete) {
          return { error: new Error("Delete failed") };
        }
        return { data: [], error: null };
      });
      const res = await saveSeatingArrangement("2024-01-01", []);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Delete failed");
    });
  });

  describe("getSavedSeatingArrangement", () => {
    it("should fetch saved arrangements", async () => {
      mockSupabaseQuery.mockReturnValue({
        data: [{
          row_number: 1,
          column_number: 1,
          seat_label: "R1C1",
          venues: { venue_id: "v1", venue_name: "Hall", rows_count: 2, columns_count: 2, dept_id: "d1" },
          courses: { course_id: "c1", course_code: "MATH" },
          students: { student_id: "s1", student_name: "John", student_enrollment_no: "123" }
        }],
        error: null
      });

      const res = await getSavedSeatingArrangement("2024-01-01");
      expect(res.length).toBe(1);
      expect(res[0]?.seats[0]?.[0]?.student_name).toBe("John");
    });

    it("should handle error in fetch", async () => {
      mockSupabaseQuery.mockImplementation((_chain) => {
        throw new Error("DB Fetch Error");
      });
      const res = await getSavedSeatingArrangement("2024-01-01");
      expect(res.length).toBe(0);
    });
  });
});
