import React, { useState, useEffect, useMemo } from 'react';
import { format, getDayOfYear, addDays, subDays, isSameDay, isToday } from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, 
  Calendar, 
  Search, 
  Heart, 
  Sparkles, 
  Quote, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Save, 
  History,
  Trash2,
  Edit2,
  Check,
  RefreshCw,
  X,
  Settings,
  Palette,
  Type as TypeIcon,
  Square
} from 'lucide-react';
import { cn } from './lib/utils';
import { Entry, Mood, MOODS, MANTRAS, AffirmationCategory, AFFIRMATION_CATEGORIES, ThemeConfig, NotebookConfig } from './types';
import { generateAffirmations, generateReflectionQuestion, generateMantraExplanation } from './services/ai';
import { NotebookCover } from './components/NotebookCover';

export default function App() {
  const [entries, setEntries] = useState<Entry[]>(() => {
    const saved = localStorage.getItem('soul_journal_entries');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('soul_journal_theme');
    return saved ? JSON.parse(saved) : {
      texture: 'cream',
      border: 'ornate',
      font: 'serif-display',
      coverColor: '#f5f5f0'
    };
  });

  const [notebookConfig, setNotebookConfig] = useState<NotebookConfig>(() => {
    const saved = localStorage.getItem('soul_journal_config');
    return saved ? JSON.parse(saved) : {
      title: 'NOTE BOOK',
      year: new Date().getFullYear(),
      owner: 'Uyen'
    };
  });

  const [view, setView] = useState<'cover' | 'today' | 'history' | 'mood-check' | 'category-select' | 'settings'>('cover');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  
  const [currentMood, setCurrentMood] = useState<Mood | null>(null);
  const [currentCategory, setCurrentCategory] = useState<AffirmationCategory | null>(null);
  const [currentEntry, setCurrentEntry] = useState<Partial<Entry>>({
    affirmations: ['', '', ''],
    gratitude: ['', '', ''],
    mantra: MANTRAS[Math.floor(Math.random() * MANTRAS.length)]
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [reflectionQuestion, setReflectionQuestion] = useState<string | null>(null);
  const [reflectionAnswer, setReflectionAnswer] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showReflection, setShowReflection] = useState(false);
  const [autoReflection, setAutoReflection] = useState(false);

  useEffect(() => {
    localStorage.setItem('soul_journal_entries', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('soul_journal_theme', JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('soul_journal_config', JSON.stringify(notebookConfig));
  }, [notebookConfig]);

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const existingEntry = useMemo(() => 
    entries.find(e => isSameDay(new Date(e.date), currentDate)),
  [entries, currentDate]);

  useEffect(() => {
    const syncEntry = async () => {
      if (existingEntry) {
        setCurrentEntry(existingEntry);
        setCurrentMood(existingEntry.mood as Mood);
        setCurrentCategory(existingEntry.category as AffirmationCategory);
        
        // Handle migration from old 'reflection' field to 'reflectionQuestion'
        const question = existingEntry.reflectionQuestion || (existingEntry as any).reflection || null;
        setReflectionQuestion(question);
        setReflectionAnswer(existingEntry.reflectionAnswer || '');
        setShowReflection(!!question);
        
        // Ensure mantra always has explanation if missing
        if (existingEntry.mantra && !existingEntry.mantra.context) {
          setIsGenerating(true);
          const explanation = await generateMantraExplanation(existingEntry.mantra.text, existingEntry.mantra.author);
          const updatedEntry = { 
            ...existingEntry, 
            mantra: { ...existingEntry.mantra, context: explanation } 
          };
          setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
          setIsGenerating(false);
        }
      } else {
        // Reset for new day
        const randomMantra = MANTRAS[Math.floor(Math.random() * MANTRAS.length)];
        setCurrentEntry({
          affirmations: ['', '', ''],
          gratitude: ['', '', ''],
          mantra: randomMantra
        });
        setCurrentMood(null);
        setCurrentCategory(null);
        setReflectionQuestion(null);
        setReflectionAnswer('');
        setShowReflection(false);

        // Auto-generate explanation for the initial random mantra if it's missing
        if (!randomMantra.context) {
          setIsGenerating(true);
          const explanation = await generateMantraExplanation(randomMantra.text, randomMantra.author);
          setCurrentEntry(prev => ({
            ...prev,
            mantra: { ...randomMantra, context: explanation }
          }));
          setIsGenerating(false);
        }
      }
    };

    syncEntry();
  }, [existingEntry, currentDate]); // Include existingEntry to keep state in sync

  const handleOpenNotebook = () => {
    const now = new Date();
    setCurrentDate(now);
    
    // Check if an entry already exists for today
    const todayStr = format(now, 'yyyy-MM-dd');
    const todayEntry = entries.find(e => isSameDay(new Date(e.date), now));
    
    if (todayEntry) {
      // Sync state immediately to avoid flicker and ensure selection screens are skipped
      setCurrentEntry(todayEntry);
      setCurrentMood(todayEntry.mood as Mood);
      setCurrentCategory(todayEntry.category as AffirmationCategory);
      
      const question = todayEntry.reflectionQuestion || (todayEntry as any).reflection || null;
      setReflectionQuestion(question);
      setReflectionAnswer(todayEntry.reflectionAnswer || '');
      setShowReflection(!!question);
      
      setView('today');
    } else {
      setView('mood-check');
    }
  };

  const handleMoodSelect = (mood: Mood) => {
    setCurrentMood(mood);
    setView('category-select');
  };

  const handleCategorySelect = async (category: AffirmationCategory) => {
    setCurrentCategory(category);
    setView('today'); // Navigate immediately
    
    setIsGenerating(true);
    try {
      const suggested = await generateAffirmations(category);
      
      const newEntry: Entry = {
        id: crypto.randomUUID(),
        date: currentDate.toISOString(),
        mood: currentMood!,
        category,
        affirmations: suggested,
        mantra: currentEntry.mantra as any,
        gratitude: currentEntry.gratitude as string[],
        reflectionQuestion: reflectionQuestion || undefined,
        reflectionAnswer: reflectionAnswer || ''
      };

      setEntries([newEntry, ...entries]);
      setCurrentEntry(newEntry);
    } catch (error) {
      console.error("Failed to generate affirmations:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    const newEntry: Entry = {
      id: existingEntry?.id || crypto.randomUUID(),
      date: currentDate.toISOString(),
      mood: currentMood!,
      category: currentCategory!,
      affirmations: currentEntry.affirmations as string[],
      mantra: currentEntry.mantra as any,
      gratitude: currentEntry.gratitude as string[],
      reflectionQuestion: reflectionQuestion || undefined,
      reflectionAnswer: reflectionAnswer || undefined
    };

    if (existingEntry) {
      setEntries(entries.map(e => e.id === existingEntry.id ? newEntry : e));
    } else {
      setEntries([newEntry, ...entries]);
    }
    alert('Journal entry saved. ♡');
  };

  const handlePrevDay = () => {
    setDirection(-1);
    setCurrentDate(prev => subDays(prev, 1));
    if (view !== 'today') setView('today');
  };

  const handleNextDay = () => {
    setDirection(1);
    setCurrentDate(prev => addDays(prev, 1));
    if (view !== 'today') setView('today');
  };

  const handleJumpToToday = () => {
    const today = new Date();
    if (isSameDay(currentDate, today)) return;
    setDirection(currentDate < today ? 1 : -1);
    setCurrentDate(today);
    if (view !== 'today') setView('today');
  };

  const handleRefreshAffirmations = async () => {
    if (!currentCategory) return;
    setIsGenerating(true);
    const suggested = await generateAffirmations(currentCategory);
    setCurrentEntry(prev => ({ ...prev, affirmations: suggested }));
    setIsGenerating(false);
  };

  const handleRefreshMantra = async () => {
    setIsGenerating(true);
    const randomMantra = MANTRAS[Math.floor(Math.random() * MANTRAS.length)];
    let explanation = randomMantra.context;
    
    if (!explanation) {
      explanation = await generateMantraExplanation(randomMantra.text, randomMantra.author);
    }
    
    setCurrentEntry(prev => ({ 
      ...prev, 
      mantra: { ...randomMantra, context: explanation } 
    }));
    setIsGenerating(false);
  };

  const handleGratitudeChange = (index: number, value: string) => {
    const newGratitude = [...(currentEntry.gratitude || ['', '', ''])];
    newGratitude[index] = value;
    setCurrentEntry(prev => ({ ...prev, gratitude: newGratitude }));
    
    // Auto-save
    if (existingEntry) {
      const updatedEntry = { ...existingEntry, gratitude: newGratitude };
      setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
    }

    if (autoReflection && newGratitude.every(g => g.trim().length > 0) && !reflectionQuestion) {
      triggerReflection(newGratitude);
    }
  };

  const triggerReflection = async (gratitude: string[]) => {
    if (!currentMood) return;
    setIsGenerating(true);
    try {
      const q = await generateReflectionQuestion(gratitude, currentMood);
      setReflectionQuestion(q);
      setShowReflection(true);
    } catch (error) {
      console.error("Failed to generate reflection:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAffirmationChange = (index: number, value: string) => {
    const newAffirmations = [...(currentEntry.affirmations || ['', '', ''])];
    newAffirmations[index] = value;
    setCurrentEntry(prev => ({ ...prev, affirmations: newAffirmations }));

    // Auto-save
    if (existingEntry) {
      const updatedEntry = { ...existingEntry, affirmations: newAffirmations };
      setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
    }
  };

  const filteredEntries = entries.filter(e => 
    e.affirmations.some(a => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
    e.gratitude.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
    e.mantra.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const monthlyStats = useMemo(() => {
    const now = currentDate;
    const thisMonth = entries.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    const moods = thisMonth.reduce((acc, e) => {
      acc[e.mood] = (acc[e.mood] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topMood = Object.entries(moods).sort((a, b) => (b[1] as number) - (a[1] as number))[0];

    return {
      count: thisMonth.length,
      topMood: topMood ? MOODS.find(m => m.type === topMood[0]) : null
    };
  }, [entries, currentDate]);

  const streak = useMemo(() => {
    return entries.length;
  }, [entries]);

  const themeClasses = cn(
    "journal-page p-8 sm:p-12 rounded-lg min-h-[80vh] flex flex-col relative",
    `texture-${theme.texture}`,
    `border-${theme.border}`,
    `font-${theme.font}`,
    "page-shadow"
  );

  const pageVariants = {
    initial: (direction: number) => ({
      x: direction > 0 ? 500 : -500,
      opacity: 0,
      rotateY: direction > 0 ? 90 : -90,
      scale: 0.9,
      transformOrigin: direction > 0 ? "left" : "right"
    }),
    animate: {
      x: 0,
      opacity: 1,
      rotateY: 0,
      scale: 1,
      transformOrigin: "center"
    },
    exit: (direction: number) => ({
      x: direction > 0 ? -500 : 500,
      opacity: 0,
      rotateY: direction > 0 ? -90 : 90,
      scale: 0.9,
      transformOrigin: direction > 0 ? "right" : "left"
    })
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-8 overflow-x-hidden">
      {/* Navigation Header */}
      {view !== 'cover' && (
        <nav className="fixed top-0 w-full max-w-4xl flex justify-between items-center p-6 z-10">
          <button 
            onClick={() => setView('cover')}
            className="flex items-center gap-2 text-journal-accent opacity-50 hover:opacity-100 transition-opacity"
          >
            <Book size={20} />
            <span className="hidden sm:inline">Close Notebook</span>
          </button>
          
          <div className="flex items-center gap-6">
            {!isSameDay(currentDate, new Date()) && (
              <button 
                onClick={handleJumpToToday}
                className="flex items-center gap-2 text-journal-accent opacity-60 hover:opacity-100 transition-opacity animate-bounce-subtle"
              >
                <Calendar size={18} />
                <span className="hidden sm:inline text-xs uppercase tracking-widest">Today</span>
              </button>
            )}
            <button 
              onClick={() => setView('history')}
              className={cn(
                "flex items-center gap-2 text-journal-accent transition-opacity",
                view === 'history' ? "opacity-100 font-bold" : "opacity-50"
              )}
            >
              <History size={20} />
              <span className="hidden sm:inline">History</span>
            </button>
            <button 
              onClick={() => setView('settings')}
              className={cn(
                "flex items-center gap-2 text-journal-accent transition-opacity",
                view === 'settings' ? "opacity-100 font-bold" : "opacity-50"
              )}
            >
              <Settings size={20} />
              <span className="hidden sm:inline">Settings</span>
            </button>
            <div className="flex items-center gap-1 text-journal-accent/60 text-sm">
              <Sparkles size={14} />
              <span>{streak} day streak</span>
            </div>
          </div>
        </nav>
      )}

      <main className="w-full max-w-2xl mt-16 mb-8 flex flex-col items-center">
        <AnimatePresence mode="wait" custom={direction}>
          {view === 'cover' ? (
            <div key="cover" className="flex flex-col items-center">
              <NotebookCover 
                config={notebookConfig} 
                theme={theme} 
                onOpen={handleOpenNotebook} 
              />
              <p className="mt-8 text-journal-accent/40 italic text-sm animate-pulse">
                Click to open your soul journal...
              </p>
            </div>
          ) : (
            <div key="journal-content" className="w-full relative">
              {/* Flick Controls - Only on journal page */}
              {view === 'today' && (
                <>
                  <div className="absolute top-1/2 -translate-y-1/2 -left-16 hidden lg:block">
                    <button 
                      onClick={handlePrevDay}
                      className="p-4 rounded-full hover:bg-journal-accent/5 transition-colors text-journal-accent/40 hover:text-journal-accent"
                    >
                      <ChevronLeft size={32} />
                    </button>
                  </div>
                  <div className="absolute top-1/2 -translate-y-1/2 -right-16 hidden lg:block">
                    <button 
                      onClick={handleNextDay}
                      className="p-4 rounded-full hover:bg-journal-accent/5 transition-colors text-journal-accent/40 hover:text-journal-accent"
                    >
                      <ChevronRight size={32} />
                    </button>
                  </div>
                </>
              )}

              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={dateStr + view}
                  custom={direction}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(e, { offset, velocity }) => {
                    const swipe = offset.x;
                    if (swipe < -100) {
                      handleNextDay();
                    } else if (swipe > 100) {
                      handlePrevDay();
                    }
                  }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 260, 
                    damping: 20,
                    opacity: { duration: 0.2 }
                  }}
                  className="w-full cursor-grab active:cursor-grabbing"
                  style={{ perspective: 2000 }}
                >
                  {view === 'mood-check' && (
                    <div className={cn("journal-page border-ornate texture-cream p-8 sm:p-12 rounded-lg text-center page-shadow relative overflow-hidden")}>
                      <div className="notebook-inner-shadow absolute inset-y-0 left-0 w-8 pointer-events-none" />
                      <div className="page-curl" />
                      
                      {/* Decorative Corners */}
                      <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-journal-accent/20 rounded-tl-sm pointer-events-none" />
                      <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-journal-accent/20 rounded-tr-sm pointer-events-none" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-journal-accent/20 rounded-bl-sm pointer-events-none" />
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-journal-accent/20 rounded-br-sm pointer-events-none" />

                      <h2 className="font-serif-display text-3xl mb-2 italic">Welcome back, {notebookConfig.owner}</h2>
                      <p className="text-journal-ink/60 mb-8">How does your soul feel on this {format(currentDate, 'EEEE')}?</p>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {MOODS.map((m) => (
                          <button
                            key={m.type}
                            onClick={() => handleMoodSelect(m.type)}
                            className="flex flex-col items-center p-4 rounded-xl border border-journal-accent/10 hover:bg-journal-accent/5 transition-colors group"
                          >
                            <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">{m.emoji}</span>
                            <span className="text-xs uppercase tracking-widest font-medium opacity-70">{m.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {view === 'category-select' && (
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
                            className="flex items-center gap-4 p-4 rounded-xl border border-journal-accent/10 hover:bg-journal-accent/5 transition-colors group text-left"
                          >
                            <span className="text-2xl group-hover:scale-110 transition-transform">{cat.icon}</span>
                            <span className="text-sm uppercase tracking-widest font-medium opacity-70">{cat.label}</span>
                          </button>
                        ))}
                      </div>
                      <button 
                        onClick={() => setView('mood-check')}
                        className="mt-8 text-xs uppercase tracking-widest opacity-40 hover:opacity-100"
                      >
                        ← Back to mood
                      </button>
                    </div>
                  )}

                  {view === 'today' && (
                    <div className={cn(themeClasses, "relative overflow-hidden")}>
                      <div className="notebook-inner-shadow absolute inset-y-0 left-0 w-8 pointer-events-none" />
                      <div className="page-curl" />
                      
                      {/* Decorative Corners */}
                      <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-journal-accent/20 rounded-tl-sm pointer-events-none" />
                      <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-journal-accent/20 rounded-tr-sm pointer-events-none" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-journal-accent/20 rounded-bl-sm pointer-events-none" />
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-journal-accent/20 rounded-br-sm pointer-events-none" />

                      {/* Header */}
                      <div className="flex justify-between items-start mb-12 border-b border-journal-accent/10 pb-6">
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
                              className="px-4 py-2 bg-journal-accent/10 hover:bg-journal-accent/20 rounded-full text-[10px] uppercase tracking-widest font-bold transition-colors"
                            >
                              Add Mood & Category
                            </button>
                          ) : (
                            <>
                              {currentMood && (
                                <div className="flex flex-col items-end">
                                  <span className="text-2xl">{MOODS.find(m => m.type === currentMood)?.emoji}</span>
                                  <span className="text-[10px] uppercase tracking-widest opacity-40">{currentMood}</span>
                                </div>
                              )}
                              {currentCategory && (
                                <div className="flex items-center gap-1 px-2 py-1 bg-journal-accent/5 rounded-full">
                                  <span className="text-xs">{AFFIRMATION_CATEGORIES.find(c => c.type === currentCategory)?.icon}</span>
                                  <span className="text-[8px] uppercase tracking-widest opacity-60">{currentCategory}</span>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Affirmations */}
                      <section className="mb-12">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-serif-display text-xl italic flex items-center gap-2">
                            <Sparkles size={16} className="text-journal-accent" />
                            Affirmations
                          </h3>
                          <button 
                            onClick={handleRefreshAffirmations}
                            disabled={isGenerating}
                            className="p-1 hover:bg-journal-accent/5 rounded-full transition-colors disabled:opacity-30"
                          >
                            <RefreshCw size={14} className={cn(isGenerating && "animate-spin")} />
                          </button>
                        </div>
                        <div className="space-y-4 relative">
                          {isGenerating && (!currentEntry.affirmations || currentEntry.affirmations.every(a => a === '')) && (
                            <div className="absolute inset-0 bg-journal-paper/50 backdrop-blur-[1px] z-10 flex flex-col items-center justify-center gap-2 rounded-lg">
                              <RefreshCw size={24} className="text-journal-accent animate-spin" />
                              <p className="text-[10px] uppercase tracking-widest opacity-60">Whispering affirmations...</p>
                            </div>
                          )}
                          {currentEntry.affirmations?.map((aff, i) => (
                            <div key={i} className="relative group">
                              <input
                                type="text"
                                value={aff}
                                onChange={(e) => handleAffirmationChange(i, e.target.value)}
                                placeholder="..."
                                className="w-full bg-transparent border-b border-journal-accent/5 py-2 px-1 focus:outline-none focus:border-journal-accent/30 transition-colors italic text-lg"
                              />
                              <div className="absolute left-[-20px] top-3 opacity-20 text-xs">{i + 1}</div>
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Daily Mantra */}
                      <section className="mb-12 p-6 bg-journal-accent/5 rounded-2xl relative overflow-hidden">
                        <Quote className="absolute top-[-10px] right-[-10px] opacity-5 w-24 h-24" />
                        <div className="flex justify-between items-center mb-4 relative z-10">
                          <h3 className="font-serif-display text-xl italic flex items-center gap-2">
                            <Quote size={16} className="text-journal-accent" />
                            Daily Mantra
                          </h3>
                          <button 
                            onClick={handleRefreshMantra}
                            disabled={isGenerating}
                            className="p-1 hover:bg-journal-accent/5 rounded-full transition-colors disabled:opacity-30"
                          >
                            <RefreshCw size={14} className={cn(isGenerating && "animate-spin")} />
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
                      <section className="mb-12">
                        <h3 className="font-serif-display text-xl italic mb-4 flex items-center gap-2">
                          <Heart size={16} className="text-journal-accent" />
                          Gratitude
                        </h3>
                        <div className="space-y-4">
                          {currentEntry.gratitude?.map((item, i) => (
                            <div key={i} className="flex gap-4 items-center">
                              <span className="text-journal-accent/30 font-serif-display italic">I am grateful for...</span>
                              <input
                                type="text"
                                value={item}
                                onChange={(e) => handleGratitudeChange(i, e.target.value)}
                                placeholder="..."
                                className="flex-1 bg-transparent border-b border-journal-accent/5 py-2 px-1 focus:outline-none focus:border-journal-accent/30 transition-colors"
                              />
                            </div>
                          ))}
                        </div>
                      </section>

                      {/* Reflection */}
                      {showReflection && reflectionQuestion && (
                        <div className="mb-12 p-6 border border-journal-accent/10 rounded-2xl italic text-center">
                          <p className="text-journal-accent/70 mb-4">"{reflectionQuestion}"</p>
                          <textarea 
                            className="w-full bg-transparent border-none focus:outline-none text-center resize-none"
                            placeholder="Write your heart here..."
                            rows={3}
                            value={reflectionAnswer}
                            onChange={(e) => {
                              const val = e.target.value;
                              setReflectionAnswer(val);
                              // Auto-save reflection
                              if (existingEntry) {
                                const updatedEntry = { ...existingEntry, reflectionAnswer: val };
                                setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
                              }
                            }}
                          />
                        </div>
                      )}

                      {/* Page Number */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest opacity-20 font-serif-display">
                        Page {getDayOfYear(currentDate)}
                      </div>

                      {/* Footer Actions */}
                      <div className="mt-auto pt-8 flex justify-between items-center">
                        <button 
                          onClick={() => {
                            if (showReflection) {
                              setShowReflection(false);
                            } else if (reflectionQuestion) {
                              setShowReflection(true);
                            } else {
                              triggerReflection(currentEntry.gratitude as string[]);
                            }
                          }}
                          className="text-xs uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                        >
                          {showReflection ? "Hide Reflection" : "Ask Reflection?"}
                        </button>
                        <button 
                          onClick={handleSave}
                          className="bg-journal-accent text-journal-paper px-8 py-3 rounded-full flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-journal-accent/20"
                        >
                          <Save size={18} />
                          <span>Save Entry</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {view === 'history' && (
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

                      {filteredEntries.length === 0 ? (
                        <div className="text-center py-20 opacity-30 italic">
                          No entries found. Start your journey today.
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {filteredEntries.map((entry) => (
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
                          ))}
                        </div>
                      )}

                      {/* Page Number */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest opacity-20 font-serif-display">
                        Index
                      </div>
                    </div>
                  )}

                  {view === 'settings' && (
                    <div className={cn("journal-page border-ornate texture-cream p-8 sm:p-12 rounded-lg page-shadow relative overflow-hidden")}>
                      <div className="notebook-inner-shadow absolute inset-y-0 left-0 w-8 pointer-events-none" />
                      <div className="page-curl" />

                      {/* Decorative Corners */}
                      <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-journal-accent/20 rounded-tl-sm pointer-events-none" />
                      <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-journal-accent/20 rounded-tr-sm pointer-events-none" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-journal-accent/20 rounded-bl-sm pointer-events-none" />
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-journal-accent/20 rounded-br-sm pointer-events-none" />

                      <h2 className="font-serif-display text-3xl mb-8 italic text-center">Journal Settings</h2>
                      
                      <div className="space-y-10">
                        {/* Notebook Config */}
                        <section>
                          <h3 className="text-xs uppercase tracking-widest font-bold opacity-40 mb-4 flex items-center gap-2">
                            <Book size={14} />
                            Notebook Identity
                          </h3>
                          <div className="space-y-4">
                            <div>
                              <label className="text-[10px] uppercase tracking-widest opacity-50 mb-1 block">Owner Name</label>
                              <input 
                                type="text"
                                value={notebookConfig.owner}
                                onChange={(e) => setNotebookConfig({ ...notebookConfig, owner: e.target.value })}
                                className="w-full bg-journal-accent/5 border-none rounded-lg p-3 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-widest opacity-50 mb-1 block">Notebook Title</label>
                              <input 
                                type="text"
                                value={notebookConfig.title}
                                onChange={(e) => setNotebookConfig({ ...notebookConfig, title: e.target.value })}
                                className="w-full bg-journal-accent/5 border-none rounded-lg p-3 focus:outline-none"
                              />
                            </div>
                            <button 
                              onClick={() => {
                                const year = prompt("Enter year for new notebook:", (new Date().getFullYear() + 1).toString());
                                if (year) {
                                  const shouldClear = confirm("Would you like to start fresh with no entries for the new year?");
                                  if (shouldClear) {
                                    setEntries([]);
                                  }
                                  setNotebookConfig({ ...notebookConfig, year: parseInt(year) });
                                  alert(`New notebook for ${year} created! ♡`);
                                }
                              }}
                              className="w-full py-2 border border-journal-accent/20 rounded-lg text-xs uppercase tracking-widest hover:bg-journal-accent/5 transition-colors"
                            >
                              Create New Year Notebook
                            </button>
                          </div>
                        </section>

                        {/* AI Features */}
                        <section>
                          <h3 className="text-xs uppercase tracking-widest font-bold opacity-40 mb-4 flex items-center gap-2">
                            <Sparkles size={14} />
                            AI Features
                          </h3>
                          <div className="flex items-center justify-between p-4 bg-journal-accent/5 rounded-xl">
                            <div>
                              <p className="text-sm font-medium">Automatic Reflection</p>
                              <p className="text-[10px] opacity-50">AI asks a question after gratitude entries</p>
                            </div>
                            <button 
                              onClick={() => setAutoReflection(!autoReflection)}
                              className={cn(
                                "w-12 h-6 rounded-full transition-colors relative",
                                autoReflection ? "bg-journal-accent" : "bg-journal-accent/20"
                              )}
                            >
                              <div className={cn(
                                "absolute top-1 w-4 h-4 rounded-full bg-white transition-all",
                                autoReflection ? "left-7" : "left-1"
                              )} />
                            </button>
                          </div>
                        </section>

                        {/* Theme Customization */}
                        <section>
                          <h3 className="text-xs uppercase tracking-widest font-bold opacity-40 mb-4 flex items-center gap-2">
                            <Palette size={14} />
                            Theme Customization
                          </h3>
                          
                          <div className="space-y-6">
                            {/* Cover Color */}
                            <div>
                              <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Cover Color</p>
                              <div className="flex gap-2">
                                {['#f5f5f0', '#2c2c2c', '#5A5A40', '#8B4513', '#4682B4'].map((c) => (
                                  <button
                                    key={c}
                                    onClick={() => setTheme({ ...theme, coverColor: c })}
                                    className={cn(
                                      "w-8 h-8 rounded-full border-2 transition-all",
                                      theme.coverColor === c ? "border-journal-accent scale-110" : "border-transparent"
                                    )}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Texture */}
                            <div>
                              <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Paper Texture</p>
                              <div className="grid grid-cols-4 gap-2">
                                {['cream', 'white', 'parchment', 'linen'].map((t) => (
                                  <button
                                    key={t}
                                    onClick={() => setTheme({ ...theme, texture: t as any })}
                                    className={cn(
                                      "h-12 rounded-lg border transition-all capitalize text-[10px]",
                                      theme.texture === t ? "border-journal-accent ring-1 ring-journal-accent" : "border-journal-accent/10",
                                      `texture-${t}`
                                    )}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Font */}
                            <div>
                              <p className="text-[10px] uppercase tracking-widest opacity-50 mb-2">Typography</p>
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { id: 'serif-display', name: 'Cormorant' },
                                  { id: 'serif-body', name: 'Baskerville' },
                                  { id: 'playfair', name: 'Playfair' }
                                ].map((f) => (
                                  <button
                                    key={f.id}
                                    onClick={() => setTheme({ ...theme, font: f.id as any })}
                                    className={cn(
                                      "h-12 rounded-lg border transition-all text-[10px]",
                                      theme.font === f.id ? "border-journal-accent ring-1 ring-journal-accent" : "border-journal-accent/10",
                                      `font-${f.id}`
                                    )}
                                  >
                                    {f.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </section>
                      </div>
                      
                      {/* Page Number */}
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-widest opacity-20 font-serif-display">
                        Preferences
                      </div>

                      <button 
                        onClick={() => setView('today')}
                        className="mt-12 w-full py-3 bg-journal-accent text-journal-paper rounded-full text-sm font-medium"
                      >
                        Done
                      </button>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
              
              {/* Mobile Flick Controls - Only on journal page */}
              {view === 'today' && (
                <div className="flex lg:hidden justify-between mt-8 w-full px-4">
                  <button 
                    onClick={handlePrevDay}
                    className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-40 hover:opacity-100"
                  >
                    <ChevronLeft size={16} />
                    Prev Day
                  </button>
                  <button 
                    onClick={handleNextDay}
                    className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-40 hover:opacity-100"
                  >
                    Next Day
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
