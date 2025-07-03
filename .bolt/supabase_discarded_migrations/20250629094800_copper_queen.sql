/*
  # Create holidays table

  1. New Tables
    - `holidays`
      - `id` (uuid, primary key)
      - `holiday_date` (date, unique, not null)
      - `holiday_name` (text, not null)
      - `description` (text, nullable)
      - `is_recurring` (boolean, default false)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on `holidays` table
    - Add policy for public read access to holidays
    - Add policy for all operations on holidays (for admin functionality)

  3. Indexes
    - Index on holiday_date for efficient date queries
    - Index on is_recurring for filtering recurring holidays
*/

CREATE TABLE IF NOT EXISTS public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date UNIQUE NOT NULL,
  holiday_name text NOT NULL,
  description text,
  is_recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays USING btree (holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_recurring ON public.holidays USING btree (is_recurring);

-- Create policies for access control
CREATE POLICY "Allow public read access to holidays"
  ON public.holidays
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Allow all operations on holidays"
  ON public.holidays
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);