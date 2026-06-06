import { useEffect } from 'react';
import { useTour } from '@/contexts/TourContext';
import { TourSpotlight } from './TourSpotlight';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface WelcomeTourProps {
  steps: TourStep[];
  autoStart?: boolean;
}

export const WelcomeTour = ({ steps, autoStart = false }: WelcomeTourProps) => {
  const { startTour, isTourActive } = useTour();

  useEffect(() => {
    if (autoStart && !isTourActive) {
      const hasSeenTour = localStorage.getItem('tandemlearn_tour_completed');
      if (!hasSeenTour) {
        // Delay to allow page to render
        const timer = setTimeout(() => {
          startTour(steps.length);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [autoStart, startTour, steps.length, isTourActive]);

  return (
    <>
      {steps.map((step, index) => (
        <TourSpotlight
          key={index}
          step={index}
          targetId={step.targetId}
          title={step.title}
          description={step.description}
          position={step.position}
        />
      ))}
    </>
  );
};
