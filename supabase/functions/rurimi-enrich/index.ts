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
    const { terms, language_code, subject_area } = await req.json();

    if (!terms || !Array.isArray(terms) || terms.length === 0) {
      return new Response(JSON.stringify({ error: "terms array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetLang = language_code || "sna"; // Default to Shona

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) throw new Error("LOVABLE_API_KEY not configured");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Check existing glossary entries for these terms
    const normalizedTerms = terms.map((t: string) => t.toLowerCase().trim());

    const { data: existingEntries } = await supabase
      .from("dialect_glossary")
      .select("*")
      .in("term", normalizedTerms)
      .eq("language_code", targetLang);

    const existingTermSet = new Set(existingEntries?.map((e) => e.term) || []);
    const missingTerms = normalizedTerms.filter((t: string) => !existingTermSet.has(t));

    // 2. If we have missing terms, generate cultural definitions using AI
    let newEntries: any[] = [];

    if (missingTerms.length > 0) {
      const langNames: Record<string, string> = {
        sna: "Shona",
        nde: "Ndebele",
        zul: "isiZulu",
        zsl: "Zimbabwean Sign Language",
        swh: "Swahili",
        bem: "Bemba",
        xh: "isiXhosa",
        st: "Sesotho",
        tn: "Setswana",
        af: "Afrikaans",
      };

      const langName = langNames[targetLang] || targetLang;

      const systemPrompt = `You are Rurimi, a cultural language intelligence agent for TandemLearn — an educational platform designed FROM Southern Africa, not retrofitted for it.

Your role: Generate culturally authentic definitions of English educational terms in ${langName}. These are NOT direct translations — they are cultural explanations that use local idioms, analogies, and references familiar to Southern African students.

Rules:
- Definitions must be in ${langName} with cultural context
- Use analogies from daily life in Southern Africa (local foods, activities, traditions)
- Keep definitions simple enough for young learners
- Include a usage_context showing the term used in a sentence mixing English and ${langName}
${targetLang === 'zsl' ? '- For ZSL: describe the sign gesture clearly, including hand shapes and movements' : ''}

You MUST call the provided function with your response.`;

      const userPrompt = `Generate culturally authentic ${langName} definitions for these English educational terms:
${missingTerms.map((t: string, i: number) => `${i + 1}. ${t}`).join("\n")}
${subject_area ? `\nSubject context: ${subject_area}` : ""}`;

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
                name: "create_glossary_entries",
                description: "Create dialect glossary entries for educational terms",
                parameters: {
                  type: "object",
                  properties: {
                    entries: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          term: { type: "string", description: "The English term (lowercase)" },
                          cultural_definition: {
                            type: "string",
                            description: `The culturally authentic definition in ${langName}`,
                          },
                          usage_context: {
                            type: "string",
                            description: "Example sentence showing usage, mixing English and the target language naturally",
                          },
                        },
                        required: ["term", "cultural_definition", "usage_context"],
                      },
                    },
                  },
                  required: ["entries"],
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "create_glossary_entries" } },
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limited" }), {
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
        throw new Error(`AI gateway error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];

      if (toolCall?.function?.arguments) {
        const parsed = JSON.parse(toolCall.function.arguments);
        newEntries = (parsed.entries || []).map((e: any) => ({
          term: e.term.toLowerCase().trim(),
          language_code: targetLang,
          cultural_definition: e.cultural_definition,
          usage_context: e.usage_context,
          subject_area: subject_area || "general",
          sign_language_ref: targetLang === "zsl" ? e.cultural_definition : null,
        }));

        // Upsert new entries to glossary
        if (newEntries.length > 0) {
          await supabase
            .from("dialect_glossary")
            .upsert(newEntries, { onConflict: "term,language_code" });
        }
      }
    }

    // 3. Return combined results (existing + newly generated)
    const allEntries = [...(existingEntries || []), ...newEntries];

    // Build a lookup map: term -> dialect info
    const dialectMap: Record<string, any> = {};
    for (const entry of allEntries) {
      dialectMap[entry.term] = {
        cultural_definition: entry.cultural_definition,
        usage_context: entry.usage_context,
        language_code: entry.language_code,
        sign_language_ref: entry.sign_language_ref,
      };
    }

    const durationMs = Date.now() - startTime;

    // 4. Log agent action
    await supabase.from("agent_actions").insert({
      agent_name: "Rurimi",
      action_type: "dialect_enrichment",
      status: "completed",
      duration_ms: durationMs,
      input_summary: `Enriched ${terms.length} terms in ${targetLang}`,
      output_summary: `Found ${existingEntries?.length || 0} cached, generated ${newEntries.length} new entries`,
      impact_metric: {
        terms_requested: terms.length,
        terms_cached: existingEntries?.length || 0,
        terms_generated: newEntries.length,
        language: targetLang,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        dialect_map: dialectMap,
        language_code: targetLang,
        cached: existingEntries?.length || 0,
        generated: newEntries.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[Rurimi] Error:", error);

    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("agent_actions").insert({
        agent_name: "Rurimi",
        action_type: "dialect_enrichment",
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
