import { useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus } from './use-network-status';
import {
  addToSyncQueue,
  saveTranscriptOffline,
  getTranscriptOffline,
  saveSavedTranscriptOffline,
  getAllSavedTranscriptsOffline,
} from '@/utils/offlineStorage';
import {
  processSyncQueue,
  setupAutoSync,
  refreshSyncCount,
  syncTranscriptWithServer,
} from '@/utils/syncManager';

interface UseOfflineSyncOptions {
  sessionName?: string;
  onSyncComplete?: () => void;
  onConflict?: (serverText: string, localText: string) => void;
}

export const useOfflineSync = (options: UseOfflineSyncOptions = {}) => {
  const { sessionName = 'live_class', onSyncComplete, onConflict } = options;
  const { isOnline, wasOffline } = useNetworkStatus();
  const autoSyncCleanup = useRef<(() => void) | null>(null);

  // Setup auto-sync on mount
  useEffect(() => {
    autoSyncCleanup.current = setupAutoSync();
    refreshSyncCount();

    return () => {
      if (autoSyncCleanup.current) {
        autoSyncCleanup.current();
      }
    };
  }, []);

  // Handle reconnection
  useEffect(() => {
    if (wasOffline && isOnline) {
      handleReconnection();
    }
  }, [wasOffline, isOnline]);

  const handleReconnection = async () => {
    // Sync transcript with server
    const result = await syncTranscriptWithServer(sessionName);
    
    if (result.conflict && onConflict) {
      const localTranscript = await getTranscriptOffline(sessionName);
      onConflict(result.transcript, localTranscript?.text || '');
    }

    // Process any pending sync items
    await processSyncQueue();
    
    if (onSyncComplete) {
      onSyncComplete();
    }
  };

  // Save transcript (works offline and online)
  const saveTranscript = useCallback(
    async (id: string, text: string, sessionId?: string) => {
      // Always save locally first
      await saveTranscriptOffline(
        id,
        sessionName,
        text,
        isOnline ? 'synced' : 'pending'
      );

      // If offline, queue for sync
      if (!isOnline && sessionId) {
        await addToSyncQueue('UPDATE', 'live_transcription', {
          id: sessionId,
          transcription_text: text,
          updated_at: new Date().toISOString(),
        });
        await refreshSyncCount();
      }
    },
    [isOnline, sessionName]
  );

  // Get cached transcript
  const getCachedTranscript = useCallback(async () => {
    const cached = await getTranscriptOffline(sessionName);
    return cached?.text || null;
  }, [sessionName]);

  // Save transcript to library (works offline)
  const saveToLibrary = useCallback(
    async (transcript: {
      id: string;
      title: string;
      text: string;
      language: string | null;
      savedBy: string;
    }) => {
      const savedTranscript = {
        id: transcript.id,
        title: transcript.title,
        text: transcript.text,
        sessionName,
        language: transcript.language,
        savedAt: new Date().toISOString(),
        savedBy: transcript.savedBy,
        syncStatus: isOnline ? 'synced' as const : 'pending' as const,
      };

      // Save locally
      await saveSavedTranscriptOffline(savedTranscript);

      // If offline, queue for sync
      if (!isOnline) {
        await addToSyncQueue('INSERT', 'saved_transcripts', {
          id: transcript.id,
          title: transcript.title,
          transcript_text: transcript.text,
          session_name: sessionName,
          language: transcript.language,
          saved_by: transcript.savedBy,
        });
        await refreshSyncCount();
      }

      return savedTranscript;
    },
    [isOnline, sessionName]
  );

  // Get all saved transcripts (from cache when offline)
  const getSavedTranscripts = useCallback(async () => {
    return getAllSavedTranscriptsOffline();
  }, []);

  // Queue a generic action for sync
  const queueAction = useCallback(
    async (
      action: 'INSERT' | 'UPDATE' | 'DELETE',
      table: string,
      data: Record<string, any>
    ) => {
      if (!isOnline) {
        await addToSyncQueue(action, table, data);
        await refreshSyncCount();
      }
    },
    [isOnline]
  );

  // Force sync now
  const forceSync = useCallback(async () => {
    if (isOnline) {
      return processSyncQueue();
    }
    return { success: false, processed: 0, failed: 0 };
  }, [isOnline]);

  return {
    isOnline,
    wasOffline,
    saveTranscript,
    getCachedTranscript,
    saveToLibrary,
    getSavedTranscripts,
    queueAction,
    forceSync,
  };
};
