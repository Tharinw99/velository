import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  collection,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Game, Series } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Connection test
export async function testConnection(): Promise<void> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
    }
  }
}

// Initialize Auth
export async function initAuth(): Promise<void> {
  return new Promise(resolve => {
    const unsubscribe = auth.onAuthStateChanged(() => {
      unsubscribe();
      resolve();
    });
  });
}

const CHUNK_SIZE = 500_000;

// Save a game to Firestore with chunking for large games (> 800 KB)
export async function saveGameToFirebase(game: Game): Promise<void> {
  const path = `games/${game.id}`;
  try {
    const isLarge =
      typeof game.codeOrUrl === 'string' && game.codeOrUrl.length > 800_000;

    if (isLarge) {
      const fullCode = game.codeOrUrl;
      const numChunks = Math.ceil(fullCode.length / CHUNK_SIZE);

      // Write parent document with isChunked: true and codeOrUrl: '' to stay well under 1MB limit
      await setDoc(doc(db, 'games', game.id), {
        title: game.title,
        genre: game.genre,
        type: game.type,
        codeOrUrl: '',
        isChunked: true,
        totalChunks: numChunks,
        coverUrl: game.coverUrl || '',
        originalFileName: game.originalFileName || '',
        plays: game.plays || 0,
        isFavorite: !!game.isFavorite,
        addedAt: game.addedAt || Date.now(),
        seriesId: game.seriesId || '',
        seriesName: game.seriesName || '',
        sourceLink: game.sourceLink || '',
      });

      // Write chunks to subcollection
      for (let i = 0; i < numChunks; i++) {
        const chunkData = fullCode.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const chunkRef = doc(db, 'games', game.id, 'chunks', `c-${i}`);
        await setDoc(chunkRef, {
          chunkIndex: i,
          data: chunkData,
        });
      }
    } else {
      // Standard game document (under 800 KB)
      await setDoc(doc(db, 'games', game.id), {
        title: game.title,
        genre: game.genre,
        type: game.type,
        codeOrUrl: game.codeOrUrl || '',
        isChunked: false,
        coverUrl: game.coverUrl || '',
        originalFileName: game.originalFileName || '',
        plays: game.plays || 0,
        isFavorite: !!game.isFavorite,
        addedAt: game.addedAt || Date.now(),
        seriesId: game.seriesId || '',
        seriesName: game.seriesName || '',
        sourceLink: game.sourceLink || '',
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Hydrate chunked game from subcollection
export async function hydrateChunkedGame(game: Game): Promise<Game> {
  try {
    const chunksSnap = await getDocs(collection(db, 'games', game.id, 'chunks'));
    if (!chunksSnap.empty) {
      const chunks: Array<{ chunkIndex: number; data: string }> = [];
      chunksSnap.forEach(c => {
        const cd = c.data();
        chunks.push({ chunkIndex: cd.chunkIndex ?? 0, data: cd.data || '' });
      });
      chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
      const reassembled = chunks.map(c => c.data).join('');
      return { ...game, codeOrUrl: reassembled };
    }
  } catch (err) {
    console.warn(`Could not hydrate chunks for game ${game.id}:`, err);
  }
  return game;
}

// Save Series to Firestore
export async function saveSeriesToFirebase(series: Series): Promise<void> {
  const path = `series/${series.id}`;
  try {
    await setDoc(doc(db, 'series', series.id), {
      name: series.name,
      gameIds: series.gameIds || [],
      coverUrl: series.coverUrl || '',
      createdAt: series.createdAt || Date.now(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Real-time listener for Series
export function subscribeToSeries(callback: (seriesList: Series[]) => void): () => void {
  const path = 'series';
  return onSnapshot(
    collection(db, path),
    snapshot => {
      const list: Series[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || '',
          gameIds: data.gameIds || [],
          coverUrl: data.coverUrl,
          createdAt: data.createdAt || Date.now(),
        });
      });
      callback(list);
    },
    error => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// Batch save multiple games
export async function batchSaveGamesToFirebase(games: Game[]): Promise<void> {
  for (const game of games) {
    try {
      await saveGameToFirebase(game);
    } catch (err) {
      console.warn(`Error writing game ${game.title} to Firebase:`, err);
    }
  }
}

// Update game fields (plays, isFavorite, title, coverUrl)
export async function updateGameInFirebase(
  gameId: string,
  partial: Partial<Game>,
  fullGame?: Game
): Promise<void> {
  const path = `games/${gameId}`;
  try {
    if (fullGame) {
      await setDoc(
        doc(db, 'games', gameId),
        {
          title: fullGame.title,
          genre: fullGame.genre,
          type: fullGame.type,
          codeOrUrl:
            fullGame.codeOrUrl && fullGame.codeOrUrl.length > 800_000
              ? ''
              : fullGame.codeOrUrl || '',
          coverUrl: fullGame.coverUrl || '',
          originalFileName: fullGame.originalFileName || '',
          plays: partial.plays !== undefined ? partial.plays : fullGame.plays || 0,
          isFavorite:
            partial.isFavorite !== undefined ? partial.isFavorite : !!fullGame.isFavorite,
          addedAt: fullGame.addedAt || Date.now(),
          seriesId: fullGame.seriesId || '',
          seriesName: fullGame.seriesName || '',
          sourceLink: fullGame.sourceLink || '',
          ...partial,
        },
        { merge: true }
      );
    } else {
      await setDoc(doc(db, 'games', gameId), partial, { merge: true });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Delete a single game and its chunks from Firestore
export async function deleteGameFromFirebase(gameId: string): Promise<void> {
  const path = `games/${gameId}`;
  try {
    // Delete any subcollection chunks
    try {
      const chunksSnap = await getDocs(collection(db, 'games', gameId, 'chunks'));
      for (const c of chunksSnap.docs) {
        await deleteDoc(doc(db, 'games', gameId, 'chunks', c.id));
      }
    } catch {}

    await deleteDoc(doc(db, 'games', gameId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Delete all games from Firestore
export async function deleteAllGamesFromFirebase(): Promise<void> {
  const path = 'games';
  try {
    const snap = await getDocs(collection(db, path));
    for (const d of snap.docs) {
      await deleteGameFromFirebase(d.id);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Fetch all games from Firestore
export async function fetchGamesFromFirebase(): Promise<Game[]> {
  const path = 'games';
  try {
    const snap = await getDocs(collection(db, path));
    const list: Game[] = [];
    for (const d of snap.docs) {
      const data = d.data();
      let game: Game = {
        id: d.id,
        title: data.title || '',
        genre: data.genre || 'Action',
        type: data.type || 'html',
        codeOrUrl: data.codeOrUrl || '',
        coverUrl: data.coverUrl,
        originalFileName: data.originalFileName,
        plays: data.plays || 0,
        isFavorite: data.isFavorite,
        addedAt: data.addedAt || Date.now(),
        seriesId: data.seriesId,
        seriesName: data.seriesName,
        sourceLink: data.sourceLink,
      };

      if (data.isChunked && !game.codeOrUrl) {
        game = await hydrateChunkedGame(game);
      }
      list.push(game);
    }
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return [];
  }
}

// Real-time listener for Games
export function subscribeToGames(callback: (games: Game[]) => void): () => void {
  const path = 'games';
  return onSnapshot(
    collection(db, path),
    snapshot => {
      const list: Game[] = [];
      snapshot.forEach(d => {
        const data = d.data();
        list.push({
          id: d.id,
          title: data.title || '',
          genre: data.genre || 'Action',
          type: data.type || 'html',
          codeOrUrl: data.codeOrUrl || '',
          coverUrl: data.coverUrl,
          originalFileName: data.originalFileName,
          plays: data.plays || 0,
          isFavorite: data.isFavorite,
          addedAt: data.addedAt || Date.now(),
          seriesId: data.seriesId,
          seriesName: data.seriesName,
          sourceLink: data.sourceLink,
        });
      });
      callback(list);
    },
    error => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}
