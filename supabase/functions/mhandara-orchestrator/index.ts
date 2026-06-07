import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Mhandara orchestrator
 * Reads unconsumed entries from agent_context_pool AND recent agent_actions,
 * applies rules, and writes user-facing alerts into mhandara_alerts.
 *
 * Designed to be idempotent and safe to call every 5 minutes (cron) or
 * on-demand from the dashboard.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const startedAt = Date.now();
  let alertsCreated = 0;

  try {
    // --- 1. Pull unconsumed context-pool entries ---
    const { data: poolEntries } = await supabase
      .from("agent_context_pool")
      .select("*")
      .not("consumed_by", "cs", "{mhandara}")
      .gt("expires_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .limit(200);

    for (const entry of poolEntries ?? []) {
      const teacherId = entry.lesson_id
        ? (await supabase.from("lessons").select("teacher_id").eq("id", entry.lesson_id).maybeSingle())
            .data?.teacher_id ?? null
        : null;

      const alerts: any[] = [];
      const c = entry.content ?? {};

      if (entry.agent_name === "nzwisiso" && c.spike_detected && teacherId) {
        alerts.push({
          user_id: teacherId,
          lesson_id: entry.lesson_id,
          alert_type: "complexity_spike",
          title: "Lesson language may be too complex",
          body: `Complexity scored ${c.complexity_score} against grade level ${c.grade_level}. Consider simplifying.`,
          action_payload: { suggested_action: "inject_simplified_caption", terms: c.difficult_terms ?? [] },
        });
      }

      if (entry.agent_name === "rurimi" && c.fallback_type === "fingerspelling" && teacherId) {
        alerts.push({
          user_id: teacherId,
          lesson_id: entry.lesson_id,
          alert_type: "dialect_mismatch",
          title: "Dialect bridge fell back to fingerspelling",
          body: `No approved ZSL variant for ${c.glosses_translated ?? "several"} terms. Deaf students saw fingerspelling.`,
          action_payload: { suggested_action: "request_variant_submission" },
        });
      }

      if (entry.agent_name === "muchinda" && Array.isArray(c.at_risk_students)) {
        for (const s of c.at_risk_students) {
          if (!s?.teacher_id) continue;
          alerts.push({
            user_id: s.teacher_id,
            lesson_id: null,
            alert_type: "at_risk_student",
            title: "Student needs attention",
            body: `${s.name ?? "A student"} attendance is below 50%. Suggested: ${s.intervention ?? "check-in"}.`,
            action_payload: { student_id: s.student_id, intervention: s.intervention },
          });
        }
      }

      if (entry.agent_name === "mwalimu" && c.briefing_generated && teacherId) {
        alerts.push({
          user_id: teacherId,
          lesson_id: entry.lesson_id,
          alert_type: "pre_lesson_ready",
          title: "Pre-lesson briefing ready",
          body: "Vocabulary cards and teacher notes are prepared for this lesson.",
          action_payload: { lesson_id: entry.lesson_id },
        });
      }

      for (const a of alerts) {
        await supabase.from("mhandara_alerts").insert(a);
        alertsCreated++;
      }

      // mark consumed
      await supabase
        .from("agent_context_pool")
        .update({ consumed_by: [...(entry.consumed_by ?? []), "mhandara"] })
        .eq("id", entry.id);
    }

    // --- 2. Backfill from recent agent_actions (last 30 min) so existing
    //        agents already in production surface in the UI even if they
    //        haven't been wired to write to context_pool yet ---
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { data: recentActions } = await supabase
      .from("agent_actions")
      .select("*")
      .gte("created_at", since)
      .limit(100);

    for (const a of recentActions ?? []) {
      if (!a.lesson_id) continue;
      const { data: lesson } = await supabase
        .from("lessons")
        .select("teacher_id, title")
        .eq("id", a.lesson_id)
        .maybeSingle();
      if (!lesson?.teacher_id) continue;

      // De-dup: skip if we've already written an alert for this action recently
      const { data: existing } = await supabase
        .from("mhandara_alerts")
        .select("id")
        .eq("user_id", lesson.teacher_id)
        .eq("lesson_id", a.lesson_id)
        .gte("created_at", since)
        .limit(1);
      if (existing && existing.length > 0) continue;

      if (a.agent_name === "Mwalimu" && a.status === "completed") {
        await supabase.from("mhandara_alerts").insert({
          user_id: lesson.teacher_id,
          lesson_id: a.lesson_id,
          alert_type: "pre_lesson_ready",
          title: `Pre-lesson briefing ready: ${lesson.title}`,
          body: a.output_summary ?? "Vocabulary cards and teacher notes are prepared.",
          action_payload: { lesson_id: a.lesson_id },
        });
        alertsCreated++;
      }
    }

    // --- 3. Log the orchestrator run ---
    await supabase.from("agent_actions").insert({
      agent_name: "Mhandara",
      action_type: "orchestrate",
      status: "completed",
      duration_ms: Date.now() - startedAt,
      output_summary: `Created ${alertsCreated} alerts from ${poolEntries?.length ?? 0} pool entries.`,
      impact_metric: { alerts_created: alertsCreated, pool_entries: poolEntries?.length ?? 0 },
    });

    return new Response(
      JSON.stringify({ success: true, alerts_created: alertsCreated, pool_entries: poolEntries?.length ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[mhandara-orchestrator]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
