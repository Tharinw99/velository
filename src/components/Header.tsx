import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Shuffle,
  Star,
  Lock,
  Maximize2,
  Minimize2,
  MoreVertical,
  HelpCircle,
  Download,
  FolderInput,
  RotateCcw,
  Zap,
  Code2,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface HeaderProps {
  onOpenUpload: () => void;
  onRandomGame: () => void;
  showFavoritesOnly: boolean;
  onToggleFavorites: () => void;
  onCloak: () => void;
  onResetCache: () => void;
  onExportLibrary: () => void;
  onImportLibrary: () => void;
  totalGames: number;
  isDevMode: boolean;
  onToggleDevMode: () => void;
  onDeleteAllGames: () => void;
  onReloadOfficialUgs: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenUpload,
  onRandomGame,
  showFavoritesOnly,
  onToggleFavorites,
  onCloak,
  onResetCache,
  onExportLibrary,
  onImportLibrary,
  totalGames,
  isDevMode,
  onToggleDevMode,
  onDeleteAllGames,
  onReloadOfficialUgs,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Close more menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-[#18181b]/95 backdrop-blur-md border-b border-[#27272a] px-4 md:px-8 flex items-center justify-between transition-all">
        {/* Left: Brand Name, Minimalist Mark, and Dev Mode Tag */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#2563eb] to-[#38bdf8] flex items-center justify-center shadow-sm">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">Veloc</h1>
            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa] border border-[#3f3f46]">
              {totalGames} games
            </span>
          </div>

          {/* Developer Mode Quick Toggle */}
          <button
            onClick={onToggleDevMode}
            title={
              isDevMode
                ? 'Developer Mode Active: Click to turn OFF'
                : 'Developer Mode: Click to turn ON (manage, delete, rename games)'
            }
            className={`ml-2 px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border ${
              isDevMode
                ? 'bg-[#9333ea]/20 text-[#c084fc] border-[#a855f7]/50 shadow-sm shadow-[#a855f7]/20'
                : 'bg-[#27272a] hover:bg-[#3f3f46] text-[#71717a] hover:text-[#d4d4d8] border-transparent'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isDevMode ? 'Dev Mode: ON' : 'Dev Mode'}
            </span>
          </button>
        </div>

        {/* Right: Primary action buttons + More overflow button */}
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* Button 1: Upload games */}
          <button
            onClick={onOpenUpload}
            title="Upload Game (HTML / Text Batch / Add Series)"
            className="w-10 h-10 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] hover:text-white flex items-center justify-center transition border border-transparent hover:border-[#52525b]"
            aria-label="Upload Game"
          >
            <Upload className="w-4 h-4" />
          </button>

          {/* Button 2: Random game picker */}
          <button
            onClick={onRandomGame}
            title="Play Random Game"
            className="w-10 h-10 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] hover:text-white flex items-center justify-center transition border border-transparent hover:border-[#52525b]"
            aria-label="Random Game"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Button 3: Starred / Favorites toggle */}
          <button
            onClick={onToggleFavorites}
            title={showFavoritesOnly ? 'Show All Games' : 'Show Starred Favorites'}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition border ${
              showFavoritesOnly
                ? 'bg-[#ca8a04]/20 text-[#facc15] border-[#eab308]/40'
                : 'bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] hover:text-white border-transparent'
            }`}
            aria-label="Favorites"
          >
            <Star className={`w-4 h-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
          </button>

          {/* Button 4: Panic / Quick Cloak lock */}
          <button
            onClick={onCloak}
            title="Panic / Quick Cloak (Esc)"
            className="w-10 h-10 rounded-xl bg-[#27272a] hover:bg-[#991b1b] text-[#e4e4e7] hover:text-white flex items-center justify-center transition border border-transparent hover:border-[#ef4444]/40"
            aria-label="Quick Cloak"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Button 5: Fullscreen toggle */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="w-10 h-10 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] hover:text-white flex items-center justify-center transition border border-transparent hover:border-[#52525b]"
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Button 6: Help / Info */}
          <button
            onClick={() => setShowHelpDialog(true)}
            title="App Information & Shortcuts"
            className="w-10 h-10 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] hover:text-white flex items-center justify-center transition border border-transparent hover:border-[#52525b]"
            aria-label="Help"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Overflow "More" Button */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowMoreMenu(!showMoreMenu)}
              title="More Options"
              className="w-10 h-10 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#e4e4e7] hover:text-white flex items-center justify-center transition border border-transparent hover:border-[#52525b]"
              aria-label="More Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {/* Material Design 3 Dropdown Menu */}
            {showMoreMenu && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-[#1f1f23] border border-[#2e2e34] shadow-2xl p-1.5 z-50 text-sm">
                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onToggleDevMode();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-[#d4d4d8] hover:bg-[#2a2a30] hover:text-white flex items-center gap-2.5 transition"
                >
                  <Code2 className="w-4 h-4 text-[#c084fc]" />
                  <span>{isDevMode ? 'Disable Developer Mode' : 'Enable Developer Mode'}</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onReloadOfficialUgs();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-[#d4d4d8] hover:bg-[#2a2a30] hover:text-white flex items-center gap-2.5 transition"
                >
                  <RefreshCw className="w-4 h-4 text-[#38bdf8]" />
                  <span>Reload Official Games ({totalGames})</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onExportLibrary();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-[#d4d4d8] hover:bg-[#2a2a30] hover:text-white flex items-center gap-2.5 transition"
                >
                  <Download className="w-4 h-4 text-[#38bdf8]" />
                  <span>Export Backup (JSON)</span>
                </button>

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onImportLibrary();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-[#d4d4d8] hover:bg-[#2a2a30] hover:text-white flex items-center gap-2.5 transition"
                >
                  <FolderInput className="w-4 h-4 text-[#4ade80]" />
                  <span>Import Backup (JSON)</span>
                </button>

                <div className="h-px bg-[#2e2e34] my-1" />

                {isDevMode && (
                  <button
                    onClick={() => {
                      setShowMoreMenu(false);
                      onDeleteAllGames();
                    }}
                    className="w-full px-3 py-2.5 rounded-xl text-left text-[#ef4444] hover:bg-[#7f1d1d]/20 flex items-center gap-2.5 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Wipe All Games</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    setShowMoreMenu(false);
                    onResetCache();
                  }}
                  className="w-full px-3 py-2.5 rounded-xl text-left text-[#ef4444] hover:bg-[#7f1d1d]/20 flex items-center gap-2.5 transition"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset Cache & Cloak</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Info / Help Dialog */}
      {showHelpDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-4">Veloc</h3>

            <div className="space-y-2 text-xs text-[#d4d4d8] mb-6">
              <div className="flex justify-between py-1.5 border-b border-[#27272a]">
                <span className="text-[#71717a]">Developer Mode</span>
                <span className="font-mono bg-[#27272a] px-1.5 py-0.5 rounded text-[#c084fc]">
                  Rename, Delete, Change Covers
                </span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#27272a]">
                <span className="text-[#71717a]">Disguise Mode</span>
                <span className="font-mono bg-[#27272a] px-1.5 py-0.5 rounded">Lock Icon</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#27272a]">
                <span className="text-[#71717a]">Sort Modes</span>
                <span className="font-mono bg-[#27272a] px-1.5 py-0.5 rounded">A-Z / Popular Switch</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#27272a]">
                <span className="text-[#71717a]">Official UGS Library</span>
                <span className="font-mono bg-[#27272a] px-1.5 py-0.5 rounded">
                  2,956 Standalone Unblocked Games
                </span>
              </div>
            </div>

            <button
              onClick={() => setShowHelpDialog(false)}
              className="w-full py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium text-sm transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
