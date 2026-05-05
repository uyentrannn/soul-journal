export type Mood = 'peaceful' | 'anxious' | 'grateful' | 'tired' | 'inspired' | 'sad' | 'content' | 'radiant';

export type AffirmationCategory = 'abundance' | 'growth' | 'habits' | 'healing' | 'confidence' | 'peace' | 'self-love' | 'connection';

export interface ThemeConfig {
  texture: 'cream' | 'white' | 'parchment' | 'linen';
  border: 'ornate' | 'minimal' | 'classic' | 'none';
  font: 'serif-display' | 'serif-body' | 'playfair';
  coverColor: string;
}

export interface NotebookConfig {
  title: string;
  year: number;
  owner: string;
}

export interface Entry {
  id: string;
  date: string; // ISO string
  mood: string;
  category?: AffirmationCategory;
  affirmations: string[];
  mantra: {
    text: string;
    author: string;
    context?: string;
  };
  gratitude: string[];
  reflectionQuestion?: string;
  reflectionAnswer?: string;
  photos?: string[];
}

export const AFFIRMATION_CATEGORIES: { type: AffirmationCategory; label: string; icon: string }[] = [
  { type: 'abundance', label: 'Manifest Abundance', icon: '💰' },
  { type: 'growth', label: 'Achieve Self-Growth', icon: '🌱' },
  { type: 'habits', label: 'Establish New Habits', icon: '🔄' },
  { type: 'healing', label: 'Healing & Recovery', icon: '🩹' },
  { type: 'confidence', label: 'Self-Confidence', icon: '👑' },
  { type: 'peace', label: 'Inner Peace', icon: '🌊' },
  { type: 'self-love', label: 'Cultivate Self-Love', icon: '💖' },
  { type: 'connection', label: 'Deepen Connections', icon: '🫂' },
];

export const MOODS: { type: Mood; emoji: string; label: string }[] = [
  { type: 'peaceful', emoji: '🕊️', label: 'Peaceful' },
  { type: 'grateful', emoji: '🙏', label: 'Grateful' },
  { type: 'inspired', emoji: '✨', label: 'Inspired' },
  { type: 'radiant', emoji: '☀️', label: 'Radiant' },
  { type: 'content', emoji: '😊', label: 'Content' },
  { type: 'anxious', emoji: '🌊', label: 'Anxious' },
  { type: 'sad', emoji: '☁️', label: 'Sad' },
  { type: 'tired', emoji: '🌙', label: 'Tired' },
];
