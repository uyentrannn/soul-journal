import { Entry } from '../types';

const DB_NAME = 'soul_journal_db';
const STORE_NAME = 'entries_store';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB database');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

export function getEntriesFromDB(): Promise<Entry[]> {
  return new Promise((resolve, reject) => {
    initDB()
      .then((db) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('entries_list');

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          reject(request.error);
        };
      })
      .catch(reject);
  });
}

export function saveEntriesToDB(entries: Entry[]): Promise<void> {
  return new Promise((resolve, reject) => {
    initDB()
      .then((db) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(entries, 'entries_list');

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      })
      .catch(reject);
  });
}

export function clearEntriesInDB(): Promise<void> {
  return new Promise((resolve, reject) => {
    initDB()
      .then((db) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete('entries_list');

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          reject(request.error);
        };
      })
      .catch(reject);
  });
}
