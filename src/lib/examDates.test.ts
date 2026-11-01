import { describe, expect, it } from "vitest";
import { summariseExamDates } from "./examDates";

describe("summariseExamDates", () => {
  it("keeps today and later, drops past days and duplicates, counts days to the next", () => {
    const now = new Date(2026, 10, 1, 18, 30); // 1 Nov 2026, evening local time
    const s = summariseExamDates(["2026-11-03", "2026-10-31", "2026-11-01", "2026-11-01"], now);
    expect(s.upcoming).toEqual(["2026-11-01", "2026-11-03"]);
    expect(s.next).toBe("2026-11-01");
    expect(s.daysUntilNext).toBe(0);
    expect(s.last).toBe("2026-11-03");
  });

  it("reports nothing upcoming when every day has passed", () => {
    const s = summariseExamDates(["2026-04-15", "2026-04-19"], new Date(2026, 10, 1));
    expect(s).toEqual({ upcoming: [], next: null, daysUntilNext: null, last: null });
  });
});
