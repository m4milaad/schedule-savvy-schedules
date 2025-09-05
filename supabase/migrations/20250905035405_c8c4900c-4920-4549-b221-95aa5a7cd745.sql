-- Insert dummy student enrollments for testing
-- First, get some existing student and course IDs to work with

-- Insert sample enrollments for students into courses
-- Assuming we have students and courses in the database, let's create some enrollments

INSERT INTO student_courses (student_id, course_id, semester) VALUES
-- Get the first 3 students and enroll them in random courses
((SELECT student_id FROM students LIMIT 1), (SELECT course_id FROM courses LIMIT 1), 1),
((SELECT student_id FROM students LIMIT 1), (SELECT course_id FROM courses OFFSET 1 LIMIT 1), 1),
((SELECT student_id FROM students LIMIT 1), (SELECT course_id FROM courses OFFSET 2 LIMIT 1), 1),

-- Second student
((SELECT student_id FROM students OFFSET 1 LIMIT 1), (SELECT course_id FROM courses LIMIT 1), 1),
((SELECT student_id FROM students OFFSET 1 LIMIT 1), (SELECT course_id FROM courses OFFSET 3 LIMIT 1), 1),

-- Third student  
((SELECT student_id FROM students OFFSET 2 LIMIT 1), (SELECT course_id FROM courses OFFSET 1 LIMIT 1), 1),
((SELECT student_id FROM students OFFSET 2 LIMIT 1), (SELECT course_id FROM courses OFFSET 4 LIMIT 1), 1),
((SELECT student_id FROM students OFFSET 2 LIMIT 1), (SELECT course_id FROM courses OFFSET 5 LIMIT 1), 1);

-- Also insert into student_enrollments table for consistency
INSERT INTO student_enrollments (student_id, course_id, enrollment_date, is_active) VALUES
((SELECT student_id FROM students LIMIT 1), (SELECT course_id FROM courses LIMIT 1), NOW(), true),
((SELECT student_id FROM students LIMIT 1), (SELECT course_id FROM courses OFFSET 1 LIMIT 1), NOW(), true),
((SELECT student_id FROM students LIMIT 1), (SELECT course_id FROM courses OFFSET 2 LIMIT 1), NOW(), true),

-- Second student
((SELECT student_id FROM students OFFSET 1 LIMIT 1), (SELECT course_id FROM courses LIMIT 1), NOW(), true),
((SELECT student_id FROM students OFFSET 1 LIMIT 1), (SELECT course_id FROM courses OFFSET 3 LIMIT 1), NOW(), true),

-- Third student  
((SELECT student_id FROM students OFFSET 2 LIMIT 1), (SELECT course_id FROM courses OFFSET 1 LIMIT 1), NOW(), true),
((SELECT student_id FROM students OFFSET 2 LIMIT 1), (SELECT course_id FROM courses OFFSET 4 LIMIT 1), NOW(), true),
((SELECT student_id FROM students OFFSET 2 LIMIT 1), (SELECT course_id FROM courses OFFSET 5 LIMIT 1), NOW(), true);

-- Verify the data
-- SELECT s.student_name, c.course_name, c.course_code 
-- FROM student_courses sc 
-- JOIN students s ON sc.student_id = s.student_id 
-- JOIN courses c ON sc.course_id = c.course_id;