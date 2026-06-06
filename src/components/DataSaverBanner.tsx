import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Battery, BatteryLow, Wifi, Zap, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export const DataSaverBanner = () => {
  const { dataSaver, loadSheddingMode, batteryLevel, isLowBattery, setDataSaver, setLoadSheddingMode } = useAccessibility();
  const [dismissed, setDismissed] = useState(false);

  // Show low battery warning if not already in load-shedding mode
  if (isLowBattery && !loadSheddingMode && !dismissed) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 px-4 py-2 bg-warning text-warning-foreground text-center text-sm font-medium flex items-center justify-center gap-2">
        <BatteryLow className="h-4 w-4" />
        <span>Battery low ({batteryLevel}%) — </span>
        <button 
          onClick={() => setLoadSheddingMode(true)} 
          className="underline font-bold"
        >
          Enable power-saving mode
        </button>
        <button onClick={() => setDismissed(true)} className="ml-2">
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  // Show active mode indicators
  if ((dataSaver || loadSheddingMode) && !dismissed) {
    return (
      <div className={cn(
        "fixed top-0 left-0 right-0 z-40 px-4 py-1.5 text-center text-xs font-medium flex items-center justify-center gap-3",
        "bg-muted text-muted-foreground"
      )}>
        {dataSaver && (
          <span className="flex items-center gap-1">
            <Wifi className="h-3 w-3" /> Data Saver
          </span>
        )}
        {loadSheddingMode && (
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" /> Power Saver
          </span>
        )}
        {batteryLevel !== null && (
          <span className="flex items-center gap-1">
            <Battery className="h-3 w-3" /> {batteryLevel}%
          </span>
        )}
        <button onClick={() => setDismissed(true)}>
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  }

  return null;
};
