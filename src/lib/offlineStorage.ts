/**
 * Offline storage para canciones descargadas.
 * Guarda los blobs (audio + portada) en IndexedDB para reproducción sin conexión.
 *
 * Estructura:
 *  - DB: yusiop-offline (v1)
 *    - store "songs": { id, title, artist, duration_seconds, preview_start_seconds,
 *                       audio_blob: Blob, cover_blob: Blob | null,
 *                       audio_mime, cover_mime, downloaded_at }
 */

const DB_NAME = 'yusiop-offline';
const DB_VERSION = 1;
const SONGS_STORE = 'songs';

export interface OfflineSongMeta {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  preview_start_seconds?: number;
  downloaded_at: string;
  audio_mime: string;
  cover_mime: string | null;
}

export interface OfflineSongRecord extends OfflineSongMeta {
  audio_blob: Blob;
  cover_blob: Blob | null;
}

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible en este navegador'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SONGS_STORE)) {
        db.createObjectStore(SONGS_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
};

const tx = async <T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | Promise<T>
): Promise<T> => {
  const db = await openDB();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(SONGS_STORE, mode);
    const store = transaction.objectStore(SONGS_STORE);
    let result: T;
    Promise.resolve(fn(store))
      .then((r) => {
        if (r && typeof (r as IDBRequest).onsuccess !== 'undefined') {
          (r as IDBRequest).onsuccess = () => {
            result = (r as IDBRequest).result;
          };
          (r as IDBRequest).onerror = () => reject((r as IDBRequest).error);
        } else {
          result = r as T;
        }
      })
      .catch(reject);
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
};

const fetchAsBlob = async (url: string): Promise<{ blob: Blob; mime: string }> => {
  const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!res.ok) throw new Error(`Fetch falló (${res.status}) para ${url}`);
  const blob = await res.blob();
  const mime = blob.type || res.headers.get('content-type') || 'application/octet-stream';
  return { blob, mime };
};

export interface SaveSongInput {
  id: string;
  title: string;
  artist: string;
  duration_seconds: number;
  preview_start_seconds?: number;
  track_url: string;
  cover_url?: string | null;
}

export const saveSongOffline = async (song: SaveSongInput): Promise<void> => {
  const { blob: audio_blob, mime: audio_mime } = await fetchAsBlob(song.track_url);

  let cover_blob: Blob | null = null;
  let cover_mime: string | null = null;
  if (song.cover_url) {
    try {
      const cover = await fetchAsBlob(song.cover_url);
      cover_blob = cover.blob;
      cover_mime = cover.mime;
    } catch {
      // portada opcional: si falla, seguimos
    }
  }

  const record: OfflineSongRecord = {
    id: song.id,
    title: song.title,
    artist: song.artist,
    duration_seconds: song.duration_seconds,
    preview_start_seconds: song.preview_start_seconds,
    downloaded_at: new Date().toISOString(),
    audio_blob,
    audio_mime,
    cover_blob,
    cover_mime,
  };

  await tx('readwrite', (store) => store.put(record));
};

export const getOfflineSong = async (id: string): Promise<OfflineSongRecord | null> => {
  try {
    const record = await tx<OfflineSongRecord | undefined>('readonly', (store) => store.get(id));
    return record ?? null;
  } catch {
    return null;
  }
};

export const hasOfflineSong = async (id: string): Promise<boolean> => {
  const r = await getOfflineSong(id);
  return !!r;
};

export const listOfflineSongs = async (): Promise<OfflineSongRecord[]> => {
  try {
    return await tx<OfflineSongRecord[]>('readonly', (store) => store.getAll());
  } catch {
    return [];
  }
};

export const deleteOfflineSong = async (id: string): Promise<void> => {
  try {
    await tx('readwrite', (store) => store.delete(id));
  } catch {
    // noop
  }
};

export const clearOfflineSongs = async (): Promise<void> => {
  try {
    await tx('readwrite', (store) => store.clear());
  } catch {
    // noop
  }
};

/**
 * Devuelve un object URL para reproducir/mostrar un blob almacenado offline.
 * El llamante es responsable de revocarlo con URL.revokeObjectURL cuando termine.
 */
export const blobUrl = (blob: Blob): string => URL.createObjectURL(blob);
