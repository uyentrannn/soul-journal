import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  format, 
  getDayOfYear, 
  addDays, 
  subDays, 
  isSameDay,
  isToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek 
} from 'date-fns';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Book, 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  History,
  Settings,
  Sparkles,
  Check
} from 'lucide-react';
import { cn } from './lib/utils';
import { Entry, Mood, AffirmationCategory, ThemeConfig, NotebookConfig } from './types';
import { generateAffirmations, generateReflectionQuestion, generateMantraExplanation, generateDailyMantra } from './services/ai';
import { NotebookCover } from './components/NotebookCover';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { getEntriesFromDB, saveEntriesToDB, clearEntriesInDB } from './lib/indexedDB';
import { compressAndResizeImage } from './lib/imageProcessor';
import { calculateMonthlyStats, calculateStreak } from './lib/stats';
import { useAuth } from './context/AuthContext';
import { fetchEntriesFromCloud, upsertEntryToCloud, uploadEntryPhoto } from './services/db';

// Import newly created presentational views
import { MoodCheckView } from './components/views/MoodCheckView';
import { CategorySelectView } from './components/views/CategorySelectView';
import { JournalEditorView } from './components/views/JournalEditorView';
import { HistoryView } from './components/views/HistoryView';
import { CalendarView } from './components/views/CalendarView';
import { SettingsView } from './components/views/SettingsView';

export default function App() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoadingEntries, setIsLoadingEntries] = useState(true);
  
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    try {
      const saved = localStorage.getItem('soul_journal_theme');
      return saved ? JSON.parse(saved) : {
        texture: 'cream',
        border: 'ornate',
        font: 'serif-display',
        coverColor: '#f5f5f0'
      };
    } catch (e) {
      return {
        texture: 'cream',
        border: 'ornate',
        font: 'serif-display',
        coverColor: '#f5f5f0'
      };
    }
  });

  const [notebookConfig, setNotebookConfig] = useState<NotebookConfig>(() => {
    try {
      const saved = localStorage.getItem('soul_journal_config');
      return saved ? JSON.parse(saved) : {
        title: 'NOTE BOOK',
        year: new Date().getFullYear(),
        owner: 'Uyen'
      };
    } catch (e) {
      return {
        title: 'NOTE BOOK',
        year: new Date().getFullYear(),
        owner: 'Uyen'
      };
    }
  });

  const [view, setView] = useState<'cover' | 'today' | 'history' | 'mood-check' | 'category-select' | 'settings' | 'calendar'>('cover');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right
  
  const [currentMood, setCurrentMood] = useState<Mood | null>(null);
  const [currentCategory, setCurrentCategory] = useState<AffirmationCategory | null>(null);
  const [currentEntry, setCurrentEntry] = useState<Partial<Entry>>({
    affirmations: ['', '', ''],
    gratitude: ['', '', ''],
    mantra: {
      text: "The happiness of your life depends upon the quality of your thoughts.",
      author: "Marcus Aurelius",
      context: "A reminder that our internal perspective shapes our external reality."
    },
    photos: []
  });
  
  const [isGeneratingAffirmations, setIsGeneratingAffirmations] = useState(false);
  const [isGeneratingMantra, setIsGeneratingMantra] = useState(false);
  const [isGeneratingReflection, setIsGeneratingReflection] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false); // Used for total page actions like day change
  const [reflectionQuestion, setReflectionQuestion] = useState<string | null>(null);
  const [reflectionAnswer, setReflectionAnswer] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const {
    user,
    isSyncing,
    setIsSyncing,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authMode,
    setAuthMode,
    handleLogin: handleLoginContext,
    handleSignUp: handleSignUpContext,
    handleLogout: handleLogoutContext,
    handleResetPassword: handleResetPasswordContext,
    handleUpdatePassword: handleUpdatePasswordContext
  } = useAuth();
  const [showReflection, setShowReflection] = useState(false);
  const [autoReflection, setAutoReflection] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });


  useEffect(() => {
    try {
      localStorage.setItem('soul_journal_theme', JSON.stringify(theme));
    } catch (error) {
      console.error("Failed to save theme to localStorage:", error);
    }
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem('soul_journal_config', JSON.stringify(notebookConfig));
    } catch (error) {
      console.error("Failed to save config to localStorage:", error);
    }
  }, [notebookConfig]);

  // Redirect to reset settings screen if user session recovers password
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset');
        setView('settings');
      }
    });
    return () => subscription.unsubscribe();
  }, [setAuthMode, setView]);

  useEffect(() => {
    if (user && isSupabaseConfigured) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    if (!isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      const data = await fetchEntriesFromCloud();
      setEntries(data);
      safeSaveEntries(data);
    } catch (error) {
      console.error('Error fetching entries from cloud:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        showToast('Network error: Could not connect to cloud. ♡');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = () => handleLoginContext(showToast);
  const handleSignUp = () => handleSignUpContext(showToast);
  const handleResetPassword = () => handleResetPasswordContext(showToast);
  const handleUpdatePassword = () => handleUpdatePasswordContext(showToast);
  const handleLogout = () => handleLogoutContext(showToast, async () => {
    setEntries([]);
    await clearEntriesInDB();
    localStorage.removeItem('soul_journal_entries');
  });

  const handlePrevMonth = () => setCalendarMonth(prev => subMonths(prev, 1));
  const handleNextMonth = () => setCalendarMonth(prev => addMonths(prev, 1));

  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(calendarMonth));
    const end = endOfWeek(endOfMonth(calendarMonth));
    return eachDayOfInterval({ start, end });
  }, [calendarMonth]);

  const dateStr = format(currentDate, 'yyyy-MM-dd');
  const existingEntry = useMemo(() => 
    entries.find(e => isSameDay(new Date(e.date), currentDate)),
  [entries, currentDate]);
  const toastRef = useRef<{ show: boolean; message: string }>({ show: false, message: '' });
  const lastSyncedDateRef = useRef<string | null>(null);

  // Auto-save references
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingEntryToSaveRef = useRef<Entry | null>(null);

  // Load entries from IndexedDB on startup (with localStorage migration/fallback)
  useEffect(() => {
    const bootstrapDB = async () => {
      try {
        let loadedEntries = await getEntriesFromDB();
        
        // If DB is empty, check if we have data in localStorage to migrate
        if (loadedEntries.length === 0) {
          const saved = localStorage.getItem('soul_journal_entries');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (Array.isArray(parsed) && parsed.length > 0) {
                console.log("Migrating entries from localStorage to IndexedDB...");
                await saveEntriesToDB(parsed);
                loadedEntries = parsed;
              }
            } catch (e) {
              console.error("Failed to parse localStorage entries during migration:", e);
            }
          }
        }
        
        setEntries(loadedEntries);
      } catch (err) {
        console.error("IndexedDB initialization error:", err);
        // Fallback to localStorage
        const saved = localStorage.getItem('soul_journal_entries');
        if (saved) {
          try {
            setEntries(JSON.parse(saved));
          } catch (e) {
            console.error("Failed to parse fallback localStorage entries:", e);
          }
        }
      } finally {
        setIsLoadingEntries(false);
      }
    };

    bootstrapDB();
  }, []);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const safeSaveEntries = async (entriesToSave: Entry[]) => {
    try {
      await saveEntriesToDB(entriesToSave);
      // Backup to localStorage (without base64 images to prevent QuotaExceededError)
      const entriesForBackup = entriesToSave.map(e => ({
        ...e,
        photos: e.photos ? e.photos.map(p => p.startsWith('data:image') ? '' : p).filter(Boolean) : []
      }));
      localStorage.setItem('soul_journal_entries', JSON.stringify(entriesForBackup));
    } catch (error) {
      console.error("Failed to save entries to IndexedDB/localStorage backup:", error);
    }
  };

  const performAutoSave = async () => {
    if (!pendingEntryToSaveRef.current) return;
    
    const entryToSave = pendingEntryToSaveRef.current;
    pendingEntryToSaveRef.current = null;
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }

    console.log("Auto-saving entry to database and cloud...", entryToSave.id);
    setEntries(prev => prev.map(e => e.id === entryToSave.id ? entryToSave : e));
    await syncSingleEntry(entryToSave);
  };

  const queueAutoSave = (updatedEntry: Entry) => {
    pendingEntryToSaveRef.current = updatedEntry;

    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(async () => {
      await performAutoSave();
    }, 1500); // Save 1.5 seconds after typing stops
  };

  const flushAutoSave = async () => {
    if (pendingEntryToSaveRef.current) {
      await performAutoSave();
    }
  };

  // Flush pending auto-saves when changing date or view
  useEffect(() => {
    return () => {
      if (pendingEntryToSaveRef.current) {
        performAutoSave();
      }
    };
  }, [currentDate, view]);

  // Keep database synced with entries state
  useEffect(() => {
    if (!isLoadingEntries) {
      safeSaveEntries(entries);
    }
  }, [entries, isLoadingEntries]);

  useEffect(() => {
    const currentDateStr = format(currentDate, 'yyyy-MM-dd');
    
    // Only run if the date has changed
    if (lastSyncedDateRef.current === currentDateStr) return;

    if (existingEntry) {
      // Set existing entry states synchronously to prevent UI lag
      setCurrentEntry(existingEntry);
      setCurrentMood(existingEntry.mood as Mood);
      setCurrentCategory(existingEntry.category as AffirmationCategory);
      
      const question = existingEntry.reflectionQuestion || (existingEntry as any).reflection || null;
      setReflectionQuestion(question);
      setReflectionAnswer(existingEntry.reflectionAnswer || '');
      setShowReflection(!!question);
      
      // Async: Ensure mantra explanation context is generated if missing
      if (existingEntry.mantra && !existingEntry.mantra.context) {
        const fetchMantraContext = async () => {
          setIsGenerating(true);
          try {
            const explanation = await generateMantraExplanation(existingEntry.mantra.text, existingEntry.mantra.author);
            const updatedEntry = { 
              ...existingEntry, 
              mantra: { ...existingEntry.mantra, context: explanation } 
            };
            setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
            syncSingleEntry(updatedEntry);
          } catch (error) {
            console.error("Failed to generate mantra context:", error);
          } finally {
            setIsGenerating(false);
          }
        };
        fetchMantraContext();
      }
    } else {
      // Synchronously reset for new day (no lag, no previous data persists)
      setCurrentEntry({
        affirmations: ['', '', ''],
        gratitude: ['', '', ''],
        mantra: { text: '', author: '' },
        photos: []
      });
      setCurrentMood(null);
      setCurrentCategory(null);
      setReflectionQuestion(null);
      setReflectionAnswer('');
      setShowReflection(false);
    }
    
    lastSyncedDateRef.current = currentDateStr;
  }, [existingEntry, currentDate]);

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

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleMoodSelect = (mood: Mood) => {
    setCurrentMood(mood);
    if (existingEntry) {
      const updatedEntry = { ...existingEntry, mood };
      setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
      setCurrentEntry(updatedEntry);
      syncSingleEntry(updatedEntry);
    }
    setView('category-select');
  };

  const handleCategorySelect = async (category: AffirmationCategory) => {
    setCurrentCategory(category);
    setView('today'); // Navigate immediately
    
    setIsGenerating(true);
    try {
      const currentAffs = existingEntry?.affirmations || [];
      const suggestedPromise = generateAffirmations(category, currentAffs);
      const dailyMantraPromise = !existingEntry ? generateDailyMantra() : Promise.resolve(null);

      const [suggested, dailyMantra] = await Promise.all([suggestedPromise, dailyMantraPromise]);
      
      if (existingEntry) {
        const updatedEntry = { 
          ...existingEntry, 
          category,
          affirmations: suggested
        };
        setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
        setCurrentEntry(updatedEntry);
        await syncSingleEntry(updatedEntry);
        showToast('Category updated and affirmations refreshed. ♡');
      } else {
        const newEntry: Entry = {
          id: generateId(),
          date: currentDate.toISOString(),
          mood: currentMood!,
          category,
          affirmations: suggested,
          mantra: dailyMantra || { text: '', author: '' },
          gratitude: currentEntry.gratitude as string[],
          reflectionQuestion: reflectionQuestion || undefined,
          reflectionAnswer: reflectionAnswer || '',
          photos: []
        };

        setEntries(prev => [newEntry, ...prev]);
        setCurrentEntry(newEntry);
      }
    } catch (error) {
      console.error("Failed to generate entry contents:", error);
      showToast('Failed to generate entry contents. ♡');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!currentMood || !currentCategory) {
      showToast('Please select a mood and category first. ♡');
      return;
    }

    try {
      let photosToSave = currentEntry.photos || [];
      const entryId = existingEntry?.id || generateId();

      // If logged in, upload base64 photos to Supabase Storage
      if (user && isSupabaseConfigured) {
        showToast('Syncing with cloud... ♡');
        
        // Upload Photos
        const uploadedPhotos = await Promise.all(
          photosToSave.map(async (photo) => {
            if (photo.startsWith('data:image')) {
              const url = await uploadPhotoToSupabase(photo, entryId);
              return url || photo;
            }
            return photo;
          })
        );
        photosToSave = uploadedPhotos.filter(p => p !== null) as string[];
      }

      const newEntry: Entry = {
        id: entryId,
        date: currentDate.toISOString(),
        mood: currentMood,
        category: currentCategory,
        affirmations: currentEntry.affirmations as string[] || [],
        mantra: currentEntry.mantra as any || { text: '', author: '' },
        gratitude: currentEntry.gratitude as string[] || [],
        reflectionQuestion: reflectionQuestion || undefined,
        reflectionAnswer: reflectionAnswer || undefined,
        photos: photosToSave
      };

      // Local update
      if (existingEntry) {
        setEntries(prev => prev.map(e => e.id === existingEntry.id ? newEntry : e));
      } else {
        setEntries(prev => [newEntry, ...prev]);
      }

      // Supabase sync
      if (user && isSupabaseConfigured) {
        await upsertEntryToCloud(newEntry, user.id);
      }

      showToast('Journal entry saved. ♡');
    } catch (error: any) {
      console.error("Failed to save entry:", error);
      const message = error?.message || "Unknown error";
      showToast(`Error saving entry: ${message}. ♡`);
    }
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

  const syncSingleEntry = async (entry: Entry) => {
    if (user && isSupabaseConfigured) {
      try {
        await upsertEntryToCloud(entry, user.id);
      } catch (error) {
        console.error("Failed to sync entry to cloud:", error);
      }
    }
  };

  const handleRefreshAffirmations = async () => {
    if (!currentCategory) return;
    setIsGeneratingAffirmations(true);
    try {
      const currentAffs = currentEntry.affirmations || [];
      const suggested = await generateAffirmations(currentCategory, currentAffs);
      setCurrentEntry(prev => ({ ...prev, affirmations: suggested }));
      
      if (existingEntry) {
        const updatedEntry = { ...existingEntry, affirmations: suggested };
        setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
        await syncSingleEntry(updatedEntry);
      }
      showToast('Affirmations refreshed. ♡');
    } catch (error) {
      console.error("Failed to refresh affirmations:", error);
    } finally {
      setIsGeneratingAffirmations(false);
    }
  };

  const handleRefreshMantra = async () => {
    setIsGeneratingMantra(true);
    try {
      const currentMantraText = currentEntry.mantra?.text;
      const dailyMantra = await generateDailyMantra(currentMantraText);
      setCurrentEntry(prev => ({ 
        ...prev, 
        mantra: dailyMantra
      }));

      if (existingEntry) {
        const updatedEntry = { 
          ...existingEntry, 
          mantra: dailyMantra
        };
        setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
        await syncSingleEntry(updatedEntry);
      }
      
      showToast('Mantra refreshed. ♡');
    } catch (error) {
      console.error("Failed to refresh mantra:", error);
      showToast('Failed to refresh mantra. ♡');
    } finally {
      setIsGeneratingMantra(false);
    }
  };

  const uploadPhotoToSupabase = async (base64: string, entryId: string): Promise<string | null> => {
    if (!user || !isSupabaseConfigured) return null;
    try {
      return await uploadEntryPhoto(base64, user.id, entryId);
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };



  const handlePhotoReplace = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const inputElement = e.target;

    try {
      // Compress immediately to standard offline formats
      const compressedBase64 = await compressAndResizeImage(file);
      
      let finalPhotoPath = compressedBase64;
      if (user && isSupabaseConfigured) {
        showToast('Uploading to cloud... ♡');
        const entryId = existingEntry?.id || generateId();
        const url = await uploadPhotoToSupabase(compressedBase64, entryId);
        if (url) {
          finalPhotoPath = url;
        }
      }

      const nextPhotos = [...(currentEntry.photos || [])];
      nextPhotos[index] = finalPhotoPath;

      setCurrentEntry(prev => ({ ...prev, photos: nextPhotos }));

      if (existingEntry) {
        const updatedEntry = { ...existingEntry, photos: nextPhotos };
        setEntries(prevEntries => prevEntries.map(e => e.id === existingEntry.id ? updatedEntry : e));
        syncSingleEntry(updatedEntry);
      }
      
      inputElement.value = '';
    } catch (error) {
      console.error("Error replacing photo:", error);
      showToast("Failed to replace photo. ♡");
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const currentPhotos = currentEntry.photos || [];
    if (currentPhotos.length >= 3) {
      showToast('Maximum 3 photos allowed per entry. ♡');
      return;
    }

    const availableSlots = 3 - currentPhotos.length;
    const filesToProcess = Array.from(files).slice(0, availableSlots);
    const inputElement = e.target;
    
    try {
      // Process and compress each image
      const processedPhotos = await Promise.all(filesToProcess.map((file: File) => {
        return compressAndResizeImage(file);
      }));

      if (processedPhotos.length === 0) return;

      const entryId = existingEntry?.id || generateId();

      let finalPhotos: string[] = [];
      if (user && isSupabaseConfigured) {
        showToast('Uploading to cloud... ♡');
        const uploadedUrls = await Promise.all(processedPhotos.map(async (base64) => {
          const url = await uploadPhotoToSupabase(base64, entryId);
          return url || base64;
        }));
        finalPhotos = uploadedUrls.filter(p => p !== null) as string[];
      } else {
        finalPhotos = processedPhotos;
      }

      const nextPhotos = [...(currentEntry.photos || []), ...finalPhotos].slice(0, 3);

      setCurrentEntry(prev => ({
        ...prev,
        photos: nextPhotos
      }));

      if (existingEntry) {
        const updatedEntry = { ...existingEntry, photos: nextPhotos };
        setEntries(prevEntries => prevEntries.map(e => e.id === existingEntry.id ? updatedEntry : e));
        syncSingleEntry(updatedEntry);
      }

      inputElement.value = '';
    } catch (error) {
      console.error("Error processing photos:", error);
      showToast("Failed to process some photos. ♡");
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = (currentEntry.photos || []).filter((_, i) => i !== index);
    setCurrentEntry(prev => ({
      ...prev,
      photos: updatedPhotos
    }));

    if (existingEntry) {
      const updatedEntry = { ...existingEntry, photos: updatedPhotos };
      setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
      syncSingleEntry(updatedEntry);
    }
  };

  const handleGratitudeChange = (index: number, value: string) => {
    const newGratitude = [...(currentEntry.gratitude || ['', '', ''])];
    newGratitude[index] = value;
    setCurrentEntry(prev => ({ ...prev, gratitude: newGratitude }));
    
    // Auto-save
    if (existingEntry) {
      const updatedEntry = { ...existingEntry, gratitude: newGratitude };
      queueAutoSave(updatedEntry);
    }

    if (autoReflection && newGratitude.every(g => g.trim().length > 0) && !reflectionQuestion) {
      triggerReflection(newGratitude);
    }
  };

  const triggerReflection = async (gratitude: string[]) => {
    if (!currentMood) return;
    setIsGeneratingReflection(true);
    try {
      const q = await generateReflectionQuestion(gratitude, currentMood, reflectionQuestion || undefined);
      setReflectionQuestion(q);
      setShowReflection(true);
      
      if (existingEntry) {
        const updatedEntry = { ...existingEntry, reflectionQuestion: q };
        setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
        await syncSingleEntry(updatedEntry);
      }
      showToast('Reflection refreshed. ♡');
    } catch (error) {
      console.error("Failed to generate reflection:", error);
    } finally {
      setIsGeneratingReflection(false);
    }
  };

  const handleAffirmationChange = (index: number, value: string) => {
    const newAffirmations = [...(currentEntry.affirmations || ['', '', ''])];
    newAffirmations[index] = value;
    setCurrentEntry(prev => ({ ...prev, affirmations: newAffirmations }));

    // Auto-save
    if (existingEntry) {
      const updatedEntry = { ...existingEntry, affirmations: newAffirmations };
      queueAutoSave(updatedEntry);
    }
  };

  const handleReflectionAnswerChange = (val: string) => {
    setReflectionAnswer(val);
    if (existingEntry) {
      const updatedEntry = { ...existingEntry, reflectionAnswer: val };
      queueAutoSave(updatedEntry);
    }
  };

  const handleClearAllEntries = () => {
    setEntries([]);
  };

  const filteredEntries = entries.filter(e => 
    e.affirmations.some(a => a.toLowerCase().includes(searchQuery.toLowerCase())) ||
    e.gratitude.some(g => g.toLowerCase().includes(searchQuery.toLowerCase())) ||
    e.mantra.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const monthlyStats = useMemo(() => {
    return calculateMonthlyStats(entries, currentDate);
  }, [entries, currentDate]);

  const streak = useMemo(() => {
    return calculateStreak(entries);
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
            {!isSameDay(currentDate, new Date()) && view === 'today' && (
              <button 
                onClick={handleJumpToToday}
                className="flex items-center gap-1 text-journal-accent opacity-40 hover:opacity-100 transition-opacity animate-bounce-subtle"
                title="Back to Today"
              >
                <Sparkles size={16} />
                <span className="hidden lg:inline text-[9px] uppercase tracking-widest">Today</span>
              </button>
            )}
            <button 
              onClick={() => setView('calendar')}
              className={cn(
                "flex items-center gap-2 text-journal-accent transition-opacity",
                view === 'calendar' ? "opacity-100 font-bold" : "opacity-50"
              )}
            >
              <Calendar size={20} />
              <span className="hidden sm:inline">Calendar</span>
            </button>
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
                    <MoodCheckView
                      owner={notebookConfig.owner}
                      currentDate={currentDate}
                      handleMoodSelect={handleMoodSelect}
                      existingEntry={!!existingEntry}
                      setView={setView}
                    />
                  )}

                  {view === 'category-select' && (
                    <CategorySelectView
                      currentDate={currentDate}
                      handleCategorySelect={handleCategorySelect}
                      existingEntry={!!existingEntry}
                      setView={setView}
                    />
                  )}

                  {view === 'today' && (
                    <JournalEditorView
                      currentDate={currentDate}
                      currentEntry={currentEntry}
                      currentMood={currentMood}
                      currentCategory={currentCategory}
                      existingEntry={!!existingEntry}
                      isGeneratingAffirmations={isGeneratingAffirmations}
                      isGeneratingMantra={isGeneratingMantra}
                      isGeneratingReflection={isGeneratingReflection}
                      reflectionQuestion={reflectionQuestion}
                      reflectionAnswer={reflectionAnswer}
                      showReflection={showReflection}
                      setShowReflection={setShowReflection}
                      handleGratitudeChange={handleGratitudeChange}
                      handleAffirmationChange={handleAffirmationChange}
                      handleReflectionAnswerChange={handleReflectionAnswerChange}
                      handleRefreshAffirmations={handleRefreshAffirmations}
                      handleRefreshMantra={handleRefreshMantra}
                      handlePhotoUpload={handlePhotoUpload}
                      handlePhotoReplace={handlePhotoReplace}
                      handleRemovePhoto={handleRemovePhoto}
                      handleSave={handleSave}
                      setView={setView}
                      triggerReflection={triggerReflection}
                      themeClasses={themeClasses}
                    />
                  )}

                  {view === 'history' && (
                    <HistoryView
                      filteredEntries={filteredEntries}
                      searchQuery={searchQuery}
                      setSearchQuery={setSearchQuery}
                      setCurrentDate={setCurrentDate}
                      setView={setView}
                      monthlyStats={monthlyStats}
                      themeClasses={themeClasses}
                    />
                  )}

                  {view === 'calendar' && (
                    <CalendarView
                      entries={entries}
                      currentDate={currentDate}
                      setCurrentDate={setCurrentDate}
                      setView={setView}
                      calendarMonth={calendarMonth}
                      handlePrevMonth={handlePrevMonth}
                      handleNextMonth={handleNextMonth}
                      calendarDays={calendarDays}
                      monthlyStats={monthlyStats}
                      themeClasses={themeClasses}
                    />
                  )}

                  {view === 'settings' && (
                    <SettingsView
                      theme={theme}
                      setTheme={setTheme}
                      notebookConfig={notebookConfig}
                      setNotebookConfig={setNotebookConfig}
                      user={user}
                      isSyncing={isSyncing}
                      isSupabaseConfigured={isSupabaseConfigured}
                      authEmail={authEmail}
                      setAuthEmail={setAuthEmail}
                      authPassword={authPassword}
                      setAuthPassword={setAuthPassword}
                      authMode={authMode}
                      setAuthMode={setAuthMode}
                      handleLogin={handleLogin}
                      handleSignUp={handleSignUp}
                      handleResetPassword={handleResetPassword}
                      handleUpdatePassword={handleUpdatePassword}
                      handleLogout={handleLogout}
                      onClearAllEntries={handleClearAllEntries}
                      setView={setView}
                      showToast={showToast}
                      autoReflection={autoReflection}
                      setAutoReflection={setAutoReflection}
                    />
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
        <AnimatePresence>
          {toast.show && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-6 py-3 bg-journal-ink text-journal-paper rounded-full shadow-2xl flex items-center gap-3"
            >
              <Check size={16} className="text-emerald-400" />
              <span className="text-sm font-medium tracking-wide">{toast.message}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
