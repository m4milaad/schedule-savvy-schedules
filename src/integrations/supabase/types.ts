export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      course_assignments: {
        Row: {
          course_id: string | null
          created_at: string | null
          id: string
          teacher_id: string | null
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          id?: string
          teacher_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_assignments_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          course_code: string
          course_type: string | null
          created_at: string | null
          credits: number | null
          department_id: string | null
          gap_days: number | null
          id: string
          name: string
          program_type: string | null
          semester: number | null
          updated_at: string | null
        }
        Insert: {
          course_code: string
          course_type?: string | null
          created_at?: string | null
          credits?: number | null
          department_id?: string | null
          gap_days?: number | null
          id?: string
          name: string
          program_type?: string | null
          semester?: number | null
          updated_at?: string | null
        }
        Update: {
          course_code?: string
          course_type?: string | null
          created_at?: string | null
          credits?: number | null
          department_id?: string | null
          gap_days?: number | null
          id?: string
          name?: string
          program_type?: string | null
          semester?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          id: string
          name: string
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_invigilators: {
        Row: {
          created_at: string | null
          duty_type: string | null
          exam_schedule_id: string | null
          id: string
          teacher_id: string | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          duty_type?: string | null
          exam_schedule_id?: string | null
          id?: string
          teacher_id?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          duty_type?: string | null
          exam_schedule_id?: string | null
          id?: string
          teacher_id?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_invigilators_exam_schedule_id_fkey"
            columns: ["exam_schedule_id"]
            isOneToOne: false
            referencedRelation: "exam_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_invigilators_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_invigilators_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_schedules: {
        Row: {
          course_code: string
          created_at: string | null
          day_of_week: string | null
          exam_date: string
          id: string
          program_type: string | null
          semester: number | null
          session_id: string | null
          teacher_code: string
          time_slot: string | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          course_code: string
          created_at?: string | null
          day_of_week?: string | null
          exam_date: string
          id?: string
          program_type?: string | null
          semester?: number | null
          session_id?: string | null
          teacher_code: string
          time_slot?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          course_code?: string
          created_at?: string | null
          day_of_week?: string | null
          exam_date?: string
          id?: string
          program_type?: string | null
          semester?: number | null
          session_id?: string | null
          teacher_code?: string
          time_slot?: string | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_schedules_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_schedules_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string | null
          description: string | null
          holiday_date: string
          holiday_name: string
          id: string
          is_recurring: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          holiday_date: string
          holiday_name: string
          id?: string
          is_recurring?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          holiday_date?: string
          holiday_name?: string
          id?: string
          is_recurring?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      login_tbl: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          password_hash: string
          reference_id: string | null
          updated_at: string | null
          user_type: string
          username: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash: string
          reference_id?: string | null
          updated_at?: string | null
          user_type: string
          username: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash?: string
          reference_id?: string | null
          updated_at?: string | null
          user_type?: string
          username?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          details: string
          id: string
          is_active: boolean | null
          notification_date: string | null
          target_audience: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          details: string
          id?: string
          is_active?: boolean | null
          notification_date?: string | null
          target_audience?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string
          id?: string
          is_active?: boolean | null
          notification_date?: string | null
          target_audience?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          address: string | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          academic_year: number
          created_at: string | null
          end_date: string | null
          id: string
          is_active: boolean | null
          name: string
          start_date: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          start_date?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: number
          created_at?: string | null
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          start_date?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      student_enrollments: {
        Row: {
          academic_year: string | null
          course_id: string | null
          created_at: string | null
          grade: string | null
          id: string
          marks_obtained: number | null
          max_marks: number | null
          semester: number | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          academic_year?: string | null
          course_id?: string | null
          created_at?: string | null
          grade?: string | null
          id?: string
          marks_obtained?: number | null
          max_marks?: number | null
          semester?: number | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          academic_year?: string | null
          course_id?: string | null
          created_at?: string | null
          grade?: string | null
          id?: string
          marks_obtained?: number | null
          max_marks?: number | null
          semester?: number | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          contact_no: string | null
          created_at: string | null
          department_id: string | null
          email: string | null
          enrollment_no: string
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_no?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          enrollment_no: string
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_no?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          enrollment_no?: string
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      teachers: {
        Row: {
          address: string | null
          contact_no: string | null
          created_at: string | null
          department_id: string | null
          designation: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          teacher_code: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_no?: string | null
          created_at?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          teacher_code: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_no?: string | null
          created_at?: string | null
          department_id?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          teacher_code?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_assignments: {
        Row: {
          created_at: string | null
          exam_schedule_id: string | null
          id: string
          students_count: number | null
          updated_at: string | null
          venue_id: string | null
        }
        Insert: {
          created_at?: string | null
          exam_schedule_id?: string | null
          id?: string
          students_count?: number | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Update: {
          created_at?: string | null
          exam_schedule_id?: string | null
          id?: string
          students_count?: number | null
          updated_at?: string | null
          venue_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venue_assignments_exam_schedule_id_fkey"
            columns: ["exam_schedule_id"]
            isOneToOne: false
            referencedRelation: "exam_schedules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_assignments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          capacity: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_orphaned_records: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_schedule_data: {
        Args: {
          p_semester?: number
          p_program_type?: string
          p_course_code?: string
        }
        Returns: {
          assignment_id: string
          course_code: string
          teacher_code: string
          course_name: string
          teacher_name: string
          semester: number
          program_type: string
          gap_days: number
          has_exam_scheduled: boolean
        }[]
      }
      manage_course_teacher_assignment: {
        Args: {
          p_action: string
          p_course_code: string
          p_teacher_code: string
          p_course_name?: string
          p_teacher_name?: string
          p_semester?: number
          p_program_type?: string
          p_gap_days?: number
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
