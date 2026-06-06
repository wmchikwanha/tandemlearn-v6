import { useEffect, useState, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, X } from 'lucide-react';
import { useTour } from '@/contexts/TourContext';

interface TourSpotlightProps {
  step: number;
  targetId: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const TourSpotlight = ({
  step,
  targetId,
  title,
  description,
  position = 'bottom',
}: TourSpotlightProps) => {
  const { isTourActive, currentStep, nextStep, skipTour } = useTour();
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isTourActive && currentStep === step) {
      const element = document.getElementById(targetId);
      if (element) {
        const rect = element.getBoundingClientRect();
        setTargetRect(rect);
        setIsVisible(true);
        
        // Scroll element into view
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setIsVisible(false);
    }
  }, [isTourActive, currentStep, step, targetId]);

  if (!isVisible || !targetRect) return null;

  const tooltipPosition = () => {
    const padding = 16;
    switch (position) {
      case 'top':
        return {
          top: targetRect.top - padding,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translate(-50%, -100%)',
        };
      case 'bottom':
        return {
          top: targetRect.bottom + padding,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - padding,
          transform: 'translate(-100%, -50%)',
        };
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + padding,
          transform: 'translateY(-50%)',
        };
      default:
        return {};
    }
  };

  return (
    <>
      {/* Backdrop with spotlight cutout */}
      <div className="fixed inset-0 z-50 pointer-events-none">
        <svg className="w-full h-full">
          <defs>
            <mask id="spotlight-mask">
              <rect x="0" y="0" width="100%" height="100%" fill="white" />
              <rect
                x={targetRect.left - 8}
                y={targetRect.top - 8}
                width={targetRect.width + 16}
                height={targetRect.height + 16}
                rx="8"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="hsl(var(--background))"
            opacity="0.8"
            mask="url(#spotlight-mask)"
          />
        </svg>

        {/* Highlight ring */}
        <div
          className="absolute border-2 border-primary rounded-lg shadow-[0_0_0_4px_hsl(var(--primary)/0.2)] animate-pulse"
          style={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
        />
      </div>

      {/* Tooltip card */}
      <Card
        className="fixed z-[60] w-80 shadow-lg pointer-events-auto"
        style={tooltipPosition()}
      >
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-foreground">{title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 -mt-1"
              onClick={skipTour}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={skipTour}>
              Skip Tour
            </Button>
            <Button size="sm" onClick={nextStep}>
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
};
