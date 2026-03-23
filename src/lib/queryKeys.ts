/**
 * Centralized query key factory for consistent cache invalidation
 * 
 * Benefits:
 * - Type-safe query keys
 * - Consistent key structure across the app
 * - Easy to invalidate specific scopes
 * - Better cache hit rates
 */

export const queryKeys = {
  // Students
  students: {
    all: ['students'] as const,
    byDept: (deptId: string) => ['students', deptId] as const,
    detail: (studentId: string) => ['students', 'detail', studentId] as const,
  },

  // Seat Assignments
  seatAssignments: {
    all: ['seat_assignments'] as const,
    byDate: (examDate: string) => ['seat_assignments', examDate] as const,
    byDateAndDept: (examDate: string, deptId: string) => 
      ['seat_assignments', examDate, deptId] as const,
  },

  // Departments
  departments: {
    all: ['departments'] as const,
    detail: (deptId: string) => ['departments', 'detail', deptId] as const,
  },

  // Venues
  venues: {
    all: ['venues'] as const,
    detail: (venueId: string) => ['venues', 'detail', venueId] as const,
  },

  // Schedules
  schedules: {
    all: ['schedules'] as const,
    byDate: (date: string) => ['schedules', date] as const,
    byStudent: (studentId: string) => ['schedules', 'student', studentId] as const,
    byDept: (deptId: string) => ['schedules', 'dept', deptId] as const,
  },

  // User Profile
  profile: {
    current: ['profile', 'current'] as const,
    byId: (userId: string) => ['profile', userId] as const,
  },

  // Audit Logs
  auditLogs: {
    all: ['audit_logs'] as const,
    byUser: (userId: string) => ['audit_logs', 'user', userId] as const,
    byAction: (action: string) => ['audit_logs', 'action', action] as const,
  },
} as const;

/**
 * Helper to invalidate all queries under a specific scope
 * 
 * Example:
 * queryClient.invalidateQueries({ queryKey: queryKeys.students.all })
 * This will invalidate all student queries including byDept
 */
