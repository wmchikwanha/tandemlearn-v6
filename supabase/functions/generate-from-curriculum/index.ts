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

  try {
    const { documentIds, prompt, gradeLevel, subjectFocus, accessibilityNeeds } = await req.json();

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Fetch selected curriculum documents content
    let curriculumContext = "";

    if (documentIds && documentIds.length > 0) {
      const { data: docs, error: docsError } = await supabase
        .from("curriculum_documents")
        .select("*")
        .in("id", documentIds);

      if (docsError) {
        console.error("Error fetching curriculum docs:", docsError);
      }

      if (docs && docs.length > 0) {
        for (const doc of docs) {
          // Only extract text from text-based files
          const textTypes = ["text/plain", "text/markdown", "text/csv", "application/json"];
          const isText = textTypes.some(t => doc.file_type?.includes(t)) ||
            doc.file_name?.match(/\.(txt|md|csv)$/i);

          if (isText) {
            try {
              const { data: fileData, error: fileError } = await supabase.storage
                .from("curriculum_repository")
                .download(doc.file_path);

              if (!fileError && fileData) {
                const text = await fileData.text();
                // Limit to 8000 chars per document
                const trimmed = text.substring(0, 8000);
                curriculumContext += `\n\n--- CURRICULUM DOCUMENT: ${doc.title} ---\n`;
                if (doc.subject_area) curriculumContext += `Subject: ${doc.subject_area}\n`;
                if (doc.grade_level) curriculumContext += `Grade: ${doc.grade_level}\n`;
                curriculumContext += `\n${trimmed}`;
                if (text.length > 8000) curriculumContext += "\n[...truncated]";
              }
            } catch (e) {
              console.error(`Failed to read file ${doc.file_name}:`, e);
            }
          } else {
            // For non-text files, include metadata only
            curriculumContext += `\n\n--- CURRICULUM DOCUMENT: ${doc.title} ---\n`;
            curriculumContext += `File: ${doc.file_name} (${doc.file_type})\n`;
            if (doc.description) curriculumContext += `Description: ${doc.description}\n`;
            if (doc.subject_area) curriculumContext += `Subject: ${doc.subject_area}\n`;
            if (doc.grade_level) curriculumContext += `Grade: ${doc.grade_level}\n`;
          }
        }
      }
    }

    const systemPrompt = `You are an expert Southern African curriculum specialist and lesson plan designer for TandemLearn™. You create inclusive, bespoke lesson plans aligned with national curricula (ZIMSEC, CAPS, etc.).

Your lesson plans must be:
- Structured and practical for real classroom use
- Inclusive of diverse learners (deaf, blind, neurodiverse, ESL)
- Culturally appropriate for Southern African classrooms
- Aligned with curriculum standards when documents are provided

Return a JSON object with this exact structure:
{
  "title": "Lesson title",
  "description": "Brief description",
  "learning_objectives": ["objective 1", "objective 2", ...],
  "lesson_outline": ["Step 1: ...", "Step 2: ...", ...],
  "materials_needed": ["material 1", "material 2", ...],
  "differentiation_notes": "How to adapt for diverse learners",
  "estimated_duration": "e.g., 45 minutes"
}

IMPORTANT: Return ONLY valid JSON, no markdown formatting or code blocks.`;

    let userPrompt = `Create a lesson plan based on the following:\n\n`;
    userPrompt += `TEACHER'S REQUEST: ${prompt}\n`;
    if (gradeLevel) userPrompt += `GRADE LEVEL: ${gradeLevel}\n`;
    if (subjectFocus) userPrompt += `SUBJECT: ${subjectFocus}\n`;
    if (accessibilityNeeds) userPrompt += `ACCESSIBILITY NEEDS: ${accessibilityNeeds}\n`;
    if (curriculumContext) {
      userPrompt += `\nCURRICULUM REFERENCE MATERIALS:\n${curriculumContext}`;
    }

    // Call Lovable AI Gateway
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
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) throw new Error("No content returned from AI");

    // Parse JSON from response (handle potential markdown wrapping)
    let lesson;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      lesson = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse lesson plan from AI response");
    }

    const durationMs = Date.now() - startTime;

    // Log to agent_actions
    await supabase.from("agent_actions").insert({
      agent_name: "CurriculumGenerator",
      action_type: "generate_lesson_plan",
      input_summary: `Prompt: ${prompt.substring(0, 200)}${documentIds?.length ? `, ${documentIds.length} doc(s)` : ""}`,
      output_summary: `Generated: ${lesson.title}`,
      status: "completed",
      duration_ms: durationMs,
      impact_metric: {
        documents_used: documentIds?.length || 0,
        grade_level: gradeLevel || null,
        subject: subjectFocus || null,
      },
    });

    return new Response(JSON.stringify({ success: true, lesson }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("generate-from-curriculum error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
