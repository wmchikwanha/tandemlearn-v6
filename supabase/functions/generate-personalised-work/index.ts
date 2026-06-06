import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { student_id, lesson_id, work_type } = await req.json();

    if (!student_id || !lesson_id || !work_type) {
      return new Response(JSON.stringify({ error: "student_id, lesson_id, and work_type are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch student profile
    const { data: profile } = await supabase
      .from("profiles").select("full_name, email").eq("id", student_id).single();

    // Fetch lesson info
    const { data: lesson } = await supabase
      .from("lessons").select("title, description, language").eq("id", lesson_id).single();

    // Fetch student progress for this lesson
    const { data: progress } = await supabase
      .from("student_progress").select("mark, comment, session_date")
      .eq("student_id", student_id).eq("lesson_id", lesson_id)
      .order("session_date", { ascending: false }).limit(10);

    // Fetch unmastered vocabulary
    const { data: vocab } = await supabase
      .from("student_vocabulary").select("term, definition, mastered")
      .eq("student_id", student_id).eq("lesson_id", lesson_id);

    // Fetch student documents (non-confidential summaries)
    const { data: docs } = await supabase
      .from("student_documents").select("title, document_type, notes")
      .eq("student_id", student_id);

    // Fetch student feedback for this lesson
    const { data: feedback } = await supabase
      .from("student_feedback").select("feedback_text, feedback_type")
      .eq("student_id", student_id).eq("lesson_id", lesson_id)
      .order("created_at", { ascending: false }).limit(5);

    // Fetch attendance
    const { data: attendance } = await supabase
      .from("lesson_attendance").select("session_date, duration_minutes")
      .eq("student_id", student_id).eq("lesson_id", lesson_id);

    const unmasteredVocab = vocab?.filter(v => !v.mastered) || [];
    const marks = progress?.filter(p => p.mark !== null).map(p => p.mark) || [];
    const avgMark = marks.length > 0 ? Math.round(marks.reduce((a, b) => a! + b!, 0)! / marks.length) : null;

    const prompt = `You are an inclusive education specialist generating personalised ${work_type} for a student.

STUDENT PROFILE:
- Name: ${profile?.full_name || "Unknown"}
- Lesson: ${lesson?.title || "Unknown"} (${lesson?.language || "en"})
- Description: ${lesson?.description || "N/A"}

ACADEMIC HISTORY:
- Average mark: ${avgMark !== null ? avgMark + "%" : "No marks yet"}
- Recent marks: ${marks.slice(0, 5).join(", ") || "None"}
- Sessions attended: ${attendance?.length || 0}
- Recent teacher comments: ${progress?.slice(0, 3).map(p => p.comment).filter(Boolean).join("; ") || "None"}

VOCABULARY STATUS:
- Unmastered terms: ${unmasteredVocab.map(v => v.term).join(", ") || "None"}

STUDENT DOCUMENTS:
${docs?.map(d => `- ${d.document_type}: ${d.title}${d.notes ? ` (${d.notes})` : ""}`).join("\n") || "None uploaded"}

STUDENT FEEDBACK:
${feedback?.map(f => `- [${f.feedback_type}]: ${f.feedback_text}`).join("\n") || "No feedback submitted"}

INSTRUCTIONS:
Generate a personalised ${work_type} that:
1. Targets the student's specific weak areas based on marks and feedback
2. Reinforces unmastered vocabulary
3. Considers any documented needs (IEP, medical, etc.)
4. Uses appropriate language level for the student
5. Includes clear, structured tasks with varying difficulty
6. Provides adaptations for diverse learners (visual descriptions, simplified instructions where needed)

Return valid JSON with this structure:
{
  "title": "string",
  "objectives": ["string"],
  "tasks": [{"title": "string", "question": "string", "instructions": "string"}],
  "adaptations": "string describing specific accommodations",
  "vocabulary_focus": ["terms to reinforce"]
}`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const response = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI API error: ${response.status} - ${errText}`);
    }

    const aiResult = await response.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse JSON from response
    let parsed: any;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: content };
    } catch {
      parsed = { raw: content };
    }

    // Log to agent_actions
    const startTime = Date.now();
    await supabase.from("agent_actions").insert({
      agent_name: "PersonalisedWork",
      action_type: `generate_${work_type}`,
      lesson_id: lesson_id,
      target_user_id: student_id,
      input_summary: `${work_type} for ${profile?.full_name || student_id} in ${lesson?.title}`,
      output_summary: parsed.title || "Generated work",
      status: "completed",
      duration_ms: Date.now() - startTime,
    });

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
