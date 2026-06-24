import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cacheApprovedVariant, invalidateVariantCache } from "@/utils/offlineStorage";

/**
 * Concept 3: Approved-Variant Cache Refresh
 *
 * Listens for human-driven validator approvals on `dialect_variants`.
 * When a variant transitions to `status='approved'`, the matching IndexedDB
 * entry is replaced AND React Query caches are invalidated so every open
 * client refreshes instantly. Offline devices pick the update up on next sync.
 */
export const useVariantApprovalSync = () => {
  const qc = useQueryClient();
  const invalidateQueries = () => {
    qc.invalidateQueries({ queryKey: ["dialect_variants"] });
    qc.invalidateQueries({ queryKey: ["variants"] });
    qc.invalidateQueries({ queryKey: ["fallback-hotspots"] });
    qc.invalidateQueries({ queryKey: ["harmonization"] });
  };

  useEffect(() => {

    // 1. Postgres changes channel — fires for any UPDATE on dialect_variants
    const pgChannel = supabase
      .channel("dialect_variants_approvals")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dialect_variants" },
        async (payload) => {
          const newRow: any = payload.new;
          const oldRow: any = payload.old;
          if (!newRow) return;
          // Only react to transitions into 'approved' or content changes
          // on an already-approved variant.
          const becameApproved =
            newRow.status === "approved" && oldRow?.status !== "approved";
          const approvedContentChanged =
            newRow.status === "approved" &&
            (newRow.video_url !== oldRow?.video_url ||
              newRow.variant_label !== oldRow?.variant_label ||
              newRow.notation !== oldRow?.notation ||
              newRow.current_version !== oldRow?.current_version);

          if (!becameApproved && !approvedContentChanged) return;

          try {
            await cacheApprovedVariant({
              id: newRow.id,
              universalSignId: newRow.universal_sign_id,
              region: newRow.region,
              variantLabel: newRow.variant_label,
              videoUrl: newRow.video_url ?? null,
              notation: newRow.notation ?? null,
              currentVersion: newRow.current_version,
              updatedAt: newRow.updated_at,
            });
            invalidateQueries();
          } catch (e) {
            console.error("[variant-sync] cache write failed", e);
          }

        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "dialect_variants" },
        async (payload) => {
          const oldRow: any = payload.old;
          if (oldRow?.id) {
            try {
              await invalidateVariantCache(oldRow.id);
            } catch (e) {
              console.error("[variant-sync] cache invalidation failed", e);
            }
          }
        },
      )
      .subscribe();

    // 2. Lightweight broadcast channel — lets the validator dashboard push
    //    explicit cache-bust events even when RLS hides the variant row.
    const broadcastChannel = supabase
      .channel("zsl_variant_updates")
      .on("broadcast", { event: "variant_approved" }, async ({ payload }) => {
        const p: any = payload ?? {};
        if (!p.id) return;
        if (p.deleted) {
          await invalidateVariantCache(p.id);
          return;
        }
        await cacheApprovedVariant({
          id: p.id,
          universalSignId: p.universal_sign_id,
          region: p.region,
          variantLabel: p.variant_label,
          videoUrl: p.video_url ?? null,
          notation: p.notation ?? null,
          currentVersion: p.current_version ?? 1,
          updatedAt: p.updated_at ?? new Date().toISOString(),
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(pgChannel);
      supabase.removeChannel(broadcastChannel);
    };
  }, []);
};
