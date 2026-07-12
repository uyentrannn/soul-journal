import React from 'react';
import { format, getDayOfYear } from 'date-fns';
import { Search } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Entry, MOODS } from '../../types';

interface HistoryViewProps {
  filteredEntries: Entry[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  setCurrentDate: (date: Date) => void;
  setView: (view: any) => void;
  monthlyStats: { count: number; topMood: any };
  themeClasses: string;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  filteredEntries,
  searchQuery,
  setSearchQuery,
  setCurrentDate,
  setView,
  monthlyStats,
  themeClasses
}) => {
  return (
    <div className={cn(themeClasses, "relative overflow-hidden")}>
      <div className="notebook-inner-shadow absolute inset-y-0 left-0 w-8 pointer-events-none" />
      <div className="page-curl" />

      {/* Decorative Corners */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-journal-accent/20 rounded-tl-sm pointer-events-none" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-journal-accent/20 rounded-tr-sm pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-journal-accent/20 rounded-bl-sm pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-journal-accent/20 rounded-br-sm pointer-events-none" />

      <div className="flex justify-between items-center mb-8">
        <h2 className="font-serif-display text-3xl italic">Past Entries</h2>
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" />
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="bg-journal-accent/5 border-none rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 ring-journal-accent/20"
          />
        </div>
      </div>

      <div className="mb-12 p-6 bg-journal-accent/5 rounded-2xl border border-journal-accent/10 flex justify-around items-center text-center">
        <div>
          <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">This Month</p>
          <p className="font-serif-display text-2xl italic">{monthlyStats.count} Entries</p>
        </div>
        <div className="w-px h-12 bg-journal-accent/10" />
        <div>
          <p className="text-[10px] uppercase tracking-widest opacity-50 mb-1">Dominant Mood</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xl">{monthlyStats.topMood?.emoji || "—"}</span>
            <p className="font-serif-display text-2xl italic">{monthlyStats.topMood?.label || "None yet"}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {filteredEntries.length === 0 ? (
          <div className="text-center py-20 opacity-30 italic">
            No entries found. Start your journey today.
          </div>
        ) : (
          filteredEntries.map((entry) => (
            <div 
              key={entry.id} 
              className="p-6 border border-journal-accent/5 rounded-2xl hover:bg-journal-accent/5 transition-colors cursor-pointer group"
              onClick={() => {
                setCurrentDate(new Date(entry.date));
                setView('today');
              }}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-serif-display text-lg italic">{format(new Date(entry.date), 'EEEE, MMMM do')}</h4>
                  <p className="text-[10px] uppercase tracking-widest opacity-40">Day {getDayOfYear(new Date(entry.date))}</p>
                </div>
                <span className="text-xl">{MOODS.find(m => m.type === entry.mood)?.emoji}</span>
              </div>
              <p className="text-sm italic opacity-70 line-clamp-1">"{entry.mantra.text}"</p>
            </div>
          ))
        )}
      </div>

      {/* Page Number */}
      <div className="mt-auto pt-4 pb-4 flex justify-center">
        <div className="text-[10px] uppercase tracking-widest opacity-20 font-serif-display">
          Index
        </div>
      </div>
    </div>
  );
};
