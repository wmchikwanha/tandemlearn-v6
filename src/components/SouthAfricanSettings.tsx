import { useAccessibility } from '@/contexts/AccessibilityContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Wifi, Zap, Battery, Signal } from 'lucide-react';

export const SouthAfricanSettings = () => {
  const { 
    dataSaver, setDataSaver, 
    loadSheddingMode, setLoadSheddingMode,
    batteryLevel, isLowBattery 
  } = useAccessibility();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Signal className="h-5 w-5 text-primary" />
          Connectivity & Power
        </CardTitle>
        <CardDescription>
          Optimise for low data, slow networks, and load shedding
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Data Saver */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="data-saver" className="flex items-center gap-2 text-sm font-medium">
              <Wifi className="h-4 w-4 text-primary" />
              Data Saver Mode
            </Label>
            <p className="text-xs text-muted-foreground">
              Reduces animations, compresses content, and minimises data usage. 
              Ideal for prepaid mobile data.
            </p>
          </div>
          <Switch
            id="data-saver"
            checked={dataSaver}
            onCheckedChange={setDataSaver}
          />
        </div>

        {/* Load Shedding Mode */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="load-shedding" className="flex items-center gap-2 text-sm font-medium">
              <Zap className="h-4 w-4 text-warning" />
              Load Shedding Mode
            </Label>
            <p className="text-xs text-muted-foreground">
              Aggressive caching, reduced screen brightness hints, and minimal background activity. 
              Content pre-cached for offline use.
            </p>
          </div>
          <Switch
            id="load-shedding"
            checked={loadSheddingMode}
            onCheckedChange={setLoadSheddingMode}
          />
        </div>

        {/* Battery Status */}
        {batteryLevel !== null && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Battery className={`h-5 w-5 ${isLowBattery ? 'text-destructive' : 'text-success'}`} />
            <div>
              <p className="text-sm font-medium">Battery: {batteryLevel}%</p>
              <p className="text-xs text-muted-foreground">
                {isLowBattery 
                  ? 'Low battery — power saving recommended' 
                  : batteryLevel <= 50 
                    ? 'Moderate — consider enabling power saver before load shedding'
                    : 'Good battery level'}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
