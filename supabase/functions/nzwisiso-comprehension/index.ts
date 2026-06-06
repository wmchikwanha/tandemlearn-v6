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
    const { sessionName, transcriptChunk, connectedStudents, silentStudentCount, handRaisedCount } = await req.json();

    if (!sessionName || !transcriptChunk) {
      return new Response(
        JSON.stringify({ error: "sessionName and transcriptChunk required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const supabase = createClient(supabaseUrl, serviceKey);

    // 1. Compute text complexity metrics locally (no AI needed for basic metrics)
    const sentences = transcriptChunk.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
    const words = transcriptChunk.split(/\s+/).filter((w: string) => w.length > 0);
    const wordCount = words.length;
    const avgSentenceLength = sentences.length > 0 ? Math.round(wordCount / sentences.length) : 0;

    // Syllable count approximation
    const countSyllables = (word: string) => {
      word = word.toLowerCase().replace(/[^a-z]/g, '');
      if (word.length <= 3) return 1;
      word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
      word = word.replace(/^y/, '');
      const matches = word.match(/[aeiouy]{1,2}/g);
      return matches ? matches.length : 1;
    };

    const totalSyllables = words.reduce((sum: number, w: string) => sum + countSyllables(w), 0);
    const avgSyllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 0;

    // Flesch-Kincaid Grade Level
    const fleschKincaid = wordCount > 0 && sentences.length > 0
      ? Math.round((0.39 * (wordCount / sentences.length) + 11.8 * (totalSyllables / wordCount) - 15.59) * 10) / 10
      : 0;

    // Complex words (3+ syllables)
    const complexWords = words.filter((w: string) => countSyllables(w) >= 3);
    const complexWordRatio = wordCount > 0 ? Math.round((complexWords.length / wordCount) * 100) : 0;

    // 2. Determine alert level based on metrics
    const alerts: Array<{ type: string; severity: 'info' | 'warning' | 'critical'; message: string }> = [];

    if (fleschKincaid > 10) {
      alerts.push({
        type: 'complexity_spike',
        severity: fleschKincaid > 14 ? 'critical' : 'warning',
        message: `Language complexity is high (Grade ${fleschKincaid}). Consider simplifying vocabulary.`,
      });
    }

    if (avgSentenceLength > 25) {
      alerts.push({
        type: 'long_sentences',
        severity: avgSentenceLength > 35 ? 'critical' : 'warning',
        message: `Average sentence length is ${avgSentenceLength} words. Try shorter sentences for clarity.`,
      });
    }

    if (complexWordRatio > 20) {
      alerts.push({
        type: 'complex_vocabulary',
        severity: complexWordRatio > 35 ? 'critical' : 'warning',
        message: `${complexWordRatio}% of words are complex (3+ syllables). Consider pausing to explain key terms.`,
      });
    }

    // Engagement alerts
    if (connectedStudents !== undefined && silentStudentCount !== undefined) {
      const silentRatio = connectedStudents > 0 ? silentStudentCount / connectedStudents : 0;
      if (silentRatio > 0.7 && connectedStudents >= 3) {
        alerts.push({
          type: 'low_engagement',
          severity: silentRatio > 0.9 ? 'critical' : 'warning',
          message: `${silentStudentCount} of ${connectedStudents} students haven't interacted. Consider asking a question.`,
        });
      }
    }

    if (handRaisedCount !== undefined && handRaisedCount >= 3) {
      alerts.push({
        type: 'multiple_hands',
        severity: handRaisedCount >= 5 ? 'critical' : 'warning',
        message: `${handRaisedCount} students have raised their hands. Consider pausing to address questions.`,
      });
    }

    // 3. If complexity is high and AI is available, generate simplification suggestions
    let simplifications: string[] = [];
    if (lovableKey && complexWords.length > 0 && fleschKincaid > 8) {
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
              model: "google/gemini-2.5-flash-lite",
              messages: [
                {
                  role: "system",
                  content: `You are Nzwisiso Edu, a comprehension monitor for Southern African classrooms. Given complex words from a teacher's speech, provide simple 3-5 word alternative definitions suitable for secondary school students. Output a JSON array of objects with "word" and "simple" keys. Max 5 words. Output valid JSON only.`,
                },
                {
                  role: "user",
                  content: `Simplify these complex words from the teacher's speech: ${complexWords.slice(0, 8).join(', ')}`,
                },
              ],
              temperature: 0.3,
              max_tokens: 300,
            }),
          }
        );

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices?.[0]?.message?.content || "";
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            simplifications = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (e) {
        console.error("AI simplification failed:", e);
      }
    }

    // 4. Log agent action if there are alerts
    if (alerts.length > 0) {
      await supabase.from("agent_actions").insert({
        agent_name: "Nzwisiso Edu",
        action_type: "comprehension_monitor",
        session_name: sessionName,
        input_summary: `Analyzed ${wordCount} words, Grade ${fleschKincaid}`,
        output_summary: alerts.map(a => a.message).join('; '),
        status: "completed",
        duration_ms: Date.now() - startTime,
        impact_metric: {
          word_count: wordCount,
          grade_level: fleschKincaid,
          complex_word_ratio: complexWordRatio,
          alerts_generated: alerts.length,
          connected_students: connectedStudents || 0,
        },
      });
    }

    return new Response(
      JSON.stringify({
        metrics: {
          wordCount,
          avgSentenceLength,
          avgSyllablesPerWord: Math.round(avgSyllablesPerWord * 10) / 10,
          fleschKincaid,
          complexWordRatio,
          complexWords: complexWords.slice(0, 8),
        },
        alerts,
        simplifications,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Nzwisiso Edu error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
