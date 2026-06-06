import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { lessonId } = await req.json();
    if (!lessonId) {
      return new Response(JSON.stringify({ error: "lessonId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get lesson details
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id, title, description, language, session_name")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      throw new Error(`Lesson not found: ${lessonError?.message}`);
    }

    // 2. Get lesson materials (text-based files only)
    const { data: materials } = await supabase
      .from("lesson_materials")
      .select("*")
      .eq("lesson_id", lessonId);

    if (!materials || materials.length === 0) {
      console.log("No materials found for lesson", lessonId);
      return new Response(JSON.stringify({ message: "No materials to process" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Extract text content from materials
    let combinedContent = "";
    for (const material of materials) {
      if (material.material_type === "link") continue;
      
      const isTextFile = /\.(txt|md|csv)$/i.test(material.file_name);
      if (!isTextFile) continue;

      const { data: fileData } = await supabase.storage
        .from("lesson_materials")
        .download(material.file_path);

      if (fileData) {
        const text = await fileData.text();
        combinedContent += `\n--- ${material.file_name} ---\n${text}\n`;
      }
    }

    if (!combinedContent.trim()) {
      console.log("No text content extracted from materials");
      return new Response(JSON.stringify({ message: "No text content in materials" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Truncate if very long
    const maxChars = 12000;
    if (combinedContent.length > maxChars) {
      combinedContent = combinedContent.substring(0, maxChars) + "\n[content truncated]";
    }

    // 4. Get enrolled students
    const { data: assignments } = await supabase
      .from("lesson_assignments")
      .select("student_id")
      .eq("lesson_id", lessonId);

    if (!assignments || assignments.length === 0) {
      console.log("No students enrolled in lesson");
      return new Response(JSON.stringify({ message: "No students enrolled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const studentIds = assignments.map((a) => a.student_id);

    // 5. Generate vocabulary preview using AI
    const systemPrompt = `You are Mwalimu, an AI preparation agent for TandemLearn — an educational platform designed for Southern African classrooms.

Your role: Pre-scan lesson materials and generate a preparation briefing that helps students arrive ready to learn.

You MUST return structured output using the provided function tool. The briefing should be:
- Written in clear, simple English suitable for young learners
- Culturally aware of Southern African educational contexts
- Focused on key vocabulary and concepts students will encounter

Guidelines:
- Extract 5-8 key vocabulary terms with simple definitions
- Identify 3-5 main concepts the lesson will cover
- Write a friendly, encouraging welcome message
- Create 2-3 "think about this before class" questions to prime curiosity`;

    const userPrompt = `Lesson: "${lesson.title}"
${lesson.description ? `Description: ${lesson.description}` : ""}

Material content:
${combinedContent}

Generate a pre-lesson briefing card for students.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
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
              name: "create_briefing",
              description: "Create a pre-lesson briefing card for students",
              parameters: {
                type: "object",
                properties: {
                  welcome_message: {
                    type: "string",
                    description: "A friendly 1-2 sentence welcome message about today's lesson",
                  },
                  lesson_topic: {
                    type: "string",
                    description: "The main topic in simple terms",
                  },
                  key_vocabulary: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        term: { type: "string" },
                        definition: { type: "string", description: "Simple definition suitable for young learners" },
                        example: { type: "string", description: "Example sentence using the term" },
                      },
                      required: ["term", "definition"],
                    },
                    description: "5-8 key vocabulary terms students will encounter",
                  },
                  main_concepts: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 main concepts the lesson covers, in simple language",
                  },
                  think_about: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-3 curiosity-priming questions for students to think about before class",
                  },
                },
                required: ["welcome_message", "lesson_topic", "key_vocabulary", "main_concepts", "think_about"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "create_briefing" } },
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await aiResponse.text();
      throw new Error(`AI gateway error: ${aiResponse.status} ${errorText}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error("No tool call in AI response");
    }

    const briefingData = JSON.parse(toolCall.function.arguments);

    // 5b. Enrich vocabulary with Rurimi dialect definitions
    const vocabTerms = briefingData.key_vocabulary?.map((v: any) => v.term) || [];
    if (vocabTerms.length > 0) {
      try {
        const rurimiResponse = await fetch(`${supabaseUrl}/functions/v1/rurimi-enrich`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            terms: vocabTerms,
            language_code: lesson.language === "en" ? "sna" : (lesson.language || "sna"),
            subject_area: lesson.title,
          }),
        });

        if (rurimiResponse.ok) {
          const rurimiData = await rurimiResponse.json();
          if (rurimiData.dialect_map) {
            briefingData.key_vocabulary = briefingData.key_vocabulary.map((v: any) => {
              const dialect = rurimiData.dialect_map[v.term.toLowerCase()];
              return dialect
                ? { ...v, dialect_definition: dialect.cultural_definition, dialect_context: dialect.usage_context, dialect_language: rurimiData.language_code }
                : v;
            });
            briefingData.dialect_language = rurimiData.language_code;
            console.log(`[Mwalimu] Rurimi enriched ${Object.keys(rurimiData.dialect_map).length} terms`);
          }
        }
      } catch (rurimiErr) {
        console.error("[Mwalimu] Rurimi enrichment failed (non-fatal):", rurimiErr);
      }
    }

    // 6. Upsert briefings for all enrolled students
    const briefingRecords = studentIds.map((studentId: string) => ({
      lesson_id: lessonId,
      student_id: studentId,
      briefing_json: briefingData,
      language: lesson.language || "en",
      generated_by: "Mwalimu",
    }));

    const { error: upsertError } = await supabase
      .from("pre_lesson_briefings")
      .upsert(briefingRecords, { onConflict: "lesson_id,student_id" });

    if (upsertError) {
      console.error("Error upserting briefings:", upsertError);
      throw upsertError;
    }

    const durationMs = Date.now() - startTime;

    // 7. Log agent action
    await supabase.from("agent_actions").insert({
      agent_name: "Mwalimu",
      action_type: "pre_lesson_briefing",
      lesson_id: lessonId,
      session_name: lesson.session_name,
      status: "completed",
      duration_ms: durationMs,
      input_summary: `Processed ${materials.length} material(s) for "${lesson.title}"`,
      output_summary: `Generated briefing with ${briefingData.key_vocabulary?.length || 0} vocabulary terms for ${studentIds.length} student(s)`,
      impact_metric: {
        students_served: studentIds.length,
        vocab_terms_previewed: briefingData.key_vocabulary?.length || 0,
        concepts_identified: briefingData.main_concepts?.length || 0,
        materials_processed: materials.length,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        studentsServed: studentIds.length,
        vocabTerms: briefingData.key_vocabulary?.length || 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Mwalimu error:", error);

    // Log failure
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("agent_actions").insert({
        agent_name: "Mwalimu",
        action_type: "pre_lesson_briefing",
        status: "failed",
        duration_ms: Date.now() - startTime,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    } catch {}

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
