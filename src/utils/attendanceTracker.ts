import { supabase } from "@/integrations/supabase/client";

/**
 * Records student attendance when joining a live session.
 * Uses upsert to handle reconnections on the same day.
 */
export const recordAttendance = async (lessonId: string, studentId: string) => {
  const today = new Date().toISOString().split('T')[0];
  
  const { error } = await supabase
    .from('lesson_attendance' as any)
    .upsert(
      {
        lesson_id: lessonId,
        student_id: studentId,
        session_date: today,
        joined_at: new Date().toISOString(),
        join_method: 'live',
      },
      { onConflict: 'lesson_id,student_id,session_date' }
    );

  if (error) {
    console.error('Failed to record attendance:', error);
  }
};

/**
 * Updates the left_at timestamp and calculates duration when student leaves.
 */
export const recordDeparture = async (lessonId: string, studentId: string) => {
  const today = new Date().toISOString().split('T')[0];
  
  // Get the attendance record
  const { data } = await supabase
    .from('lesson_attendance' as any)
    .select('id, joined_at')
    .eq('lesson_id', lessonId)
    .eq('student_id', studentId)
    .eq('session_date', today)
    .single();

  if (data) {
    const joinedAt = new Date((data as any).joined_at);
    const now = new Date();
    const durationMinutes = Math.round((now.getTime() - joinedAt.getTime()) / 60000);

    await supabase
      .from('lesson_attendance' as any)
      .update({
        left_at: now.toISOString(),
        duration_minutes: durationMinutes,
      })
      .eq('id', (data as any).id);
  }
};

/**
 * Fetches attendance records for a lesson on a specific date.
 */
export const getAttendanceForLesson = async (lessonId: string, date?: string) => {
  const targetDate = date || new Date().toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('lesson_attendance' as any)
    .select('*')
    .eq('lesson_id', lessonId)
    .eq('session_date', targetDate)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch attendance:', error);
    return [];
  }

  return data || [];
};

/**
 * Fetches attendance summary for a lesson across all dates.
 */
export const getAttendanceSummary = async (lessonId: string) => {
  const { data, error } = await supabase
    .from('lesson_attendance' as any)
    .select('*')
    .eq('lesson_id', lessonId)
    .order('session_date', { ascending: false });

  if (error) {
    console.error('Failed to fetch attendance summary:', error);
    return [];
  }

  return data || [];
};
