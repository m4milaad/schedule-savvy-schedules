/*
  # Update profiles table for better student management

  1. New Columns
    - `semester` (integer, default 1)
    - `abc_id` (text, unique, numeric only)
    - `address` (text)
  
  2. Updates
    - Add unique constraint on abc_id
    - Add check constraint for numeric abc_id
    - Add semester validation (1-12)
  
  3. Security
    - Update existing RLS policies to include new fields
*/

-- Add semester column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'semester'
  ) THEN
    ALTER TABLE profiles ADD COLUMN semester integer DEFAULT 1;
  END IF;
END $$;

-- Add abc_id column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'abc_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN abc_id text;
  END IF;
END $$;

-- Add address column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'address'
  ) THEN
    ALTER TABLE profiles ADD COLUMN address text;
  END IF;
END $$;

-- Add unique constraint on abc_id for profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_abc_id_key'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_abc_id_key UNIQUE (abc_id);
  END IF;
END $$;

-- Add check constraint for numeric abc_id in profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_abc_id_numeric_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_abc_id_numeric_check 
    CHECK (abc_id IS NULL OR abc_id ~ '^[0-9]+$');
  END IF;
END $$;

-- Add check constraint for semester range in profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'profiles_semester_range_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_semester_range_check 
    CHECK (semester >= 1 AND semester <= 12);
  END IF;
END $$;