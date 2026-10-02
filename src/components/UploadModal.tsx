import React, { useState, useMemo } from 'react';
import {
  X,
  Upload,
  FileCode,
  FileText,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  Image,
  ArrowRight,
  ArrowLeft,
  Trash2,
  ExternalLink,
  Link,
  Loader2,
  Download,
  Layers,
  Search,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { Game, SanitizedBatchItem, GameType, Series } from '../types';
import {
  sanitizeHtmlGameCode,
  detectGameType,
  parseGoogleDocLine,
  parseClipboardHtml,
  downloadGameFromLink,
  generateDefaultCoverSvg,
  generateSeriesCollageSvg,
  unwrapGoogleRedirect,
} from '../utils/sanitizer';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveGames: (newGames: Game[]) => void;
  existingGames: Game[];
  onSaveSeries: (newSeries: Series, updatedGames?: Game[]) => void;
}

const AVAILABLE_GENRES = [
  'Action',
  'Arcade',
  'Puzzle',
  'Sports',
  'Retro',
  'Strategy',
  'Casual',
  'Flash Classic',
];

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSaveGames,
  existingGames,
  onSaveSeries,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [uploadSourceMode, setUploadSourceMode] = useState<'text' | 'files' | 'series'>('text');

  // Input states
  const [pastedDocText, setPastedDocText] = useState('');
  const [queuedItems, setQueuedItems] = useState<SanitizedBatchItem[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgressMsg, setDownloadProgressMsg] = useState('');

  // Series Creation State (Option 3)
  const [seriesName, setSeriesName] = useState('');
  const [seriesSubMode, setSeriesSubMode] = useState<'existing' | 'upload'>('existing');
  const [selectedExistingGameIds, setSelectedExistingGameIds] = useState<string[]>([]);
  const [seriesGameSearch, setSeriesGameSearch] = useState('');

  // --- SERIES MEMOS (Unconditionally declared at top) ---
  const filteredExistingGames = useMemo(() => {
    if (!seriesGameSearch.trim()) return existingGames;
    const q = seriesGameSearch.toLowerCase();
    return existingGames.filter(g => g.title.toLowerCase().includes(q));
  }, [existingGames, seriesGameSearch]);

  const seriesCollageCovers = useMemo(() => {
    let covers: string[] = [];
    if (seriesSubMode === 'existing') {
      const selected = existingGames.filter(g => selectedExistingGameIds.includes(g.id));
      covers = selected.map(g => g.coverUrl || generateDefaultCoverSvg(g.title, g.genre));
    } else {
      covers = queuedItems.map(i => i.coverUrl || generateDefaultCoverSvg(i.extractedTitle || 'Game', i.genre));
    }
    const shuffled = [...covers].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  }, [seriesSubMode, selectedExistingGameIds, existingGames, queuedItems]);

  // Intercept paste event to capture rich clipboard HTML from Google Docs
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const htmlData = e.clipboardData.getData('text/html');
    const plainText = e.clipboardData.getData('text/plain');

    // If HTML contains hyperlinks from Google Docs
    if (htmlData && htmlData.includes('href=')) {
      e.preventDefault();
      const parsedFromHtml = parseClipboardHtml(htmlData);
      if (parsedFromHtml.length > 0) {
        // Construct clear text preview with URLs
        const textWithLinks = parsedFromHtml
          .map(p => `${p.title}: ${p.filename} ${p.url || ''}`)
          .join('\n');
        setPastedDocText(textWithLinks);

        const newItems: SanitizedBatchItem[] = parsedFromHtml.map((p, idx) => ({
          id: 'clip-' + Date.now() + '-' + idx,
          rawInput: `${p.title}: ${p.filename} ${p.url || ''}`,
          detectedType: detectGameType('', p.filename),
          extractedTitle: p.title,
          originalFileName: p.filename,
          extractedUrl: p.url,
          sanitizedHtml: '',
          genre: 'Action',
          isValid: true,
          sanitizationNotes: p.url
            ? [`Link pulled: ${p.url}`]
            : ['No link attached in HTML'],
        }));
        setQueuedItems(newItems);
        return;
      }
    }

    // Fallback: Check plain text for URLs
    if (plainText) {
      setTimeout(() => {
        handleTextChange(plainText);
      }, 10);
    }
  };

  // Plain text changes
  const handleTextChange = (text: string) => {
    setPastedDocText(text);
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const parsedItems: SanitizedBatchItem[] = [];

    lines.forEach((line, idx) => {
      const parsed = parseGoogleDocLine(line);
      if (!parsed) return;
      const detectedType = detectGameType(line, parsed.filename);
      parsedItems.push({
        id: 'txt-' + Date.now() + '-' + idx,
        rawInput: line,
        detectedType,
        extractedTitle: parsed.title,
        originalFileName: parsed.filename,
        extractedUrl: parsed.url,
        sanitizedHtml: '',
        genre: 'Action',
        isValid: true,
        sanitizationNotes: parsed.url
          ? [`Link pulled: ${parsed.url}`]
          : ['No link attached in line'],
      });
    });

    if (parsedItems.length > 0) {
      setQueuedItems(parsedItems);
    }
  };

  // Direct HTML file uploads
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: SanitizedBatchItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const text = await file.text();
      const detectedType = detectGameType(text, file.name);
      const { sanitized, notes } = sanitizeHtmlGameCode(text, detectedType);

      newItems.push({
        id: 'file-' + Date.now() + '-' + i,
        rawInput: file.name,
        detectedType,
        extractedTitle: '',
        originalFileName: file.name,
        sanitizedHtml: sanitized,
        genre: 'Arcade',
        isValid: true,
        sanitizationNotes: [
          `File loaded locally (${(file.size / 1024).toFixed(1)} KB)`,
          ...notes,
        ],
      });
    }

    setQueuedItems(prev => [...prev, ...newItems]);
  };

  // Update item URL manually
  const updateItemUrl = (id: string, url: string) => {
    const clean = unwrapGoogleRedirect(url);
    setQueuedItems(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              extractedUrl: clean,
              sanitizationNotes: [`Link updated: ${clean}`],
            }
          : item
      )
    );
  };

  // Step 1 -> Step 2: Download HTML files from extracted links & inspect
  const handleStep1Proceed = async () => {
    if (queuedItems.length === 0) {
      alert('Please paste games in format "Game Name: clgamename.html [link]" or upload HTML files.');
      return;
    }

    setIsDownloading(true);
    const updatedItems = [...queuedItems];

    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      setDownloadProgressMsg(`Processing ${item.extractedTitle || item.originalFileName}... (${i + 1}/${updatedItems.length})`);

      if (item.extractedUrl) {
        try {
          const rawHtml = await downloadGameFromLink(item.extractedUrl);
          const detectedType = detectGameType(rawHtml, item.originalFileName);
          const { sanitized, notes } = sanitizeHtmlGameCode(rawHtml, detectedType);

          item.sanitizedHtml = sanitized;
          item.detectedType = detectedType;
          item.isValid = true;
          item.sanitizationNotes = [
            `Downloaded from: ${item.extractedUrl}`,
            `File size: ${(rawHtml.length / 1024).toFixed(1)} KB`,
            ...notes,
          ];
        } catch (err: any) {
          console.warn('Direct HTML download fallback to URL embed for', item.extractedTitle, err);
          // Fallback: Embed the URL directly!
          item.sanitizedHtml = item.extractedUrl;
          item.detectedType = 'url';
          item.isValid = true;
          item.sanitizationNotes = [
            `Connected via live link: ${item.extractedUrl}`,
            'Configured for direct in-game execution',
          ];
        }
      } else if (!item.sanitizedHtml) {
        item.sanitizedHtml = `<!DOCTYPE html><html><head><title>${item.extractedTitle}</title><style>body{background:#111;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}</style></head><body><h2>${item.extractedTitle}</h2></body></html>`;
        item.sanitizationNotes = ['Placeholder shell created'];
      }
    }

    setQueuedItems(updatedItems);
    setIsDownloading(false);
    setCurrentStep(2);
  };

  // Step 3 update handlers
  const updateItemTitle = (id: string, newTitle: string) => {
    setQueuedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, extractedTitle: newTitle } : item))
    );
  };

  const updateItemGenre = (id: string, newGenre: string) => {
    setQueuedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, genre: newGenre } : item))
    );
  };

  const updateItemCover = (id: string, coverDataOrUrl: string) => {
    setQueuedItems(prev =>
      prev.map(item => (item.id === id ? { ...item, coverUrl: coverDataOrUrl } : item))
    );
  };

  const handleImageFileChange = (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateItemCover(id, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeItem = (id: string) => {
    setQueuedItems(prev => prev.filter(i => i.id !== id));
  };

  // Final Save for Standard Uploads
  const handleFinalSave = () => {
    const finalGames: Game[] = queuedItems.map(item => {
      const safeTitle =
        item.extractedTitle.trim() ||
        item.originalFileName?.replace(/\.[^/.]+$/, '') ||
        'Custom Game';

      const effectiveCode = item.sanitizedHtml || item.extractedUrl || '';
      const isUrl =
        typeof effectiveCode === 'string' &&
        (effectiveCode.startsWith('http://') || effectiveCode.startsWith('https://'));

      return {
        id: 'game-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
        title: safeTitle,
        genre: item.genre,
        type: isUrl ? 'url' : item.detectedType || 'html',
        codeOrUrl: effectiveCode,
        coverUrl: item.coverUrl || generateDefaultCoverSvg(safeTitle, item.genre),
        originalFileName: item.originalFileName,
        sourceLink: item.extractedUrl,
        plays: 0,
        isFavorite: false,
        addedAt: Date.now(),
        seriesName: item.seriesName,
      };
    });

    onSaveGames(finalGames);
    onClose();
  };

  // --- SERIES OPTION 3 HANDLERS ---
  const toggleExistingGameSelection = (id: string) => {
    setSelectedExistingGameIds(prev =>
      prev.includes(id) ? prev.filter(gId => gId !== id) : [...prev, id]
    );
  };

  const handleCreateSeriesSubmit = () => {
    const cleanSeriesName = seriesName.trim();
    if (!cleanSeriesName) {
      alert('Please enter a name for the series (e.g. Subway Surfers).');
      return;
    }

    if (seriesSubMode === 'existing') {
      if (selectedExistingGameIds.length === 0) {
        alert('Please select at least 1 game to add to this series.');
        return;
      }

      const collageCover = generateSeriesCollageSvg(cleanSeriesName, seriesCollageCovers);
      const newSeries: Series = {
        id: 'series-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        name: cleanSeriesName,
        gameIds: selectedExistingGameIds,
        coverUrl: collageCover,
        createdAt: Date.now(),
      };

      const updatedGames = existingGames.map(g =>
        selectedExistingGameIds.includes(g.id)
          ? { ...g, seriesId: newSeries.id, seriesName: newSeries.name }
          : g
      );

      onSaveSeries(newSeries, updatedGames);
      onClose();
    } else {
      if (queuedItems.length === 0) {
        alert('Please upload or paste at least 1 game for this series.');
        return;
      }

      const collageCover = generateSeriesCollageSvg(cleanSeriesName, seriesCollageCovers);
      const seriesId = 'series-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);

      const newGames: Game[] = queuedItems.map(item => {
        const safeTitle = item.extractedTitle.trim() || item.originalFileName?.replace(/\.[^/.]+$/, '') || 'Game';
        const effectiveCode = item.sanitizedHtml || item.extractedUrl || '';
        const isUrl =
          typeof effectiveCode === 'string' &&
          (effectiveCode.startsWith('http://') || effectiveCode.startsWith('https://'));

        return {
          id: 'game-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
          title: safeTitle,
          genre: item.genre,
          type: isUrl ? 'url' : item.detectedType || 'html',
          codeOrUrl: effectiveCode,
          coverUrl: item.coverUrl || generateDefaultCoverSvg(safeTitle, item.genre),
          originalFileName: item.originalFileName,
          sourceLink: item.extractedUrl,
          plays: 0,
          isFavorite: false,
          addedAt: Date.now(),
          seriesId,
          seriesName: cleanSeriesName,
        };
      });

      const newSeries: Series = {
        id: seriesId,
        name: cleanSeriesName,
        gameIds: newGames.map(g => g.id),
        coverUrl: collageCover,
        createdAt: Date.now(),
      };

      onSaveGames(newGames);
      onSaveSeries(newSeries);
      onClose();
    }
  };

  // Safe early return after all hooks are defined
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-3xl bg-[#18181b] border border-[#27272a] rounded-2xl flex flex-col max-h-[90vh] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#27272a] bg-[#141416] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#38bdf8]" />
              <span>{uploadSourceMode === 'series' ? 'Add Series' : 'Upload Games'}</span>
            </h2>
            {uploadSourceMode !== 'series' && (
              <div className="flex items-center gap-4 mt-2 text-xs font-medium">
                <span className={currentStep === 1 ? 'text-[#38bdf8] font-bold' : 'text-[#71717a]'}>
                  1. Source
                </span>
                <span className="text-[#3f3f46]">›</span>
                <span className={currentStep === 2 ? 'text-[#38bdf8] font-bold' : 'text-[#71717a]'}>
                  2. Download & Sanitize
                </span>
                <span className="text-[#3f3f46]">›</span>
                <span className={currentStep === 3 ? 'text-[#38bdf8] font-bold' : 'text-[#71717a]'}>
                  3. Names & Covers
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Main 3 Source Options Header Toggle */}
          {currentStep === 1 && (
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#121214] border border-[#27272a] rounded-xl">
              <button
                onClick={() => setUploadSourceMode('text')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  uploadSourceMode === 'text'
                    ? 'bg-[#27272a] text-[#38bdf8] shadow-sm'
                    : 'text-[#71717a] hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Text / Link</span>
              </button>
              <button
                onClick={() => setUploadSourceMode('files')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  uploadSourceMode === 'files'
                    ? 'bg-[#27272a] text-[#38bdf8] shadow-sm'
                    : 'text-[#71717a] hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>HTML Files</span>
              </button>
              <button
                onClick={() => setUploadSourceMode('series')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition ${
                  uploadSourceMode === 'series'
                    ? 'bg-[#2563eb] text-white shadow-sm'
                    : 'text-[#71717a] hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Add Series</span>
              </button>
            </div>
          )}

          {/* VIEW: OPTION 3 - ADD SERIES */}
          {uploadSourceMode === 'series' && currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-white">Series Name</label>
                <input
                  type="text"
                  value={seriesName}
                  onChange={e => setSeriesName(e.target.value)}
                  placeholder="e.g. Subway Surfers, Slope Series, FNAF..."
                  className="w-full px-3.5 py-2.5 bg-[#121214] border border-[#27272a] rounded-xl text-xs text-white placeholder-[#52525b] focus:outline-none focus:border-[#38bdf8]"
                />
              </div>

              {/* Sub-mode: Current Games vs Upload to Series */}
              <div className="flex gap-2 border-b border-[#27272a] pb-2 text-xs">
                <button
                  onClick={() => setSeriesSubMode('existing')}
                  className={`pb-1 font-semibold transition ${
                    seriesSubMode === 'existing'
                      ? 'text-[#38bdf8] border-b-2 border-[#38bdf8]'
                      : 'text-[#71717a] hover:text-white'
                  }`}
                >
                  Add Current Games ({selectedExistingGameIds.length} selected)
                </button>
                <button
                  onClick={() => setSeriesSubMode('upload')}
                  className={`pb-1 font-semibold transition ${
                    seriesSubMode === 'upload'
                      ? 'text-[#38bdf8] border-b-2 border-[#38bdf8]'
                      : 'text-[#71717a] hover:text-white'
                  }`}
                >
                  Upload New Games to Series ({queuedItems.length} queued)
                </button>
              </div>

              {/* Sub-mode A: Select from Existing Games */}
              {seriesSubMode === 'existing' && (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-3" />
                    <input
                      type="text"
                      value={seriesGameSearch}
                      onChange={e => setSeriesGameSearch(e.target.value)}
                      placeholder="Search existing games to add..."
                      className="w-full pl-9 pr-3 py-2 bg-[#121214] border border-[#27272a] rounded-xl text-xs text-white placeholder-[#52525b] focus:outline-none focus:border-[#38bdf8]"
                    />
                  </div>

                  {existingGames.length > 0 ? (
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                      {filteredExistingGames.map(game => {
                        const isChecked = selectedExistingGameIds.includes(game.id);
                        return (
                          <div
                            key={game.id}
                            onClick={() => toggleExistingGameSelection(game.id)}
                            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition text-xs ${
                              isChecked
                                ? 'bg-[#1e293b] border-[#38bdf8]/60 text-white'
                                : 'bg-[#141416] border-[#27272a] text-[#d4d4d8] hover:bg-[#1a1a1e]'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#27272a] shrink-0">
                                <img
                                  src={game.coverUrl || generateDefaultCoverSvg(game.title, game.genre)}
                                  alt=""
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="font-medium truncate">{game.title}</span>
                            </div>
                            <div>
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-[#38bdf8]" />
                              ) : (
                                <Square className="w-4 h-4 text-[#71717a]" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs text-[#71717a] bg-[#121214] rounded-xl border border-[#27272a]">
                      No existing games in library yet. Switch to "Upload New Games to Series" above.
                    </div>
                  )}
                </div>
              )}

              {/* Sub-mode B: Upload to Series */}
              {seriesSubMode === 'upload' && (
                <div className="space-y-3">
                  <textarea
                    rows={4}
                    value={pastedDocText}
                    onPaste={handlePaste}
                    onChange={e => handleTextChange(e.target.value)}
                    placeholder="Subway Surfers Miami: clsubwaymiami.html https://...&#10;Subway Surfers Tokyo: clsubwaytokyo.html"
                    className="w-full p-3 bg-[#121214] border border-[#27272a] rounded-xl text-xs font-mono text-white placeholder-[#52525b] focus:outline-none focus:border-[#38bdf8] resize-none"
                  />
                  <div className="flex items-center justify-between text-xs text-[#71717a]">
                    <span>Or select HTML files:</span>
                    <label className="px-3 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#38bdf8] cursor-pointer">
                      <span>Choose Files</span>
                      <input
                        type="file"
                        multiple
                        accept=".html,.htm"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* Custom 3-Cover Collage Card Preview */}
              <div className="p-3.5 rounded-2xl bg-[#121214] border border-[#27272a] flex items-center gap-4">
                <div className="w-24 h-24 rounded-xl overflow-hidden bg-black shrink-0 border border-[#2e2e34]">
                  <img
                    src={generateSeriesCollageSvg(seriesName || 'Series Name', seriesCollageCovers)}
                    alt="Collage Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-1 text-xs">
                  <span className="font-semibold text-white flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#38bdf8]" />
                    Custom 3-Cover Series Collage
                  </span>
                  <p className="text-[11px] text-[#71717a] leading-relaxed">
                    Automatically composes 3 covers from the games into a unified 512x512 series card with title banner.
                  </p>
                </div>
              </div>

              {/* Create Series Button */}
              <button
                onClick={handleCreateSeriesSubmit}
                className="w-full py-2.5 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-xs font-bold text-white transition shadow-sm"
              >
                Create Series & Save
              </button>
            </div>
          )}

          {/* VIEW: OPTION 1 - TEXT / LINK FORMAT */}
          {uploadSourceMode === 'text' && currentStep === 1 && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs text-[#a1a1aa]">
                <span className="font-medium">Paste copied list:</span>
                <span className="font-mono text-[#71717a]">Game Name: clgamename.html</span>
              </div>

              <textarea
                rows={6}
                value={pastedDocText}
                onPaste={handlePaste}
                onChange={e => handleTextChange(e.target.value)}
                placeholder="Game Name: clgamename.html https://drive.google.com/..."
                className="w-full p-3.5 bg-[#121214] border border-[#27272a] rounded-xl text-xs font-mono text-white placeholder-[#52525b] focus:outline-none focus:border-[#38bdf8] transition resize-none"
              />

              {/* Real-time Extracted Items Preview */}
              {queuedItems.length > 0 && (
                <div className="space-y-2 mt-2">
                  <div className="text-xs font-medium text-[#a1a1aa]">
                    Extracted Games ({queuedItems.length}):
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {queuedItems.map(item => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-[#141416] border border-[#27272a] text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-white">
                            {item.extractedTitle || 'Game'}
                          </span>
                          <span className="font-mono text-[11px] text-[#38bdf8]">
                            {item.originalFileName}
                          </span>
                        </div>

                        {/* Extracted Link Field */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0d0d0f] border border-[#27272a] text-[11px] text-[#a1a1aa]">
                            <Link className="w-3 h-3 text-[#38bdf8] shrink-0" />
                            <input
                              type="text"
                              value={item.extractedUrl || ''}
                              onChange={e => updateItemUrl(item.id, e.target.value)}
                              placeholder="Paste or edit link (Google Drive / web URL)"
                              className="w-full bg-transparent text-white placeholder-[#52525b] focus:outline-none font-mono text-[11px]"
                            />
                          </div>
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1.5 text-[#ef4444] hover:bg-[#27272a] rounded-lg transition"
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: OPTION 2 - DIRECT HTML FILE UPLOAD */}
          {uploadSourceMode === 'files' && currentStep === 1 && (
            <div className="space-y-4">
              <label className="border-2 border-dashed border-[#2e2e34] hover:border-[#38bdf8]/50 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer bg-[#121214]/60 hover:bg-[#121214] transition">
                <Upload className="w-8 h-8 text-[#38bdf8] mb-2" />
                <span className="text-sm font-medium text-white mb-1">Select HTML game files</span>
                <span className="text-xs text-[#71717a]">Supports batch selection (.html, .htm, .swf)</span>
                <input
                  type="file"
                  multiple
                  accept=".html,.htm,.swf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {queuedItems.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-[#a1a1aa] mb-1">
                    Queued Files ({queuedItems.length}):
                  </div>
                  {queuedItems.map(item => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#141416] border border-[#27272a] text-xs"
                    >
                      <div className="flex items-center gap-2 text-white font-mono truncate">
                        <FileCode className="w-3.5 h-3.5 text-[#38bdf8]" />
                        <span>{item.originalFileName}</span>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-[#ef4444] hover:text-[#f87171] p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STEP 2: DOWNLOAD & SANITIZE */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#0c1322] border border-[#1d4ed8]/30 flex items-start gap-3 text-xs text-[#93c5fd]">
                <ShieldCheck className="w-5 h-5 text-[#38bdf8] shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white mb-0.5">Files Processed & Verified</div>
                  <span>
                    Each game was downloaded or linked, validated for security, and prepared for full-screen gameplay.
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                {queuedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#141416] border border-[#27272a] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-[#22c55e]" />
                        <span className="font-medium text-xs text-white">
                          {item.extractedTitle || item.originalFileName || `Game #${idx + 1}`}
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#27272a] text-[#a1a1aa]">
                          {item.detectedType.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[11px] font-mono text-[#71717a]">
                        {item.originalFileName}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#a1a1aa] bg-[#0d0d0f] p-2.5 rounded-lg border border-[#1f1f23]">
                      <div className="font-medium text-[#71717a] mb-1">Check Report:</div>
                      <ul className="list-disc list-inside space-y-0.5">
                        {item.sanitizationNotes.map((note, nIdx) => (
                          <li key={nIdx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: NAMES & COVERS (512x512 Square Ratio) */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <p className="text-xs text-[#a1a1aa]">
                Confirm names, genres, and upload 512x512 cover artwork:
              </p>

              <div className="space-y-3">
                {queuedItems.map(item => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-[#141416] border border-[#27272a] flex flex-col md:flex-row gap-4 items-start md:items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded-xl bg-[#1f1f23] border border-[#2e2e34] overflow-hidden shrink-0 group">
                        <img
                          src={
                            item.coverUrl ||
                            generateDefaultCoverSvg(item.extractedTitle || 'Game', item.genre)
                          }
                          alt="Cover"
                          className="w-full h-full object-cover"
                        />
                        <label
                          htmlFor={`cover-upload-${item.id}`}
                          className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition text-white"
                          title="Upload 512x512 Cover Art"
                        >
                          <Image className="w-4 h-4" />
                        </label>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label
                          htmlFor={`cover-upload-${item.id}`}
                          className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#38bdf8] cursor-pointer flex items-center gap-1.5 transition"
                        >
                          <Image className="w-3 h-3" />
                          <span>Upload Image</span>
                        </label>
                        <input
                          id={`cover-upload-${item.id}`}
                          type="file"
                          accept="image/*"
                          onChange={e => handleImageFileChange(item.id, e)}
                          className="hidden"
                        />
                      </div>
                    </div>

                    <div className="flex-1 w-full space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-medium text-[#a1a1aa]">Game Name</label>
                        {item.originalFileName && (
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1f1f23] text-[#71717a] border border-[#2a2a30]">
                            File: {item.originalFileName}
                          </span>
                        )}
                      </div>

                      <input
                        type="text"
                        value={item.extractedTitle}
                        onChange={e => updateItemTitle(item.id, e.target.value)}
                        placeholder="Type game title here..."
                        className="w-full px-3 py-2 bg-[#101012] border border-[#2a2a30] rounded-xl text-xs text-white placeholder-[#52525b] focus:outline-none focus:border-[#38bdf8]"
                      />
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center">
                      <select
                        value={item.genre}
                        onChange={e => updateItemGenre(item.id, e.target.value)}
                        aria-label="Select Genre"
                        className="px-2.5 py-2 bg-[#18181b] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-[#38bdf8]"
                      >
                        {AVAILABLE_GENRES.map(g => (
                          <option key={g} value={g}>
                            {g}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-2 text-[#71717a] hover:text-[#ef4444] rounded-xl hover:bg-[#27272a] transition"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Navigation */}
        {uploadSourceMode !== 'series' && (
          <div className="p-4 border-t border-[#27272a] bg-[#141416] flex items-center justify-between">
            <div>
              {currentStep > 1 && (
                <button
                  onClick={() => setCurrentStep(prev => (prev - 1) as 1 | 2 | 3)}
                  className="px-4 py-2 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-xs font-medium text-white flex items-center gap-1.5 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-transparent hover:bg-[#27272a] text-xs font-medium text-[#a1a1aa] transition"
              >
                Cancel
              </button>

              {currentStep === 1 && (
                <button
                  onClick={handleStep1Proceed}
                  disabled={isDownloading || queuedItems.length === 0}
                  className="px-5 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] disabled:opacity-50 text-xs font-medium text-white flex items-center gap-2 transition shadow-sm"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{downloadProgressMsg || 'Downloading...'}</span>
                    </>
                  ) : (
                    <>
                      <span>Download & Sanitize</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              )}

              {currentStep === 2 && (
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-5 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-xs font-medium text-white flex items-center gap-1.5 transition shadow-sm"
                >
                  <span>Continue to Names & Covers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}

              {currentStep === 3 && (
                <button
                  onClick={handleFinalSave}
                  disabled={queuedItems.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-[#16a34a] hover:bg-[#15803d] disabled:opacity-50 text-xs font-semibold text-white flex items-center gap-1.5 transition shadow-sm"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Save to Library & Firebase</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
