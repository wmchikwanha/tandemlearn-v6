import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface TourContextType {
  isTourActive: boolean;
  currentStep: number;
  totalSteps: number;
  startTour: (steps: number) => void;
  nextStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

export const useTour = () => {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
};

interface TourProviderProps {
  children: ReactNode;
}

export const TourProvider = ({ children }: TourProviderProps) => {
  const [isTourActive, setIsTourActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [totalSteps, setTotalSteps] = useState(0);

  const startTour = (steps: number) => {
    setTotalSteps(steps);
    setCurrentStep(0);
    setIsTourActive(true);
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      completeTour();
    }
  };

  const skipTour = () => {
    setIsTourActive(false);
    setCurrentStep(0);
    localStorage.setItem('tandemlearn_tour_completed', 'true');
  };

  const completeTour = () => {
    setIsTourActive(false);
    setCurrentStep(0);
    localStorage.setItem('tandemlearn_tour_completed', 'true');
  };

  return (
    <TourContext.Provider
      value={{
        isTourActive,
        currentStep,
        totalSteps,
        startTour,
        nextStep,
        skipTour,
        completeTour,
      }}
    >
      {children}
    </TourContext.Provider>
  );
};
