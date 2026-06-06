import { supabase } from '@/integrations/supabase/client';
import {
  getPendingSyncItems,
  updateSyncItemStatus,
  removeSyncItem,
  getSyncQueueCount,
  saveTranscriptOffline,
  markTranscriptSynced,
  getTranscriptOffline,
} from './offlineStorage';

type SyncListener = (status: SyncStatus) => void;

export interface SyncStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  error: string | null;
}

let syncListeners: SyncListener[] = [];
let currentStatus: SyncStatus = {
  isSyncing: false,
  pendingCount: 0,
  lastSyncAt: null,
  error: null,
};

export const subscribeSyncStatus = (listener: SyncListener) => {
  syncListeners.push(listener);
  listener(currentStatus);
  return () => {
    syncListeners = syncListeners.filter((l) => l !== listener);
  };
};

const notifyListeners = () => {
  syncListeners.forEach((listener) => listener(currentStatus));
};

const updateStatus = (updates: Partial<SyncStatus>) => {
  currentStatus = { ...currentStatus, ...updates };
  notifyListeners();
};

export const getSyncStatus = () => currentStatus;

export const refreshSyncCount = async () => {
  const count = await getSyncQueueCount();
  updateStatus({ pendingCount: count });
};

// Process the sync queue when online
export const processSyncQueue = async (): Promise<{ success: boolean; processed: number; failed: number }> => {
  if (currentStatus.isSyncing) {
    return { success: false, processed: 0, failed: 0 };
  }

  updateStatus({ isSyncing: true, error: null });
  
  let processed = 0;
  let failed = 0;

  try {
    const pendingItems = await getPendingSyncItems();
    updateStatus({ pendingCount: pendingItems.length });

    for (const item of pendingItems) {
      await updateSyncItemStatus(item.id, 'processing');

      try {
        let success = false;

        switch (item.table) {
          case 'live_transcription':
            success = await syncLiveTranscription(item.action, item.data);
            break;
          case 'saved_transcripts':
            success = await syncSavedTranscripts(item.action, item.data);
            break;
          case 'session_participants':
            success = await syncSessionParticipants(item.action, item.data);
            break;
          default:
            console.warn(`Unknown table for sync: ${item.table}`);
            success = true; // Skip unknown tables
        }

        if (success) {
          await removeSyncItem(item.id);
          processed++;
        } else {
          await updateSyncItemStatus(item.id, 'failed', true);
          failed++;
        }
      } catch (error) {
        console.error(`Error syncing item ${item.id}:`, error);
        await updateSyncItemStatus(item.id, 'failed', true);
        failed++;
      }
    }

    const newCount = await getSyncQueueCount();
    updateStatus({
      isSyncing: false,
      pendingCount: newCount,
      lastSyncAt: new Date().toISOString(),
    });

    return { success: true, processed, failed };
  } catch (error) {
    console.error('Sync queue processing error:', error);
    updateStatus({
      isSyncing: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    });
    return { success: false, processed, failed };
  }
};

// Sync live transcription
const syncLiveTranscription = async (
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  data: Record<string, any>
): Promise<boolean> => {
  if (action === 'UPDATE') {
    // For live transcription, server wins on conflicts (latest timestamp)
    const { data: serverData, error: fetchError } = await supabase
      .from('live_transcription')
      .select('*')
      .eq('id', data.id)
      .single();

    if (fetchError) {
      console.error('Error fetching server transcript:', fetchError);
      return false;
    }

    // Compare timestamps - server wins if more recent
    const serverTime = new Date(serverData?.updated_at || 0).getTime();
    const localTime = new Date(data.updated_at || 0).getTime();

    if (serverTime > localTime) {
      // Server is more recent - update local cache with server data
      await saveTranscriptOffline(
        serverData.id,
        serverData.session_name,
        serverData.transcription_text || '',
        'synced'
      );
      return true;
    }

    // Local is more recent - push to server
    const { error } = await supabase
      .from('live_transcription')
      .update({
        transcription_text: data.transcription_text,
        updated_at: new Date().toISOString(),
      })
      .eq('id', data.id);

    if (error) {
      console.error('Error updating transcript:', error);
      return false;
    }

    await markTranscriptSynced(data.id);
    return true;
  }

  return true;
};

// Sync saved transcripts
const syncSavedTranscripts = async (
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  data: Record<string, any>
): Promise<boolean> => {
  switch (action) {
    case 'INSERT': {
      const { error } = await supabase.from('saved_transcripts').insert({
        id: data.id,
        title: data.title,
        transcript_text: data.transcript_text,
        session_name: data.session_name,
        language: data.language,
        saved_by: data.saved_by,
      });
      return !error;
    }
    case 'UPDATE': {
      const { error } = await supabase
        .from('saved_transcripts')
        .update({
          title: data.title,
          transcript_text: data.transcript_text,
        })
        .eq('id', data.id);
      return !error;
    }
    case 'DELETE': {
      const { error } = await supabase
        .from('saved_transcripts')
        .delete()
        .eq('id', data.id);
      return !error;
    }
    default:
      return true;
  }
};

// Sync session participants
const syncSessionParticipants = async (
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  data: Record<string, any>
): Promise<boolean> => {
  switch (action) {
    case 'UPDATE': {
      const { error } = await supabase
        .from('session_participants')
        .update({
          hand_raised: data.hand_raised,
          is_unmuted: data.is_unmuted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);
      return !error;
    }
    default:
      return true;
  }
};

// Sync specific transcript with conflict resolution
export const syncTranscriptWithServer = async (sessionName: string): Promise<{
  success: boolean;
  transcript: string;
  conflict: boolean;
}> => {
  try {
    const localTranscript = await getTranscriptOffline(sessionName);
    
    const { data: serverData, error } = await supabase
      .from('live_transcription')
      .select('*')
      .eq('session_name', sessionName)
      .single();

    if (error) {
      return { 
        success: false, 
        transcript: localTranscript?.text || '', 
        conflict: false 
      };
    }

    const serverText = serverData?.transcription_text || '';
    const localText = localTranscript?.text || '';

    // If texts are the same, no conflict
    if (serverText === localText) {
      return { success: true, transcript: serverText, conflict: false };
    }

    // Server wins for live transcription
    await saveTranscriptOffline(
      serverData.id,
      serverData.session_name,
      serverText,
      'synced'
    );

    return { 
      success: true, 
      transcript: serverText, 
      conflict: serverText !== localText 
    };
  } catch (error) {
    console.error('Error syncing transcript:', error);
    const localTranscript = await getTranscriptOffline(sessionName);
    return { 
      success: false, 
      transcript: localTranscript?.text || '', 
      conflict: false 
    };
  }
};

// Auto-sync when coming online
export const setupAutoSync = () => {
  const handleOnline = async () => {
    console.log('Network online - starting sync');
    await processSyncQueue();
  };

  window.addEventListener('online', handleOnline);

  return () => {
    window.removeEventListener('online', handleOnline);
  };
};
