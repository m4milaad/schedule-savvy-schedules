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
      courses: {
        Row: {
          course_code: string
          course_credits: number | null
          course_id: string
          course_name: string
          course_type: string | null
          created_at: string | null
          dept_id: string | null
          updated_at: string | null
        }
        Insert: {
          course_code: string
          course_credits?: number | null
          course_id?: string
          course_name: string
          course_type?: string | null
          created_at?: string | null
          dept_id?: string | null
          updated_at?: string | null
        }
        Update: {
          course_code?: string
          course_credits?: number | null
          course_id?: string
          course_name?: string
          course_type?: string | null
          created_at?: string | null
          dept_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_dept_id_fkey"
            columns: ["dept_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["dept_id"]
          },
        ]
      }
      datesheets: {
        Row: {
          course_id: string
          created_at: string | null
          exam_date: string
          session_id: string
          updated_at: string | null
          venue_assigned: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          exam_date: string
          session_id: string
          updated_at?: string | null
          venue_assigned?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          exam_date?: string
          session_id?: string
          updated_at?: string | null
          venue_assigned?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "datesheets_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "datesheets_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "datesheets_venue_assigned_fkey"
            columns: ["venue_assigned"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          dept_id: string
          dept_name: string
          school_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dept_id?: string
          dept_name: string
          school_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dept_id?: string
          dept_name?: string
          school_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["school_id"]
          },
        ]
      }
      exam_teachers: {
        Row: {
          created_at: string | null
          session_id: string
          teacher_id: string
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          created_at?: string | null
          session_id: string
          teacher_id: string
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          created_at?: string | null
          session_id?: string
          teacher_id?: string
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exam_teachers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["session_id"]
          },
          {
            foreignKeyName: "exam_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
          },
          {
            foreignKeyName: "exam_teachers_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      holidays: {
        Row: {
          created_at: string | null
          holiday_date: string
          holiday_description: string | null
          holiday_id: string
          holiday_name: string
          is_recurring: boolean | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          holiday_date: string
          holiday_description?: string | null
          holiday_id?: string
          holiday_name: string
          is_recurring?: boolean | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          holiday_date?: string
          holiday_description?: string | null
          holiday_id?: string
          holiday_name?: string
          is_recurring?: boolean | null
          updated_at?: string | null
        }
        Relationships: []
      }
      login_tbl: {
        Row: {
          created_at: string | null
          password: string
          type: string
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string | null
          password: string
          type: string
          updated_at?: string | null
          user_id?: string
          username: string
        }
        Update: {
          created_at?: string | null
          password?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          notification_details: string
          notification_id: string
          notification_path: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          notification_details: string
          notification_id?: string
          notification_path: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          notification_details?: string
          notification_id?: string
          notification_path?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      schools: {
        Row: {
          created_at: string | null
          school_id: string
          school_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          school_id?: string
          school_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          school_id?: string
          school_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string | null
          last_date: string | null
          session_id: string
          session_name: string
          session_year: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          last_date?: string | null
          session_id?: string
          session_name: string
          session_year: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          last_date?: string | null
          session_id?: string
          session_name?: string
          session_year?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      student_courses: {
        Row: {
          course_id: string
          created_at: string | null
          grade: string | null
          marks_obtained: number | null
          max_marks: number | null
          semester: number
          student_id: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          grade?: string | null
          marks_obtained?: number | null
          max_marks?: number | null
          semester: number
          student_id: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          grade?: string | null
          marks_obtained?: number | null
          max_marks?: number | null
          semester?: number
          student_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "student_courses_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      students: {
        Row: {
          created_at: string | null
          dept_id: string | null
          student_address: string | null
          student_email: string | null
          student_enrollment_no: string
          student_id: string
          student_name: string
          student_year: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          dept_id?: string | null
          student_address?: string | null
          student_email?: string | null
          student_enrollment_no: string
          student_id?: string
          student_name: string
          student_year?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          dept_id?: string | null
          student_address?: string | null
          student_email?: string | null
          student_enrollment_no?: string
          student_id?: string
          student_name?: string
          student_year?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "students_dept_id_fkey"
            columns: ["dept_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["dept_id"]
          },
        ]
      }
      teachers: {
        Row: {
          contact_no: string | null
          created_at: string | null
          dept_id: string | null
          designation: string | null
          teacher_address: string | null
          teacher_email: string | null
          teacher_id: string
          teacher_name: string
          updated_at: string | null
        }
        Insert: {
          contact_no?: string | null
          created_at?: string | null
          dept_id?: string | null
          designation?: string | null
          teacher_address?: string | null
          teacher_email?: string | null
          teacher_id?: string
          teacher_name: string
          updated_at?: string | null
        }
        Update: {
          contact_no?: string | null
          created_at?: string | null
          dept_id?: string | null
          designation?: string | null
          teacher_address?: string | null
          teacher_email?: string | null
          teacher_id?: string
          teacher_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teachers_dept_id_fkey"
            columns: ["dept_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["dept_id"]
          },
        ]
      }
      venue_subjects: {
        Row: {
          course_id: string
          created_at: string | null
          exam_date: string
          students_count: number | null
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          exam_date: string
          students_count?: number | null
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          exam_date?: string
          students_count?: number | null
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "venue_subjects_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["venue_id"]
          },
        ]
      }
      venues: {
        Row: {
          created_at: string | null
          updated_at: string | null
          venue_address: string | null
          venue_capacity: number | null
          venue_id: string
          venue_name: string
        }
        Insert: {
          created_at?: string | null
          updated_at?: string | null
          venue_address?: string | null
          venue_capacity?: number | null
          venue_id?: string
          venue_name: string
        }
        Update: {
          created_at?: string | null
          updated_at?: string | null
          venue_address?: string | null
          venue_capacity?: number | null
          venue_id?: string
          venue_name?: string
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
      get_exam_schedule_data: {
        Args: Record<PropertyKey, never>
        Returns: {
          exam_date: string
          course_code: string
          course_name: string
          venue_name: string
          session_name: string
        }[]
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
      manage_holiday: {
        Args: {
          p_action: string
          p_holiday_date: string
          p_holiday_name: string
          p_holiday_description?: string
          p_is_recurring?: boolean
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
