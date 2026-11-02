import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Save, FileSpreadsheet, Edit, Lock, SlidersHorizontal, Plus } from 'lucide-react';
import { createWorkbook, addWorksheetFromJson, downloadWorkbook, readExcelFile } from '@/utils/excelUtils';
import logger from '@/lib/logger';
import {
  type AwardComponent, type Scores, AWARD_TOTAL, DEFAULT_SCHEME, PRESET_COMPONENTS,
  columnHeader, gradeOf, readRow, toStored, totalOf,
} from './awardRoll';


interface MarksTabProps {
  teacherId: string;
  courses: Record<string, unknown>[];
}

interface StudentMark {
  id?: string;
  student_id: string;
  student_name: string;
  enrollment_no: string;
  scores: Scores;
  total_marks: number | null;
  grade: string | null;
}

export const MarksTab: React.FC<MarksTabProps> = ({ teacherId, courses }) => {
  const [selectedCourse, setSelectedCourse] = useState('');
  const [marks, setMarks] = useState<StudentMark[]>([]);
  const [scheme, setScheme] = useState<AwardComponent[]>([]);
  // Component picker: null = closed; confirming = showing the summary before it is applied.
  const [draft, setDraft] = useState<AwardComponent[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [customName, setCustomName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [tempSelectedCourse, setTempSelectedCourse] = useState('');
  const { toast } = useToast();

  const course = courses.find(c => c.course_id === selectedCourse);

  useEffect(() => {
    if (selectedCourse) {
      loadMarks();
    }
  }, [selectedCourse]);

  const loadMarks = async () => {
    if (!selectedCourse) return;
    setLoading(true);

    try {
      // Get enrolled students for this course
      const { data: enrollments, error: enrollError } = await supabase
        .from('student_enrollments')
        .select(`
          student_id,
          students:student_id (
            student_id,
            student_name,
            student_enrollment_no
          )
        `)
        .eq('course_id', selectedCourse)
        .eq('is_active', true);

      if (enrollError) throw enrollError;

      // Get existing marks
      const { data: existingMarks, error: marksError } = await supabase
        .from('student_marks')
        .select('*')
        .eq('course_id', selectedCourse)
        .eq('teacher_id', teacherId);

      if (marksError) throw marksError;

      // The course's components are whatever its saved rows use; a course with none yet gets the picker.
      const saved = existingMarks?.[0];

      const studentMarks: StudentMark[] = (enrollments || []).map(e => {
        const student = e.students as { student_name: string; student_enrollment_no: string } | null;
        const existing = existingMarks?.find(m => m.student_id === e.student_id);

        return {
          id: existing?.id,
          student_id: e.student_id || '',
          student_name: student?.student_name || 'Unknown',
          enrollment_no: student?.student_enrollment_no || 'N/A',
          scores: existing ? readRow(existing).scores : {},
          total_marks: existing?.total_marks ?? null,
          grade: existing?.grade ?? null,
        };
      });

      setMarks(studentMarks);
      if (saved) {
        setScheme(readRow(saved).scheme);
      } else {
        setScheme([]);
        openPicker(DEFAULT_SCHEME);
      }
    } catch (error: unknown) {
      logger.error('Error loading marks:', error);
      toast({
        title: 'Error',
        description: 'Failed to load student marks',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const withTotals = (mark: StudentMark, components: AwardComponent[]): StudentMark => {
    const total = totalOf(components, mark.scores);
    return { ...mark, total_marks: total, grade: gradeOf(total) };
  };

  const handleMarkChange = (index: number, component: string, value: string) => {
    setMarks(marks.map((m, i) => i !== index ? m : withTotals(
      { ...m, scores: { ...m.scores, [component]: value === '' ? null : parseFloat(value) } },
      scheme,
    )));
  };

  // ── Component picker ──
  const openPicker = (start: AwardComponent[]) => {
    setDraft(start.map(c => ({ ...c })));
    setConfirming(false);
    setCustomName('');
  };

  const draftNames = draft ? [...PRESET_COMPONENTS, ...draft.map(c => c.name).filter(n => !PRESET_COMPONENTS.includes(n))] : [];
  const draftTotal = (draft ?? []).reduce((sum, c) => sum + (c.max || 0), 0);
  const draftValid = !!draft && draft.length > 0 && draft.every(c => c.max > 0) && draftTotal === AWARD_TOTAL;

  const toggleComponent = (name: string, on: boolean) => {
    if (!draft) return;
    setDraft(on ? [...draft, { name, max: 0 }] : draft.filter(c => c.name !== name));
  };

  const setComponentMax = (name: string, value: string) => {
    if (!draft) return;
    setDraft(draft.map(c => c.name === name ? { ...c, max: value === '' ? 0 : Number(value) } : c));
  };

  const addCustomComponent = () => {
    const name = customName.trim();
    if (!draft || !name || draftNames.some(n => n.toLowerCase() === name.toLowerCase())) return;
    setDraft([...draft, { name, max: 0 }]);
    setCustomName('');
  };

  const applyScheme = () => {
    if (!draft) return;
    // Columns follow the picker's order, not the order they were ticked in.
    const next = [...draft].sort((a, b) => draftNames.indexOf(a.name) - draftNames.indexOf(b.name));
    setScheme(next);
    setMarks(marks.map(m => withTotals(
      { ...m, scores: Object.fromEntries(next.map(c => [c.name, m.scores[c.name] ?? null])) },
      next,
    )));
    setDraft(null);
    toast({ title: 'Components applied', description: 'Save the award roll to keep them' });
  };

  const removedWithMarks = draft
    ? scheme.filter(c => !draft.some(d => d.name === c.name) && marks.some(m => m.scores[c.name] != null)).map(c => c.name)
    : [];

  const saveMarks = async () => {
    if (!selectedCourse) return;
    const over = marks.find(m => scheme.some(c => {
      const v = m.scores[c.name];
      return v != null && (Number.isNaN(v) || v < 0 || v > c.max);
    }));
    if (over) {
      toast({
        title: 'Marks out of range',
        description: `${over.student_name}: each mark must be between 0 and the component's maximum`,
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);

    try {
      const semester = (course?.semester as number) || 1;

      for (const mark of marks) {
        const markData = {
          student_id: mark.student_id,
          course_id: selectedCourse,
          teacher_id: teacherId,
          semester,
          component_marks: toStored(scheme, mark.scores) as unknown as Json,
          total_marks: mark.total_marks,
          grade: mark.grade,
        };

        if (mark.id) {
          const { error } = await supabase
            .from('student_marks')
            .update(markData)
            .eq('id', mark.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('student_marks')
            .insert(markData);
          if (error) throw error;
        }
      }

      toast({ title: 'Success', description: 'Award roll saved successfully' });
      loadMarks();
    } catch (error: unknown) {
      logger.error('Error saving marks:', error);
      toast({
        title: 'Error',
        description: (error as Error)?.message || 'Failed to save marks',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const downloadTemplate = async () => {
    const templateData = marks.map(m => ({
      'Enrollment No': m.enrollment_no,
      'Student Name': m.student_name,
      ...Object.fromEntries(scheme.map(c => [columnHeader(c), m.scores[c.name] ?? ''])),
    }));

    const workbook = createWorkbook();
    addWorksheetFromJson(workbook, 'Award Roll', templateData);
    await downloadWorkbook(workbook, `award_roll_template_${course?.course_code ?? selectedCourse}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const jsonData = await readExcelFile(file);
      const missing = scheme.filter(c => !(columnHeader(c) in (jsonData[0] ?? {}))).map(columnHeader);
      if (missing.length) throw new Error(`Missing columns: ${missing.join(', ')}. Download the template again.`);

      const byEnrollment = new Map(jsonData.map((row: Record<string, unknown>) => [String(row['Enrollment No']), row]));
      setMarks(marks.map(m => {
        const row = byEnrollment.get(m.enrollment_no);
        if (!row) return m;
        const scores = Object.fromEntries(scheme.map(c => {
          const v = row[columnHeader(c)];
          return [c.name, v == null || v === '' ? null : Number(v)];
        }));
        return withTotals({ ...m, scores }, scheme);
      }));
      toast({ title: 'Success', description: 'Marks imported. Review them, then save.' });
    } catch (error) {
      toast({
        title: 'Error',
        description: (error as Error)?.message || 'Failed to parse Excel file',
        variant: 'destructive',
      });
    }
    e.target.value = '';
  };

  const exportMarks = async () => {
    const exportData = marks.map(m => ({
      'Enrollment No': m.enrollment_no,
      'Student Name': m.student_name,
      ...Object.fromEntries(scheme.map(c => [columnHeader(c), m.scores[c.name]])),
      [`Total (${AWARD_TOTAL})`]: m.total_marks,
      'Grade': m.grade,
    }));

    const workbook = createWorkbook();
    addWorksheetFromJson(workbook, 'Award Roll', exportData);
    await downloadWorkbook(workbook, `award_roll_${course?.course_code ?? selectedCourse}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleCourseSelection = () => {
    if (tempSelectedCourse) {
      setSelectedCourse(tempSelectedCourse);
      setCourseModalOpen(false);
      setTempSelectedCourse('');
    }
  };

  const handleModalCancel = () => {
    setCourseModalOpen(false);
    setTempSelectedCourse('');
  };

  const getGradeBadge = (grade: string | null) => {
    if (!grade) return null;

    const gradeColors: Record<string, string> = {
      'A+': 'bg-green-600',
      'A': 'bg-blue-600',
      'B+': 'bg-purple-600',
      'B': 'bg-yellow-600',
      'C': 'bg-orange-600',
      'D': 'bg-red-600',
      'F': 'bg-red-800'
    };

    return <Badge className={gradeColors[grade] || 'bg-gray-600'}>{grade}</Badge>;
  };

  const getStatusBadge = (mark: StudentMark) => {
    const total = mark.total_marks;
    if (total === null) return <Badge variant="outline">Pending</Badge>;
    if (total >= 40) return <Badge className="bg-green-600">Pass</Badge>;
    return <Badge variant="destructive">Fail</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Course Selection Modal */}
      <Dialog open={courseModalOpen} onOpenChange={setCourseModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Course</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Course</Label>
              <Select value={tempSelectedCourse} onValueChange={setTempSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.course_id as string} value={course.course_id as string}>
                      {course.course_code as string} - {course.course_name as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleModalCancel}>
                Cancel
              </Button>
              <Button onClick={handleCourseSelection} disabled={!tempSelectedCourse}>
                Apply
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Component picker, then a confirmation of what was picked */}
      <Dialog open={draft !== null} onOpenChange={(open) => !open && setDraft(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{confirming ? 'Confirm award roll components' : 'Award roll components'}</DialogTitle>
            <DialogDescription>
              {course?.course_code as string}
              {course?.program_type ? ` · ${course.program_type as string}` : ''}
              {confirming
                ? ' · These columns will be used for the template, upload and marks entry.'
                : ` · Tick what this course is assessed on and give each its marks. Weightage must total ${AWARD_TOTAL}.`}
            </DialogDescription>
          </DialogHeader>

          {draft && !confirming && (
            <div className="space-y-3">
              <div className="max-h-[50vh] space-y-2 overflow-y-auto pr-1">
                {draftNames.map(name => {
                  const component = draft.find(c => c.name === name);
                  const id = `component-${name.replace(/\W+/g, '-')}`;
                  return (
                    <div key={name} className="flex items-center gap-3">
                      <Checkbox id={id} checked={!!component} onCheckedChange={(on) => toggleComponent(name, on === true)} />
                      <Label htmlFor={id} className="flex-1 cursor-pointer font-normal">{name}</Label>
                      <Input
                        type="number"
                        min="1"
                        aria-label={`${name} marks`}
                        disabled={!component}
                        value={component?.max || ''}
                        onChange={(e) => setComponentMax(name, e.target.value)}
                        className="h-8 w-20 text-center text-sm"
                        placeholder="Marks"
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustomComponent()}
                  placeholder="Add another component, e.g. Lab Record"
                  className="h-8 text-sm"
                  aria-label="New component name"
                />
                <Button variant="outline" size="sm" onClick={addCustomComponent} disabled={!customName.trim()}>
                  <Plus className="mr-1 h-4 w-4" /> Add
                </Button>
              </div>
              <div className={draftTotal === AWARD_TOTAL ? 'text-sm text-muted-foreground' : 'text-sm text-destructive'}>
                Total weightage: <span className="font-semibold">{draftTotal}</span> / {AWARD_TOTAL}
              </div>
            </div>
          )}

          {draft && confirming && (
            <div className="space-y-3">
              <table className="linear-table">
                <thead>
                  <tr>
                    <th className="linear-th">Component</th>
                    <th className="linear-th text-right">Marks</th>
                  </tr>
                </thead>
                <tbody>
                  {[...draft].sort((a, b) => draftNames.indexOf(a.name) - draftNames.indexOf(b.name)).map(c => (
                    <tr key={c.name} className="linear-tr">
                      <td className="linear-td">{c.name}</td>
                      <td className="linear-td text-right">{c.max}</td>
                    </tr>
                  ))}
                  <tr className="linear-tr font-semibold">
                    <td className="linear-td">Total</td>
                    <td className="linear-td text-right">{draftTotal}</td>
                  </tr>
                </tbody>
              </table>
              {removedWithMarks.length > 0 && (
                <div className="text-sm text-destructive">
                  Marks already entered for {removedWithMarks.join(', ')} will be removed when you save.
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {confirming ? (
              <>
                <Button variant="outline" onClick={() => setConfirming(false)}>Back</Button>
                <Button onClick={applyScheme}>Confirm</Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setDraft(null)}>Cancel</Button>
                <Button onClick={() => setConfirming(true)} disabled={!draftValid}>Review</Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Award Roll */}
      <Card className="linear-surface overflow-hidden">
        <CardHeader className="linear-toolbar flex flex-col gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="linear-kicker">Academics</div>
              <CardTitle className="text-base font-semibold">
                Award Roll
              </CardTitle>
            </div>
            <div className="linear-pill">
              <span className="font-medium text-foreground">{marks.length}</span>
              <span>students</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setCourseModalOpen(true)} size="sm">
              {selectedCourse ?
                `${(course?.course_code as string) || 'Course'}` :
                'Select Course'
              }
            </Button>
            {selectedCourse && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openPicker(scheme.length ? scheme : DEFAULT_SCHEME)}
                  disabled={loading}
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Components
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={downloadTemplate}
                  disabled={marks.length === 0 || scheme.length === 0}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Template
                </Button>
                <Label htmlFor="marks-upload" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild disabled={scheme.length === 0}>
                    <span>
                      <Upload className="w-4 h-4 mr-2" />
                      Upload
                    </span>
                  </Button>
                </Label>
                <Input
                  id="marks-upload"
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  disabled={scheme.length === 0}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportMarks}
                  disabled={marks.length === 0 || scheme.length === 0}
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!selectedCourse ? (
            <div className="py-14 text-center">
              <div className="text-sm font-medium">Select a course to start the award roll</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Choose a course from your assigned subjects to begin assessment.
              </div>
            </div>
          ) : loading ? (
            <div className="py-14 text-center">
              <div className="text-sm font-medium">Loading students...</div>
            </div>
          ) : marks.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-sm font-medium">No enrolled students found</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Students will appear here when they enroll in this course.
              </div>
            </div>
          ) : scheme.length === 0 ? (
            <div className="py-14 text-center">
              <div className="text-sm font-medium">Choose this course's assessment components</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Pick components like Test-1, Project or Field Trip and their marks.
              </div>
              <Button className="mt-4" size="sm" onClick={() => openPicker(DEFAULT_SCHEME)}>
                <SlidersHorizontal className="w-4 h-4 mr-2" />
                Choose components
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="linear-table">
                <thead>
                  <tr>
                    <th className="linear-th">Student</th>
                    <th className="linear-th hidden md:table-cell">Roll No</th>
                    {scheme.map(c => (
                      <th key={c.name} className="linear-th hidden lg:table-cell">{columnHeader(c)}</th>
                    ))}
                    <th className="linear-th">Total</th>
                    <th className="linear-th">Grade</th>
                    <th className="linear-th">Status</th>
                    <th className="linear-th text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {marks.map((mark, index) => (
                    <tr key={mark.student_id} className="linear-tr">
                      <td className="linear-td">
                        <div className="font-medium">{mark.student_name}</div>
                        <div className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {mark.enrollment_no}
                        </div>
                      </td>
                      <td className="linear-td hidden md:table-cell text-sm text-muted-foreground">
                        {mark.enrollment_no}
                      </td>
                      {scheme.map(c => (
                        <td key={c.name} className="linear-td hidden lg:table-cell">
                          <Input
                            type="number"
                            min="0"
                            max={c.max}
                            aria-label={`${mark.student_name} ${c.name}`}
                            value={mark.scores[c.name] ?? ''}
                            onChange={(e) => handleMarkChange(index, c.name, e.target.value)}
                            className="w-16 h-8 text-center text-sm"
                            placeholder="0"
                          />
                        </td>
                      ))}
                      <td className="linear-td text-sm font-semibold">
                        {mark.total_marks ?? '-'}
                      </td>
                      <td className="linear-td">
                        {getGradeBadge(mark.grade)}
                      </td>
                      <td className="linear-td">
                        {getStatusBadge(mark)}
                      </td>
                      <td className="linear-td">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={saveMarks}
                            disabled={saving}
                          >
                            <Save className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {}}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {}}
                          >
                            <Lock className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment Guide - Only show when course is selected and has data */}
      {selectedCourse && marks.length > 0 && scheme.length > 0 && (
        <Card className="linear-surface overflow-hidden">
          <CardHeader className="linear-toolbar flex flex-col gap-3">
            <div>
              <div className="linear-kicker">Reference</div>
              <CardTitle className="text-base font-semibold">Assessment Guide</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <div>Total: {AWARD_TOTAL} marks</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-4">
                {scheme.map(c => (
                  <div key={c.name} className="text-center">
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs">{c.max} marks</div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
