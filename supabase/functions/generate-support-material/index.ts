import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  try {
    const { feedback_id, student_id, lesson_id, feedback_text, feedback_type } = await req.json();
    if (!feedback_text || !lesson_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch lesson info
    const { data: lesson } = await supabase.from("lessons").select("title, description, language").eq("id", lesson_id).single();

    // Fetch student profile
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", student_id).single();

    // Fetch student's vocabulary mastery for this lesson
    const { data: vocab } = await supabase.from("student_vocabulary").select("term, mastered").eq("student_id", student_id).eq("lesson_id", lesson_id);

    // Fetch lesson materials
    const { data: materials } = await supabase.from("lesson_materials").select("file_name, file_type").eq("lesson_id", lesson_id).limit(5);

    const unmasteredTerms = vocab?.filter(v => !v.mastered).map(v => v.term) || [];

    const prompt = `You are a supportive educational assistant for TandemLearn™, an inclusive learning platform used in Southern African schools.

A student has submitted private feedback about a lesson. Generate targeted, compassionate support material to help them.

STUDENT: ${profile?.full_name || "Student"}
LESSON: ${lesson?.title || "Unknown"} — ${lesson?.description || ""}
FEEDBACK TYPE: ${feedback_type}
STUDENT'S MESSAGE: "${feedback_text}"

${unmasteredTerms.length > 0 ? `UNMASTERED VOCABULARY: ${unmasteredTerms.join(", ")}` : ""}
${materials?.length ? `LESSON MATERIALS: ${materials.map(m => m.file_name).join(", ")}` : ""}

Generate a helpful, encouraging response that:
1. Acknowledges the student's specific concern
2. Provides a clear, simple explanation or exercise targeting their difficulty
3. If vocabulary is unmastered, include definitions
4. Uses simple language appropriate for ESL learners
5. Ends with encouragement

Keep the response under 300 words. Be warm and specific — not generic.`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const supportMaterial = aiData.choices?.[0]?.message?.content || "Unable to generate support material.";

    // Log agent action
    await supabase.from("agent_actions").insert({
      agent_name: "SupportGenerator",
      action_type: "generate_support_material",
      target_user_id: student_id,
      lesson_id,
      input_summary: `Feedback type: ${feedback_type}, text: ${feedback_text.substring(0, 100)}`,
      output_summary: supportMaterial.substring(0, 200),
      status: "completed",
      duration_ms: Date.now() - startTime,
      impact_metric: { feedback_id, feedback_type },
    });

    return new Response(JSON.stringify({ support_material: supportMaterial }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
