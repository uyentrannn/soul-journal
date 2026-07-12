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
  Square,
  Camera,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from './lib/utils';
import { Entry, Mood, MOODS, AffirmationCategory, AFFIRMATION_CATEGORIES, ThemeConfig, NotebookConfig } from './types';
import { generateAffirmations, generateReflectionQuestion, generateMantraExplanation, generateDailyMantra } from './services/ai';
import { NotebookCover } from './components/NotebookCover';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import TextareaAutosize from 'react-textarea-autosize';

export default function App() {
  const [entries, setEntries] = useState<Entry[]>(() => {
    try {
      const saved = localStorage.getItem('soul_journal_entries');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Failed to load entries:", e);
      return [];
    }
  });
  
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
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [showReflection, setShowReflection] = useState(false);
  const [autoReflection, setAutoReflection] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: '' });
  const lastSyncedDateRef = useRef<string | null>(null);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => setToast({ show: false, message: '' }), 3000);
  };

  const safeSaveEntries = (entriesToSave: Entry[]) => {
    try {
      localStorage.setItem('soul_journal_entries', JSON.stringify(entriesToSave));
    } catch (error) {
      console.error("Failed to save entries to localStorage:", error);
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        let prunedEntries = [...entriesToSave];
        
        // Find indices of entries containing local base64 photos, sorted oldest to newest
        const itemsWithBase64 = prunedEntries
          .map((entry, index) => ({ entry, index }))
          .filter(item => item.entry.photos && item.entry.photos.some(p => p.startsWith('data:image')))
          .sort((a, b) => new Date(a.entry.date).getTime() - new Date(b.entry.date).getTime());

        let success = false;
        
        // Iteratively prune older photos until the payload fits
        for (const item of itemsWithBase64) {
          prunedEntries[item.index] = {
            ...prunedEntries[item.index],
            photos: [] // strip local photos to save space
          };
          
          try {
            localStorage.setItem('soul_journal_entries', JSON.stringify(prunedEntries));
            success = true;
            console.log(`Pruned old photos from entry ${item.entry.id} to fit under localStorage quota.`);
            break;
          } catch (retryError) {
            // Still exceeding, continue
          }
        }

        // If simple single-by-single pruning didn't succeed, do a bulk prune of all base64 photos
        if (!success) {
          prunedEntries = prunedEntries.map(e => {
            if (e.photos && e.photos.some(p => p.startsWith('data:image'))) {
              return { ...e, photos: [] };
            }
            return e;
          });
          try {
            localStorage.setItem('soul_journal_entries', JSON.stringify(prunedEntries));
            success = true;
            console.log("Bulk pruned all base64 photos to resolve localStorage quota.");
          } catch (bulkError) {
            // Still failing
          }
        }

        // Final fallback: slice to newest 100 entries
        if (!success) {
          try {
            const trimmed = prunedEntries.slice(0, 100);
            localStorage.setItem('soul_journal_entries', JSON.stringify(trimmed));
            success = true;
            console.log("Trimmed entries to newest 100 to fit under localStorage quota.");
          } catch (finalError) {
            console.error("Critical: Could not save even trimmed entries to localStorage:", finalError);
          }
        }

        if (success) {
          if (isSupabaseConfigured) {
            showToast("Local storage full. Older local photos pruned to save space. Log in/Sync to use unlimited cloud storage! ♡");
          } else {
            showToast("Local storage limit reached. Older photos removed to free up space. ♡");
          }
        } else {
          showToast("Storage full. Please delete some entries to save more. ♡");
        }
      }
    }
  };

  useEffect(() => {
    safeSaveEntries(entries);
  }, [entries]);

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

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    }).catch(err => {
      console.error("Supabase session error:", err);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'PASSWORD_RECOVERY') {
        setAuthMode('reset');
        setView('settings');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && isSupabaseConfigured) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    if (!isSupabaseConfigured) return;
    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      if (data) {
        setEntries(data);
        safeSaveEntries(data);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      if (error instanceof Error && error.message.includes('Failed to fetch')) {
        showToast('Network error: Could not connect to cloud. ♡');
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogin = async () => {
    if (!isSupabaseConfigured) {
      showToast('Cloud sync is not configured yet. ♡');
      return;
    }
    if (!authEmail || !authPassword) {
      showToast('Please enter email and password. ♡');
      return;
    }
    setIsSyncing(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) throw error;
      showToast('Welcome back! ♡');
    } catch (error: any) {
      showToast(error.message + ' ♡');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignUp = async () => {
    if (!isSupabaseConfigured) {
      showToast('Cloud sync is not configured yet. ♡');
      return;
    }
    if (!authEmail || !authPassword) {
      showToast('Please enter email and password. ♡');
      return;
    }
    setIsSyncing(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
      });
      if (error) throw error;
      showToast('Check your email for confirmation! ♡');
    } catch (error: any) {
      showToast(error.message + ' ♡');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    if (!isSupabaseConfigured) return;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setEntries([]);
      localStorage.removeItem('soul_journal_entries');
      showToast('Logged out. ♡');
    } catch (error) {
      showToast('Logout failed. ♡');
    }
  };

  const handleResetPassword = async () => {
    if (!isSupabaseConfigured) {
      showToast('Cloud sync is not configured yet. ♡');
      return;
    }
    if (!authEmail) {
      showToast('Please enter your email. ♡');
      return;
    }
    setIsSyncing(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(authEmail, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      showToast('Password reset email sent! ♡');
      setAuthMode('login');
    } catch (error: any) {
      showToast(error.message + ' ♡');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!isSupabaseConfigured) return;
    if (!authPassword) {
      showToast('Please enter a new password. ♡');
      return;
    }
    setIsSyncing(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: authPassword
      });
      if (error) throw error;
      showToast('Password updated successfully! ♡');
      setAuthMode('login');
      setAuthPassword('');
    } catch (error: any) {
      showToast(error.message + ' ♡');
    } finally {
      setIsSyncing(false);
    }
  };

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

  useEffect(() => {
    const syncEntry = async () => {
      const currentDateStr = format(currentDate, 'yyyy-MM-dd');
      
      // Only sync if the date has changed
      if (lastSyncedDateRef.current === currentDateStr) return;
      
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
          syncSingleEntry(updatedEntry);
          setIsGenerating(false);
        }
        
        lastSyncedDateRef.current = currentDateStr;
      } else {
        // Reset for new day
        setIsGenerating(true);
        const dailyMantra = await generateDailyMantra();
        setCurrentEntry({
          affirmations: ['', '', ''],
          gratitude: ['', '', ''],
          mantra: dailyMantra,
          photos: []
        });
        setCurrentMood(null);
        setCurrentCategory(null);
        setReflectionQuestion(null);
        setReflectionAnswer('');
        setShowReflection(false);
        setIsGenerating(false);
        
        lastSyncedDateRef.current = currentDateStr;
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
      const suggested = await generateAffirmations(category, currentAffs);
      
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
          mantra: currentEntry.mantra as any,
          gratitude: currentEntry.gratitude as string[],
          reflectionQuestion: reflectionQuestion || undefined,
          reflectionAnswer: reflectionAnswer || '',
          photos: []
        };

        setEntries(prev => [newEntry, ...prev]);
        setCurrentEntry(newEntry);
      }
    } catch (error) {
      console.error("Failed to generate affirmations:", error);
      showToast('Failed to refresh affirmations. ♡');
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
        const { error } = await supabase
          .from('entries')
          .upsert({
            ...newEntry,
            user_id: user.id
          });
        
        if (error) throw error;
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
        const { error } = await supabase
          .from('entries')
          .upsert({
            ...entry,
            user_id: user.id
          });
        if (error) throw error;
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
      // Convert base64 to blob
      const res = await fetch(base64);
      const blob = await res.blob();
      
      const fileName = `${user.id}/${entryId}/${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('photos')
        .upload(fileName, blob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('photos')
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const compressAndResizeImage = (file: File, maxWidth = 500, maxHeight = 500, quality = 0.4): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Using highly optimized quality (0.4) and resolution (500 max) to save ~90% local storage
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.onerror = () => reject(new Error('Image failed to load'));
        img.src = reader.result as string;
      };
      reader.onerror = () => reject(new Error('File failed to read'));
      reader.readAsDataURL(file);
    });
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

      setCurrentEntry(prev => {
        const nextPhotos = [...(prev.photos || [])];
        nextPhotos[index] = finalPhotoPath;
        
        if (existingEntry) {
          const updatedEntry = { ...existingEntry, photos: nextPhotos };
          setEntries(prevEntries => prevEntries.map(e => e.id === existingEntry.id ? updatedEntry : e));
          syncSingleEntry(updatedEntry);
        }
        
        return { ...prev, photos: nextPhotos };
      });
      
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

      setCurrentEntry(prev => {
        const nextPhotos = [...(prev.photos || []), ...finalPhotos].slice(0, 3);
        
        if (existingEntry) {
          const updatedEntry = { ...existingEntry, photos: nextPhotos };
          setEntries(prevEntries => prevEntries.map(e => e.id === existingEntry.id ? updatedEntry : e));
          syncSingleEntry(updatedEntry);
        }
        
        return {
          ...prev,
          photos: nextPhotos
        };
      });

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
      setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
      syncSingleEntry(updatedEntry);
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
      setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
      syncSingleEntry(updatedEntry);
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

                      {existingEntry && (
                        <button 
                          onClick={() => setView('today')}
                          className="mt-8 text-xs uppercase tracking-widest opacity-40 hover:opacity-100"
                        >
                          ✕ Cancel changes
                        </button>
                      )}
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
                      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button 
                          onClick={() => setView('mood-check')}
                          className="text-xs uppercase tracking-widest opacity-40 hover:opacity-100"
                        >
                          ← Back to mood
                        </button>
                        {existingEntry && (
                          <button 
                            onClick={() => setView('today')}
                            className="text-xs uppercase tracking-widest opacity-40 hover:opacity-100"
                          >
                            ✕ Cancel changes
                          </button>
                        )}
                      </div>
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
                              className="px-4 py-2 bg-journal-accent/10 hover:bg-journal-accent/20 rounded-full text-[10px] uppercase tracking-widest font-bold transition-colors"
                            >
                              Add Mood & Category
                            </button>
                          ) : (
                            <>
                              {currentMood && (
                                <button 
                                  onClick={() => setView('mood-check')}
                                  className="flex flex-col items-end group hover:bg-journal-accent/5 p-2 -m-2 rounded-xl transition-colors"
                                  title="Change mood"
                                >
                                  <span className="text-2xl group-hover:scale-110 transition-transform">{MOODS.find(m => m.type === currentMood)?.emoji}</span>
                                  <span className="text-[10px] uppercase tracking-widest opacity-40 group-hover:opacity-100">{currentMood}</span>
                                </button>
                              )}
                              {currentCategory && (
                                <button 
                                  onClick={() => setView('category-select')}
                                  className="flex items-center gap-1 px-2 py-1 bg-journal-accent/5 hover:bg-journal-accent/10 rounded-full transition-colors group"
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

                      {/* Affirmations */}
                      <section className="mb-12">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-serif-display text-xl italic flex items-center gap-2">
                            <Sparkles size={16} className="text-journal-accent" />
                            Affirmations
                          </h3>
                          <button 
                            onClick={handleRefreshAffirmations}
                            disabled={isGeneratingAffirmations}
                            className="p-3 -m-2 hover:bg-journal-accent/5 rounded-full transition-colors disabled:opacity-30"
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
                      <section className="mb-12 p-6 bg-journal-accent/5 rounded-2xl relative overflow-hidden min-h-[150px]">
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
                            className="p-3 -m-2 hover:bg-journal-accent/5 rounded-full transition-colors disabled:opacity-30"
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
                      <section className="mb-12">
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
                      <section className="mb-12">
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
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, scale: 0.9, rotate: i % 2 === 0 ? -2 : 2 }}
                                animate={{ opacity: 1, scale: 1, rotate: i % 2 === 0 ? -2 : 2 }}
                                whileHover={{ scale: 1.05, rotate: 0, zIndex: 10 }}
                                className="bg-white p-3 pb-10 shadow-xl border border-black/5 relative group"
                                style={{ width: '160px' }}
                              >
                                <div className="aspect-square overflow-hidden bg-gray-100">
                                  <img 
                                    src={photo} 
                                    alt={`Moment ${i + 1}`} 
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                  />
                                </div>
                                <div className="absolute top-1 right-1 flex gap-1 transition-opacity">
                                  <label className="bg-black/50 text-white p-1.5 rounded-full cursor-pointer hover:bg-black/70 transition-colors">
                                    <RefreshCw size={12} />
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      className="hidden" 
                                      onChange={(e) => handlePhotoReplace(i, e)}
                                    />
                                  </label>
                                  <button
                                    onClick={() => handleRemovePhoto(i)}
                                    className="bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                                <div className="absolute bottom-2 left-0 right-0 text-center">
                                  <span className="font-serif-display text-[10px] opacity-30 italic">
                                    {format(currentDate, 'MMM d, yyyy')}
                                  </span>
                                </div>
                              </motion.div>
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
                      <section className="mb-6 relative min-h-[120px]">
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
                            className="p-3 -m-2 hover:bg-journal-accent/5 rounded-full transition-colors"
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
                            className="w-full py-4 border-2 border-dashed border-journal-accent/10 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-journal-accent/5 transition-colors"
                          >
                            <Sparkles size={24} className="opacity-20" />
                            <span className="text-[10px] uppercase tracking-widest opacity-40">Ask for a reflection?</span>
                          </button>
                        ) : (
                          <div className="p-4 border border-journal-accent/10 rounded-2xl italic text-center relative">
                            <button 
                              onClick={() => setShowReflection(false)}
                              className="absolute top-2 right-2 p-1 opacity-60 hover:opacity-100 transition-opacity"
                            >
                              <X size={14} />
                            </button>
                            <p className="text-journal-accent/70 mb-2 text-sm">"{reflectionQuestion}"</p>
                            <TextareaAutosize 
                              className="w-full bg-transparent border-none focus:outline-none text-center resize-none"
                              placeholder="Write your heart here..."
                              minRows={3}
                              value={reflectionAnswer}
                              onChange={(e) => {
                                const val = e.target.value;
                                setReflectionAnswer(val);
                                // Auto-save reflection
                                if (existingEntry) {
                                  const updatedEntry = { ...existingEntry, reflectionAnswer: val };
                                  setEntries(prev => prev.map(e => e.id === existingEntry.id ? updatedEntry : e));
                                  syncSingleEntry(updatedEntry);
                                }
                              }}
                            />
                          </div>
                        )}
                      </section>

                      {/* Page Number & Footer Actions */}
                      <div className="mt-auto pt-4 pb-4 flex flex-col items-center gap-4">
                        <button 
                          onClick={handleSave}
                          className="bg-journal-accent text-journal-paper px-8 py-3 rounded-full flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-journal-accent/20"
                        >
                          <Save size={18} />
                          <span>Save Entry</span>
                        </button>

                        <div className="text-[10px] uppercase tracking-widest opacity-20 font-serif-display">
                          Page {getDayOfYear(currentDate)}
                        </div>
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
                      <div className="mt-auto pt-4 pb-4 flex justify-center">
                        <div className="text-[10px] uppercase tracking-widest opacity-20 font-serif-display">
                          Index
                        </div>
                      </div>
                    </div>
                  )}

                  {view === 'calendar' && (
                    <div className={cn(themeClasses, "relative overflow-hidden")}>
                      <div className="notebook-inner-shadow absolute inset-y-0 left-0 w-8 pointer-events-none" />
                      <div className="page-curl" />
                      
                      {/* Decorative Corners */}
                      <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-journal-accent/20 rounded-tl-sm pointer-events-none" />
                      <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-journal-accent/20 rounded-tr-sm pointer-events-none" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-journal-accent/20 rounded-bl-sm pointer-events-none" />
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-journal-accent/20 rounded-br-sm pointer-events-none" />

                      <div className="flex justify-between items-center mb-8">
                        <h2 className="font-serif-display text-3xl italic">Soul Calendar</h2>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={handlePrevMonth}
                            className="p-2 hover:bg-journal-accent/5 rounded-full transition-colors"
                          >
                            <ChevronLeft size={20} />
                          </button>
                          <span className="font-serif-display text-xl italic min-w-[140px] text-center">
                            {format(calendarMonth, 'MMMM yyyy')}
                          </span>
                          <button 
                            onClick={handleNextMonth}
                            className="p-2 hover:bg-journal-accent/5 rounded-full transition-colors"
                          >
                            <ChevronRight size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-px bg-journal-accent/10 border border-journal-accent/10 rounded-2xl overflow-hidden mb-8">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                          <div key={day} className="bg-journal-accent/5 py-4 text-center text-[10px] uppercase tracking-widest font-bold opacity-40">
                            {day}
                          </div>
                        ))}
                        {calendarDays.map((day, idx) => {
                          const entryForDay = entries.find(e => isSameDay(new Date(e.date), day));
                          const isCurrentMonth = isSameMonth(day, calendarMonth);
                          const isSelected = isSameDay(day, currentDate);
                          const isTodayDay = isToday(day);

                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                setCurrentDate(day);
                                setView('today');
                              }}
                              className={cn(
                                "aspect-square p-2 flex flex-col items-center justify-between transition-all hover:z-10 relative group",
                                isCurrentMonth ? "bg-journal-paper" : "bg-journal-accent/[0.02] text-journal-accent/20",
                                isSelected && "ring-2 ring-journal-accent/40 z-10",
                                !isCurrentMonth && "pointer-events-none"
                              )}
                            >
                              <span className={cn(
                                "text-[10px] font-serif-display",
                                isTodayDay && "bg-journal-accent text-journal-paper w-5 h-5 flex items-center justify-center rounded-full"
                              )}>
                                {format(day, 'd')}
                              </span>
                              
                              {entryForDay && (
                                <motion.div 
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="flex flex-col items-center gap-0.5"
                                >
                                  <span className="text-sm sm:text-lg transform group-hover:scale-125 transition-transform">
                                    {MOODS.find(m => m.type === entryForDay.mood)?.emoji}
                                  </span>
                                  <div className="w-1 h-1 bg-journal-accent rounded-full opacity-40" />
                                </motion.div>
                              )}

                              {isCurrentMonth && !entryForDay && (
                                <Plus size={8} className="opacity-0 group-hover:opacity-20 transition-opacity" />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="mt-8 flex flex-wrap gap-4 justify-center">
                        {MOODS.map(m => {
                          const count = entries.filter(e => e.mood === m.type && isSameMonth(new Date(e.date), calendarMonth)).length;
                          if (count === 0) return null;
                          return (
                            <div key={m.type} className="flex items-center gap-2 bg-journal-accent/5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest opacity-60">
                              <span>{m.emoji}</span>
                              <span>{m.label}</span>
                              <span className="font-bold opacity-40">({count})</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Page Number */}
                      <div className="mt-auto pt-4 pb-4 flex justify-center">
                        <div className="text-[10px] uppercase tracking-widest opacity-20 font-serif-display">
                          Calendar
                        </div>
                      </div>
                    </div>
                  )}

                  {view === 'settings' && (
                    <div className={cn("journal-page border-ornate texture-cream p-8 sm:p-12 rounded-lg min-h-[80vh] flex flex-col page-shadow relative overflow-hidden")}>
                      <div className="notebook-inner-shadow absolute inset-y-0 left-0 w-8 pointer-events-none" />
                      <div className="page-curl" />

                      {/* Decorative Corners */}
                      <div className="absolute top-4 left-4 w-8 h-8 border-t border-l border-journal-accent/20 rounded-tl-sm pointer-events-none" />
                      <div className="absolute top-4 right-4 w-8 h-8 border-t border-r border-journal-accent/20 rounded-tr-sm pointer-events-none" />
                      <div className="absolute bottom-4 left-4 w-8 h-8 border-b border-l border-journal-accent/20 rounded-bl-sm pointer-events-none" />
                      <div className="absolute bottom-4 right-4 w-8 h-8 border-b border-r border-journal-accent/20 rounded-br-sm pointer-events-none" />

                      <h2 className="font-serif-display text-3xl mb-8 italic text-center">Journal Settings</h2>
                      
                      <div className="space-y-10">
                        {/* Cloud Sync */}
                        <section>
                          <h3 className="text-xs uppercase tracking-widest font-bold opacity-40 mb-4 flex items-center gap-2">
                            <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                            Cloud Sync (Supabase)
                          </h3>
                          <div className="p-4 bg-journal-accent/5 rounded-xl space-y-4">
                            {!isSupabaseConfigured ? (
                              <div className="text-center py-4">
                                <p className="text-xs text-red-500/60 italic mb-2">Supabase is not configured.</p>
                                <p className="text-[10px] opacity-50 leading-relaxed">
                                  Please add <code className="bg-journal-accent/10 px-1 rounded">VITE_SUPABASE_URL</code> and <code className="bg-journal-accent/10 px-1 rounded">VITE_SUPABASE_ANON_KEY</code> to the <strong>Settings &gt; Secrets</strong> menu in AI Studio.
                                </p>
                              </div>
                            ) : user ? (
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="text-sm font-medium">Connected as</p>
                                  <p className="text-[10px] opacity-50">{user.email}</p>
                                </div>
                                <button 
                                  onClick={handleLogout}
                                  className="px-4 py-2 bg-journal-accent/10 hover:bg-journal-accent/20 rounded-lg text-xs uppercase tracking-widest transition-colors"
                                >
                                  Logout
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                <p className="text-xs opacity-60 italic text-center">Connect to Supabase to sync your journal across devices.</p>
                                
                                <div className="space-y-3">
                                  <input 
                                    type="email"
                                    placeholder="Email Address"
                                    value={authEmail}
                                    onChange={(e) => setAuthEmail(e.target.value)}
                                    className="w-full bg-journal-accent/5 border-none rounded-lg p-3 text-sm focus:outline-none"
                                  />
                                  <input 
                                    type="password"
                                    placeholder="Password"
                                    value={authPassword}
                                    onChange={(e) => setAuthPassword(e.target.value)}
                                    className="w-full bg-journal-accent/5 border-none rounded-lg p-3 text-sm focus:outline-none"
                                  />
                                </div>

                                <div className="flex flex-col gap-2">
                                  {authMode === 'login' ? (
                                    <>
                                      <button 
                                        onClick={handleLogin}
                                        disabled={isSyncing}
                                        className="w-full py-3 bg-journal-accent text-white rounded-xl text-xs uppercase tracking-widest font-bold hover:scale-[1.02] transition-transform disabled:opacity-50"
                                      >
                                        {isSyncing ? 'Logging in...' : 'Login'}
                                      </button>
                                      <div className="flex justify-between px-1">
                                        <button 
                                          onClick={() => setAuthMode('signup')}
                                          className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                                        >
                                          Sign Up
                                        </button>
                                        <button 
                                          onClick={() => setAuthMode('reset')}
                                          className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                                        >
                                          Forgot Password?
                                        </button>
                                      </div>
                                    </>
                                  ) : authMode === 'signup' ? (
                                    <>
                                      <button 
                                        onClick={handleSignUp}
                                        disabled={isSyncing}
                                        className="w-full py-3 bg-journal-accent text-white rounded-xl text-xs uppercase tracking-widest font-bold hover:scale-[1.02] transition-transform disabled:opacity-50"
                                      >
                                        {isSyncing ? 'Creating Account...' : 'Sign Up'}
                                      </button>
                                      <button 
                                        onClick={() => setAuthMode('login')}
                                        className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                                      >
                                        Already have an account? Login
                                      </button>
                                    </>
                                  ) : (
                                    <>
                                      <button 
                                        onClick={user ? handleUpdatePassword : handleResetPassword}
                                        disabled={isSyncing}
                                        className="w-full py-3 bg-journal-accent text-white rounded-xl text-xs uppercase tracking-widest font-bold hover:scale-[1.02] transition-transform disabled:opacity-50"
                                      >
                                        {isSyncing ? 'Processing...' : (user ? 'Update Password' : 'Send Reset Link')}
                                      </button>
                                      <button 
                                        onClick={() => setAuthMode('login')}
                                        className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
                                      >
                                        Back to Login
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </section>

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
                                  showToast(`New notebook for ${year} created! ♡`);
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
                      
                      {/* Page Number & Done Button */}
                      <div className="mt-auto pt-4 pb-4 flex flex-col items-center gap-4">
                        <button 
                          onClick={() => setView('today')}
                          className="w-full py-3 bg-journal-accent text-journal-paper rounded-full text-sm font-medium shadow-lg shadow-journal-accent/20 transition-transform hover:scale-[1.02]"
                        >
                          Done
                        </button>

                        <div className="text-[10px] uppercase tracking-widest opacity-20 font-serif-display">
                          Preferences
                        </div>
                      </div>
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
