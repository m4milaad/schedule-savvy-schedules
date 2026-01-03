-- Create library books table
CREATE TABLE public.library_books (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title varchar NOT NULL,
    author varchar NOT NULL,
    isbn varchar UNIQUE,
    category varchar,
    total_copies integer DEFAULT 1,
    available_copies integer DEFAULT 1,
    location varchar,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create book issues table
CREATE TABLE public.book_issues (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    book_id uuid NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    issued_date date NOT NULL DEFAULT CURRENT_DATE,
    due_date date NOT NULL,
    returned_date date,
    status varchar DEFAULT 'active',
    late_fee numeric DEFAULT 0,
    renewed_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create student notice reads table (for tracking read/unread notices)
CREATE TABLE public.student_notice_reads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    notice_id uuid NOT NULL REFERENCES public.notices(id) ON DELETE CASCADE,
    read_at timestamp with time zone DEFAULT now(),
    UNIQUE(student_id, notice_id)
);

-- Create resource bookmarks table
CREATE TABLE public.resource_bookmarks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id uuid NOT NULL REFERENCES public.students(student_id) ON DELETE CASCADE,
    resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(student_id, resource_id)
);

-- Enable RLS on all tables
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_notice_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_bookmarks ENABLE ROW LEVEL SECURITY;

-- Library books policies (anyone can view)
CREATE POLICY "Anyone can view library books" ON public.library_books
    FOR SELECT USING (true);

CREATE POLICY "Only admins can manage library books" ON public.library_books
    FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'department_admin'))
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'department_admin'));

-- Book issues policies
CREATE POLICY "Students can view their own book issues" ON public.book_issues
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = book_issues.student_id AND p.user_id = auth.uid())
    );

CREATE POLICY "Admins can manage all book issues" ON public.book_issues
    FOR ALL USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'department_admin'))
    WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'department_admin'));

-- Student notice reads policies
CREATE POLICY "Students can manage their own notice reads" ON public.student_notice_reads
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = student_notice_reads.student_id AND p.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = student_notice_reads.student_id AND p.user_id = auth.uid())
    );

-- Resource bookmarks policies
CREATE POLICY "Students can manage their own bookmarks" ON public.resource_bookmarks
    FOR ALL USING (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = resource_bookmarks.student_id AND p.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = resource_bookmarks.student_id AND p.user_id = auth.uid())
    );

-- Create triggers for updated_at
CREATE TRIGGER update_library_books_updated_at
    BEFORE UPDATE ON public.library_books
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_book_issues_updated_at
    BEFORE UPDATE ON public.book_issues
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();