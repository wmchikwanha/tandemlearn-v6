import { useLanguage, SUPPORTED_LANGUAGES } from "@/contexts/LanguageContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  compact?: boolean;
  className?: string;
}

export const LanguageSwitcher = ({ compact = false, className = "" }: LanguageSwitcherProps) => {
  const { language, setLanguage, currentLanguage } = useLanguage();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {!compact && <Globe className="h-4 w-4 text-muted-foreground" />}
      <Select value={language} onValueChange={(v) => setLanguage(v as any)}>
        <SelectTrigger className={compact ? "w-[100px] h-8 text-xs" : "w-[180px]"}>
          <SelectValue>
            <span className="flex items-center gap-2">
              <span>{currentLanguage.flag}</span>
              <span>{compact ? currentLanguage.code.toUpperCase() : currentLanguage.nativeName}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              <span className="flex items-center gap-2">
                <span>{lang.flag}</span>
                <span>{lang.nativeName}</span>
                {lang.code !== 'en' && (
                  <span className="text-muted-foreground text-xs">({lang.name})</span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
