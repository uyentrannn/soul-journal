import React from 'react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { Mood, MOODS } from '../../types';

interface MoodCheckViewProps {
  owner: string;
  currentDate: Date;
  handleMoodSelect: (mood: Mood) => void;
  existingEntry: boolean;
  setView: (view: any) => void;
}

export const MoodCheckView: React.FC<MoodCheckViewProps> = ({
  owner,
  currentDate,
  handleMoodSelect,
  existingEntry,
  setView
}) => {
  return (
    <div className={cn("journal-page border-ornate texture-cream p-8 sm:p-12 rounded-lg text-center page-shadow relative overflow-hidden")}>
      <div className="notebook-inner-shadow absolute inset-y-0 left-0 w-8 pointer-events-none" />
      <div className="page-curl" />
      
      {/* Decorative Corners */}
      <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-journal-accent/20 rounded-tl-sm pointer-events-none" />
      <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-journal-accent/20 rounded-tr-sm pointer-events-none" />
      <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-journal-accent/20 rounded-bl-sm pointer-events-none" />
      <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-journal-accent/20 rounded-br-sm pointer-events-none" />

      <h2 className="font-serif-display text-3xl mb-2 italic">Welcome back, {owner}</h2>
      <p className="text-journal-ink/60 mb-8">How does your soul feel on this {format(currentDate, 'EEEE')}?</p>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {MOODS.map((m) => (
          <button
            key={m.type}
            onClick={() => handleMoodSelect(m.type)}
            className="flex flex-col items-center p-4 rounded-xl border border-journal-accent/10 hover:bg-journal-accent/5 transition-colors group cursor-pointer"
          >
            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{m.emoji}</span>
            <span className="text-xs uppercase tracking-widest font-medium opacity-70">{m.label}</span>
          </button>
        ))}
      </div>

      {existingEntry && (
        <button 
          onClick={() => setView('today')}
          className="mt-8 text-xs uppercase tracking-widest opacity-40 hover:opacity-100 cursor-pointer"
        >
          ✕ Cancel changes
        </button>
      )}
    </div>
  );
};
