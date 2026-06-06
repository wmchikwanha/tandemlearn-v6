import { useState, useEffect } from 'react';
import { Cloud, CloudOff, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { subscribeSyncStatus, processSyncQueue, SyncStatus } from '@/utils/syncManager';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface SyncStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export const SyncStatusIndicator = ({ className, showLabel = false }: SyncStatusIndicatorProps) => {
  const { isOnline } = useNetworkStatus();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    error: null,
  });

  useEffect(() => {
    const unsubscribe = subscribeSyncStatus(setSyncStatus);
    return unsubscribe;
  }, []);

  const handleManualSync = async () => {
    if (isOnline && !syncStatus.isSyncing) {
      await processSyncQueue();
    }
  };

  const getStatusIcon = () => {
    if (!isOnline) {
      return <CloudOff className="h-4 w-4 text-destructive" />;
    }
    if (syncStatus.isSyncing) {
      return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
    }
    if (syncStatus.error) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (syncStatus.pendingCount > 0) {
      return <Cloud className="h-4 w-4 text-warning" />;
    }
    return <Check className="h-4 w-4 text-success" />;
  };

  const getStatusText = () => {
    if (!isOnline) {
      return 'Offline';
    }
    if (syncStatus.isSyncing) {
      return 'Syncing...';
    }
    if (syncStatus.error) {
      return 'Sync failed';
    }
    if (syncStatus.pendingCount > 0) {
      return `${syncStatus.pendingCount} pending`;
    }
    return 'Synced';
  };

  const getTooltipContent = () => {
    if (!isOnline) {
      return 'You are offline. Changes will sync when you reconnect.';
    }
    if (syncStatus.isSyncing) {
      return 'Synchronizing your changes with the server...';
    }
    if (syncStatus.error) {
      return `Sync error: ${syncStatus.error}. Tap to retry.`;
    }
    if (syncStatus.pendingCount > 0) {
      return `${syncStatus.pendingCount} changes waiting to sync. Tap to sync now.`;
    }
    if (syncStatus.lastSyncAt) {
      const lastSync = new Date(syncStatus.lastSyncAt);
      return `All changes synced. Last sync: ${lastSync.toLocaleTimeString()}`;
    }
    return 'All changes synced';
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'gap-1.5 px-2 h-8',
              !isOnline && 'text-destructive',
              syncStatus.pendingCount > 0 && isOnline && 'text-warning',
              className
            )}
            onClick={handleManualSync}
            disabled={!isOnline || syncStatus.isSyncing}
          >
            {getStatusIcon()}
            {showLabel && (
              <span className="text-xs font-medium">{getStatusText()}</span>
            )}
            {syncStatus.pendingCount > 0 && !showLabel && (
              <span className="text-xs font-medium bg-warning/20 px-1.5 py-0.5 rounded-full">
                {syncStatus.pendingCount}
              </span>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="text-xs">{getTooltipContent()}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
