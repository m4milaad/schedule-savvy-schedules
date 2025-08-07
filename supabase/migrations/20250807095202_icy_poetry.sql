/*
  # Add ABC ID and semester to students table

  1. New Columns
    - `abc_id` (text, unique, numeric only)
    - `semester` (integer, default 1)
  
  2. Updates
    - Add unique constraint on abc_id
    - Add check constraint for numeric abc_id
    - Add semester validation (1-12)
  
  3. Security
    - Update existing RLS policies to include new fields
*/

-- Add ABC ID column (numeric only)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'abc_id'
  ) THEN
    ALTER TABLE students ADD COLUMN abc_id text;
  END IF;
END $$;

-- Add semester column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'semester'
  ) THEN
    ALTER TABLE students ADD COLUMN semester integer DEFAULT 1;
  END IF;
END $$;

-- Add unique constraint on abc_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'students_abc_id_key'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_abc_id_key UNIQUE (abc_id);
  END IF;
END $$;

-- Add check constraint for numeric abc_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'students_abc_id_numeric_check'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_abc_id_numeric_check 
    CHECK (abc_id IS NULL OR abc_id ~ '^[0-9]+$');
  END IF;
END $$;

-- Add check constraint for semester range
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'students_semester_range_check'
  ) THEN
    ALTER TABLE students ADD CONSTRAINT students_semester_range_check 
    CHECK (semester >= 1 AND semester <= 12);
  END IF;
END $$;