import { Game, Series } from '../types';
import {
  saveAllGamesToIDB,
  getAllGamesFromIDB,
  saveAllSeriesToIDB,
  getAllSeriesFromIDB,
  saveGameToIDB,
} from './indexedDb';
import ugsGamesData from '../data/ugsGames.json';

const STORAGE_KEY = 'veloc_user_games_v2';
const SERIES_STORAGE_KEY = 'veloc_user_series_v2';
const DEV_MODE_KEY = 'veloc_dev_mode';

// In-memory cache for synchronous access
let inMemoryGames: Game[] = [];
let inMemorySeries: Series[] = [];

export function getDefaultUgsGames(): Game[] {
  return (ugsGamesData as unknown as Game[]) || [];
}

export function loadStoredGames(): Game[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      if (inMemoryGames.length > 0) return inMemoryGames;
      // Default initialize with official UGS games
      const defaults = getDefaultUgsGames();
      inMemoryGames = defaults;
      return defaults;
    }
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) && parsed.length > 0 ? parsed : getDefaultUgsGames();
    inMemoryGames = list;
    return list;
  } catch (err) {
    console.warn('Failed to load games from localStorage cache:', err);
    return inMemoryGames.length > 0 ? inMemoryGames : getDefaultUgsGames();
  }
}

export async function hydrateFromIndexedDB(): Promise<{ games: Game[]; series: Series[] }> {
  try {
    const [idbGames, idbSeries] = await Promise.all([
      getAllGamesFromIDB(),
      getAllSeriesFromIDB(),
    ]);

    if (idbGames && idbGames.length > 0) {
      inMemoryGames = idbGames;
    } else if (inMemoryGames.length === 0) {
      inMemoryGames = getDefaultUgsGames();
      saveAllGamesToIDB(inMemoryGames).catch(() => {});
    }

    if (idbSeries && idbSeries.length > 0) {
      inMemorySeries = idbSeries;
    }

    return { games: inMemoryGames, series: inMemorySeries };
  } catch (err) {
    console.warn('Error hydrating from IndexedDB:', err);
    return {
      games: inMemoryGames.length > 0 ? inMemoryGames : getDefaultUgsGames(),
      series: inMemorySeries,
    };
  }
}

export function saveGamesToStorage(games: Game[]): void {
  inMemoryGames = games;

  // 1. Save full game payload into IndexedDB (virtually unlimited quota)
  saveAllGamesToIDB(games).catch(err => {
    console.warn('IndexedDB write error:', err);
  });

  // 2. Safely attempt localStorage write with quota overflow protection
  try {
    // For large collections (thousands of games), store index metadata in localStorage
    const lightweight = games.map(g => ({
      id: g.id,
      title: g.title,
      genre: g.genre,
      type: g.type,
      codeOrUrl: g.codeOrUrl && g.codeOrUrl.length > 2000 ? '' : g.codeOrUrl,
      coverUrl: g.coverUrl,
      originalFileName: g.originalFileName,
      plays: g.plays || 0,
      isFavorite: !!g.isFavorite,
      addedAt: g.addedAt || Date.now(),
      seriesId: g.seriesId,
      seriesName: g.seriesName,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lightweight));
  } catch (err) {
    console.warn('LocalStorage quota reached; data fully preserved in IndexedDB.');
  }
}

export function updateGameInStorage(gameId: string, partial: Partial<Game>): void {
  inMemoryGames = inMemoryGames.map(g => (g.id === gameId ? { ...g, ...partial } : g));
  saveGamesToStorage(inMemoryGames);
}

export function deleteGameFromStorage(gameId: string): void {
  inMemoryGames = inMemoryGames.filter(g => g.id !== gameId);
  saveGamesToStorage(inMemoryGames);
}

export function deleteAllGamesFromStorage(): void {
  inMemoryGames = [];
  inMemorySeries = [];
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(SERIES_STORAGE_KEY);
  } catch {}
  saveAllGamesToIDB([]).catch(() => {});
  saveAllSeriesToIDB([]).catch(() => {});
}

export function loadStoredSeries(): Series[] {
  try {
    const raw = localStorage.getItem(SERIES_STORAGE_KEY);
    if (!raw) return inMemorySeries;
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    inMemorySeries = list;
    return list;
  } catch (err) {
    console.warn('Failed to load series from localStorage:', err);
    return inMemorySeries;
  }
}

export function saveSeriesToStorage(seriesList: Series[]): void {
  inMemorySeries = seriesList;

  saveAllSeriesToIDB(seriesList).catch(err => {
    console.warn('IndexedDB series write error:', err);
  });

  try {
    localStorage.setItem(SERIES_STORAGE_KEY, JSON.stringify(seriesList));
  } catch (err) {
    console.warn('LocalStorage series quota reached, preserved in IndexedDB:', err);
  }
}

export function recordGamePlay(gameId: string): void {
  const target = inMemoryGames.find(g => g.id === gameId);
  if (target) {
    target.plays = (target.plays || 0) + 1;
    saveGameToIDB(target).catch(() => {});
  }
}

export function toggleFavoriteGame(gameId: string): boolean {
  const target = inMemoryGames.find(g => g.id === gameId);
  if (target) {
    target.isFavorite = !target.isFavorite;
    saveGameToIDB(target).catch(() => {});
    return !!target.isFavorite;
  }
  return false;
}

export function getDevModeEnabled(): boolean {
  try {
    return localStorage.getItem(DEV_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setDevModeEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(DEV_MODE_KEY, enabled ? 'true' : 'false');
  } catch {}
}
