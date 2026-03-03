
import { openDB, IDBPDatabase } from 'idb';
import { useState, useCallback } from 'react';

const DB_NAME = 'SISFILA_DB_V2';
const STORE_NAME = 'state';
const PENDING_STORE = 'pending_ops';

export function useIndexedDB() {
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const initDB = useCallback(async () => {
    return openDB(DB_NAME, 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
        if (!db.objectStoreNames.contains(PENDING_STORE)) {
          db.createObjectStore(PENDING_STORE, { keyPath: 'uid', autoIncrement: true });
        }
      },
    });
  }, []);

  const saveBackup = useCallback(async (state: any) => {
    try {
      const db = await initDB();
      await db.put(STORE_NAME, state, 'backup');
    } catch (e) {
      console.error("IDB Save Error", e);
    }
  }, [initDB]);

  const loadBackup = useCallback(async () => {
    try {
      const db = await initDB();
      return await db.get(STORE_NAME, 'backup');
    } catch (e) {
      console.error("IDB Load Error", e);
      return null;
    }
  }, [initDB]);

  const addPendingOp = useCallback(async (op: any) => {
    try {
      const db = await initDB();
      await db.put(PENDING_STORE, {
        ...op,
        timestamp: Date.now()
      });
      const count = await db.count(PENDING_STORE);
      setPendingSyncCount(count);
    } catch (e) {
      console.error("IDB Pending Op Error", e);
    }
  }, [initDB]);

  const getPendingOps = useCallback(async () => {
    try {
      const db = await initDB();
      return await db.getAll(PENDING_STORE);
    } catch (e) {
      console.error("IDB Get Pending Ops Error", e);
      return [];
    }
  }, [initDB]);

  const clearPendingOps = useCallback(async () => {
    try {
      const db = await initDB();
      await db.clear(PENDING_STORE);
      setPendingSyncCount(0);
    } catch (e) {
      console.error("IDB Clear Pending Ops Error", e);
    }
  }, [initDB]);

  const updatePendingCount = useCallback(async () => {
    try {
      const db = await initDB();
      const count = await db.count(PENDING_STORE);
      setPendingSyncCount(count);
    } catch (e) {
      console.error("IDB Count Error", e);
    }
  }, [initDB]);

  return {
    pendingSyncCount,
    saveBackup,
    loadBackup,
    addPendingOp,
    getPendingOps,
    clearPendingOps,
    updatePendingCount,
    initDB
  };
}
