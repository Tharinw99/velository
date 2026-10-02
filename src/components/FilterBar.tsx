import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Filter, Flame, ArrowDownAZ, ChevronDown } from 'lucide-react';
import { SortMode } from '../types';

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGenre: string;
  onGenreChange: (genre: string) => void;
  sortMode: SortMode;
  onSortModeChange: (mode: SortMode) => void;
  genres: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedGenre,
  onGenreChange,
  sortMode,
  onSortModeChange,
  genres,
}) => {
  const [isGenreOpen, setIsGenreOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsGenreOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between w-full">
      {/* Search Input Bar with Clear Button */}
      <div className="relative flex-1">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717a]">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search games by title, genre..."
          className="w-full pl-10 pr-9 py-2.5 bg-[#18181b] border border-[#27272a] rounded-xl text-sm text-white placeholder-[#71717a] focus:outline-none focus:border-[#38bdf8] focus:ring-1 focus:ring-[#38bdf8] transition"
        />
        {searchQuery && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#71717a] hover:text-white"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Section: Genre Dropdown + Tab Pill Switch (Alphabetical vs Popular) */}
      <div className="flex items-center gap-2.5">
        {/* Genre Filter Dropdown Menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsGenreOpen(!isGenreOpen)}
            className={`h-10 px-3.5 rounded-xl border text-xs font-medium flex items-center gap-2 transition ${
              selectedGenre !== 'ALL'
                ? 'bg-[#1e293b] border-[#38bdf8]/40 text-[#38bdf8]'
                : 'bg-[#18181b] border-[#27272a] hover:border-[#3f3f46] text-[#d4d4d8]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>{selectedGenre === 'ALL' ? 'All Genres' : selectedGenre}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {isGenreOpen && (
            <div className="absolute left-0 md:right-0 md:left-auto mt-1.5 w-44 rounded-2xl bg-[#1f1f23] border border-[#2e2e34] shadow-2xl p-1.5 z-40">
              <button
                onClick={() => {
                  onGenreChange('ALL');
                  setIsGenreOpen(false);
                }}
                className={`w-full px-3 py-2 rounded-xl text-left text-xs transition ${
                  selectedGenre === 'ALL'
                    ? 'bg-[#2563eb] text-white font-medium'
                    : 'text-[#d4d4d8] hover:bg-[#2a2a30]'
                }`}
              >
                All Genres
              </button>
              {genres.map(g => (
                <button
                  key={g}
                  onClick={() => {
                    onGenreChange(g);
                    setIsGenreOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded-xl text-left text-xs transition ${
                    selectedGenre === g
                      ? 'bg-[#2563eb] text-white font-medium'
                      : 'text-[#d4d4d8] hover:bg-[#2a2a30]'
                  }`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab Pill Switch: Alphabetical vs Popular (Requested specifically by user) */}
        <div className="h-10 bg-[#18181b] border border-[#27272a] p-1 rounded-xl flex items-center shadow-inner">
          <button
            onClick={() => onSortModeChange('alphabetical')}
            className={`h-full px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              sortMode === 'alphabetical'
                ? 'bg-[#27272a] text-[#38bdf8] shadow-sm'
                : 'text-[#71717a] hover:text-[#d4d4d8]'
            }`}
            title="Sort Alphabetically (A-Z)"
          >
            <ArrowDownAZ className="w-3.5 h-3.5" />
            <span>A-Z</span>
          </button>
          <button
            onClick={() => onSortModeChange('popular')}
            className={`h-full px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all ${
              sortMode === 'popular'
                ? 'bg-[#27272a] text-[#f59e0b] shadow-sm'
                : 'text-[#71717a] hover:text-[#d4d4d8]'
            }`}
            title="Sort by Popularity"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Popular</span>
          </button>
        </div>
      </div>
    </div>
  );
};
