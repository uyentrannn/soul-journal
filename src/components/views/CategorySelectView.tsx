import React from 'react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { AffirmationCategory, AFFIRMATION_CATEGORIES } from '../../types';

interface CategorySelectViewProps {
  currentDate: Date;
  handleCategorySelect: (category: AffirmationCategory) => void;
  existingEntry: boolean;
  setView: (view: any) => void;
}

export const CategorySelectView: React.FC<CategorySelectViewProps> = ({
  currentDate,
  handleCategorySelect,
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

      <h2 className="font-serif-display text-3xl mb-2 italic">Focus for {format(currentDate, 'MMM do')}</h2>
      <p className="text-journal-ink/60 mb-8">What would you like to invite into your life?</p>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {AFFIRMATION_CATEGORIES.map((cat) => (
          <button
            key={cat.type}
            onClick={() => handleCategorySelect(cat.type)}
            className="flex items-center gap-4 p-4 rounded-xl border border-journal-accent/10 hover:bg-journal-accent/5 transition-colors group text-left cursor-pointer"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
            <span className="text-sm uppercase tracking-widest font-medium opacity-70">{cat.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
        <button 
          onClick={() => setView('mood-check')}
          className="text-xs uppercase tracking-widest opacity-40 hover:opacity-100 cursor-pointer"
        >
          ← Back to mood
        </button>
        {existingEntry && (
          <button 
            onClick={() => setView('today')}
            className="text-xs uppercase tracking-widest opacity-40 hover:opacity-100 cursor-pointer"
          >
            ✕ Cancel changes
          </button>
        )}
      </div>
    </div>
  );
};
