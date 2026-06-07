import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDBSchema extends DBSchema {
  transcripts: {
    key: string;
    value: {
      id: string;
      sessionName: string;
      text: string;
      updatedAt: string;
      syncStatus: 'synced' | 'pending' | 'conflict';
    };
  };
  savedTranscripts: {
    key: string;
    value: {
      id: string;
      title: string;
      text: string;
      sessionName: string;
      language: string | null;
      savedAt: string;
      savedBy: string;
      syncStatus: 'synced' | 'pending';
    };
  };
  syncQueue: {
    key: string;
    value: {
      id: string;
      action: 'INSERT' | 'UPDATE' | 'DELETE';
      table: string;
      data: Record<string, any>;
      timestamp: string;
      status: 'pending' | 'processing' | 'failed';
      retryCount: number;
    };
    indexes: { 'by-status': string; 'by-timestamp': string };
  };
  lessonCache: {
    key: string;
    value: {
      id: string;
      data: Record<string, any>;
      cachedAt: string;
    };
  };
  appState: {
    key: string;
    value: {
      key: string;
      value: any;
      updatedAt: string;
    };
  };
  variantCache: {
    key: string;
    value: {
      id: string;
      universalSignId: string;
      region: string;
      variantLabel: string;
      videoUrl: string | null;
      notation: string | null;
      currentVersion: number;
      updatedAt: string;
      cachedAt: string;
    };
    indexes: { 'by-sign-region': [string, string] };
  };
}

const DB_NAME = 'tandemlearn-offline';
const DB_VERSION = 2;

let dbInstance: IDBPDatabase<OfflineDBSchema> | null = null;

export const getDB = async (): Promise<IDBPDatabase<OfflineDBSchema>> => {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<OfflineDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // Transcripts store
      if (!db.objectStoreNames.contains('transcripts')) {
        db.createObjectStore('transcripts', { keyPath: 'id' });
      }

      // Saved transcripts store
      if (!db.objectStoreNames.contains('savedTranscripts')) {
        db.createObjectStore('savedTranscripts', { keyPath: 'id' });
      }

      // Sync queue store with indexes
      if (!db.objectStoreNames.contains('syncQueue')) {
        const syncStore = db.createObjectStore('syncQueue', { keyPath: 'id' });
        syncStore.createIndex('by-status', 'status');
        syncStore.createIndex('by-timestamp', 'timestamp');
      }

      // Lesson cache store
      if (!db.objectStoreNames.contains('lessonCache')) {
        db.createObjectStore('lessonCache', { keyPath: 'id' });
      }

      // App state store
      if (!db.objectStoreNames.contains('appState')) {
        db.createObjectStore('appState', { keyPath: 'key' });
      }

      // Approved-variant cache (Concept 3 — refreshed by validator approvals)
      if (!db.objectStoreNames.contains('variantCache')) {
        const variantStore = db.createObjectStore('variantCache', { keyPath: 'id' });
        variantStore.createIndex('by-sign-region', ['universalSignId', 'region']);
      }
    },
  });

  return dbInstance;
};

// ==================== TRANSCRIPT OPERATIONS ====================

export const saveTranscriptOffline = async (
  id: string,
  sessionName: string,
  text: string,
  syncStatus: 'synced' | 'pending' | 'conflict' = 'pending'
) => {
  const db = await getDB();
  await db.put('transcripts', {
    id,
    sessionName,
    text,
    updatedAt: new Date().toISOString(),
    syncStatus,
  });
};

export const getTranscriptOffline = async (sessionName: string) => {
  const db = await getDB();
  const all = await db.getAll('transcripts');
  return all.find((t) => t.sessionName === sessionName);
};

export const markTranscriptSynced = async (id: string) => {
  const db = await getDB();
  const transcript = await db.get('transcripts', id);
  if (transcript) {
    transcript.syncStatus = 'synced';
    await db.put('transcripts', transcript);
  }
};

// ==================== SAVED TRANSCRIPTS OPERATIONS ====================

export const saveSavedTranscriptOffline = async (transcript: {
  id: string;
  title: string;
  text: string;
  sessionName: string;
  language: string | null;
  savedAt: string;
  savedBy: string;
  syncStatus?: 'synced' | 'pending';
}) => {
  const db = await getDB();
  await db.put('savedTranscripts', {
    ...transcript,
    syncStatus: transcript.syncStatus || 'pending',
  });
};

export const getAllSavedTranscriptsOffline = async () => {
  const db = await getDB();
  return db.getAll('savedTranscripts');
};

export const deleteSavedTranscriptOffline = async (id: string) => {
  const db = await getDB();
  await db.delete('savedTranscripts', id);
};

// ==================== SYNC QUEUE OPERATIONS ====================

export const addToSyncQueue = async (
  action: 'INSERT' | 'UPDATE' | 'DELETE',
  table: string,
  data: Record<string, any>
) => {
  const db = await getDB();
  const id = `${table}-${action}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await db.put('syncQueue', {
    id,
    action,
    table,
    data,
    timestamp: new Date().toISOString(),
    status: 'pending',
    retryCount: 0,
  });
  
  return id;
};

export const getPendingSyncItems = async () => {
  const db = await getDB();
  const tx = db.transaction('syncQueue', 'readonly');
  const index = tx.store.index('by-status');
  return index.getAll('pending');
};

export const getAllSyncItems = async () => {
  const db = await getDB();
  return db.getAll('syncQueue');
};

export const updateSyncItemStatus = async (
  id: string,
  status: 'pending' | 'processing' | 'failed',
  incrementRetry = false
) => {
  const db = await getDB();
  const item = await db.get('syncQueue', id);
  if (item) {
    item.status = status;
    if (incrementRetry) {
      item.retryCount += 1;
    }
    await db.put('syncQueue', item);
  }
};

export const removeSyncItem = async (id: string) => {
  const db = await getDB();
  await db.delete('syncQueue', id);
};

export const clearCompletedSyncItems = async () => {
  const db = await getDB();
  const all = await db.getAll('syncQueue');
  const tx = db.transaction('syncQueue', 'readwrite');
  
  for (const item of all) {
    if (item.status !== 'pending' && item.status !== 'processing') {
      await tx.store.delete(item.id);
    }
  }
  
  await tx.done;
};

// ==================== LESSON CACHE OPERATIONS ====================

export const cacheLessonData = async (id: string, data: Record<string, any>) => {
  const db = await getDB();
  await db.put('lessonCache', {
    id,
    data,
    cachedAt: new Date().toISOString(),
  });
};

export const getCachedLessonData = async (id: string) => {
  const db = await getDB();
  return db.get('lessonCache', id);
};

export const getAllCachedLessons = async () => {
  const db = await getDB();
  return db.getAll('lessonCache');
};

export const clearLessonCache = async () => {
  const db = await getDB();
  await db.clear('lessonCache');
};

// ==================== APP STATE OPERATIONS ====================

export const saveAppState = async (key: string, value: any) => {
  const db = await getDB();
  await db.put('appState', {
    key,
    value,
    updatedAt: new Date().toISOString(),
  });
};

export const getAppState = async (key: string) => {
  const db = await getDB();
  const state = await db.get('appState', key);
  return state?.value;
};

// ==================== UTILITY FUNCTIONS ====================

export const getSyncQueueCount = async () => {
  const db = await getDB();
  const pending = await getPendingSyncItems();
  return pending.length;
};

export const clearAllOfflineData = async () => {
  const db = await getDB();
  await Promise.all([
    db.clear('transcripts'),
    db.clear('savedTranscripts'),
    db.clear('syncQueue'),
    db.clear('lessonCache'),
    db.clear('appState'),
    db.clear('variantCache'),
  ]);
};

// ==================== APPROVED-VARIANT CACHE (Concept 3) ====================

export const cacheApprovedVariant = async (variant: {
  id: string;
  universalSignId: string;
  region: string;
  variantLabel: string;
  videoUrl: string | null;
  notation: string | null;
  currentVersion: number;
  updatedAt: string;
}) => {
  const db = await getDB();
  await db.put('variantCache', {
    ...variant,
    cachedAt: new Date().toISOString(),
  });
};

export const getCachedVariant = async (id: string) => {
  const db = await getDB();
  return db.get('variantCache', id);
};

export const getCachedVariantsForSign = async (
  universalSignId: string,
  region: string,
) => {
  const db = await getDB();
  const tx = db.transaction('variantCache', 'readonly');
  const index = tx.store.index('by-sign-region');
  return index.getAll([universalSignId, region] as any);
};

export const invalidateVariantCache = async (id: string) => {
  const db = await getDB();
  await db.delete('variantCache', id);
};
