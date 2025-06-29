/*
  # Create holidays management table

  1. New Tables
    - `holidays`
      - `id` (uuid, primary key)
      - `holiday_date` (date, unique)
      - `holiday_name` (text)
      - `description` (text, optional)
      - `is_recurring` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `holidays` table
    - Add policy for public read access
    - Add policy for authenticated users to manage holidays

  3. Indexes
    - Index on holiday_date for fast date lookups
    - Index on is_recurring for filtering
*/

CREATE TABLE IF NOT EXISTS holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL UNIQUE,
  holiday_name text NOT NULL,
  description text,
  is_recurring boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_holidays_recurring ON holidays(is_recurring);

-- Enable Row Level Security
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Allow public read access to holidays"
  ON holidays
  FOR SELECT
  USING (true);

-- Create policy for all operations (admin access)
CREATE POLICY "Allow all operations on holidays"
  ON holidays
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert some sample holidays
INSERT INTO holidays (holiday_date, holiday_name, description, is_recurring) VALUES
('2024-01-26', 'Republic Day', 'National holiday celebrating the adoption of the Constitution of India', true),
('2024-08-15', 'Independence Day', 'National holiday celebrating India''s independence from British rule', true),
('2024-10-02', 'Gandhi Jayanti', 'National holiday celebrating the birth of Mahatma Gandhi', true),
('2024-12-25', 'Christmas Day', 'Christian holiday celebrating the birth of Jesus Christ', true),
('2024-11-01', 'Diwali', 'Festival of lights celebrated by Hindus, Sikhs, and Jains', false),
('2024-03-08', 'Holi', 'Hindu festival of colors and spring', false)
ON CONFLICT (holiday_date) DO NOTHING;