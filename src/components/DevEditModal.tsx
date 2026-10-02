import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Save, Trash2, CheckCircle, Upload } from 'lucide-react';
import { Game } from '../types';
import { generateDefaultCoverSvg } from '../utils/sanitizer';

interface DevEditModalProps {
  game: Game | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (gameId: string, updates: { title: string; coverUrl?: string; genre: string }) => void;
  onDelete: (gameId: string) => void;
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

export const DevEditModal: React.FC<DevEditModalProps> = ({
  game,
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('Action');
  const [coverUrl, setCoverUrl] = useState('');

  useEffect(() => {
    if (game) {
      setTitle(game.title);
      setGenre(game.genre || 'Action');
      setCoverUrl(game.coverUrl || '');
    }
  }, [game]);

  if (!isOpen || !game) return null;

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCoverUrl(dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!title.trim()) {
      alert('Game title cannot be empty.');
      return;
    }
    onSave(game.id, {
      title: title.trim(),
      genre,
      coverUrl: coverUrl || undefined,
    });
    onClose();
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to permanently delete "${game.title}"?`)) {
      onDelete(game.id);
      onClose();
    }
  };

  const effectiveCover = coverUrl || generateDefaultCoverSvg(title || game.title, genre);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#18181b] border border-[#27272a] rounded-2xl p-5 shadow-2xl flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#27272a]">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#38bdf8] font-semibold">
              Developer Mode
            </span>
            <h3 className="text-base font-bold text-white tracking-tight">Edit Game</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-[#a1a1aa] hover:text-white flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 512x512 Cover Preview & Upload */}
        <div className="flex items-center gap-4 p-3 bg-[#121214] border border-[#27272a] rounded-xl">
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-black shrink-0 border border-[#3f3f46]">
            <img src={effectiveCover} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 space-y-1.5 text-xs">
            <span className="font-semibold text-white">Cover Artwork (512x512)</span>
            <div className="flex items-center gap-2">
              <label className="px-3 py-1.5 rounded-lg bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-medium cursor-pointer flex items-center gap-1.5 transition">
                <Upload className="w-3 h-3" />
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageFileChange}
                  className="hidden"
                />
              </label>
              {coverUrl && (
                <button
                  type="button"
                  onClick={() => setCoverUrl('')}
                  className="px-2 py-1.5 rounded-lg bg-[#27272a] hover:bg-[#3f3f46] text-[#ef4444] transition"
                  title="Reset to default SVG"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Game Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#d4d4d8]">Official Game Title</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Official Game Name..."
            className="w-full px-3 py-2 bg-[#121214] border border-[#27272a] rounded-xl text-xs text-white placeholder-[#52525b] focus:outline-none focus:border-[#38bdf8]"
          />
        </div>

        {/* Genre Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-[#d4d4d8]">Genre</label>
          <select
            value={genre}
            onChange={e => setGenre(e.target.value)}
            className="w-full px-3 py-2 bg-[#121214] border border-[#27272a] rounded-xl text-xs text-white focus:outline-none focus:border-[#38bdf8]"
          >
            {AVAILABLE_GENRES.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>

        {/* Original File Info */}
        {game.originalFileName && (
          <div className="text-[11px] font-mono text-[#71717a] bg-[#121214] p-2 rounded-lg border border-[#27272a]/60 truncate">
            Source File: {game.originalFileName}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-[#27272a]">
          <button
            type="button"
            onClick={handleDelete}
            className="px-3.5 py-2 rounded-xl bg-[#27272a] hover:bg-[#ef4444] text-[#ef4444] hover:text-white text-xs font-medium flex items-center gap-1.5 transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Game</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-transparent hover:bg-[#27272a] text-[#a1a1aa] text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
