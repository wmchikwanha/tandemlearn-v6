import { supabase } from "@/integrations/supabase/client";

export type RouteFallback = "direct_match" | "canonical_redirect" | "fingerspelling";

export interface ResolvedSign {
  gloss: string;
  universalSign: {
    id: string;
    gloss: string;
    concept_description: string;
  } | null;
  matchedVariant: {
    id: string;
    region: string;
    variant_label: string;
    description: string | null;
    notation: string | null;
    confidence: number;
  } | null;
  alternativeVariants: Array<{
    id: string;
    region: string;
    variant_label: string;
    confidence: number;
  }>;
  fallback: RouteFallback;
  message: string;
}

/**
 * Resolve a target English gloss + a student's region to:
 *   1. the universal (canonical) sign
 *   2. the approved regional variant if it exists
 *   3. otherwise the highest-confidence approved variant in another region (canonical redirect)
 *   4. otherwise fingerspell fallback
 */
export async function resolveSign(gloss: string, studentRegion: string): Promise<ResolvedSign> {
  const normalized = gloss.trim().toLowerCase().replace(/\s+/g, "_");

  const { data: universal } = await supabase
    .from("universal_signs")
    .select("id, gloss, concept_description")
    .eq("gloss", normalized)
    .maybeSingle();

  if (!universal) {
    return {
      gloss: normalized,
      universalSign: null,
      matchedVariant: null,
      alternativeVariants: [],
      fallback: "fingerspelling",
      message: `No universal sign recorded for "${gloss}". Fingerspell.`,
    };
  }

  const { data: variants } = await supabase
    .from("dialect_variants")
    .select("id, region, variant_label, description, notation, confidence, status")
    .eq("universal_sign_id", universal.id)
    .eq("status", "approved")
    .order("confidence", { ascending: false });

  const approved = variants ?? [];
  const regional = approved.find((v) => v.region === studentRegion) ?? null;
  const alternatives = approved
    .filter((v) => v.id !== regional?.id)
    .map(({ id, region, variant_label, confidence }) => ({ id, region, variant_label, confidence }));

  if (regional) {
    return {
      gloss: normalized,
      universalSign: universal,
      matchedVariant: regional,
      alternativeVariants: alternatives,
      fallback: "direct_match",
      message: `Direct match in ${studentRegion}.`,
    };
  }

  if (approved.length > 0) {
    const best = approved[0];
    return {
      gloss: normalized,
      universalSign: universal,
      matchedVariant: best,
      alternativeVariants: alternatives.filter((v) => v.id !== best.id),
      fallback: "canonical_redirect",
      message: `No ${studentRegion} variant approved yet — showing canonical from ${best.region}.`,
    };
  }

  return {
    gloss: normalized,
    universalSign: universal,
    matchedVariant: null,
    alternativeVariants: [],
    fallback: "fingerspelling",
    message: "No approved variant exists yet. Fingerspell while a panel reviews submissions.",
  };
}

export const ZIM_REGION_LIST = [
  "Harare",
  "Bulawayo",
  "Masvingo",
  "Manicaland",
  "Mashonaland East",
  "Mashonaland West",
  "Mashonaland Central",
  "Midlands",
  "Matabeleland North",
  "Matabeleland South",
  "Rural_NdebeleInfluenced",
] as const;
