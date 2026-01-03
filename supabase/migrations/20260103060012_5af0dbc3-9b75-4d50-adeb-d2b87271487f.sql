-- Create notices table for teacher notice management
CREATE TABLE public.notices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),
    target_audience VARCHAR(50) NOT NULL DEFAULT 'all_students' CHECK (target_audience IN ('all_students', 'specific_class', 'subject_students')),
    target_course_id UUID REFERENCES public.courses(course_id) ON DELETE SET NULL,
    target_semester INTEGER,
    target_dept_id UUID REFERENCES public.departments(dept_id) ON DELETE SET NULL,
    expiry_date DATE,
    views_count INTEGER DEFAULT 0,
    notifications_sent INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create student_marks table for marks management
CREATE TABLE public.student_marks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(course_id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    test_1_marks DECIMAL(5,2),
    test_2_marks DECIMAL(5,2),
    presentation_marks DECIMAL(5,2),
    assignment_marks DECIMAL(5,2),
    attendance_marks DECIMAL(5,2),
    total_marks DECIMAL(5,2),
    grade VARCHAR(5),
    academic_year INTEGER,
    semester INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, course_id, academic_year)
);

-- Create attendance table for daily attendance
CREATE TABLE public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(course_id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'on_leave')),
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(student_id, course_id, attendance_date)
);

-- Create assignments table
CREATE TABLE public.assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(course_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    max_marks INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create assignment_submissions table
CREATE TABLE public.assignment_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assignment_id UUID NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    submission_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    file_url TEXT,
    marks_obtained DECIMAL(5,2),
    feedback TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'graded', 'late')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(assignment_id, student_id)
);

-- Create resources table for uploaded teaching materials
CREATE TABLE public.resources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(course_id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    resource_type VARCHAR(50) NOT NULL DEFAULT 'document' CHECK (resource_type IN ('lecture_notes', 'presentation', 'video_tutorial', 'document', 'other')),
    access_level VARCHAR(30) DEFAULT 'enrolled_students' CHECK (access_level IN ('all_students', 'enrolled_students')),
    file_url TEXT,
    file_name VARCHAR(255),
    file_size INTEGER,
    file_type VARCHAR(50),
    download_count INTEGER DEFAULT 0,
    view_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create leave_applications table for student and teacher leave management
CREATE TABLE public.leave_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    applicant_type VARCHAR(20) NOT NULL CHECK (applicant_type IN ('student', 'teacher')),
    leave_type VARCHAR(30) NOT NULL CHECK (leave_type IN ('sick_leave', 'personal', 'medical', 'emergency', 'other')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_remarks TEXT,
    contact_info VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for notices
CREATE POLICY "Teachers can manage their own notices" ON public.notices
    FOR ALL USING (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    WITH CHECK (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can view active notices" ON public.notices
    FOR SELECT USING (is_active = true AND (expiry_date IS NULL OR expiry_date >= CURRENT_DATE));

CREATE POLICY "Admins can manage all notices" ON public.notices
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- RLS Policies for student_marks
CREATE POLICY "Teachers can manage marks for their courses" ON public.student_marks
    FOR ALL USING (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    WITH CHECK (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can view their own marks" ON public.student_marks
    FOR SELECT USING (student_id IN (SELECT student_id FROM students WHERE student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Admins can manage all marks" ON public.student_marks
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- RLS Policies for attendance
CREATE POLICY "Teachers can manage attendance for their courses" ON public.attendance
    FOR ALL USING (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    WITH CHECK (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can view their own attendance" ON public.attendance
    FOR SELECT USING (student_id IN (SELECT student_id FROM students WHERE student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Admins can manage all attendance" ON public.attendance
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- RLS Policies for assignments
CREATE POLICY "Teachers can manage their own assignments" ON public.assignments
    FOR ALL USING (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    WITH CHECK (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can view active assignments" ON public.assignments
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all assignments" ON public.assignments
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- RLS Policies for assignment_submissions
CREATE POLICY "Students can manage their own submissions" ON public.assignment_submissions
    FOR ALL USING (student_id IN (SELECT student_id FROM students WHERE student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))
    WITH CHECK (student_id IN (SELECT student_id FROM students WHERE student_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Teachers can view and grade submissions" ON public.assignment_submissions
    FOR ALL USING (assignment_id IN (SELECT id FROM assignments WHERE teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())))
    WITH CHECK (assignment_id IN (SELECT id FROM assignments WHERE teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid())));

CREATE POLICY "Admins can manage all submissions" ON public.assignment_submissions
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- RLS Policies for resources
CREATE POLICY "Teachers can manage their own resources" ON public.resources
    FOR ALL USING (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    WITH CHECK (teacher_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Students can view active resources" ON public.resources
    FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage all resources" ON public.resources
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- RLS Policies for leave_applications
CREATE POLICY "Users can manage their own leave applications" ON public.leave_applications
    FOR ALL USING (applicant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()))
    WITH CHECK (applicant_id IN (SELECT id FROM profiles WHERE user_id = auth.uid()));

CREATE POLICY "Teachers can view student leave applications" ON public.leave_applications
    FOR SELECT USING (
        applicant_type = 'student' AND 
        has_role(auth.uid(), 'teacher'::app_role)
    );

CREATE POLICY "Teachers can update student leave status" ON public.leave_applications
    FOR UPDATE USING (
        applicant_type = 'student' AND 
        has_role(auth.uid(), 'teacher'::app_role)
    );

CREATE POLICY "Admins can manage all leave applications" ON public.leave_applications
    FOR ALL USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'department_admin'::app_role));

-- Create triggers for updated_at
CREATE TRIGGER update_notices_updated_at BEFORE UPDATE ON public.notices
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_student_marks_updated_at BEFORE UPDATE ON public.student_marks
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_updated_at BEFORE UPDATE ON public.attendance
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at BEFORE UPDATE ON public.assignments
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignment_submissions_updated_at BEFORE UPDATE ON public.assignment_submissions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_applications_updated_at BEFORE UPDATE ON public.leave_applications
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update handle_new_user function to handle teachers with approval workflow
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_profile_id uuid;
  v_user_type text;
  v_full_name text;
  v_email text;
  v_metadata jsonb;
  v_dept_id uuid;
  v_semester integer;
  v_student_year integer;
  v_student_enrollment_no text;
  v_is_approved boolean;
BEGIN
  v_metadata := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_user_type := COALESCE(NULLIF(v_metadata ->> 'user_type', ''), 'student');
  v_full_name := COALESCE(NULLIF(v_metadata ->> 'full_name', ''), COALESCE(NEW.email, ''));
  v_email := NEW.email;

  -- Department admins and teachers require approval, others are auto-approved
  v_is_approved := CASE 
    WHEN v_user_type IN ('department_admin', 'teacher') THEN false
    ELSE true
  END;

  v_dept_id := NULL;
  IF COALESCE(v_metadata ->> 'dept_id', '') <> '' THEN
    BEGIN
      v_dept_id := (v_metadata ->> 'dept_id')::uuid;
    EXCEPTION WHEN others THEN
      v_dept_id := NULL;
    END;
  END IF;

  v_semester := NULL;
  IF COALESCE(v_metadata ->> 'semester', '') <> '' THEN
    BEGIN
      v_semester := (v_metadata ->> 'semester')::integer;
    EXCEPTION WHEN others THEN
      v_semester := NULL;
    END;
  END IF;
  v_semester := COALESCE(v_semester, 1);

  v_student_year := NULL;
  IF COALESCE(v_metadata ->> 'student_year', '') <> '' THEN
    BEGIN
      v_student_year := (v_metadata ->> 'student_year')::integer;
    EXCEPTION WHEN others THEN
      v_student_year := NULL;
    END;
  END IF;
  v_student_year := COALESCE(v_student_year, 1);

  v_student_enrollment_no := NULLIF(TRIM(COALESCE(v_metadata ->> 'student_enrollment_no', '')), '');
  IF v_student_enrollment_no IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.students s
      WHERE s.student_enrollment_no = v_student_enrollment_no
    ) THEN
      v_student_enrollment_no := NULL;
    END IF;
  END IF;

  INSERT INTO public.profiles (user_id, user_type, full_name, email, dept_id, semester, is_approved)
  VALUES (NEW.id, v_user_type, v_full_name, v_email, v_dept_id, v_semester, v_is_approved)
  RETURNING id INTO v_profile_id;

  IF v_user_type = 'student' THEN
    INSERT INTO public.students (
      student_id,
      student_name,
      student_enrollment_no,
      student_email,
      dept_id,
      student_year,
      semester,
      created_at,
      updated_at
    )
    VALUES (
      v_profile_id,
      v_full_name,
      COALESCE(v_student_enrollment_no, 'PENDING-' || v_profile_id::text),
      v_email,
      v_dept_id,
      v_student_year,
      v_semester,
      NOW(),
      NOW()
    )
    ON CONFLICT (student_id) DO UPDATE
      SET student_name = EXCLUDED.student_name,
          student_email = EXCLUDED.student_email,
          dept_id = EXCLUDED.dept_id,
          student_year = COALESCE(EXCLUDED.student_year, public.students.student_year),
          semester = COALESCE(EXCLUDED.semester, public.students.semester),
          updated_at = NOW(),
          student_enrollment_no = COALESCE(
            NULLIF(EXCLUDED.student_enrollment_no, ''),
            public.students.student_enrollment_no
          );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN others THEN
    RAISE WARNING '[handle_new_user] Failed to seed profile/student for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

-- Update handle_new_user_role to handle teacher role
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.user_id,
    CASE 
      WHEN NEW.user_type = 'admin' THEN 'admin'::public.app_role
      WHEN NEW.user_type = 'department_admin' THEN 'department_admin'::public.app_role
      WHEN NEW.user_type = 'teacher' THEN 'teacher'::public.app_role
      ELSE 'student'::public.app_role
    END
  )
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;