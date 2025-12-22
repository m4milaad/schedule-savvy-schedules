export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string
          description: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string
          user_id: string
          user_type: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name: string
          user_id: string
          user_type: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string
          user_type?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          course_code: string
          course_credits: number | null
          course_id: string
          course_name: string
          course_type: string | null
          created_at: string | null
          dept_id: string | null
          gap_days: number | null
          program_type: string | null
          semester: number | null
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
          gap_days?: number | null
          program_type?: string | null
          semester?: number | null
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
          gap_days?: number | null
          program_type?: string | null
          semester?: number | null
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
      profiles: {
        Row: {
          contact_no: string | null
          created_at: string | null
          dept_id: string | null
          email: string | null
          full_name: string
          id: string
          is_approved: boolean | null
          semester: number | null
          theme_color: string | null
          updated_at: string | null
          user_id: string | null
          user_type: string
        }
        Insert: {
          contact_no?: string | null
          created_at?: string | null
          dept_id?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_approved?: boolean | null
          semester?: number | null
          theme_color?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_type: string
        }
        Update: {
          contact_no?: string | null
          created_at?: string | null
          dept_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_approved?: boolean | null
          semester?: number | null
          theme_color?: string | null
          updated_at?: string | null
          user_id?: string | null
          user_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_dept_id_fkey"
            columns: ["dept_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["dept_id"]
          },
        ]
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
      seat_assignments: {
        Row: {
          column_number: number
          course_id: string
          created_at: string | null
          exam_date: string
          id: string
          row_number: number
          seat_label: string | null
          student_id: string
          updated_at: string | null
          venue_id: string
        }
        Insert: {
          column_number: number
          course_id: string
          created_at?: string | null
          exam_date: string
          id?: string
          row_number: number
          seat_label?: string | null
          student_id: string
          updated_at?: string | null
          venue_id: string
        }
        Update: {
          column_number?: number
          course_id?: string
          created_at?: string | null
          exam_date?: string
          id?: string
          row_number?: number
          seat_label?: string | null
          student_id?: string
          updated_at?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seat_assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "seat_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
          {
            foreignKeyName: "seat_assignments_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["venue_id"]
          },
        ]
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
      student_enrollments: {
        Row: {
          course_id: string | null
          created_at: string | null
          enrollment_date: string | null
          id: string
          is_active: boolean | null
          student_id: string | null
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          id?: string
          is_active?: boolean | null
          student_id?: string | null
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          enrollment_date?: string | null
          id?: string
          is_active?: boolean | null
          student_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "student_enrollments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["student_id"]
          },
        ]
      }
      students: {
        Row: {
          abc_id: string | null
          contact_no: string | null
          created_at: string | null
          dept_id: string | null
          semester: number | null
          student_address: string | null
          student_email: string | null
          student_enrollment_no: string
          student_id: string
          student_name: string
          student_year: number | null
          updated_at: string | null
        }
        Insert: {
          abc_id?: string | null
          contact_no?: string | null
          created_at?: string | null
          dept_id?: string | null
          semester?: number | null
          student_address?: string | null
          student_email?: string | null
          student_enrollment_no: string
          student_id?: string
          student_name: string
          student_year?: number | null
          updated_at?: string | null
        }
        Update: {
          abc_id?: string | null
          contact_no?: string | null
          created_at?: string | null
          dept_id?: string | null
          semester?: number | null
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
      teacher_courses: {
        Row: {
          course_id: string
          created_at: string | null
          id: string
          teacher_id: string
          updated_at: string | null
        }
        Insert: {
          course_id: string
          created_at?: string | null
          id?: string
          teacher_id: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string
          created_at?: string | null
          id?: string
          teacher_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "teacher_courses_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "teachers"
            referencedColumns: ["teacher_id"]
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
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          metadata?: Json | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
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
          columns_count: number | null
          created_at: string | null
          dept_id: string | null
          joined_rows: number[] | null
          rows_count: number | null
          updated_at: string | null
          venue_address: string | null
          venue_capacity: number | null
          venue_id: string
          venue_name: string
        }
        Insert: {
          columns_count?: number | null
          created_at?: string | null
          dept_id?: string | null
          joined_rows?: number[] | null
          rows_count?: number | null
          updated_at?: string | null
          venue_address?: string | null
          venue_capacity?: number | null
          venue_id?: string
          venue_name: string
        }
        Update: {
          columns_count?: number | null
          created_at?: string | null
          dept_id?: string | null
          joined_rows?: number[] | null
          rows_count?: number | null
          updated_at?: string | null
          venue_address?: string | null
          venue_capacity?: number | null
          venue_id?: string
          venue_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "venues_dept_id_fkey"
            columns: ["dept_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["dept_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_realistic_student_enrollments: { Args: never; Returns: Json }
      get_exam_schedule_data: {
        Args: never
        Returns: {
          course_code: string
          course_name: string
          exam_date: string
          session_name: string
          venue_name: string
        }[]
      }
      get_student_enrollment_info: {
        Args: { enrollment_student_id: string }
        Returns: {
          abc_id: string
          student_enrollment_no: string
          student_id: string
          student_name: string
        }[]
      }
      get_user_department: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_approved_department_admin: {
        Args: { _user_id: string }
        Returns: boolean
      }
      manage_holiday: {
        Args: {
          p_action: string
          p_holiday_date: string
          p_holiday_description?: string
          p_holiday_name: string
          p_is_recurring?: boolean
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "department_admin" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "department_admin", "student"],
    },
  },
} as const
