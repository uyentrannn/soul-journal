export type Mood = 'peaceful' | 'anxious' | 'grateful' | 'tired' | 'inspired' | 'sad' | 'content';

export type AffirmationCategory = 'abundance' | 'growth' | 'habits' | 'healing' | 'confidence' | 'peace';

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
}

export const AFFIRMATION_CATEGORIES: { type: AffirmationCategory; label: string; icon: string }[] = [
  { type: 'abundance', label: 'Manifest Abundance', icon: '💰' },
  { type: 'growth', label: 'Achieve Self-Growth', icon: '🌱' },
  { type: 'habits', label: 'Establish New Habits', icon: '🔄' },
  { type: 'healing', label: 'Healing & Recovery', icon: '🩹' },
  { type: 'confidence', label: 'Self-Confidence', icon: '👑' },
  { type: 'peace', label: 'Inner Peace', icon: '🌊' },
];

export const MOODS: { type: Mood; emoji: string; label: string }[] = [
  { type: 'peaceful', emoji: '🕊️', label: 'Peaceful' },
  { type: 'grateful', emoji: '🙏', label: 'Grateful' },
  { type: 'inspired', emoji: '✨', label: 'Inspired' },
  { type: 'content', emoji: '😊', label: 'Content' },
  { type: 'anxious', emoji: '🌊', label: 'Anxious' },
  { type: 'sad', emoji: '☁️', label: 'Sad' },
  { type: 'tired', emoji: '🌙', label: 'Tired' },
];

export const MANTRAS = [
  { text: "The happiness of your life depends upon the quality of your thoughts.", author: "Marcus Aurelius", context: "From Meditations. A reminder that our internal perspective shapes our external reality." },
  { text: "He who has a why to live for can bear almost any how.", author: "Viktor Frankl", context: "From Man's Search for Meaning. Finding purpose is the key to resilience." },
  { text: "Everything can be taken from a man but one thing: the last of the human freedoms—to choose one’s attitude in any given set of circumstances.", author: "Viktor Frankl" },
  { text: "We suffer more often in imagination than in reality.", author: "Seneca", context: "A core Stoic principle: most of our anxieties are about things that never happen." },
  { text: "It is not that we have a short time to live, but that we waste a lot of it.", author: "Seneca" },
  { text: "The wound is the place where the Light enters you.", author: "Rumi" },
  { text: "Your task is not to seek for love, but merely to seek and find all the barriers within yourself that you have built against it.", author: "Rumi" },
  { text: "I am not what happened to me, I am what I choose to become.", author: "Carl Jung" },
  { text: "The pivot year is the year you stop waiting for your life to start and start living the one you have.", author: "Brianna Wiest" },
  { text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius" },
  { text: "The soul becomes dyed with the color of its thoughts.", author: "Marcus Aurelius" },
  { text: "No man is free who is not master of himself.", author: "Epictetus" },
  { text: "Difficulties are things that show what men are.", author: "Epictetus" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "Silence is the language of God, all else is poor translation.", author: "Rumi" },
  { text: "Yesterday I was clever, so I wanted to change the world. Today I am wise, so I am changing myself.", author: "Rumi" },
  { text: "Everything that irritates us about others can lead us to an understanding of ourselves.", author: "Carl Jung" },
  { text: "Your visions will become clear only when you can look into your own heart. Who looks outside, dreams; who looks inside, awakes.", author: "Carl Jung" },
  { text: "The most important thing is to be able at any moment to sacrifice what we are for what we could become.", author: "Charles Du Bos" },
];
