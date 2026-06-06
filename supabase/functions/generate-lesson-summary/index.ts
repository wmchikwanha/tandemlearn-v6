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

  try {
    const { transcript, lessonId, lessonTitle } = await req.json();

    if (!transcript || transcript.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Transcript is too short to summarise" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an educational assistant for deaf and hard-of-hearing students in Zimbabwe. Your job is to create lesson summaries that are:
- Written in simple, clear English (many students use sign language as their first language)
- Visually structured with short bullet points
- Focused on key concepts, not filler words

You MUST call the "create_lesson_summary" function with your response. Do not return plain text.`;

    const userPrompt = `Here is a transcript from a lesson titled "${lessonTitle || "Lesson"}":

---
${transcript.slice(0, 8000)}
---

Please create:
1. A list of 3-6 key points from this lesson (short, simple sentences)
2. A list of 5-10 important vocabulary words with simple definitions and example sentences
3. A "What to Revise" section with 2-4 things the student should review`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
              description: "Create a structured lesson summary with key points, vocabulary, and revision notes.",
              parameters: {
                type: "object",
                properties: {
                  key_points: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-6 key points from the lesson in simple English",
                  },
                  vocabulary: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        term: { type: "string" },
                        definition: { type: "string", description: "Simple definition suitable for ESL learners" },
                        example_sentence: { type: "string" },
                      },
                      required: ["term", "definition", "example_sentence"],
                    },
                    description: "5-10 important vocabulary words",
                  },
                  revision_notes: {
                    type: "array",
                    items: { type: "string" },
                    description: "2-4 things to revise",
                  },
                  lesson_title: { type: "string" },
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

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "AI is busy right now. Please try again in a minute." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please contact your administrator." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI gateway error");
    }

    const aiResult = await response.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured output");
    }

    const summary = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({ summary, lessonId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-lesson-summary error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
