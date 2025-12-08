/**
 * Dummy venue data for testing seating arrangements
 * Run this to populate venues with realistic test data
 */

import { supabase } from '@/integrations/supabase/client';

export interface DummyVenue {
  venue_name: string;
  venue_address: string;
  venue_capacity: number;
  rows_count: number;
  columns_count: number;
  joined_rows: number[];
  dept_id?: string;
}

// Sample venue configurations with various layouts
const venueTemplates: Omit<DummyVenue, 'dept_id'>[] = [
  {
    venue_name: 'Lecture Hall A',
    venue_address: 'Block A, Ground Floor',
    venue_capacity: 60,
    rows_count: 10,
    columns_count: 6,
    joined_rows: []
  },
  {
    venue_name: 'Lecture Hall B',
    venue_address: 'Block A, First Floor',
    venue_capacity: 48,
    rows_count: 8,
    columns_count: 6,
    joined_rows: [4, 5] // Middle rows joined
  },
  {
    venue_name: 'Seminar Room 101',
    venue_address: 'Block B, Ground Floor',
    venue_capacity: 30,
    rows_count: 5,
    columns_count: 6,
    joined_rows: []
  },
  {
    venue_name: 'Seminar Room 102',
    venue_address: 'Block B, Ground Floor',
    venue_capacity: 24,
    rows_count: 4,
    columns_count: 6,
    joined_rows: [2, 3]
  },
  {
    venue_name: 'Computer Lab 1',
    venue_address: 'Block C, Second Floor',
    venue_capacity: 40,
    rows_count: 8,
    columns_count: 5,
    joined_rows: []
  },
  {
    venue_name: 'Auditorium',
    venue_address: 'Main Building',
    venue_capacity: 100,
    rows_count: 10,
    columns_count: 10,
    joined_rows: [5, 6]
  },
  {
    venue_name: 'Tutorial Room T1',
    venue_address: 'Block D, First Floor',
    venue_capacity: 20,
    rows_count: 4,
    columns_count: 5,
    joined_rows: []
  },
  {
    venue_name: 'Tutorial Room T2',
    venue_address: 'Block D, First Floor',
    venue_capacity: 25,
    rows_count: 5,
    columns_count: 5,
    joined_rows: []
  },
  {
    venue_name: 'Exam Hall Central',
    venue_address: 'Central Building, Ground Floor',
    venue_capacity: 80,
    rows_count: 10,
    columns_count: 8,
    joined_rows: [4, 5, 6]
  },
  {
    venue_name: 'Mini Auditorium',
    venue_address: 'Arts Block',
    venue_capacity: 50,
    rows_count: 10,
    columns_count: 5,
    joined_rows: []
  }
];

export async function generateDummyVenues(departmentId?: string): Promise<{
  success: boolean;
  count: number;
  error?: string;
}> {
  try {
    // If departmentId provided, use it; otherwise fetch all departments
    let deptIds: string[] = [];
    
    if (departmentId) {
      deptIds = [departmentId];
    } else {
      const { data: depts, error: deptError } = await supabase
        .from('departments')
        .select('dept_id');
      
      if (deptError) throw deptError;
      deptIds = depts?.map(d => d.dept_id) || [];
    }

    if (deptIds.length === 0) {
      return { success: false, count: 0, error: 'No departments found' };
    }

    // Create venues distributed across departments
    const venuesToInsert: DummyVenue[] = [];
    
    venueTemplates.forEach((template, index) => {
      // Distribute venues across departments
      const deptId = deptIds[index % deptIds.length];
      venuesToInsert.push({
        ...template,
        venue_name: `${template.venue_name}${departmentId ? '' : ` - ${index + 1}`}`,
        dept_id: deptId
      });
    });

    const { error: insertError } = await supabase
      .from('venues')
      .insert(venuesToInsert);

    if (insertError) throw insertError;

    return { success: true, count: venuesToInsert.length };
  } catch (error: any) {
    console.error('Error generating dummy venues:', error);
    return { success: false, count: 0, error: error.message };
  }
}

export async function clearAllVenues(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('venues')
      .delete()
      .neq('venue_id', '00000000-0000-0000-0000-000000000000');

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Error clearing venues:', error);
    return { success: false, error: error.message };
  }
}
