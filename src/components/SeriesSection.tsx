import React from 'react';
import { Layers, X, Sparkles, Folder } from 'lucide-react';
import { Series } from '../types';
import { generateSeriesCollageSvg } from '../utils/sanitizer';

interface SeriesSectionProps {
  seriesList: Series[];
  selectedSeries: Series | null;
  onSelectSeries: (series: Series | null) => void;
  onOpenUploadSeries: () => void;
}

export const SeriesSection: React.FC<SeriesSectionProps> = ({
  seriesList,
  selectedSeries,
  onSelectSeries,
  onOpenUploadSeries,
}) => {
  // If a series is currently active/selected, show the active filter header
  if (selectedSeries) {
    return (
      <div className="bg-[#141417] border border-[#27272a] rounded-2xl p-4 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#18181b] border border-[#2e2e34] shrink-0">
            <img
              src={selectedSeries.coverUrl || generateSeriesCollageSvg(selectedSeries.name, [])}
              alt={selectedSeries.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#38bdf8]/15 text-[#38bdf8] border border-[#38bdf8]/30">
                Active Series
              </span>
              <span className="text-xs text-[#71717a]">
                {selectedSeries.gameIds.length} {selectedSeries.gameIds.length === 1 ? 'game' : 'games'}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white tracking-tight mt-0.5">
              {selectedSeries.name}
            </h2>
          </div>
        </div>

        <button
          onClick={() => onSelectSeries(null)}
          className="px-3.5 py-1.5 rounded-xl bg-[#27272a] hover:bg-[#3f3f46] text-xs font-medium text-white flex items-center gap-1.5 transition"
        >
          <X className="w-3.5 h-3.5" />
          <span>Show All Games</span>
        </button>
      </div>
    );
  }

  // If there are series created, show the cards
  if (seriesList.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#38bdf8]" />
          <h2 className="text-sm font-bold text-white tracking-tight">Series</h2>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#27272a] text-[#a1a1aa]">
            {seriesList.length}
          </span>
        </div>
      </div>

      {/* Series Cards Carousel / Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {seriesList.map(series => {
          const coverSrc = series.coverUrl || generateSeriesCollageSvg(series.name, []);
          return (
            <div
              key={series.id}
              onClick={() => onSelectSeries(series)}
              className="group relative flex flex-col bg-[#18181b] border border-[#27272a] hover:border-[#38bdf8]/50 rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-1 shadow-md hover:shadow-xl"
            >
              {/* 512x512 Square Collage Cover */}
              <div className="relative aspect-square w-full bg-[#121214] overflow-hidden">
                <img
                  src={coverSrc}
                  alt={series.name}
                  loading="lazy"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={e => {
                    (e.currentTarget as HTMLImageElement).src = generateSeriesCollageSvg(series.name, []);
                  }}
                />

                <div className="absolute top-2.5 left-2.5 z-10">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-[#18181b]/90 text-[#38bdf8] border border-[#38bdf8]/40 backdrop-blur-sm">
                    Series
                  </span>
                </div>
              </div>

              {/* Series Card Info */}
              <div className="p-3 flex flex-col justify-between flex-1">
                <h3 className="font-bold text-sm text-white truncate group-hover:text-[#38bdf8] transition-colors">
                  {series.name}
                </h3>
                <span className="text-[11px] text-[#71717a] mt-1">
                  {series.gameIds.length} {series.gameIds.length === 1 ? 'game' : 'games'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
