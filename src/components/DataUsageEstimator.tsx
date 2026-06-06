import { useEffect, useState } from "react";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Wifi, WifiOff, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DataUsageEstimatorProps {
  className?: string;
  showLabel?: boolean;
}

// Estimated data costs per action (in KB)
const DATA_COSTS = {
  pageLoad: 150,
  liveSessionPerMinute: 50,
  materialDownload: 500,
  transcriptSync: 10,
  imageLoad: 200,
};

export const DataUsageEstimator = ({ className = "", showLabel = true }: DataUsageEstimatorProps) => {
  const { dataSaver } = useAccessibility();
  const { t } = useLanguage();
  const [sessionDataKB, setSessionDataKB] = useState(0);
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    // Track approximate data usage this session
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        if (resource.transferSize) {
          setSessionDataKB(prev => prev + resource.transferSize / 1024);
        }
      }
    });

    try {
      observer.observe({ type: 'resource', buffered: true });
    } catch {
      // PerformanceObserver not supported
    }

    // Get connection type
    if ('connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        setConnectionType(conn.effectiveType || 'unknown');
        const updateConn = () => setConnectionType(conn.effectiveType || 'unknown');
        conn.addEventListener('change', updateConn);
        return () => {
          observer.disconnect();
          conn.removeEventListener('change', updateConn);
        };
      }
    }

    return () => observer.disconnect();
  }, []);

  const formatDataUsage = (kb: number): string => {
    if (kb < 1024) return `${Math.round(kb)} KB`;
    return `${(kb / 1024).toFixed(1)} MB`;
  };

  const getConnectionIcon = () => {
    if (connectionType === 'slow-2g' || connectionType === '2g') {
      return <WifiOff className="h-3 w-3 text-destructive" />;
    }
    if (connectionType === '3g') {
      return <Wifi className="h-3 w-3 text-yellow-500" />;
    }
    return <Wifi className="h-3 w-3 text-green-500" />;
  };

  const getConnectionLabel = () => {
    const labels: Record<string, string> = {
      'slow-2g': '2G (Slow)',
      '2g': '2G',
      '3g': '3G',
      '4g': '4G/LTE',
      'unknown': '--',
    };
    return labels[connectionType] || connectionType.toUpperCase();
  };

  const savedPercentage = dataSaver ? 40 : 0;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}>
          {getConnectionIcon()}
          {showLabel && (
            <>
              <span>{getConnectionLabel()}</span>
              <span className="text-muted-foreground/50">•</span>
              <span>{formatDataUsage(sessionDataKB)}</span>
              {dataSaver && (
                <Badge variant="outline" className="h-4 px-1 text-[10px] text-green-600 border-green-600/30">
                  <TrendingDown className="h-2 w-2 mr-0.5" />
                  ~{savedPercentage}% {t('data.saved')}
                </Badge>
              )}
            </>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        <div className="space-y-1">
          <p className="font-medium">{t('data.estimatedUsage')}</p>
          <p>Session: {formatDataUsage(sessionDataKB)}</p>
          <p>Network: {getConnectionLabel()}</p>
          {dataSaver && <p className="text-green-600">Data Saver: Active (~{savedPercentage}% savings)</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
};
