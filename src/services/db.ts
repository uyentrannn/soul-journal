import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Entry } from '../types';

export async function fetchEntriesFromCloud(): Promise<Entry[]> {
  if (!isSupabaseConfigured) return [];
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('date', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function upsertEntryToCloud(entry: Entry, userId: string): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase
    .from('entries')
    .upsert({
      ...entry,
      user_id: userId
    });

  if (error) throw error;
}

export async function uploadEntryPhoto(base64: string, userId: string, entryId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  
  const res = await fetch(base64);
  const blob = await res.blob();
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const fileName = `${userId}/${entryId}/${Date.now()}_${randomSuffix}.jpg`;

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
}
