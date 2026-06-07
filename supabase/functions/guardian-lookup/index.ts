import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { accessCode } = await req.json();

    if (!accessCode || typeof accessCode !== 'string' || accessCode.length < 4 || accessCode.length > 20) {
      return new Response(
        JSON.stringify({ error: 'Invalid access code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Look up the access code
    const { data: codeData, error: codeError } = await supabase
      .from('guardian_access_codes')
      .select('*')
      .eq('access_code', accessCode.toUpperCase().trim())
      .eq('is_active', true)
      .single();

    if (codeError || !codeData) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired access code' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiry
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'This access code has expired. Please ask the teacher for a new one.' }),
        { status: 410, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update last accessed
    await supabase
      .from('guardian_access_codes')
      .update({ last_accessed_at: new Date().toISOString(), last_viewed_at: new Date().toISOString() })
      .eq('id', codeData.id);

    const studentId = codeData.student_id;

    // Get student's assigned lessons
    const { data: assignments } = await supabase
      .from('lesson_assignments')
      .select('lesson_id')
      .eq('student_id', studentId);

    const lessonIds = assignments?.map(a => a.lesson_id) || [];

    let lessons: any[] = [];
    if (lessonIds.length > 0) {
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, title, description, day_of_week, start_time, end_time, session_name, language, is_active, teacher_id')
        .in('id', lessonIds)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');

      // Get teacher names
      if (lessonsData) {
        const teacherIds = [...new Set(lessonsData.map(l => l.teacher_id))];
        const { data: teacherProfiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', teacherIds);

        const teacherMap = new Map(teacherProfiles?.map(t => [t.id, t.full_name]) || []);

        lessons = lessonsData.map(l => ({
          ...l,
          teacher_name: teacherMap.get(l.teacher_id) || 'Teacher',
        }));
      }
    }

    // Get attendance records (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: attendance } = await supabase
      .from('lesson_attendance')
      .select('lesson_id, session_date, joined_at, left_at, duration_minutes')
      .eq('student_id', studentId)
      .gte('session_date', thirtyDaysAgo.toISOString().split('T')[0])
      .order('session_date', { ascending: false });

    // Get lesson materials
    let materials: any[] = [];
    if (lessonIds.length > 0) {
      const { data: materialsData } = await supabase
        .from('lesson_materials')
        .select('id, lesson_id, file_name, file_type, file_size, uploaded_at, link_url, material_type')
        .in('lesson_id', lessonIds)
        .order('uploaded_at', { ascending: false })
        .limit(50);

      materials = materialsData || [];
    }

    // Get student progress/marks
    let progress: any[] = [];
    if (lessonIds.length > 0) {
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('id, lesson_id, mark, comment, session_date')
        .eq('student_id', studentId)
        .order('session_date', { ascending: false })
        .limit(100);

      progress = progressData || [];
    }

    // Get shared performance reports
    const { data: reportsData } = await supabase
      .from('student_reports')
      .select('id, period_start, period_end, report_json, teacher_narrative, teacher_recommendations, status, created_at')
      .eq('student_id', studentId)
      .eq('status', 'shared')
      .order('created_at', { ascending: false })
      .limit(10);

    return new Response(
      JSON.stringify({
        studentName: codeData.student_name,
        lessons,
        attendance: attendance || [],
        materials,
        progress,
        reports: reportsData || [],
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Guardian lookup error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred. Please try again.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
