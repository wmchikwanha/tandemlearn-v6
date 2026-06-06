import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { teacherId } = await req.json();
    if (!teacherId) {
      return new Response(JSON.stringify({ error: "teacherId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Fetch teacher's lessons
    const { data: lessons } = await supabase
      .from("lessons")
      .select("id, title, session_name, day_of_week, start_time, end_time")
      .eq("teacher_id", teacherId)
      .eq("is_active", true);

    if (!lessons?.length) {
      return new Response(
        JSON.stringify({ report: null, message: "No active lessons" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const lessonIds = lessons.map((l) => l.id);

    // 2. Fetch teacher's students
    const { data: links } = await supabase
      .from("teacher_students")
      .select("student_id")
      .eq("teacher_id", teacherId);

    const studentIds = (links || []).map((l) => l.student_id);

    if (!studentIds.length) {
      return new Response(
        JSON.stringify({ report: null, message: "No students enrolled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Fetch all data in parallel (last 14 days for trends)
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000)
      .toISOString()
      .split("T")[0];

    const [
      attendanceRes,
      progressRes,
      vocabRes,
      achievementsRes,
      profilesRes,
      assignmentsRes,
    ] = await Promise.all([
      supabase
        .from("lesson_attendance")
        .select("student_id, lesson_id, session_date, duration_minutes")
        .in("lesson_id", lessonIds)
        .gte("session_date", twoWeeksAgo),
      supabase
        .from("student_progress")
        .select("student_id, lesson_id, mark, session_date, comment")
        .in("lesson_id", lessonIds)
        .gte("session_date", twoWeeksAgo),
      supabase
        .from("student_vocabulary")
        .select("student_id, term, mastered, lesson_id")
        .in("student_id", studentIds),
      supabase
        .from("student_achievements")
        .select("student_id, achievement_type, earned_at")
        .in("student_id", studentIds),
      supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", studentIds),
      supabase
        .from("lesson_assignments")
        .select("student_id, lesson_id")
        .in("lesson_id", lessonIds),
    ]);

    const attendance = attendanceRes.data || [];
    const progress = progressRes.data || [];
    const vocab = vocabRes.data || [];
    const achievements = achievementsRes.data || [];
    const profiles = profilesRes.data || [];
    const assignments = assignmentsRes.data || [];

    const nameMap = new Map<string, string>();
    profiles.forEach((p) => nameMap.set(p.id, p.full_name || p.email));

    const lessonNameMap = new Map<string, string>();
    lessons.forEach((l) => lessonNameMap.set(l.id, l.title));

    // 4. Compute per-student metrics
    const studentMetrics = studentIds.map((sid) => {
      const name = nameMap.get(sid) || "Unknown";
      const studentAttendance = attendance.filter((a) => a.student_id === sid);
      const studentProgress = progress.filter((p) => p.student_id === sid);
      const studentVocab = vocab.filter((v) => v.student_id === sid);
      const studentAchievements = achievements.filter(
        (a) => a.student_id === sid
      );

      const attendanceCount = studentAttendance.length;
      const totalDuration = studentAttendance.reduce(
        (s, a) => s + (a.duration_minutes || 0),
        0
      );
      const marks = studentProgress
        .filter((p) => p.mark !== null)
        .map((p) => p.mark!);
      const avgMark =
        marks.length > 0
          ? Math.round(marks.reduce((s, m) => s + m, 0) / marks.length)
          : null;
      const vocabTotal = studentVocab.length;
      const vocabMastered = studentVocab.filter((v) => v.mastered).length;

      // Calculate attendance streak
      const dates = [
        ...new Set(studentAttendance.map((a) => a.session_date)),
      ].sort((a, b) => b.localeCompare(a));
      let streak = dates.length > 0 ? 1 : 0;
      for (let i = 1; i < dates.length; i++) {
        const diff =
          (new Date(dates[i - 1]).getTime() - new Date(dates[i]).getTime()) /
          86400000;
        if (diff <= 2) streak++;
        else break;
      }

      // Enrolled lessons
      const enrolledLessonIds = assignments
        .filter((a) => a.student_id === sid)
        .map((a) => a.lesson_id);

      // Expected sessions (lessons * 2 weeks)
      const expectedSessions = enrolledLessonIds.length * 2;
      const attendanceRate =
        expectedSessions > 0
          ? Math.round((attendanceCount / expectedSessions) * 100)
          : 0;

      return {
        id: sid,
        name,
        attendanceCount,
        attendanceRate,
        totalDuration,
        avgMark,
        vocabTotal,
        vocabMastered,
        streak,
        badgeCount: studentAchievements.length,
        enrolledLessons: enrolledLessonIds.length,
      };
    });

    // 5. Identify at-risk students
    const atRiskStudents = studentMetrics.filter((s) => {
      const lowAttendance = s.attendanceRate < 50;
      const lowMarks = s.avgMark !== null && s.avgMark < 40;
      const noActivity = s.attendanceCount === 0;
      return lowAttendance || lowMarks || noActivity;
    });

    // 6. Per-lesson analytics
    const lessonAnalytics = lessons.map((lesson) => {
      const lessonAttendance = attendance.filter(
        (a) => a.lesson_id === lesson.id
      );
      const lessonProgress = progress.filter((p) => p.lesson_id === lesson.id);
      const enrolledCount = assignments.filter(
        (a) => a.lesson_id === lesson.id
      ).length;

      const uniqueDates = [
        ...new Set(lessonAttendance.map((a) => a.session_date)),
      ];
      const avgAttendancePerSession =
        uniqueDates.length > 0
          ? Math.round(lessonAttendance.length / uniqueDates.length)
          : 0;

      const marks = lessonProgress
        .filter((p) => p.mark !== null)
        .map((p) => p.mark!);
      const classAvg =
        marks.length > 0
          ? Math.round(marks.reduce((s, m) => s + m, 0) / marks.length)
          : null;

      const lessonVocab = vocab.filter((v) => v.lesson_id === lesson.id);
      const masteryRate =
        lessonVocab.length > 0
          ? Math.round(
              (lessonVocab.filter((v) => v.mastered).length /
                lessonVocab.length) *
                100
            )
          : null;

      return {
        lessonId: lesson.id,
        title: lesson.title,
        enrolledCount,
        sessionsHeld: uniqueDates.length,
        avgAttendancePerSession,
        classAvg,
        vocabMasteryRate: masteryRate,
      };
    });

    // 7. Attendance trend (daily counts over 14 days)
    const attendanceTrend: Record<string, number> = {};
    attendance.forEach((a) => {
      attendanceTrend[a.session_date] =
        (attendanceTrend[a.session_date] || 0) + 1;
    });

    // 8. Use AI to generate insights and suggestions
    let aiInsights = null;
    if (lovableKey) {
      const dataSnapshot = {
        totalStudents: studentIds.length,
        totalLessons: lessons.length,
        atRiskCount: atRiskStudents.length,
        atRiskNames: atRiskStudents.map((s) => s.name),
        lessonAnalytics: lessonAnalytics.map((l) => ({
          title: l.title,
          classAvg: l.classAvg,
          vocabMastery: l.vocabMasteryRate,
          avgAttendance: l.avgAttendancePerSession,
          enrolled: l.enrolledCount,
        })),
        topPerformers: studentMetrics
          .filter((s) => s.avgMark !== null && s.avgMark >= 70)
          .map((s) => ({ name: s.name, avg: s.avgMark }))
          .slice(0, 5),
        lowVocabMastery: studentMetrics
          .filter(
            (s) => s.vocabTotal > 0 && s.vocabMastered / s.vocabTotal < 0.3
          )
          .map((s) => s.name),
      };

      try {
        const aiResponse = await fetch(
          "https://api.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: `You are Muchinda, a teacher intelligence agent for Southern African classrooms. Generate a concise weekly class report with:
1. "headline" — one sentence summary of the class state
2. "wins" — array of 2-3 positive observations (strings)  
3. "concerns" — array of 1-3 concerns to address (strings)
4. "suggestions" — array of 2-3 actionable lesson plan adjustments (strings)
5. "atRiskNotes" — object mapping student names to brief concern descriptions

Keep language warm, encouraging, and practical. Reference specific lesson names and student names where relevant. Output valid JSON only.`,
                },
                {
                  role: "user",
                  content: `Here is this week's class data:\n${JSON.stringify(dataSnapshot, null, 2)}`,
                },
              ],
              temperature: 0.7,
              max_tokens: 1000,
            }),
          }
        );

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiInsights = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (aiErr) {
        console.error("AI insights generation failed:", aiErr);
      }
    }

    // 9. Build the report
    const report = {
      generatedAt: new Date().toISOString(),
      period: {
        from: twoWeeksAgo,
        to: new Date().toISOString().split("T")[0],
      },
      overview: {
        totalStudents: studentIds.length,
        totalLessons: lessons.length,
        totalSessions: [
          ...new Set(attendance.map((a) => `${a.lesson_id}_${a.session_date}`)),
        ].length,
        overallAttendanceRate:
          studentMetrics.length > 0
            ? Math.round(
                studentMetrics.reduce((s, m) => s + m.attendanceRate, 0) /
                  studentMetrics.length
              )
            : 0,
      },
      studentMetrics,
      atRiskStudents: atRiskStudents.map((s) => ({
        id: s.id,
        name: s.name,
        attendanceRate: s.attendanceRate,
        avgMark: s.avgMark,
        reasons: [
          ...(s.attendanceRate < 50
            ? [`Low attendance (${s.attendanceRate}%)`]
            : []),
          ...(s.avgMark !== null && s.avgMark < 40
            ? [`Low marks (${s.avgMark}%)`]
            : []),
          ...(s.attendanceCount === 0 ? ["No sessions attended"] : []),
        ],
      })),
      lessonAnalytics,
      attendanceTrend,
      aiInsights,
    };

    // 10. Log the agent action
    const durationMs = Date.now() - startTime;
    await supabase.from("agent_actions").insert({
      agent_name: "Muchinda",
      action_type: "weekly_class_report",
      lesson_id: null,
      target_user_id: teacherId,
      input_summary: `Generated report for ${lessons.length} lessons, ${studentIds.length} students`,
      output_summary: aiInsights?.headline || `Report: ${atRiskStudents.length} at-risk students identified`,
      status: "completed",
      duration_ms: durationMs,
      impact_metric: {
        students_analyzed: studentIds.length,
        lessons_analyzed: lessons.length,
        at_risk_identified: atRiskStudents.length,
        period_days: 14,
      },
    });

    return new Response(JSON.stringify({ report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Muchinda error:", err);

    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
