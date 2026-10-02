import { Game, Series } from '../types';

const DB_NAME = 'veloc_games_db';
const DB_VERSION = 1;
const GAMES_STORE = 'games';
const SERIES_STORE = 'series';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(GAMES_STORE)) {
        db.createObjectStore(GAMES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(SERIES_STORE)) {
        db.createObjectStore(SERIES_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllGamesFromIDB(): Promise<Game[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GAMES_STORE, 'readonly');
      const store = tx.objectStore(GAMES_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not read games from IndexedDB:', err);
    return [];
  }
}

export async function saveAllGamesToIDB(games: Game[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GAMES_STORE, 'readwrite');
      const store = tx.objectStore(GAMES_STORE);
      store.clear();
      for (const game of games) {
        store.put(game);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save games to IndexedDB:', err);
  }
}

export async function saveGameToIDB(game: Game): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(GAMES_STORE, 'readwrite');
      const store = tx.objectStore(GAMES_STORE);
      store.put(game);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save single game to IndexedDB:', err);
  }
}

export async function getAllSeriesFromIDB(): Promise<Series[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SERIES_STORE, 'readonly');
      const store = tx.objectStore(SERIES_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not read series from IndexedDB:', err);
    return [];
  }
}

export async function saveAllSeriesToIDB(seriesList: Series[]): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(SERIES_STORE, 'readwrite');
      const store = tx.objectStore(SERIES_STORE);
      store.clear();
      for (const s of seriesList) {
        store.put(s);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Could not save series to IndexedDB:', err);
  }
}
