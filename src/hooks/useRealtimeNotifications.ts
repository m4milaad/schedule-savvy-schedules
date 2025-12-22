import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UseRealtimeNotificationsProps {
  studentId?: string;
  enabled?: boolean;
}

export function useRealtimeNotifications({ studentId, enabled = true }: UseRealtimeNotificationsProps) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled || !studentId) return;

    // Create a single channel for all notifications
    const channel = supabase
      .channel('student-notifications')
      // Listen for seat assignments
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'seat_assignments',
          filter: `student_id=eq.${studentId}`
        },
        async (payload) => {
          console.log('New seat assignment:', payload);
          
          // Fetch additional details
          const { data } = await supabase
            .from('seat_assignments')
            .select(`
              seat_label,
              exam_date,
              venues (venue_name),
              courses (course_code, course_name)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const venue = (data.venues as any)?.venue_name || 'Unknown venue';
            const course = (data.courses as any)?.course_code || 'Unknown course';
            const examDate = format(new Date(data.exam_date), 'PPP');
            
            toast.success('Seat Assigned!', {
              description: `You have been assigned seat ${data.seat_label} at ${venue} for ${course} on ${examDate}`,
              duration: 8000,
            });
          }
        }
      )
      // Listen for seat assignment updates
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'seat_assignments',
          filter: `student_id=eq.${studentId}`
        },
        async (payload) => {
          console.log('Seat assignment updated:', payload);
          
          const { data } = await supabase
            .from('seat_assignments')
            .select(`
              seat_label,
              exam_date,
              venues (venue_name),
              courses (course_code)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            const venue = (data.venues as any)?.venue_name || 'Unknown venue';
            const course = (data.courses as any)?.course_code || 'Unknown course';
            
            toast.info('Seat Updated', {
              description: `Your seat for ${course} has been changed to ${data.seat_label} at ${venue}`,
              duration: 6000,
            });
          }
        }
      )
      // Listen for new datesheets (exam schedule)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'datesheets'
        },
        async (payload) => {
          console.log('New datesheet entry:', payload);
          
          // Check if this affects the student's enrolled courses
          const { data: enrollment } = await supabase
            .from('student_enrollments')
            .select('course_id')
            .eq('student_id', studentId)
            .eq('course_id', payload.new.course_id)
            .eq('is_active', true)
            .maybeSingle();

          if (enrollment) {
            // Student is enrolled in this course
            const { data: courseData } = await supabase
              .from('courses')
              .select('course_code, course_name')
              .eq('course_id', payload.new.course_id)
              .single();

            if (courseData) {
              const examDate = format(new Date(payload.new.exam_date), 'PPP');
              
              toast.success('New Exam Scheduled!', {
                description: `${courseData.course_code} - ${courseData.course_name} is scheduled for ${examDate}`,
                duration: 8000,
              });
            }
          }
        }
      )
      // Listen for datesheet updates
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'datesheets'
        },
        async (payload) => {
          console.log('Datesheet updated:', payload);
          
          // Check if this affects the student's enrolled courses
          const { data: enrollment } = await supabase
            .from('student_enrollments')
            .select('course_id')
            .eq('student_id', studentId)
            .eq('course_id', payload.new.course_id)
            .eq('is_active', true)
            .maybeSingle();

          if (enrollment) {
            const { data: courseData } = await supabase
              .from('courses')
              .select('course_code')
              .eq('course_id', payload.new.course_id)
              .single();

            if (courseData) {
              const newDate = format(new Date(payload.new.exam_date), 'PPP');
              const oldDate = payload.old?.exam_date 
                ? format(new Date(payload.old.exam_date), 'PPP') 
                : 'unknown';

              if (payload.old?.exam_date !== payload.new.exam_date) {
                toast.warning('Exam Date Changed!', {
                  description: `${courseData.course_code} has been rescheduled from ${oldDate} to ${newDate}`,
                  duration: 10000,
                });
              } else {
                toast.info('Exam Details Updated', {
                  description: `Details for ${courseData.course_code} exam on ${newDate} have been updated`,
                  duration: 6000,
                });
              }
            }
          }
        }
      )
      // Listen for datesheet deletions
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'datesheets'
        },
        async (payload) => {
          console.log('Datesheet deleted:', payload);
          
          if (payload.old?.course_id) {
            const { data: enrollment } = await supabase
              .from('student_enrollments')
              .select('course_id')
              .eq('student_id', studentId)
              .eq('course_id', payload.old.course_id)
              .eq('is_active', true)
              .maybeSingle();

            if (enrollment) {
              const { data: courseData } = await supabase
                .from('courses')
                .select('course_code')
                .eq('course_id', payload.old.course_id)
                .single();

              if (courseData) {
                toast.error('Exam Cancelled', {
                  description: `The scheduled exam for ${courseData.course_code} has been cancelled`,
                  duration: 8000,
                });
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [studentId, enabled]);

  return null;
}
