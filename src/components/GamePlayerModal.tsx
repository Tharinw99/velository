import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Maximize2,
  RotateCcw,
  ExternalLink,
  Star,
  Flame,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Game } from '../types';
import { getEmbeddableUrl } from '../utils/sanitizer';

interface GamePlayerModalProps {
  game: Game | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
}

function cleanGameHtml(raw: string, sourceUrl?: string): string {
  // Strip Google Sites gadget tags (<Module> / </Module>)
  let cleaned = raw.replace(/<\/?Module>/gi, '').trim();

  // If there's a sourceUrl and no <base> tag, inject <base> so relative resources resolve
  if (sourceUrl && !cleaned.toLowerCase().includes('<base ')) {
    const baseUrl = sourceUrl.substring(0, sourceUrl.lastIndexOf('/') + 1);
    if (cleaned.toLowerCase().includes('<head>')) {
      cleaned = cleaned.replace(/<head>/i, `<head>\n  <base href="${baseUrl}">`);
    } else if (cleaned.toLowerCase().includes('<html>')) {
      cleaned = cleaned.replace(/<html>/i, `<html>\n<head>\n  <base href="${baseUrl}">\n</head>`);
    }
  }

  return cleaned;
}

export const GamePlayerModal: React.FC<GamePlayerModalProps> = ({
  game,
  onClose,
  onToggleFavorite,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [iframeKey, setIframeKey] = useState(0);
  const [playableHtml, setPlayableHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFsChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
    };

    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const isExternalUrl = useMemo(() => {
    if (!game?.codeOrUrl) return false;
    const str = game.codeOrUrl.trim();
    return str.startsWith('http://') || str.startsWith('https://');
  }, [game?.codeOrUrl]);

  const embedUrl = useMemo(() => {
    if (!game?.codeOrUrl || !isExternalUrl) return null;
    return getEmbeddableUrl(game.codeOrUrl);
  }, [game?.codeOrUrl, isExternalUrl]);

  // Load and sanitize game content (fetches raw HTML from CDNs to execute as srcDoc)
  useEffect(() => {
    if (!game?.codeOrUrl) {
      setPlayableHtml(null);
      setIsLoading(false);
      return;
    }

    const raw = game.codeOrUrl.trim();
    const isUrl = raw.startsWith('http://') || raw.startsWith('https://');

    if (!isUrl) {
      // Already an HTML string
      setPlayableHtml(cleanGameHtml(raw));
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    // It's a URL. Check if it's a standalone HTML file or from UGS CDN
    const isHtmlFileUrl =
      raw.endsWith('.html') ||
      raw.includes('/UGS-Files/') ||
      raw.includes('raw.githubusercontent.com') ||
      raw.includes('.html?');

    if (isHtmlFileUrl) {
      setIsLoading(true);
      setLoadError(null);
      let isCancelled = false;

      fetch(raw)
        .then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to fetch file`);
          return res.text();
        })
        .then(text => {
          if (isCancelled) return;
          const cleaned = cleanGameHtml(text, raw);
          setPlayableHtml(cleaned);
          setIsLoading(false);
        })
        .catch(err => {
          if (isCancelled) return;
          console.warn('Could not fetch HTML directly, falling back to URL embed:', err);
          // If fetch fails (e.g. CORS), fallback to regular URL in iframe src
          setPlayableHtml(null);
          setIsLoading(false);
        });

      return () => {
        isCancelled = true;
      };
    } else {
      // External service embed (e.g. Google Drive preview, interactive web app)
      setPlayableHtml(null);
      setIsLoading(false);
    }
  }, [game?.id, game?.codeOrUrl, iframeKey]);

  if (!game) return null;

  const toggleModalFullscreen = () => {
    if (!modalContainerRef.current) return;
    if (!document.fullscreenElement) {
      modalContainerRef.current.requestFullscreen().catch(() => {
        setIsFullscreen(true);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {
        setIsFullscreen(false);
      });
      setIsFullscreen(false);
    }
  };

  const handleOpenAboutBlank = () => {
    try {
      const win = window.open('about:blank', '_blank');
      if (!win) {
        alert('Please allow popups to open in a new tab.');
        return;
      }
      const doc = win.document;
      doc.open();

      if (playableHtml) {
        // Direct execution of the full game in about:blank
        doc.write(playableHtml);
      } else if (isExternalUrl) {
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Google Docs</title>
            <link rel="icon" href="https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico" />
            <style>
              body, html { margin:0; padding:0; width:100%; height:100%; overflow:hidden; background:#000; }
              iframe { border:none; width:100%; height:100%; display:block; }
            </style>
          </head>
          <body>
            <iframe src="${embedUrl || game.codeOrUrl}" allow="gamepad; autoplay; fullscreen" sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups"></iframe>
          </body>
          </html>
        `);
      } else {
        doc.write(cleanGameHtml(game.codeOrUrl));
      }

      doc.close();
    } catch (err) {
      console.error('About:blank opener failed', err);
    }
  };

  return (
    <div
      ref={modalContainerRef}
      className="fixed inset-0 z-50 flex flex-col bg-black overflow-hidden select-none"
    >
      {/* 
        When isFullscreen is true: 
        The entire header and controls are completely GONE. 
        Only the game is visual! 
      */}
      {!isFullscreen && (
        <div className="h-14 border-b border-[#27272a] px-4 flex items-center justify-between bg-[#121214] shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm md:text-base font-bold text-white tracking-tight truncate max-w-xs md:max-w-md">
              {game.title}
            </h2>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#27272a] text-[#38bdf8] border border-[#3f3f46]">
              {game.genre}
            </span>
            {game.seriesName && (
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                {game.seriesName}
              </span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 md:gap-2">
            {/* Restart */}
            <button
              onClick={() => setIframeKey(prev => prev + 1)}
              title="Restart Game"
              className="w-9 h-9 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#d4d4d8] hover:text-white flex items-center justify-center transition"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {/* Favorite */}
            <button
              onClick={() => onToggleFavorite(game.id)}
              title={game.isFavorite ? 'Remove Favorite' : 'Add to Favorites'}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition ${
                game.isFavorite
                  ? 'bg-[#ca8a04]/20 text-[#facc15]'
                  : 'bg-[#27272a] hover:bg-[#3f3f46] text-[#d4d4d8]'
              }`}
            >
              <Star className={`w-4 h-4 ${game.isFavorite ? 'fill-current' : ''}`} />
            </button>

            {/* Open in about:blank */}
            <button
              onClick={handleOpenAboutBlank}
              title="Open Cloaked Tab (about:blank)"
              className="w-9 h-9 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#38bdf8] flex items-center justify-center transition"
            >
              <ExternalLink className="w-4 h-4" />
            </button>

            {/* Real Fullscreen Button */}
            <button
              onClick={toggleModalFullscreen}
              title="Fullscreen (Hides Header & Bars)"
              className="w-9 h-9 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center justify-center transition shadow-sm"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Close */}
            <button
              onClick={onClose}
              title="Close (Esc)"
              className="w-9 h-9 rounded-xl bg-[#27272a] hover:bg-[#ef4444] text-[#d4d4d8] hover:text-white flex items-center justify-center transition ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Game Screen */}
      <div className="relative flex-1 w-full h-full bg-black overflow-hidden flex items-center justify-center">
        {/* Loading Spinner */}
        {isLoading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0e0e11] text-white">
            <Loader2 className="w-8 h-8 text-[#38bdf8] animate-spin mb-3" />
            <span className="text-sm font-semibold tracking-wide">Loading {game.title}...</span>
            <span className="text-xs text-[#71717a] mt-1">Fetching game file and initializing</span>
          </div>
        )}

        {/* Load Error */}
        {loadError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0e0e11] text-white p-6 text-center">
            <AlertCircle className="w-10 h-10 text-[#ef4444] mb-3" />
            <h3 className="text-base font-semibold mb-1">Failed to launch game</h3>
            <p className="text-xs text-[#a1a1aa] max-w-sm mb-4">{loadError}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIframeKey(k => k + 1)}
                className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-xs font-semibold text-white transition"
              >
                Retry
              </button>
              <button
                onClick={handleOpenAboutBlank}
                className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-xs font-medium text-[#d4d4d8] transition"
              >
                Try Cloaked Tab
              </button>
            </div>
          </div>
        )}

        {/* Game Iframe: Prefer srcDoc with cleaned HTML so Content-Type: text/plain never causes raw text output */}
        {playableHtml ? (
          <iframe
            key={`srcdoc-${iframeKey}`}
            srcDoc={playableHtml}
            title={game.title}
            className="w-full h-full border-0 block"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups allow-modals"
            allow="gamepad; autoplay; fullscreen"
          />
        ) : isExternalUrl ? (
          <iframe
            key={`url-${iframeKey}`}
            src={embedUrl || game.codeOrUrl}
            title={game.title}
            className="w-full h-full border-0 block"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups allow-modals"
            allow="gamepad; autoplay; fullscreen"
          />
        ) : (
          <iframe
            key={`fallback-${iframeKey}`}
            srcDoc={cleanGameHtml(game.codeOrUrl)}
            title={game.title}
            className="w-full h-full border-0 block"
            sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups allow-modals"
            allow="gamepad; autoplay; fullscreen"
          />
        )}
      </div>

      {/* Bottom Bar (Only shown when not fullscreen) */}
      {!isFullscreen && (
        <div className="h-8 border-t border-[#27272a] px-4 flex items-center justify-between bg-[#121214] text-[11px] text-[#71717a] shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-[#f59e0b]" />
              {game.plays.toLocaleString()} plays
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span>Press Esc to close</span>
          </div>
        </div>
      )}
    </div>
  );
};
