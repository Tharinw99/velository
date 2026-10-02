import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Game, SortMode, Series } from './types';
import {
  loadStoredGames,
  saveGamesToStorage,
  loadStoredSeries,
  saveSeriesToStorage,
  hydrateFromIndexedDB,
  recordGamePlay,
  toggleFavoriteGame,
  getDevModeEnabled,
  setDevModeEnabled,
  deleteGameFromStorage,
  deleteAllGamesFromStorage,
  updateGameInStorage,
  getDefaultUgsGames,
} from './services/storage';
import {
  initAuth,
  testConnection,
  subscribeToGames,
  subscribeToSeries,
  batchSaveGamesToFirebase,
  updateGameInFirebase,
  saveSeriesToFirebase,
  deleteGameFromFirebase,
  deleteAllGamesFromFirebase,
} from './services/firebase';
import { isArchiveUnlocked, setArchiveUnlocked } from './utils/cloakCodes';
import { CloakScreen } from './components/CloakScreen';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { SeriesSection } from './components/SeriesSection';
import { GameCard } from './components/GameCard';
import { GamePlayerModal } from './components/GamePlayerModal';
import { UploadModal } from './components/UploadModal';
import { DevEditModal } from './components/DevEditModal';
import { Layers, ChevronDown, Code2 } from 'lucide-react';

export default function App() {
  // Cloak state
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => isArchiveUnlocked());

  // Game archive state
  const [games, setGames] = useState<Game[]>(() => loadStoredGames());
  const [seriesList, setSeriesList] = useState<Series[]>(() => loadStoredSeries());
  const [selectedSeries, setSelectedSeries] = useState<Series | null>(null);

  // Developer Mode state
  const [isDevMode, setIsDevMode] = useState<boolean>(() => getDevModeEnabled());
  const [devEditingGame, setDevEditingGame] = useState<Game | null>(null);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('ALL');
  const [sortMode, setSortMode] = useState<SortMode>('alphabetical');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Pagination / Load More state (50 games per batch)
  const [visibleCount, setVisibleCount] = useState(50);

  // Modals state
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync games state to local storage whenever it changes
  useEffect(() => {
    saveGamesToStorage(games);
  }, [games]);

  // Sync series state to local storage whenever it changes
  useEffect(() => {
    saveSeriesToStorage(seriesList);
  }, [seriesList]);

  // Asynchronously hydrate high-capacity storage from IndexedDB on boot
  useEffect(() => {
    hydrateFromIndexedDB().then(({ games: idbGames, series: idbSeries }) => {
      if (idbGames && idbGames.length > 0) {
        setGames(prev => {
          const map = new Map<string, Game>();
          prev.forEach(g => map.set(g.id, g));
          idbGames.forEach(g => {
            const existing = map.get(g.id);
            if (!existing || (!existing.codeOrUrl && g.codeOrUrl)) {
              map.set(g.id, g);
            }
          });
          return Array.from(map.values());
        });
      }
      if (idbSeries && idbSeries.length > 0) {
        setSeriesList(prev => (prev.length > 0 ? prev : idbSeries));
      }
    });
  }, []);

  // Initialize Firebase and subscribe to real-time updates for games and series
  useEffect(() => {
    initAuth().then(() => {
      testConnection();
    });

    try {
      const unsubGames = subscribeToGames(remoteGames => {
        if (remoteGames && remoteGames.length > 0) {
          setGames(prevLocal => {
            const map = new Map<string, Game>();
            prevLocal.forEach(g => map.set(g.id, g));
            remoteGames.forEach(rg => {
              const local = map.get(rg.id);
              if (local && local.codeOrUrl && !rg.codeOrUrl) {
                map.set(rg.id, { ...rg, codeOrUrl: local.codeOrUrl });
              } else {
                map.set(rg.id, rg);
              }
            });
            const merged = Array.from(map.values());
            saveGamesToStorage(merged);
            return merged;
          });
        }
      });

      const unsubSeries = subscribeToSeries(remoteSeries => {
        if (remoteSeries && remoteSeries.length > 0) {
          setSeriesList(prevLocal => {
            const map = new Map<string, Series>();
            prevLocal.forEach(s => map.set(s.id, s));
            remoteSeries.forEach(s => map.set(s.id, s));
            const merged = Array.from(map.values());
            saveSeriesToStorage(merged);
            return merged;
          });
        }
      });

      return () => {
        unsubGames();
        unsubSeries();
      };
    } catch (err) {
      console.warn('Firebase real-time sync offline or initializing:', err);
    }
  }, []);

  // Extract distinct genres
  const genres = useMemo(() => {
    const set = new Set<string>();
    games.forEach(g => set.add(g.genre));
    return Array.from(set);
  }, [games]);

  // Filter & Sort Pipeline
  const filteredAndSortedGames = useMemo(() => {
    return games
      .filter(game => {
        if (selectedSeries) {
          const inSeries =
            selectedSeries.gameIds.includes(game.id) ||
            game.seriesId === selectedSeries.id ||
            game.seriesName === selectedSeries.name;
          if (!inSeries) return false;
        }

        if (showFavoritesOnly && !game.isFavorite) return false;

        if (selectedGenre !== 'ALL' && game.genre !== selectedGenre) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchTitle = game.title.toLowerCase().includes(q);
          const matchGenre = game.genre.toLowerCase().includes(q);
          const matchSeries = game.seriesName?.toLowerCase().includes(q) || false;
          if (!matchTitle && !matchGenre && !matchSeries) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortMode === 'popular') {
          return (b.plays || 0) - (a.plays || 0);
        }
        return a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: 'base' });
      });
  }, [games, selectedSeries, showFavoritesOnly, selectedGenre, searchQuery, sortMode]);

  const displayedGames = useMemo(() => {
    return filteredAndSortedGames.slice(0, visibleCount);
  }, [filteredAndSortedGames, visibleCount]);

  const hasMoreGames = visibleCount < filteredAndSortedGames.length;

  // Handlers
  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  const handleCloak = () => {
    setIsUnlocked(false);
  };

  const handleToggleDevMode = () => {
    setIsDevMode(prev => {
      const next = !prev;
      setDevModeEnabled(next);
      return next;
    });
  };

  const handleDeleteGame = (game: Game) => {
    if (window.confirm(`Permanently delete "${game.title}"?`)) {
      setGames(prev => prev.filter(g => g.id !== game.id));
      deleteGameFromStorage(game.id);
      deleteGameFromFirebase(game.id).catch(err => {
        console.warn('Failed to delete game from Firebase:', err);
      });
    }
  };

  const handleDeleteAllGames = () => {
    if (
      window.confirm(
        'WARNING: Are you sure you want to delete ALL games from the archive and Firebase? This cannot be undone.'
      )
    ) {
      setGames([]);
      deleteAllGamesFromStorage();
      deleteAllGamesFromFirebase().catch(err => {
        console.warn('Failed to wipe all games from Firebase:', err);
      });
    }
  };

  const handleReloadOfficialUgs = () => {
    const ugs = getDefaultUgsGames();
    setGames(ugs);
    saveGamesToStorage(ugs);
    alert(`Successfully loaded ${ugs.length} official games from UGS Files!`);
  };

  const handleSaveDevGameEdit = (
    gameId: string,
    updates: { title: string; coverUrl?: string; genre: string }
  ) => {
    setGames(prev =>
      prev.map(g => (g.id === gameId ? { ...g, ...updates } : g))
    );
    updateGameInStorage(gameId, updates);
    const targetGame = games.find(g => g.id === gameId);
    updateGameInFirebase(gameId, updates, targetGame).catch(err => {
      console.warn('Failed to update game in Firebase:', err);
    });
  };

  const handleResetCache = () => {
    if (window.confirm('Reset all cache and re-lock archive to disguise timer?')) {
      setArchiveUnlocked(false);
      setIsUnlocked(false);
      localStorage.clear();
      setGames(loadStoredGames());
      setSeriesList(loadStoredSeries());
    }
  };

  const handlePlayGame = (game: Game) => {
    recordGamePlay(game.id);
    const updatedPlays = (game.plays || 0) + 1;
    setGames(prev =>
      prev.map(g => (g.id === game.id ? { ...g, plays: updatedPlays } : g))
    );
    updateGameInFirebase(game.id, { plays: updatedPlays }, game).catch(() => {});
    setActiveGame(game);
  };

  const handleToggleFavorite = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStatus = toggleFavoriteGame(id);
    setGames(prev =>
      prev.map(g => (g.id === id ? { ...g, isFavorite: newStatus } : g))
    );
    const targetGame = games.find(g => g.id === id);
    updateGameInFirebase(id, { isFavorite: newStatus }, targetGame).catch(() => {});
    if (activeGame && activeGame.id === id) {
      setActiveGame(prev => (prev ? { ...prev, isFavorite: newStatus } : null));
    }
  };

  const handleRandomGame = () => {
    if (filteredAndSortedGames.length === 0) return;
    const random = filteredAndSortedGames[Math.floor(Math.random() * filteredAndSortedGames.length)];
    handlePlayGame(random);
  };

  const handleSaveUploadedGames = (newGames: Game[]) => {
    setGames(prev => [...newGames, ...prev]);
    batchSaveGamesToFirebase(newGames).catch(err => {
      console.warn('Firebase batch upload saved locally, remote sync error:', err);
    });
  };

  const handleSaveSeries = (newSeries: Series, updatedGames?: Game[]) => {
    setSeriesList(prev => [newSeries, ...prev.filter(s => s.id !== newSeries.id)]);
    if (updatedGames) {
      setGames(updatedGames);
      batchSaveGamesToFirebase(updatedGames).catch(() => {});
    }
    saveSeriesToFirebase(newSeries).catch(err => {
      console.warn('Failed to save series to Firebase:', err);
    });
    setSelectedSeries(newSeries);
  };

  const handleExportLibrary = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ games, series: seriesList }, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', 'veloc_backup.json');
    dlAnchor.click();
  };

  const handleImportLibrary = () => {
    fileInputRef.current?.click();
  };

  const handleFileImportChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (Array.isArray(parsed)) {
          setGames(parsed);
          alert(`Successfully imported ${parsed.length} games into Veloc!`);
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed.games)) setGames(parsed.games);
          if (Array.isArray(parsed.series)) setSeriesList(parsed.series);
          alert('Successfully imported backup into Veloc!');
        }
      } catch {
        alert('Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // If Cloaked: render disguised timer screen
  if (!isUnlocked) {
    return <CloakScreen onUnlock={handleUnlock} />;
  }

  // If Unlocked: render Veloc Game Archive
  return (
    <div className="min-h-screen bg-[#0f0f12] text-[#f4f4f5] flex flex-col font-sans selection:bg-[#38bdf8]/30">
      {/* Header */}
      <Header
        onOpenUpload={() => setIsUploadOpen(true)}
        onRandomGame={handleRandomGame}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavorites={() => setShowFavoritesOnly(prev => !prev)}
        onCloak={handleCloak}
        onResetCache={handleResetCache}
        onExportLibrary={handleExportLibrary}
        onImportLibrary={handleImportLibrary}
        totalGames={games.length}
        isDevMode={isDevMode}
        onToggleDevMode={handleToggleDevMode}
        onDeleteAllGames={handleDeleteAllGames}
        onReloadOfficialUgs={handleReloadOfficialUgs}
      />

      {/* Hidden File Input for JSON import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileImportChange}
        accept=".json"
        className="hidden"
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-8 py-6 space-y-6">
        {/* Developer Mode Active Banner */}
        {isDevMode && (
          <div className="bg-[#9333ea]/15 border border-[#a855f7]/40 rounded-2xl p-3.5 flex items-center justify-between text-xs text-[#d8b4fe]">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-[#a855f7] text-[#0f172a] flex items-center justify-center font-bold">
                <Code2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <span className="font-bold text-white">Developer Mode is Active:</span>
                <span className="ml-1 text-[#d8b4fe]">
                  Hover or tap any game card to Rename, Change 512x512 Cover, or Delete.
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReloadOfficialUgs}
                className="px-3 py-1 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-white font-medium transition"
              >
                Reload UGS Games
              </button>
              <button
                onClick={handleDeleteAllGames}
                className="px-3 py-1 rounded-xl bg-[#ef4444]/20 hover:bg-[#ef4444] text-[#ef4444] hover:text-white font-medium transition"
              >
                Wipe All
              </button>
            </div>
          </div>
        )}

        {/* Search Bar & Filter Section */}
        <div className="bg-[#141417] border border-[#27272a] rounded-2xl p-3 md:p-4 shadow-sm">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedGenre={selectedGenre}
            onGenreChange={setSelectedGenre}
            sortMode={sortMode}
            onSortModeChange={setSortMode}
            genres={genres}
          />
        </div>

        {/* Series Section (Positioned directly above games section) */}
        <SeriesSection
          seriesList={seriesList}
          selectedSeries={selectedSeries}
          onSelectSeries={setSelectedSeries}
          onOpenUploadSeries={() => setIsUploadOpen(true)}
        />

        {/* Results Counter */}
        <div className="flex items-center justify-between text-xs text-[#a1a1aa] px-1">
          <div className="flex items-center gap-2">
            <span>
              {displayedGames.length} of {filteredAndSortedGames.length} games
            </span>
            {selectedSeries && (
              <span className="px-2 py-0.5 rounded-full bg-[#38bdf8]/15 text-[#38bdf8] font-semibold">
                Series: {selectedSeries.name}
              </span>
            )}
            {selectedGenre !== 'ALL' && (
              <span className="px-2 py-0.5 rounded-full bg-[#27272a] text-[#38bdf8] font-medium">
                {selectedGenre}
              </span>
            )}
            {showFavoritesOnly && (
              <span className="px-2 py-0.5 rounded-full bg-[#ca8a04]/20 text-[#facc15] font-medium">
                Starred
              </span>
            )}
          </div>
        </div>

        {/* Games Grid (512x512 Square Cards) */}
        {displayedGames.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 md:gap-4.5">
            {displayedGames.map(game => (
              <GameCard
                key={game.id}
                game={game}
                onPlay={handlePlayGame}
                onToggleFavorite={handleToggleFavorite}
                isDevMode={isDevMode}
                onRename={() => setDevEditingGame(game)}
                onChangeCover={() => setDevEditingGame(game)}
                onDelete={() => handleDeleteGame(game)}
              />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-center p-6 bg-[#141417] border border-[#27272a] rounded-2xl">
            <Layers className="w-12 h-12 text-[#52525b] mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">Archive is empty</h3>
            <p className="text-xs text-[#71717a] max-w-sm mb-4">
              All previous games were deleted. Click below to load all 2,956 official UGS games or upload your own.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={handleReloadOfficialUgs}
                className="px-5 py-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-xs font-semibold rounded-xl text-white transition shadow-sm"
              >
                Load Official UGS Games (2,956)
              </button>
              <button
                onClick={() => setIsUploadOpen(true)}
                className="px-5 py-2.5 bg-[#27272a] hover:bg-[#3f3f46] text-xs font-medium rounded-xl text-[#d4d4d8] transition"
              >
                Upload Custom Games
              </button>
            </div>
          </div>
        ) : (
          <div className="py-20 flex flex-col items-center justify-center text-center p-6 bg-[#141417] border border-[#27272a] rounded-2xl">
            <Layers className="w-12 h-12 text-[#52525b] mb-3" />
            <h3 className="text-base font-semibold text-white mb-1">No matching games</h3>
            <p className="text-xs text-[#71717a] max-w-sm mb-4">
              {selectedSeries
                ? `No games found in the "${selectedSeries.name}" series matching your filters.`
                : 'No games matched your current filters.'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedGenre('ALL');
                setSelectedSeries(null);
                setShowFavoritesOnly(false);
              }}
              className="px-4 py-2 bg-[#27272a] hover:bg-[#3f3f46] text-xs font-medium rounded-xl text-white transition"
            >
              Reset Filters
            </button>
          </div>
        )}

        {/* Load More Button (Appears every 50 games) */}
        {hasMoreGames && (
          <div className="flex justify-center pt-4 pb-8">
            <button
              onClick={() => setVisibleCount(prev => prev + 50)}
              className="px-8 py-3 rounded-2xl bg-[#1f1f23] hover:bg-[#27272a] border border-[#2e2e34] text-xs font-semibold text-white flex items-center gap-2 shadow-sm transition hover:scale-102"
            >
              <span>Load More</span>
              <ChevronDown className="w-4 h-4 text-[#38bdf8]" />
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="h-12 border-t border-[#27272a] px-4 md:px-8 flex items-center justify-between text-xs text-[#71717a] bg-[#121214]">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#a1a1aa]">Veloc</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCloak}
            className="text-[11px] text-[#38bdf8] hover:underline"
          >
            Disguise Mode
          </button>
        </div>
      </footer>

      {/* Game Player Modal */}
      <GamePlayerModal
        game={activeGame}
        onClose={() => setActiveGame(null)}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* Upload & Series 3-Step Modal */}
      {isUploadOpen && (
        <UploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onSaveGames={handleSaveUploadedGames}
          existingGames={games}
          onSaveSeries={handleSaveSeries}
        />
      )}

      {/* Developer Mode Game Editor Modal */}
      <DevEditModal
        game={devEditingGame}
        isOpen={!!devEditingGame}
        onClose={() => setDevEditingGame(null)}
        onSave={handleSaveDevGameEdit}
        onDelete={id => {
          const target = games.find(g => g.id === id);
          if (target) handleDeleteGame(target);
        }}
      />
    </div>
  );
}
