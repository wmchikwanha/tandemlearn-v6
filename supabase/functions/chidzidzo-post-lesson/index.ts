import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { session_name } = await req.json();
    if (!session_name) {
      return new Response(JSON.stringify({ error: "session_name required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[Chidzidzo] Post-lesson agent triggered for session: ${session_name}`);

    // 1. Get the transcript
    const { data: session, error: sessionError } = await supabase
      .from("live_transcription")
      .select("transcription_text, language")
      .eq("session_name", session_name)
      .single();

    if (sessionError || !session?.transcription_text) {
      console.log("[Chidzidzo] No transcript found, skipping");
      await logAgentAction(supabase, {
        agent_name: "Chidzidzo",
        action_type: "post_lesson_skip",
        session_name,
        status: "skipped",
        output_summary: "No transcript available",
        duration_ms: Date.now() - startTime,
      });
      return new Response(JSON.stringify({ status: "skipped", reason: "no_transcript" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const transcript = session.transcription_text;
    if (transcript.trim().length < 50) {
      console.log("[Chidzidzo] Transcript too short, skipping");
      await logAgentAction(supabase, {
        agent_name: "Chidzidzo",
        action_type: "post_lesson_skip",
        session_name,
        status: "skipped",
        output_summary: "Transcript too short",
        duration_ms: Date.now() - startTime,
      });
      return new Response(JSON.stringify({ status: "skipped", reason: "transcript_too_short" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Find the lesson from session_name
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, title, teacher_id")
      .eq("session_name", session_name)
      .single();

    if (!lesson) {
      console.log("[Chidzidzo] No lesson found for session, skipping");
      return new Response(JSON.stringify({ status: "skipped", reason: "no_lesson" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Find all enrolled students
    const { data: assignments } = await supabase
      .from("lesson_assignments")
      .select("student_id")
      .eq("lesson_id", lesson.id);

    const studentIds = assignments?.map((a) => a.student_id) || [];
    if (studentIds.length === 0) {
      console.log("[Chidzidzo] No students enrolled, skipping");
      return new Response(JSON.stringify({ status: "skipped", reason: "no_students" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Check which students already have summaries for this lesson (avoid duplicates)
    const { data: existingSummaries } = await supabase
      .from("lesson_summaries")
      .select("student_id")
      .eq("lesson_id", lesson.id);

    const existingStudentIds = new Set(existingSummaries?.map((s) => s.student_id) || []);
    const newStudentIds = studentIds.filter((id) => !existingStudentIds.has(id));

    if (newStudentIds.length === 0) {
      console.log("[Chidzidzo] All students already have summaries");
      return new Response(JSON.stringify({ status: "skipped", reason: "all_have_summaries" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Generate ONE summary (same content for all students in this lesson)
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    // 5a. Check Nzwisiso comprehension flags for this session
    const { data: nzwisisoActions } = await supabase
      .from("agent_actions")
      .select("output_summary, impact_metric")
      .eq("agent_name", "Nzwisiso Edu")
      .eq("session_name", session_name)
      .eq("action_type", "comprehension_monitor")
      .order("created_at", { ascending: false })
      .limit(20);

    const comprehensionFlagged = (nzwisisoActions || []).some((a: any) => {
      const m = a.impact_metric || {};
      return (m.grade_level && m.grade_level > 10) || (m.complex_word_ratio && m.complex_word_ratio > 20);
    });
    const gradeHint = (nzwisisoActions || [])[0]?.impact_metric?.grade_level;
    const nzwisisoSignals = (nzwisisoActions || [])
      .map((a: any) => a.output_summary)
      .filter(Boolean)
      .slice(0, 3)
      .join(" | ");

    console.log(`[Chidzidzo] Nzwisiso comprehension flagged: ${comprehensionFlagged}`);

    const systemPrompt = `You are Chidzidzo, an educational AI agent for deaf and hard-of-hearing students in Zimbabwe. Your job is to create lesson summaries that are:
- Written in simple, clear English (many students use sign language as their first language)
- Visually structured with short bullet points
- Focused on key concepts, not filler words
- Culturally relevant to Southern African educational contexts

You MUST call the "create_lesson_summary" function with your response.`;

    const userPrompt = `Here is a transcript from a lesson titled "${lesson.title}":

---
${transcript.slice(0, 8000)}
---

Please create:
1. A list of 3-6 key points from this lesson (short, simple sentences)
2. A list of 5-10 important vocabulary words with simple definitions and example sentences
3. A "What to Revise" section with 2-4 things the student should review${comprehensionFlagged ? `

IMPORTANT — Comprehension Difficulty Flagged by Nzwisiso:
The live comprehension monitor flagged this lesson as difficult (signals: ${nzwisisoSignals}${gradeHint ? `, peak Grade ${gradeHint}` : ''}).
You MUST also populate:
- "difficult_concept": the single hardest concept from this lesson (short phrase)
- "guided_review": 3-5 step-by-step explanations of that concept, written in very simple language for the student's grade level. Each step builds on the previous one. Use analogies and concrete examples from Southern African daily life where possible.` : ''}`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_lesson_summary",
              description: "Create a structured lesson summary.",
              parameters: {
                type: "object",
                properties: {
                  key_points: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-6 key points in simple English",
                  },
                  vocabulary: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        term: { type: "string" },
                        definition: { type: "string" },
                        example_sentence: { type: "string" },
                      },
                      required: ["term", "definition", "example_sentence"],
                    },
                  },
                  revision_notes: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 things to revise",
                  },
                  lesson_title: { type: "string" },
                  difficult_concept: {
                    type: "string",
                    description: "Single hardest concept (only when comprehension was flagged as difficult)",
                  },
                  guided_review: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 step-by-step explanations of the difficult_concept, simple language, building progressively. Only when comprehension was flagged.",
                  },
                },
                required: ["key_points", "vocabulary", "revision_notes", "lesson_title"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_lesson_summary" } },
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("[Chidzidzo] AI error:", aiResponse.status, errorText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output");
    }

    const summaryData = JSON.parse(toolCall.function.arguments);
    console.log(`[Chidzidzo] Summary generated: ${summaryData.key_points?.length} key points, ${summaryData.vocabulary?.length} vocab items`);

    // 5b. Enrich vocabulary with Rurimi dialect definitions
    const vocabTerms = summaryData.vocabulary?.map((v: any) => v.term) || [];
    if (vocabTerms.length > 0) {
      try {
        const rurimiResponse = await fetch(`${supabaseUrl}/functions/v1/rurimi-enrich`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            terms: vocabTerms,
            language_code: session.language === "en" ? "sna" : session.language,
            subject_area: lesson.title,
          }),
        });

        if (rurimiResponse.ok) {
          const rurimiData = await rurimiResponse.json();
          if (rurimiData.dialect_map) {
            // Attach dialect definitions to each vocabulary item
            summaryData.vocabulary = summaryData.vocabulary.map((v: any) => {
              const dialect = rurimiData.dialect_map[v.term.toLowerCase()];
              return dialect
                ? { ...v, dialect_definition: dialect.cultural_definition, dialect_context: dialect.usage_context, dialect_language: rurimiData.language_code }
                : v;
            });
            console.log(`[Chidzidzo] Rurimi enriched ${Object.keys(rurimiData.dialect_map).length} terms`);
          }
        }
      } catch (rurimiErr) {
        console.error("[Chidzidzo] Rurimi enrichment failed (non-fatal):", rurimiErr);
      }
    }

    // 6. Insert summaries for all new students
    const summaryRows = newStudentIds.map((studentId) => ({
      lesson_id: lesson.id,
      student_id: studentId,
      summary_json: summaryData,
    }));

    const { error: insertError } = await supabase
      .from("lesson_summaries")
      .insert(summaryRows);

    if (insertError) {
      console.error("[Chidzidzo] Insert error:", insertError);
      throw insertError;
    }

    // 7. Auto-add vocabulary to each student's word bank (new terms only)
    let totalVocabAdded = 0;
    for (const studentId of newStudentIds) {
      // Get existing vocab for this student
      const { data: existingVocab } = await supabase
        .from("student_vocabulary")
        .select("term")
        .eq("student_id", studentId);

      const existingTerms = new Set(existingVocab?.map((v) => v.term.toLowerCase()) || []);
      const newVocab = summaryData.vocabulary
        ?.filter((v: any) => !existingTerms.has(v.term.toLowerCase()))
        .map((v: any) => ({
          student_id: studentId,
          lesson_id: lesson.id,
          term: v.term,
          definition: v.definition,
          example_sentence: v.example_sentence,
        })) || [];

      if (newVocab.length > 0) {
        await supabase.from("student_vocabulary").insert(newVocab);
        totalVocabAdded += newVocab.length;
      }
    }

    // 8. Save transcript to each student's library
    const { data: teacherProfile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", lesson.teacher_id)
      .single();

    for (const studentId of newStudentIds) {
      // Check if already saved
      const { data: existing } = await supabase
        .from("saved_transcripts")
        .select("id")
        .eq("saved_by", studentId)
        .eq("session_name", session_name)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from("saved_transcripts").insert({
          saved_by: studentId,
          session_name: session_name,
          title: `${lesson.title} — ${new Date().toLocaleDateString()}`,
          transcript_text: transcript,
          language: session.language || "en",
        });
      }
    }

    const durationMs = Date.now() - startTime;

    // 9. Log the agent action
    await logAgentAction(supabase, {
      agent_name: "Chidzidzo",
      action_type: "post_lesson_summary",
      lesson_id: lesson.id,
      session_name,
      status: "completed",
      input_summary: `Transcript: ${transcript.length} chars, ${newStudentIds.length} students`,
      output_summary: `Generated ${summaryData.key_points?.length} key points, ${summaryData.vocabulary?.length} vocab items, ${totalVocabAdded} new words added to student banks`,
      impact_metric: {
        students_served: newStudentIds.length,
        key_points_generated: summaryData.key_points?.length || 0,
        vocab_items_generated: summaryData.vocabulary?.length || 0,
        vocab_items_added_to_banks: totalVocabAdded,
        transcript_length: transcript.length,
      },
      duration_ms: durationMs,
    });

    console.log(`[Chidzidzo] Complete: ${newStudentIds.length} students, ${totalVocabAdded} vocab added, ${durationMs}ms`);

    return new Response(
      JSON.stringify({
        status: "completed",
        students_served: newStudentIds.length,
        vocab_added: totalVocabAdded,
        duration_ms: durationMs,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const durationMs = Date.now() - startTime;
    console.error("[Chidzidzo] Error:", error);

    await logAgentAction(supabase, {
      agent_name: "Chidzidzo",
      action_type: "post_lesson_summary",
      status: "error",
      error_message: error instanceof Error ? error.message : "Unknown error",
      duration_ms: durationMs,
    });

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function logAgentAction(supabase: any, action: Record<string, any>) {
  try {
    await supabase.from("agent_actions").insert(action);
  } catch (e) {
    console.error("[Chidzidzo] Failed to log action:", e);
  }
}
