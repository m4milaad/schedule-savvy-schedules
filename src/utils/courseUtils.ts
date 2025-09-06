/**
 * Course merging utilities for handling similar course prefixes
 */

/**
 * Merges course codes with similar prefixes (BT and BTCS are treated as the same)
 * @param courseCode - The original course code
 * @returns The normalized course code
 */
export const normalizeCourseCode = (courseCode: string): string => {
  // Convert BTCS prefix to BT for merging purposes
  if (courseCode.startsWith('BTCS-')) {
    return courseCode.replace('BTCS-', 'BT-');
  }
  return courseCode;
};

/**
 * Checks if two course codes should be considered the same after normalization
 * @param courseCode1 - First course code
 * @param courseCode2 - Second course code
 * @returns True if the courses should be merged
 */
export const shouldMergeCourses = (courseCode1: string, courseCode2: string): boolean => {
  return normalizeCourseCode(courseCode1) === normalizeCourseCode(courseCode2);
};

/**
 * Groups courses by their normalized course codes for merging
 * @param courses - Array of courses
 * @returns Map of normalized course codes to arrays of courses
 */
export const groupCoursesByNormalizedCode = <T extends { course_code: string }>(
  courses: T[]
): Map<string, T[]> => {
  const groupedCourses = new Map<string, T[]>();
  
  courses.forEach((course) => {
    const normalizedCode = normalizeCourseCode(course.course_code);
    if (!groupedCourses.has(normalizedCode)) {
      groupedCourses.set(normalizedCode, []);
    }
    groupedCourses.get(normalizedCode)!.push(course);
  });
  
  return groupedCourses;
};