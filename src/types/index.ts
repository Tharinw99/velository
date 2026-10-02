export type GameType = 'html' | 'ruffle' | 'emulatorjs' | 'url';

export interface Game {
  id: string;
  title: string;
  genre: string;
  type: GameType;
  codeOrUrl: string; // HTML markup string, data URI, or URL
  coverUrl?: string;
  originalFileName?: string;
  plays: number;
  isFavorite?: boolean;
  addedAt: number;
  sourceLink?: string;
  description?: string;
  seriesId?: string;
  seriesName?: string;
}

export interface Series {
  id: string;
  name: string;
  gameIds: string[];
  coverUrl?: string;
  createdAt: number;
}

export type SortMode = 'alphabetical' | 'popular';

export interface SanitizedBatchItem {
  id: string;
  rawInput: string;
  detectedType: GameType;
  extractedTitle: string;
  originalFileName?: string;
  extractedUrl?: string;
  sanitizedHtml?: string;
  coverUrl?: string;
  genre: string;
  isValid: boolean;
  sanitizationNotes: string[];
  seriesName?: string;
}
