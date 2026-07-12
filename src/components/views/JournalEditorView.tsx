import React from 'react';
import { format, getDayOfYear, isToday } from 'date-fns';
import { motion } from 'motion/react';
import { Sparkles, RefreshCw, Quote, Heart, Camera, Image as ImageIcon, X, Save, Plus } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { cn } from '../../lib/utils';
import { Entry, Mood, MOODS, AffirmationCategory, AFFIRMATION_CATEGORIES } from '../../types';
import { SoulfulMomentCard } from '../widgets/SoulfulMomentCard';

interface JournalEditorViewProps {
  currentDate: Date;
  currentEntry: Partial<Entry>;
  currentMood: Mood | null;
  currentCategory: AffirmationCategory | null;
  existingEntry: boolean;
  isGeneratingAffirmations: boolean;
  isGeneratingMantra: boolean;
  isGeneratingReflection: boolean;
  reflectionQuestion: string | null;
  reflectionAnswer: string;
  showReflection: boolean;
  setShowReflection: (val: boolean) => void;
  handleGratitudeChange: (index: number, value: string) => void;
  handleAffirmationChange: (index: number, value: string) => void;
  handleReflectionAnswerChange: (value: string) => void;
  handleRefreshAffirmations: () => Promise<void>;
  handleRefreshMantra: () => Promise<void>;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handlePhotoReplace: (index: number, e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  handleRemovePhoto: (index: number) => void;
  handleSave: () => Promise<void>;
  setView: (view: any) => void;
  triggerReflection: (gratitude: string[]) => Promise<void>;
  themeClasses: string;
}

export const JournalEditorView: React.FC<JournalEditorViewProps> = ({
  currentDate,
  currentEntry,
  currentMood,
  currentCategory,
  existingEntry,
  isGeneratingAffirmations,
  isGeneratingMantra,
  isGeneratingReflection,
  reflectionQuestion,
  reflectionAnswer,
  showReflection,
  setShowReflection,
  handleGratitudeChange,
  handleAffirmationChange,
  handleReflectionAnswerChange,
  handleRefreshAffirmations,
  handleRefreshMantra,
  handlePhotoUpload,
  handlePhotoReplace,
  handleRemovePhoto,
  handleSave,
  setView,
  triggerReflection,
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

      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b border-journal-accent/10 pb-4">
        <div>
          <h1 className="font-serif-display text-2xl sm:text-3xl italic">
            {format(currentDate, 'EEEE do MMMM yyyy')} ♡
          </h1>
          <p className="text-xs uppercase tracking-[0.2em] opacity-50 mt-1">
            Day {getDayOfYear(currentDate)} of {currentDate.getFullYear()}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {!existingEntry && !isToday(currentDate) ? (
            <button 
              onClick={() => setView('mood-check')}
              className="px-4 py-2 bg-journal-accent/10 hover:bg-journal-accent/20 rounded-full text-[10px] uppercase tracking-widest font-bold transition-colors cursor-pointer"
            >
              Add Mood & Category
            </button>
          ) : (
            <>
              {currentMood && (
                <button 
                  onClick={() => setView('mood-check')}
                  className="flex flex-col items-end group hover:bg-journal-accent/5 p-2 -m-2 rounded-xl transition-colors cursor-pointer"
                  title="Change mood"
                >
                  <span className="text-2xl group-hover:scale-110 transition-transform">{MOODS.find(m => m.type === currentMood)?.emoji}</span>
                  <span className="text-[10px] uppercase tracking-widest opacity-40 group-hover:opacity-100">{currentMood}</span>
                </button>
              )}
              {currentCategory && (
                <button 
                  onClick={() => setView('category-select')}
                  className="flex items-center gap-1 px-2 py-1 bg-journal-accent/5 hover:bg-journal-accent/10 rounded-full transition-colors group cursor-pointer"
                  title="Change category"
                >
                  <span className="text-xs group-hover:rotate-12 transition-transform">{AFFIRMATION_CATEGORIES.find(c => c.type === currentCategory)?.icon}</span>
                  <span className="text-[8px] uppercase tracking-widest opacity-60 group-hover:opacity-100">{currentCategory}</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto max-h-[60vh] pr-1 space-y-12 pb-8">
        {/* Affirmations */}
        <section>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-serif-display text-xl italic flex items-center gap-2">
              <Sparkles size={16} className="text-journal-accent" />
              Affirmations
            </h3>
            <button 
              onClick={handleRefreshAffirmations}
              disabled={isGeneratingAffirmations}
              className="p-3 -m-2 hover:bg-journal-accent/5 rounded-full transition-colors disabled:opacity-30 cursor-pointer"
            >
              <RefreshCw size={16} className={cn(isGeneratingAffirmations && "animate-spin")} />
            </button>
          </div>
          <div className="space-y-4 relative min-h-[100px]">
            {isGeneratingAffirmations && (
              <div className="absolute inset-x-0 inset-y-[-10px] bg-journal-paper/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-2 rounded-xl border border-journal-accent/10 shadow-sm">
                <RefreshCw size={24} className="text-journal-accent animate-spin" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-journal-accent">Whispering affirmations...</p>
              </div>
            )}
            {currentEntry.affirmations?.map((aff, i) => (
              <div key={i} className="relative group">
                <TextareaAutosize
                  value={aff}
                  onChange={(e) => handleAffirmationChange(i, e.target.value)}
                  placeholder="..."
                  className="w-full bg-transparent border-b border-journal-accent/5 py-2 px-1 focus:outline-none focus:border-journal-accent/30 transition-colors italic text-lg resize-none overflow-hidden"
                />
                <div className="absolute left-[-20px] top-3 opacity-20 text-xs">{i + 1}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Daily Mantra */}
        <section className="p-6 bg-journal-accent/5 rounded-2xl relative overflow-hidden min-h-[150px]">
          {isGeneratingMantra && (
            <div className="absolute inset-0 bg-journal-paper/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border border-journal-accent/10 shadow-sm">
              <RefreshCw size={24} className="text-journal-accent animate-spin" />
              <p className="text-[10px] uppercase tracking-widest font-bold text-journal-accent">Seeking wisdom...</p>
            </div>
          )}
          <Quote className="absolute top-[-10px] right-[-10px] opacity-5 w-24 h-24" />
          <div className="flex justify-between items-center mb-4 relative z-10">
            <h3 className="font-serif-display text-xl italic flex items-center gap-2">
              <Quote size={16} className="text-journal-accent" />
              Daily Mantra
            </h3>
            <button 
              onClick={handleRefreshMantra}
              disabled={isGeneratingMantra}
              className="p-3 -m-2 hover:bg-journal-accent/5 rounded-full transition-colors disabled:opacity-30 cursor-pointer"
            >
              <RefreshCw size={16} className={cn(isGeneratingMantra && "animate-spin")} />
            </button>
          </div>
          <blockquote className="relative z-10">
            <p className="text-lg leading-relaxed mb-4 font-serif-body">
              "{currentEntry.mantra?.text}"
            </p>
            <footer className="text-sm opacity-60 italic">— {currentEntry.mantra?.author}</footer>
          </blockquote>
          {currentEntry.mantra?.context && (
            <div className="mt-4 pt-4 border-t border-journal-accent/10 text-xs opacity-60 leading-relaxed italic">
              <p className="mb-1 font-bold uppercase tracking-widest text-[8px]">Reflection</p>
              {currentEntry.mantra.context}
            </div>
          )}
        </section>

        {/* Gratitude */}
        <section>
          <h3 className="font-serif-display text-xl italic mb-4 flex items-center gap-2">
            <Heart size={16} className="text-journal-accent" />
            Gratitude
          </h3>
          <div className="space-y-6">
            {currentEntry.gratitude?.map((item, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:gap-4 sm:items-center">
                <span className="text-journal-accent/30 font-serif-display italic text-sm sm:text-base mb-1 sm:mb-0 shrink-0">I am grateful for...</span>
                <TextareaAutosize
                  value={item}
                  onChange={(e) => handleGratitudeChange(i, e.target.value)}
                  placeholder="..."
                  className="flex-1 bg-transparent border-b border-journal-accent/5 py-1 px-1 focus:outline-none focus:border-journal-accent/30 transition-colors resize-none overflow-hidden"
                />
              </div>
            ))}
          </div>
        </section>

        {/* Photos Section */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-serif-display text-xl italic flex items-center gap-2">
              <Camera size={16} className="text-journal-accent" />
              Soulful Moments
            </h3>
            {(currentEntry.photos?.length || 0) < 3 && (
              <label className="cursor-pointer p-2 hover:bg-journal-accent/5 rounded-full transition-colors">
                <Plus size={16} className="text-journal-accent" />
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={handlePhotoUpload}
                />
              </label>
            )}
          </div>
          
          <div className="flex flex-wrap gap-6 justify-center">
            {currentEntry.photos && currentEntry.photos.length > 0 ? (
              currentEntry.photos.map((photo, i) => (
                <SoulfulMomentCard 
                  key={i}
                  photo={photo}
                  index={i}
                  date={currentDate}
                  onReplace={handlePhotoReplace}
                  onRemove={handleRemovePhoto}
                />
              ))
            ) : (
              <label className="w-full h-32 border-2 border-dashed border-journal-accent/10 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-journal-accent/5 transition-colors">
                <ImageIcon size={24} className="opacity-20" />
                <span className="text-[10px] uppercase tracking-widest opacity-40">Capture a moment</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  className="hidden" 
                  onChange={handlePhotoUpload}
                />
              </label>
            )}
          </div>
        </section>

        {/* Reflection Section */}
        <section className="relative min-h-[120px]">
          {isGeneratingReflection && (
            <div className="absolute inset-0 bg-journal-paper/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-2 rounded-2xl border border-journal-accent/10 shadow-sm">
              <RefreshCw size={24} className="text-journal-accent animate-spin" />
              <p className="text-[10px] uppercase tracking-widest font-bold text-journal-accent">Deepening reflection...</p>
            </div>
          )}
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-serif-display text-xl italic flex items-center gap-2">
              <Sparkles size={16} className="text-journal-accent" />
              Soulful Reflection
            </h3>
            <button 
              onClick={() => {
                const gratitude = (currentEntry.gratitude as string[]) || ['', '', ''];
                triggerReflection(gratitude);
              }}
              className="p-3 -m-2 hover:bg-journal-accent/5 rounded-full transition-colors cursor-pointer"
            >
              <RefreshCw size={16} className={cn(isGeneratingReflection && "animate-spin")} />
            </button>
          </div>

          {!showReflection ? (
            <button 
              onClick={() => {
                if (reflectionQuestion) {
                  setShowReflection(true);
                } else {
                  triggerReflection(currentEntry.gratitude as string[]);
                }
              }}
              className="w-full py-4 border-2 border-dashed border-journal-accent/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-journal-accent/5 transition-colors cursor-pointer"
            >
              <Sparkles size={24} className="opacity-20" />
              <span className="text-[10px] uppercase tracking-widest opacity-40">Ask for a reflection?</span>
            </button>
          ) : (
            <div className="p-4 border border-journal-accent/10 rounded-2xl italic text-center relative">
              <button 
                onClick={() => setShowReflection(false)}
                className="absolute top-2 right-2 p-1 opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <X size={14} />
              </button>
              <p className="text-journal-accent/70 mb-2 text-sm">"{reflectionQuestion}"</p>
              <TextareaAutosize 
                className="w-full bg-transparent border-none focus:outline-none text-center resize-none"
                placeholder="Write your heart here..."
                minRows={3}
                value={reflectionAnswer}
                onChange={(e) => handleReflectionAnswerChange(e.target.value)}
              />
            </div>
          )}
        </section>
      </div>

      {/* Page Number & Footer Actions */}
      <div className="mt-auto pt-4 pb-4 flex flex-col items-center gap-4 border-t border-journal-accent/10">
        <button 
          onClick={handleSave}
          className="bg-journal-accent text-journal-paper px-8 py-3 rounded-full flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-journal-accent/20 cursor-pointer"
        >
          <Save size={18} />
          <span>Save Entry</span>
        </button>

        <div className="text-[10px] uppercase tracking-widest opacity-20 font-serif-display">
          Page {getDayOfYear(currentDate)}
        </div>
      </div>
    </div>
  );
};
