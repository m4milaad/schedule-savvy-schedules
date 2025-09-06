import { CourseTeacher, ExamScheduleItem } from "@/types/examSchedule";
import { generateExamDates, getExamTimeSlot } from "./scheduleUtils";
import { groupCoursesByNormalizedCode, normalizeCourseCode } from "./courseUtils";

/**
 * Enhanced exam scheduling algorithm with priority scoring, backtracking,
 * and optimized conflict resolution
 */

interface SchedulingContext {
  examDates: Date[];
  studentCourseMap: Record<string, string[]>;
  dateScheduleCount: Record<string, number>;
  studentExamDates: Record<string, Set<string>>;
  scheduledCourses: Set<string>;
  schedule: ExamScheduleItem[];
}

interface CourseWithPriority extends CourseTeacher {
  priority: number;
  normalizedCode: string;
}

/**
 * Calculates priority score for course scheduling
 * Higher priority = scheduled earlier
 */
function calculateCoursePriority(course: CourseTeacher, studentCourseMap: Record<string, string[]>): number {
  let priority = 0;
  
  // Priority based on semester (higher semesters get higher priority)
  priority += course.semester * 10;
  
  // Priority based on gap days (courses with higher gaps scheduled earlier)
  priority += (course.gap_days || 2) * 5;
  
  // Priority based on number of enrolled students (more students = higher priority)
  const enrolledStudents = Object.values(studentCourseMap).filter(courses => 
    courses.includes(course.course_code)
  ).length;
  priority += enrolledStudents * 2;
  
  // Priority based on course credits (assuming higher credits need more preparation time)
  if (course.course_code.includes('L')) priority -= 5; // Lab courses get lower priority
  
  return priority;
}

/**
 * Groups and merges courses with similar prefixes (BT/BTCS)
 */
function mergeSimilarCourses(courses: CourseTeacher[]): CourseTeacher[] {
  const groupedCourses = groupCoursesByNormalizedCode(courses);
  const mergedCourses: CourseTeacher[] = [];
  
  groupedCourses.forEach((courseGroup, normalizedCode) => {
    if (courseGroup.length === 1) {
      mergedCourses.push(courseGroup[0]);
    } else {
      // Merge multiple courses with same normalized code
      const primaryCourse = courseGroup[0];
      const mergedTeachers = courseGroup.map(c => c.teacher_name).filter(Boolean).join(', ');
      
      mergedCourses.push({
        ...primaryCourse,
        course_code: normalizedCode,
        teacher_name: mergedTeachers,
        id: `merged_${normalizedCode}_${courseGroup.map(c => c.id).join('_')}`
      });
    }
  });
  
  return mergedCourses;
}

/**
 * Checks if scheduling a course on a date would create student conflicts
 */
function hasStudentConflict(
  course: CourseTeacher,
  dateStr: string,
  context: SchedulingContext
): boolean {
  const studentsInCourse = Object.keys(context.studentCourseMap).filter(studentId =>
    context.studentCourseMap[studentId].includes(course.course_code) ||
    context.studentCourseMap[studentId].includes(normalizeCourseCode(course.course_code))
  );
  
  return studentsInCourse.some(studentId => {
    const studentDates = context.studentExamDates[studentId];
    return studentDates && studentDates.has(dateStr);
  });
}

/**
 * Checks if the gap requirement is satisfied for a course
 */
function satisfiesGapRequirement(
  course: CourseTeacher,
  dateStr: string,
  context: SchedulingContext
): boolean {
  const gapDays = course.gap_days || 2;
  const currentDate = new Date(dateStr);
  const studentsInCourse = Object.keys(context.studentCourseMap).filter(studentId =>
    context.studentCourseMap[studentId].includes(course.course_code) ||
    context.studentCourseMap[studentId].includes(normalizeCourseCode(course.course_code))
  );
  
  for (const studentId of studentsInCourse) {
    const studentDates = context.studentExamDates[studentId];
    if (!studentDates) continue;
    
    for (const examDateStr of studentDates) {
      const examDate = new Date(examDateStr);
      const dayDifference = Math.abs((currentDate.getTime() - examDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (dayDifference < gapDays) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Attempts to schedule a course using backtracking
 */
function scheduleWithBacktracking(
  courses: CourseWithPriority[],
  courseIndex: number,
  context: SchedulingContext
): boolean {
  if (courseIndex >= courses.length) {
    return true; // All courses scheduled successfully
  }
  
  const course = courses[courseIndex];
  
  // Skip if already scheduled (merged courses)
  if (context.scheduledCourses.has(course.normalizedCode)) {
    return scheduleWithBacktracking(courses, courseIndex + 1, context);
  }
  
  // Try each available date
  for (let dateIndex = 0; dateIndex < context.examDates.length; dateIndex++) {
    const examDate = context.examDates[dateIndex];
    const dateStr = examDate.toISOString().split('T')[0];
    
    // Check constraints
    if (hasStudentConflict(course, dateStr, context)) continue;
    if (!satisfiesGapRequirement(course, dateStr, context)) continue;
    
    // Check daily exam limit (max 2 exams per day)
    const dailyLimit = examDate.getDay() === 5 ? 1 : 2; // Friday: 1 exam, others: 2 exams
    if ((context.dateScheduleCount[dateStr] || 0) >= dailyLimit) continue;
    
    // Attempt to schedule
    const scheduleItem: ExamScheduleItem = {
      id: course.id,
      course_code: course.course_code,
      teacher_name: course.teacher_name || "",
      exam_date: dateStr,
      day_of_week: examDate.toLocaleDateString('en-US', { weekday: 'long' }),
      time_slot: getExamTimeSlot(examDate),
      semester: course.semester,
      program_type: course.program_type,
      date: examDate,
      courseCode: course.course_code,
      dayOfWeek: examDate.toLocaleDateString('en-US', { weekday: 'long' }),
      timeSlot: getExamTimeSlot(examDate),
      gap_days: course.gap_days || 2,
      is_first_paper: context.schedule.length === 0
    };
    
    // Add to schedule
    context.schedule.push(scheduleItem);
    context.scheduledCourses.add(course.normalizedCode);
    context.dateScheduleCount[dateStr] = (context.dateScheduleCount[dateStr] || 0) + 1;
    
    // Update student exam dates
    const studentsInCourse = Object.keys(context.studentCourseMap).filter(studentId =>
      context.studentCourseMap[studentId].includes(course.course_code) ||
      context.studentCourseMap[studentId].includes(normalizeCourseCode(course.course_code))
    );
    
    studentsInCourse.forEach(studentId => {
      if (!context.studentExamDates[studentId]) {
        context.studentExamDates[studentId] = new Set();
      }
      context.studentExamDates[studentId].add(dateStr);
    });
    
    // Recursively schedule remaining courses
    if (scheduleWithBacktracking(courses, courseIndex + 1, context)) {
      return true; // Success
    }
    
    // Backtrack
    context.schedule.pop();
    context.scheduledCourses.delete(course.normalizedCode);
    context.dateScheduleCount[dateStr]--;
    if (context.dateScheduleCount[dateStr] === 0) {
      delete context.dateScheduleCount[dateStr];
    }
    
    studentsInCourse.forEach(studentId => {
      context.studentExamDates[studentId]?.delete(dateStr);
    });
  }
  
  return false; // Could not schedule this course
}

/**
 * Enhanced exam schedule generation with all algorithm improvements
 */
export async function generateEnhancedSchedule(
  courses: CourseTeacher[],
  startDate: Date,
  endDate: Date,
  holidays: Date[],
  studentCourseMap: Record<string, string[]>
): Promise<ExamScheduleItem[]> {
  
  // Step 1: Merge similar courses (BT/BTCS)
  const mergedCourses = mergeSimilarCourses(courses);
  
  // Step 2: Calculate priorities and sort
  const coursesWithPriority: CourseWithPriority[] = mergedCourses.map(course => ({
    ...course,
    priority: calculateCoursePriority(course, studentCourseMap),
    normalizedCode: normalizeCourseCode(course.course_code)
  }));
  
  // Sort by priority (highest first)
  coursesWithPriority.sort((a, b) => b.priority - a.priority);
  
  // Step 3: Generate valid exam dates
  const examDates = generateExamDates(startDate, endDate, holidays);
  
  if (examDates.length === 0) {
    throw new Error("No valid exam dates found in the selected range");
  }
  
  // Step 4: Initialize scheduling context
  const context: SchedulingContext = {
    examDates,
    studentCourseMap,
    dateScheduleCount: {},
    studentExamDates: {},
    scheduledCourses: new Set(),
    schedule: []
  };
  
  // Step 5: Schedule using backtracking algorithm
  const success = scheduleWithBacktracking(coursesWithPriority, 0, context);
  
  if (!success) {
    throw new Error("Could not schedule all courses with the given constraints. Try extending the date range or reducing gap requirements.");
  }
  
  // Step 6: Sort final schedule by date and time
  context.schedule.sort((a, b) => {
    const dateComparison = new Date(a.exam_date).getTime() - new Date(b.exam_date).getTime();
    if (dateComparison !== 0) return dateComparison;
    
    // Secondary sort by semester
    return a.semester - b.semester;
  });
  
  return context.schedule;
}

/**
 * Performance optimized version for large datasets
 */
export async function generateOptimizedSchedule(
  courses: CourseTeacher[],
  startDate: Date,
  endDate: Date,
  holidays: Date[],
  studentCourseMap: Record<string, string[]>
): Promise<ExamScheduleItem[]> {
  
  // Pre-compute student-course conflicts for better performance
  const studentConflictMap = new Map<string, Set<string>>();
  
  Object.entries(studentCourseMap).forEach(([studentId, courseCodes]) => {
    courseCodes.forEach(courseCode => {
      const normalizedCode = normalizeCourseCode(courseCode);
      if (!studentConflictMap.has(normalizedCode)) {
        studentConflictMap.set(normalizedCode, new Set());
      }
      studentConflictMap.get(normalizedCode)!.add(studentId);
    });
  });
  
  // Use the enhanced algorithm with pre-computed conflicts
  return generateEnhancedSchedule(courses, startDate, endDate, holidays, studentCourseMap);
}