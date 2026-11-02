import { describe, it, expect } from 'vitest';
import { readRow, toStored, totalOf, gradeOf, DEFAULT_SCHEME } from './awardRoll';

describe('award roll', () => {
  it('reads old fixed-column rows as the default 5 x 20 scheme', () => {
    const { scheme, scores } = readRow({ test_1_marks: 15, test_2_marks: null, attendance_marks: 0 });
    expect(scheme).toEqual(DEFAULT_SCHEME);
    expect(scores).toMatchObject({ 'Test-1': 15, 'Test-2': null, Attendance: 0 });
  });

  it('round-trips custom components', () => {
    const scheme = [{ name: 'Test-1', max: 40 }, { name: 'Field Trip', max: 60 }];
    const row = { component_marks: toStored(scheme, { 'Test-1': 30, 'Field Trip': null }) };
    expect(readRow(row)).toEqual({ scheme, scores: { 'Test-1': 30, 'Field Trip': null } });
  });

  it('totals only entered marks, counting zero', () => {
    const scheme = [{ name: 'A', max: 50 }, { name: 'B', max: 50 }];
    expect(totalOf(scheme, {})).toBeNull();
    expect(totalOf(scheme, { A: 0 })).toBe(0);
    expect(totalOf(scheme, { A: 40, B: 45, Gone: 99 })).toBe(85);
    expect(gradeOf(85)).toBe('A');
    expect(gradeOf(null)).toBeNull();
  });
});
