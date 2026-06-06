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
    const { studentId, periodDays = 30, lessonIds } = await req.json();
    if (!studentId) {
      return new Response(JSON.stringify({ error: "studentId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: get caller from JWT
    const authHeader = req.headers.get("Authorization");
    let callerId: string | null = null;
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      callerId = user?.id || null;
    }

    // Period range
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodEnd.getDate() - periodDays);
    const startStr = periodStart.toISOString().split("T")[0];
    const endStr = periodEnd.toISOString().split("T")[0];

    // 1. Get student profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", studentId)
      .single();

    const studentName = profile?.full_name || profile?.email || "Student";

    // 2. Get student's lessons
    const { data: assignments } = await supabase
      .from("lesson_assignments")
      .select("lesson_id")
      .eq("student_id", studentId);

    let targetLessonIds = assignments?.map((a) => a.lesson_id) || [];
    if (lessonIds && lessonIds.length > 0) {
      targetLessonIds = targetLessonIds.filter((id: string) => lessonIds.includes(id));
    }

    let lessons: any[] = [];
    if (targetLessonIds.length > 0) {
      const { data } = await supabase
        .from("lessons")
        .select("id, title, description, language")
        .in("id", targetLessonIds);
      lessons = data || [];
    }

    // 3. Attendance
    const { data: attendance } = await supabase
      .from("lesson_attendance")
      .select("lesson_id, session_date, duration_minutes")
      .eq("student_id", studentId)
      .gte("session_date", startStr)
      .lte("session_date", endStr);

    const totalSessions = attendance?.length || 0;
    const attendedSessions = attendance?.filter(
      (a) => a.duration_minutes && a.duration_minutes > 5
    ).length || 0;
    const attendanceRate = totalSessions > 0 ? Math.round((attendedSessions / totalSessions) * 100) : null;

    // 4. Academic progress
    const { data: progress } = await supabase
      .from("student_progress")
      .select("lesson_id, mark, comment, session_date")
      .eq("student_id", studentId)
      .gte("session_date", startStr)
      .lte("session_date", endStr)
      .order("session_date", { ascending: true });

    const marks = (progress || []).filter((p) => p.mark !== null).map((p) => p.mark!);
    const avgMark = marks.length > 0 ? Math.round(marks.reduce((s, m) => s + m, 0) / marks.length) : null;
    const trend = marks.length >= 3
      ? marks[marks.length - 1] > marks[0]
        ? "improving"
        : marks[marks.length - 1] < marks[0]
        ? "declining"
        : "stable"
      : "insufficient_data";

    // Per-lesson breakdown
    const lessonPerformance = lessons.map((l) => {
      const lessonMarks = (progress || [])
        .filter((p) => p.lesson_id === l.id && p.mark !== null)
        .map((p) => p.mark!);
      const lessonAvg = lessonMarks.length > 0
        ? Math.round(lessonMarks.reduce((s, m) => s + m, 0) / lessonMarks.length)
        : null;
      const lessonAttendance = (attendance || []).filter((a) => a.lesson_id === l.id).length;
      return {
        lessonId: l.id,
        title: l.title,
        average: lessonAvg,
        sessionsAttended: lessonAttendance,
        recordCount: lessonMarks.length,
      };
    });

    // 5. Vocabulary
    const { data: vocab } = await supabase
      .from("student_vocabulary")
      .select("id, term, mastered, lesson_id")
      .eq("student_id", studentId);

    const totalTerms = vocab?.length || 0;
    const masteredTerms = vocab?.filter((v) => v.mastered).length || 0;
    const masteryRate = totalTerms > 0 ? Math.round((masteredTerms / totalTerms) * 100) : null;

    // 6. Achievements
    const { data: achievements } = await supabase
      .from("student_achievements")
      .select("achievement_type, earned_at, metadata")
      .eq("student_id", studentId)
      .gte("earned_at", periodStart.toISOString());

    // 7. Student feedback
    const { data: feedback } = await supabase
      .from("student_feedback")
      .select("feedback_text, feedback_type, created_at")
      .eq("student_id", studentId)
      .gte("created_at", periodStart.toISOString())
      .order("created_at", { ascending: false })
      .limit(10);

    // Build data payload for AI
    const reportData = {
      studentName,
      periodStart: startStr,
      periodEnd: endStr,
      academic: {
        overallAverage: avgMark,
        trend,
        marks,
        lessonPerformance,
        totalRecords: marks.length,
      },
      attendance: {
        totalSessions,
        attended: attendedSessions,
        rate: attendanceRate,
      },
      vocabulary: {
        total: totalTerms,
        mastered: masteredTerms,
        masteryRate,
      },
      achievements: achievements || [],
      feedback: (feedback || []).map((f) => ({
        text: f.feedback_text,
        type: f.feedback_type,
        date: f.created_at,
      })),
      lessons: lessons.map((l) => ({ title: l.title, language: l.language })),
    };

    // 8. AI Narrative generation
    let aiNarrative: any = null;
    if (lovableKey) {
      try {
        const aiResponse = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              tools: [
                {
                  type: "function",
                  function: {
                    name: "generate_student_report",
                    description:
                      "Generate a structured student performance report with domain narratives",
                    parameters: {
                      type: "object",
                      properties: {
                        academic_narrative: {
                          type: "string",
                          description: "2-3 sentence narrative about academic performance",
                        },
                        attendance_narrative: {
                          type: "string",
                          description: "2-3 sentence narrative about attendance and engagement",
                        },
                        vocabulary_narrative: {
                          type: "string",
                          description: "2-3 sentence narrative about vocabulary and language development",
                        },
                        social_emotional_narrative: {
                          type: "string",
                          description: "2-3 sentence narrative about social-emotional development based on student feedback",
                        },
                        strengths: {
                          type: "array",
                          items: { type: "string" },
                          description: "3 bullet points of student strengths",
                        },
                        areas_for_growth: {
                          type: "array",
                          items: { type: "string" },
                          description: "3 bullet points of areas for improvement",
                        },
                        recommendations_for_parents: {
                          type: "array",
                          items: { type: "string" },
                          description: "3 actionable recommendations for parents/guardians",
                        },
                        overall_narrative: {
                          type: "string",
                          description: "4-5 sentence overall summary for the teacher to review and edit",
                        },
                        overall_recommendations: {
                          type: "string",
                          description: "3-4 sentence recommendations paragraph for the teacher to review and edit",
                        },
                      },
                      required: [
                        "academic_narrative",
                        "attendance_narrative",
                        "vocabulary_narrative",
                        "social_emotional_narrative",
                        "strengths",
                        "areas_for_growth",
                        "recommendations_for_parents",
                        "overall_narrative",
                        "overall_recommendations",
                      ],
                    },
                  },
                },
              ],
              tool_choice: {
                type: "function",
                function: { name: "generate_student_report" },
              },
              messages: [
                {
                  role: "system",
                  content: `You are Walifaki, an educational reporting agent for TandemLearn — a sign language education platform in Southern Africa. Generate professional, empathetic student performance reports. Use warm, encouraging language appropriate for parents/guardians. Where data is limited, note this positively (e.g. "as the term progresses, we look forward to seeing more data"). Never fabricate data. Refer to the student by first name.`,
                },
                {
                  role: "user",
                  content: `Generate a performance report for this student:\n\n${JSON.stringify(reportData, null, 2)}`,
                },
              ],
            }),
          }
        );

        if (aiResponse.ok) {
          const aiResult = await aiResponse.json();
          const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            aiNarrative = JSON.parse(toolCall.function.arguments);
          }
        } else {
          const status = aiResponse.status;
          console.error("AI response error:", status);
          if (status === 429 || status === 402) {
            // Continue without AI narrative
          }
        }
      } catch (aiErr) {
        console.error("AI narrative error:", aiErr);
      }
    }

    // 9. Build final report JSON
    const reportJson = {
      ...reportData,
      aiNarrative,
    };

    // 10. Persist as draft
    const { data: savedReport, error: saveError } = await supabase
      .from("student_reports")
      .insert({
        student_id: studentId,
        generated_by: callerId || studentId,
        period_start: startStr,
        period_end: endStr,
        report_json: reportJson,
        teacher_narrative: aiNarrative?.overall_narrative || null,
        teacher_recommendations: aiNarrative?.overall_recommendations || null,
        status: "draft",
      })
      .select()
      .single();

    if (saveError) {
      console.error("Save error:", saveError);
      throw saveError;
    }

    // 11. Log to agent_actions
    const durationMs = Date.now() - startTime;
    await supabase.from("agent_actions").insert({
      agent_name: "Walifaki",
      action_type: "generate_student_report",
      target_user_id: studentId,
      input_summary: `Report for ${studentName}, ${periodDays} day period`,
      output_summary: `Generated draft report: avg ${avgMark ?? "N/A"}%, attendance ${attendanceRate ?? "N/A"}%, vocab mastery ${masteryRate ?? "N/A"}%`,
      duration_ms: durationMs,
      impact_metric: {
        avgMark,
        attendanceRate,
        vocabMasteryRate: masteryRate,
        achievementCount: achievements?.length || 0,
      },
      status: "completed",
    });

    return new Response(
      JSON.stringify({ report: savedReport }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Walifaki error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate report" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
