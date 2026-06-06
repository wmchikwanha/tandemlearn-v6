import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ZSL_PHRASES, ZSL_PHRASE_CATEGORIES, type ZSLPhrase } from "@/utils/zslPhrases";
import { ZSLPhraseCard } from "./ZSLPhraseCard";

export const ZSLPhraseLibrary = () => {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<ZSLPhrase["category"] | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ZSL_PHRASES.filter((p) => {
      if (cat !== "all" && p.category !== cat) return false;
      if (!q) return true;
      return (
        p.english.toLowerCase().includes(q) ||
        p.shona?.toLowerCase().includes(q) ||
        p.ndebele?.toLowerCase().includes(q)
      );
    });
  }, [query, cat]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search phrases in English, Shona, or Ndebele…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="text-base h-12"
      />

      <div className="flex flex-wrap gap-2">
        <CategoryChip active={cat === "all"} onClick={() => setCat("all")}>All</CategoryChip>
        {Object.entries(ZSL_PHRASE_CATEGORIES).map(([k, label]) => (
          <CategoryChip key={k} active={cat === k} onClick={() => setCat(k as ZSLPhrase["category"])}>
            {label}
          </CategoryChip>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No phrases match that search.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((p) => <ZSLPhraseCard key={p.id} phrase={p} />)}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        Library v0 • {ZSL_PHRASES.length} phrases • clips being recorded with Deaf Zimbabwe community
      </p>
    </div>
  );
};

const CategoryChip = ({ active, children, onClick }: { active: boolean; children: React.ReactNode; onClick: () => void }) => (
  <Badge
    variant={active ? "default" : "outline"}
    onClick={onClick}
    className="cursor-pointer select-none px-3 py-1 text-sm"
  >
    {children}
  </Badge>
);
