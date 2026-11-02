// Award roll components: what a course is assessed on and how many marks each part carries.

export interface AwardComponent {
  name: string;
  max: number;
}

export type Scores = Record<string, number | null>;

/** What student_marks.component_marks holds, one entry per component. */
type StoredComponent = AwardComponent & { marks: number | null };

export const PRESET_COMPONENTS = ['Test-1', 'Test-2', 'Assignment', 'Presentation', 'Attendance', 'Project', 'Field Trip', 'Viva', 'Quiz', 'Others'];

/** Weightages must add up to this, so totals stay a percentage everywhere else in the app. */
export const AWARD_TOTAL = 100;

// The fixed scheme rows used before component_marks existed (and the default for a new course).
const LEGACY: { name: string; column: string }[] = [
  { name: 'Test-1', column: 'test_1_marks' },
  { name: 'Test-2', column: 'test_2_marks' },
  { name: 'Presentation', column: 'presentation_marks' },
  { name: 'Assignment', column: 'assignment_marks' },
  { name: 'Attendance', column: 'attendance_marks' },
];
export const DEFAULT_SCHEME: AwardComponent[] = LEGACY.map(({ name }) => ({ name, max: 20 }));

/** Scheme and scores of one student_marks row, whether it was saved before or after custom components. */
export function readRow(row: Record<string, unknown>): { scheme: AwardComponent[]; scores: Scores } {
  if (Array.isArray(row.component_marks)) {
    const stored = row.component_marks as StoredComponent[];
    return {
      scheme: stored.map(({ name, max }) => ({ name, max })),
      scores: Object.fromEntries(stored.map(c => [c.name, c.marks ?? null])),
    };
  }
  return {
    scheme: DEFAULT_SCHEME,
    scores: Object.fromEntries(LEGACY.map(({ name, column }) => [name, (row[column] as number | null) ?? null])),
  };
}

export function toStored(scheme: AwardComponent[], scores: Scores): StoredComponent[] {
  return scheme.map(c => ({ ...c, marks: scores[c.name] ?? null }));
}

/** Sum of the entered marks, or null while nothing is entered. */
export function totalOf(scheme: AwardComponent[], scores: Scores): number | null {
  const entered = scheme.map(c => scores[c.name]).filter((v): v is number => v != null);
  return entered.length ? entered.reduce((a, b) => a + b, 0) : null;
}

export function gradeOf(total: number | null): string | null {
  if (total == null) return null;
  if (total >= 90) return 'A+';
  if (total >= 80) return 'A';
  if (total >= 70) return 'B+';
  if (total >= 60) return 'B';
  if (total >= 50) return 'C';
  if (total >= 40) return 'D';
  return 'F';
}

/** Spreadsheet header for a component, e.g. "Field Trip (10)". */
export const columnHeader = (c: AwardComponent) => `${c.name} (${c.max})`;
