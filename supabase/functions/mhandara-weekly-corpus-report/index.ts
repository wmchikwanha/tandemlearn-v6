import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Mhandara Weekly Corpus Report (Concept 1 + 2)
 *
 * Runs weekly (recommended Monday 06:00 via pg_cron or external scheduler).
 * - Aggregates last 7 days of ZSL fingerspelling fallbacks from agent_context_pool
 *   (entries written by the Rurimi agent with content.fallback_type === 'fingerspelling').
 * - Groups by gloss + region.
 * - Writes a single summary row into agent_context_pool for the validator panel.
 * - Concept 2: for any gloss with > 5 fallback events in the window, raises a
 *   teacher-facing 'system_suggestion' alert in mhandara_alerts pointing to
 *   the variant submission form.
 *
 * Idempotent within a calendar week: dedup uses the report_week ISO key.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const startedAt = Date.now();
  const NUDGE_THRESHOLD = 5;
  const now = new Date();
  const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const reportWeek = `${now.getUTCFullYear()}-W${Math.ceil(
    ((now.getTime() - new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getTime()) /
      86400000 +
      new Date(Date.UTC(now.getUTCFullYear(), 0, 1)).getUTCDay() +
      1) /
      7,
  )}`;

  try {
    // 1. Pull all fingerspelling fallback observations in the window
    const { data: fallbackEntries, error: fetchError } = await supabase
      .from("agent_context_pool")
      .select("id, lesson_id, content, created_at")
      .eq("agent_name", "rurimi")
      .gte("created_at", weekStart.toISOString())
      .limit(5000);

    if (fetchError) throw fetchError;

    // 2. Group by gloss + region
    type Bucket = { gloss: string; region: string; count: number; lessons: Set<string> };
    const buckets = new Map<string, Bucket>();

    for (const e of fallbackEntries ?? []) {
      const c: any = e.content ?? {};
      if (c.fallback_type !== "fingerspelling") continue;
      const glosses: string[] = Array.isArray(c.glosses)
        ? c.glosses
        : c.gloss
          ? [c.gloss]
          : [];
      const region: string = c.region ?? "unknown";
      for (const gloss of glosses) {
        const key = `${region}::${gloss}`;
        if (!buckets.has(key)) {
          buckets.set(key, { gloss, region, count: 0, lessons: new Set() });
        }
        const b = buckets.get(key)!;
        b.count += 1;
        if (e.lesson_id) b.lessons.add(e.lesson_id);
      }
    }

    const grouped = Array.from(buckets.values()).sort((a, b) => b.count - a.count);
    const topGaps = grouped.slice(0, 50);

    // 3. Idempotency — skip if report already filed this week
    const { data: existing } = await supabase
      .from("agent_context_pool")
      .select("id")
      .eq("agent_name", "mhandara")
      .eq("context_type", "summary")
      .gte("created_at", weekStart.toISOString())
      .filter("content->>report_week", "eq", reportWeek)
      .limit(1);

    let summaryInserted = false;
    if (!existing || existing.length === 0) {
      await supabase.from("agent_context_pool").insert({
        agent_name: "mhandara",
        context_type: "summary",
        priority: 3,
        content: {
          report_type: "weekly_corpus_fallback",
          report_week: reportWeek,
          window_start: weekStart.toISOString(),
          window_end: now.toISOString(),
          total_fallback_events: grouped.reduce((s, b) => s + b.count, 0),
          unique_glosses: grouped.length,
          top_gaps: topGaps.map((b) => ({
            gloss: b.gloss,
            region: b.region,
            count: b.count,
            lessons: Array.from(b.lessons),
          })),
        },
        expires_at: new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      });
      summaryInserted = true;
    }

    // 4. Concept 2: nudge alerts for high-frequency gaps
    let nudgesCreated = 0;
    const highGaps = grouped.filter((b) => b.count > NUDGE_THRESHOLD);

    // Resolve recipients: validator panel members in the region + admins + any
    // teacher who taught one of the lessons. Recipients are de-duped per gloss.
    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    const adminIds = (admins ?? []).map((a: any) => a.user_id);

    for (const gap of highGaps) {
      const recipients = new Set<string>(adminIds);

      const { data: validators } = await supabase
        .from("validator_panel_members")
        .select("user_id")
        .eq("region", gap.region);
      for (const v of validators ?? []) recipients.add(v.user_id);

      if (gap.lessons.size > 0) {
        const { data: teachers } = await supabase
          .from("lessons")
          .select("teacher_id")
          .in("id", Array.from(gap.lessons));
        for (const t of teachers ?? []) if (t.teacher_id) recipients.add(t.teacher_id);
      }

      for (const userId of recipients) {
        // De-dup: skip if a nudge for this gloss/region already exists this week
        const { data: dup } = await supabase
          .from("mhandara_alerts")
          .select("id")
          .eq("user_id", userId)
          .eq("alert_type", "system_suggestion")
          .gte("created_at", weekStart.toISOString())
          .filter("action_payload->>gloss", "eq", gap.gloss)
          .filter("action_payload->>region", "eq", gap.region)
          .limit(1);
        if (dup && dup.length > 0) continue;

        await supabase.from("mhandara_alerts").insert({
          user_id: userId,
          lesson_id: null,
          alert_type: "system_suggestion",
          title: `Missing ZSL sign: "${gap.gloss}"`,
          body: `Students encountered fingerspelling fallback for "${gap.gloss}" ${gap.count} times this week in ${gap.region}. Submit a variant video?`,
          action_payload: {
            link: "/dialect/validator",
            submission_form: "/dialect/bridge",
            gloss: gap.gloss,
            region: gap.region,
            frequency: gap.count,
            report_week: reportWeek,
          },
          expires_at: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        });
        nudgesCreated++;
      }
    }

    // 5. Log the run
    await supabase.from("agent_actions").insert({
      agent_name: "Mhandara",
      action_type: "weekly_corpus_report",
      status: "completed",
      duration_ms: Date.now() - startedAt,
      output_summary: `Week ${reportWeek}: ${grouped.length} gloss/region pairs, ${highGaps.length} high-frequency gaps, ${nudgesCreated} nudges.`,
      impact_metric: {
        report_week: reportWeek,
        unique_glosses: grouped.length,
        high_gaps: highGaps.length,
        nudges_created: nudgesCreated,
        summary_inserted: summaryInserted,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        report_week: reportWeek,
        unique_glosses: grouped.length,
        high_gaps: highGaps.length,
        nudges_created: nudgesCreated,
        summary_inserted: summaryInserted,
        top_gaps: topGaps.slice(0, 10),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[mhandara-weekly-corpus-report]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
