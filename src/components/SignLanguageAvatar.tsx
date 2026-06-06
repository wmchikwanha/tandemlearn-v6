import { useState, useEffect } from "react";
import { SIGN_PROVIDER, SIGN_PROVIDER_CONFIG, type SignProvider } from "@/utils/signLanguageConfig";

interface SignLanguageAvatarProps {
  keyword: string | null;
  sentence: string | null;
  provider?: SignProvider;
}

/**
 * Provider-agnostic sign language rendering component.
 * - 'local': Renders static SVG signs based on detected keywords
 * - 'sign-speak' / 'signvrse' / 'custom': Placeholder for AI avatar SDK
 */
export const SignLanguageAvatar = ({ 
  keyword, 
  sentence, 
  provider = SIGN_PROVIDER 
}: SignLanguageAvatarProps) => {
  const [displayedSign, setDisplayedSign] = useState<string | null>(null);
  const [fadeIn, setFadeIn] = useState(false);
  const config = SIGN_PROVIDER_CONFIG[provider];

  useEffect(() => {
    if (provider === 'local' && keyword) {
      setFadeIn(false);
      setTimeout(() => {
        setDisplayedSign(keyword);
        setFadeIn(true);
      }, 100);

      const timer = setTimeout(() => {
        setFadeIn(false);
        setTimeout(() => setDisplayedSign(null), 300);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [keyword, provider]);

  // AI provider mode (future)
  if (provider !== 'local') {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-4 p-6">
          <div className="w-48 h-48 mx-auto bg-background rounded-lg border-2 border-dashed border-primary/30 flex items-center justify-center">
            <div className="text-center space-y-2 px-4">
              <p className="text-sm font-semibold text-primary">{config.name}</p>
              <p className="text-xs text-muted-foreground">AI Avatar — awaiting API key</p>
            </div>
          </div>
          {sentence && (
            <p className="text-xs text-muted-foreground max-w-[200px] mx-auto truncate">
              "{sentence}"
            </p>
          )}
        </div>
      </div>
    );
  }

  // Local SVG mode
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className={`transition-all duration-300 ${fadeIn ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        {displayedSign ? (
          <div className="text-center space-y-4">
            <div className="w-48 h-48 mx-auto bg-background rounded-lg border-2 border-primary/20 shadow-lg flex items-center justify-center p-4">
              <img
                src={`/signs/${displayedSign}.svg`}
                alt={`Sign for ${displayedSign}`}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.currentTarget.src = '/signs/placeholder.svg';
                }}
              />
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-primary capitalize">{displayedSign}</p>
              <p className="text-sm text-muted-foreground">Zimbabwean Sign Language</p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 opacity-50">
            <div className="w-48 h-48 mx-auto bg-background rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
              <img
                src="/signs/placeholder.svg"
                alt="Waiting for signs"
                className="w-32 h-32 object-contain opacity-40"
              />
            </div>
            <p className="text-muted-foreground">Listening for keywords...</p>
          </div>
        )}
      </div>
    </div>
  );
};
