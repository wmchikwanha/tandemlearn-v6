import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type FontSize = 'normal' | 'large' | 'extra-large';

interface AccessibilityContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  dataSaver: boolean;
  setDataSaver: (enabled: boolean) => void;
  loadSheddingMode: boolean;
  setLoadSheddingMode: (enabled: boolean) => void;
  batteryLevel: number | null;
  isLowBattery: boolean;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const FONT_SIZE_KEY = 'tandem-accessibility-font-size';
const DATA_SAVER_KEY = 'tandem-data-saver';
const LOAD_SHEDDING_KEY = 'tandem-load-shedding';

const fontSizeClasses: Record<FontSize, string> = {
  'normal': 'text-base',
  'large': 'text-lg',
  'extra-large': 'text-xl'
};

const fontSizeMultipliers: Record<FontSize, number> = {
  'normal': 1,
  'large': 1.25,
  'extra-large': 1.5
};

export const AccessibilityProvider = ({ children }: { children: ReactNode }) => {
  const [fontSize, setFontSizeState] = useState<FontSize>('normal');
  const [dataSaver, setDataSaverState] = useState(false);
  const [loadSheddingMode, setLoadSheddingModeState] = useState(false);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [isLowBattery, setIsLowBattery] = useState(false);

  useEffect(() => {
    // Load saved preferences
    const savedFont = localStorage.getItem(FONT_SIZE_KEY) as FontSize;
    if (savedFont && ['normal', 'large', 'extra-large'].includes(savedFont)) {
      setFontSizeState(savedFont);
      applyFontSize(savedFont);
    }

    const savedDataSaver = localStorage.getItem(DATA_SAVER_KEY);
    if (savedDataSaver === 'true') {
      setDataSaverState(true);
      document.documentElement.setAttribute('data-data-saver', 'true');
    }

    const savedLoadShedding = localStorage.getItem(LOAD_SHEDDING_KEY);
    if (savedLoadShedding === 'true') {
      setLoadSheddingModeState(true);
      document.documentElement.setAttribute('data-load-shedding', 'true');
    }

    // Monitor battery level
    if ('getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        const updateBattery = () => {
          const level = Math.round(battery.level * 100);
          setBatteryLevel(level);
          setIsLowBattery(level <= 20 && !battery.charging);
          
          // Auto-enable load shedding mode when battery critically low
          if (level <= 10 && !battery.charging) {
            setLoadSheddingMode(true);
          }
        };
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
      });
    }

    // Detect connection quality for auto data-saver
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        const checkConnection = () => {
          // Auto-suggest data saver on slow connections
          if (conn.effectiveType === '2g' || conn.effectiveType === 'slow-2g') {
            if (!dataSaver) {
              setDataSaver(true);
            }
          }
        };
        checkConnection();
        conn.addEventListener('change', checkConnection);
      }
    }
  }, []);

  const applyFontSize = (size: FontSize) => {
    const multiplier = fontSizeMultipliers[size];
    document.documentElement.style.setProperty('--font-size-multiplier', String(multiplier));
    document.documentElement.setAttribute('data-font-size', size);
  };

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem(FONT_SIZE_KEY, size);
    applyFontSize(size);
  };

  const setDataSaver = (enabled: boolean) => {
    setDataSaverState(enabled);
    localStorage.setItem(DATA_SAVER_KEY, String(enabled));
    document.documentElement.setAttribute('data-data-saver', String(enabled));
  };

  const setLoadSheddingMode = (enabled: boolean) => {
    setLoadSheddingModeState(enabled);
    localStorage.setItem(LOAD_SHEDDING_KEY, String(enabled));
    document.documentElement.setAttribute('data-load-shedding', String(enabled));
  };

  return (
    <AccessibilityContext.Provider value={{ 
      fontSize, setFontSize, 
      dataSaver, setDataSaver, 
      loadSheddingMode, setLoadSheddingMode,
      batteryLevel, isLowBattery
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};

export { fontSizeClasses };
