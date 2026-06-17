import type { DatasetProfile } from '@/types';

const DB_NAME = 'calcsty-data-garage-db-v3';
const DB_VERSION = 1;
const DATASET_STORE = 'datasets';

function openCalcstyDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DATASET_STORE)) {
        db.createObjectStore(DATASET_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Unable to open Calcsty database'));
  });
}

export async function saveDatasetToIndexedDb(dataset: DatasetProfile): Promise<void> {
  const db = await openCalcstyDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DATASET_STORE, 'readwrite');
    const store = transaction.objectStore(DATASET_STORE);
    store.put(dataset);

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      const error = transaction.error ?? new Error('Unable to save dataset');
      db.close();
      reject(error);
    };
  });
}

export async function getDatasetsFromIndexedDb(): Promise<DatasetProfile[]> {
  const db = await openCalcstyDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DATASET_STORE, 'readonly');
    const store = transaction.objectStore(DATASET_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      db.close();
      resolve((request.result as DatasetProfile[]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
    };
    request.onerror = () => {
      const error = request.error ?? new Error('Unable to load datasets');
      db.close();
      reject(error);
    };
  });
}

export async function clearDatasetsFromIndexedDb(): Promise<void> {
  const db = await openCalcstyDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(DATASET_STORE, 'readwrite');
    const store = transaction.objectStore(DATASET_STORE);
    store.clear();

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      const error = transaction.error ?? new Error('Unable to clear datasets');
      db.close();
      reject(error);
    };
  });
}
