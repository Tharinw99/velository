import React, { useRef } from 'react';
import { Star, Play, Flame, Pencil, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Game } from '../types';
import { generateDefaultCoverSvg } from '../utils/sanitizer';

interface GameCardProps {
  game: Game;
  onPlay: (game: Game) => void;
  onToggleFavorite: (id: string, e: React.MouseEvent) => void;
  isDevMode?: boolean;
  onRename?: (game: Game, e: React.MouseEvent) => void;
  onChangeCover?: (game: Game, e: React.MouseEvent) => void;
  onDelete?: (game: Game, e: React.MouseEvent) => void;
}

export const GameCard: React.FC<GameCardProps> = ({
  game,
  onPlay,
  onToggleFavorite,
  isDevMode,
  onRename,
  onChangeCover,
  onDelete,
}) => {
  const coverSrc = game.coverUrl || generateDefaultCoverSvg(game.title, game.genre);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite(game.id, e);
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onRename?.(game, e);
  };

  const handleChangeCoverClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChangeCover?.(game, e);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete?.(game, e);
  };

  return (
    <div
      onClick={() => onPlay(game)}
      className="group relative flex flex-col bg-[#18181b] border border-[#27272a] hover:border-[#3f3f46] rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-xl"
    >
      {/* Cover Artwork Container (Square 512x512 Aspect Ratio) */}
      <div className="relative aspect-square w-full bg-[#121214] overflow-hidden">
        <img
          src={coverSrc}
          alt={game.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={e => {
            (e.currentTarget as HTMLImageElement).src = generateDefaultCoverSvg(game.title, game.genre);
          }}
        />

        {/* Play Overlay */}
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none z-10">
          <div className="w-12 h-12 rounded-full bg-[#38bdf8] text-[#0f172a] flex items-center justify-center shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
            <Play className="w-6 h-6 fill-current ml-0.5" />
          </div>
        </div>

        {/* Developer Mode Action Buttons (Always accessible when dev mode is active) */}
        {isDevMode && (
          <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 bg-[#121214]/90 backdrop-blur-md p-1 rounded-xl border border-[#3f3f46] shadow-lg">
            <button
              type="button"
              onClick={handleRenameClick}
              className="w-7 h-7 rounded-lg bg-[#27272a] hover:bg-[#38bdf8] hover:text-[#0f172a] text-[#d4d4d8] flex items-center justify-center transition"
              title="Rename Game"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleChangeCoverClick}
              className="w-7 h-7 rounded-lg bg-[#27272a] hover:bg-[#38bdf8] hover:text-[#0f172a] text-[#d4d4d8] flex items-center justify-center transition"
              title="Change 512x512 Cover"
            >
              <ImageIcon className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className="w-7 h-7 rounded-lg bg-[#27272a] hover:bg-[#ef4444] text-[#d4d4d8] hover:text-white flex items-center justify-center transition"
              title="Delete Game Permanently"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Favorite Icon Toggle */}
        <button
          type="button"
          onClick={handleFavoriteClick}
          className={`absolute top-2.5 right-2.5 z-20 w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-md ${
            game.isFavorite
              ? 'bg-[#18181b] text-[#facc15] border border-[#facc15]/40 hover:scale-110'
              : 'bg-[#18181b]/90 text-[#a1a1aa] hover:text-[#facc15] border border-[#3f3f46] hover:scale-110'
          }`}
          title={game.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          aria-label={game.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Star className={`w-4 h-4 ${game.isFavorite ? 'fill-current' : ''}`} />
        </button>

        {/* Genre Tag */}
        <div className="absolute bottom-2 left-2 z-10">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-[#18181b]/90 text-[#d4d4d8] border border-[#3f3f46]/60 backdrop-blur-sm">
            {game.genre}
          </span>
        </div>
      </div>

      {/* Card Info */}
      <div className="p-3.5 flex flex-col justify-between flex-1">
        <h3 className="font-semibold text-sm text-white truncate group-hover:text-[#38bdf8] transition-colors">
          {game.title}
        </h3>

        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#27272a]/60 text-[11px] text-[#71717a]">
          <span className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-[#f59e0b]" />
            <span>{game.plays.toLocaleString()} plays</span>
          </span>
          <span className="uppercase text-[9px] font-mono text-[#a1a1aa]">
            {game.type}
          </span>
        </div>
      </div>
    </div>
  );
};
