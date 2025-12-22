import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UseRealtimeNotificationsProps {
  studentId?: string;
  userId?: string;
  enabled?: boolean;
}

// Helper to store notification in database
async function storeNotification(
  userId: string,
  title: string,
  message: string,
  type: 'success' | 'info' | 'warning' | 'error',
  metadata?: Record<string, any>
) {
  try {
    await supabase.from('user_notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      metadata: metadata || {}
    });
  } catch (error) {
    console.error('Failed to store notification:', error);
  }
}

export function useRealtimeNotifications({ studentId, userId, enabled = true }: UseRealtimeNotificationsProps) {
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!enabled || !studentId) return;

    const authUserId = userId;

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
            const courseName = (data.courses as any)?.course_name || '';
            const examDate = format(new Date(data.exam_date), 'PPP');
            
            const title = 'Seat Assigned!';
            const message = `You have been assigned seat ${data.seat_label} at ${venue} for ${course} on ${examDate}`;
            
            toast.success(title, {
              description: message,
              duration: 8000,
            });

            // Store in database
            if (authUserId) {
              storeNotification(authUserId, title, message, 'success', {
                seat_label: data.seat_label,
                venue,
                course,
                course_name: courseName,
                exam_date: data.exam_date
              });
            }
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
            
            const title = 'Seat Updated';
            const message = `Your seat for ${course} has been changed to ${data.seat_label} at ${venue}`;
            
            toast.info(title, {
              description: message,
              duration: 6000,
            });

            if (authUserId) {
              storeNotification(authUserId, title, message, 'info', {
                seat_label: data.seat_label,
                venue,
                course,
                exam_date: data.exam_date
              });
            }
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
              
              const title = 'New Exam Scheduled!';
              const message = `${courseData.course_code} - ${courseData.course_name} is scheduled for ${examDate}`;
              
              toast.success(title, {
                description: message,
                duration: 8000,
              });

              if (authUserId) {
                storeNotification(authUserId, title, message, 'success', {
                  course_code: courseData.course_code,
                  course_name: courseData.course_name,
                  exam_date: payload.new.exam_date
                });
              }
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
                const title = 'Exam Date Changed!';
                const message = `${courseData.course_code} has been rescheduled from ${oldDate} to ${newDate}`;
                
                toast.warning(title, {
                  description: message,
                  duration: 10000,
                });

                if (authUserId) {
                  storeNotification(authUserId, title, message, 'warning', {
                    course_code: courseData.course_code,
                    old_date: payload.old?.exam_date,
                    new_date: payload.new.exam_date
                  });
                }
              } else {
                const title = 'Exam Details Updated';
                const message = `Details for ${courseData.course_code} exam on ${newDate} have been updated`;
                
                toast.info(title, {
                  description: message,
                  duration: 6000,
                });

                if (authUserId) {
                  storeNotification(authUserId, title, message, 'info', {
                    course_code: courseData.course_code,
                    exam_date: payload.new.exam_date
                  });
                }
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
                const title = 'Exam Cancelled';
                const message = `The scheduled exam for ${courseData.course_code} has been cancelled`;
                
                toast.error(title, {
                  description: message,
                  duration: 8000,
                });

                if (authUserId) {
                  storeNotification(authUserId, title, message, 'error', {
                    course_code: courseData.course_code
                  });
                }
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
  }, [studentId, userId, enabled]);

  return null;
}
