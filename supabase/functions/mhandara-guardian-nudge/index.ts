import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Daily guardian nudge generator.
 *
 * For every guardian access code that hasn't been viewed in the last 7 days,
 * generate a wa.me deep-link and queue a `guardian_non_viewer` alert for the
 * owning teacher. Actual WhatsApp message dispatch is intentionally WIP —
 * Lovable Cloud Resend integration is pending Phase 1 funding. The wa.me
 * link itself is included in the action_payload so a teacher can tap-to-send.
 */
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const startedAt = Date.now();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  let alertsCreated = 0;

  try {
    const { data: codes } = await supabase
      .from("guardian_access_codes")
      .select("id, access_code, student_name, student_id, teacher_id, last_viewed_at")
      .eq("is_active", true)
      .or(`last_viewed_at.is.null,last_viewed_at.lt.${cutoff}`)
      .limit(500);

    for (const code of codes ?? []) {
      const link = `https://tandemlearn.app/guardian?code=${encodeURIComponent(code.access_code)}`;
      const message = `${code.student_name ?? "Your child"} has new updates on TandemLearn. View the latest report: ${link}`;
      const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`;

      await supabase.from("mhandara_alerts").insert({
        user_id: code.teacher_id,
        alert_type: "guardian_non_viewer",
        title: `Guardian inactive: ${code.student_name ?? "student"}`,
        body: "Guardian has not viewed the portal in 7+ days. Tap to send a WhatsApp nudge.",
        action_payload: { wa_link: waLink, student_id: code.student_id, guardian_code: code.access_code },
      });
      alertsCreated++;
    }

    await supabase.from("agent_actions").insert({
      agent_name: "Mhandara",
      action_type: "guardian_nudge",
      status: "completed",
      duration_ms: Date.now() - startedAt,
      output_summary: `Queued ${alertsCreated} guardian nudges.`,
      impact_metric: { alerts_created: alertsCreated, candidates: codes?.length ?? 0 },
    });

    return new Response(JSON.stringify({ success: true, alerts_created: alertsCreated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[mhandara-guardian-nudge]", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
