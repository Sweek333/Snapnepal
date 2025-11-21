import { createClient } from '@supabase/supabase-js';
import { PhotoData } from '../types';

const supabaseUrl = 'https://rbwlnnspktdijewmdivj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJid2xubnNwa3RkaWpld21kaXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2ODAyNjEsImV4cCI6MjA3OTI1NjI2MX0.VKJ_ZA8r56PhQhoTZ_b6TupIS_bCtlBsvxyblDJfBNs';

export const supabase = createClient(supabaseUrl, supabaseKey);

const LOCAL_BACKUP_KEY = 'retro_snap_backup_gallery';

// --- Local Storage Fallbacks ---
const getLocalBackup = (): PhotoData[] => {
  try {
    const stored = localStorage.getItem(LOCAL_BACKUP_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveLocalBackup = (photo: PhotoData) => {
  const current = getLocalBackup();
  // Avoid duplicates
  if (!current.find(p => p.id === photo.id)) {
    const updated = [photo, ...current];
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(updated));
  }
};

const deleteLocalBackup = (id: string) => {
    const current = getLocalBackup();
    const updated = current.filter(p => p.id !== id);
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(updated));
};

// Helper to convert base64 to Blob for upload
const base64ToBlob = (base64: string, mimeType: string = 'image/png') => {
  const byteString = atob(base64.includes(',') ? base64.split(',')[1] : base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
};

// Helper to merge Cloud and Local data (Union) to ensure persistence
const mergePhotos = (cloudPhotos: PhotoData[], localPhotos: PhotoData[]): PhotoData[] => {
    const photoMap = new Map<string, PhotoData>();
    
    // Add local photos first
    localPhotos.forEach(p => photoMap.set(p.id, p));
    
    // Add/Overwrite with cloud photos (Assuming cloud is authority, but we want to keep local if cloud misses them)
    cloudPhotos.forEach(p => photoMap.set(p.id, p));
    
    return Array.from(photoMap.values()).sort((a, b) => b.timestamp - a.timestamp);
};

// --- Public API ---

export const uploadPhotoToSupabase = async (base64Image: string, filename: string): Promise<string | null> => {
  try {
    const blob = base64ToBlob(base64Image);
    
    // Upload to 'retro-uploads' bucket
    const { error: uploadError } = await supabase.storage
      .from('retro-uploads') 
      .upload(`public/${filename}.png`, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (uploadError) {
      console.warn("Supabase Storage Upload failed (Bucket likely missing). Using Base64 fallback.");
      return base64Image;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('retro-uploads')
      .getPublicUrl(`public/${filename}.png`);

    return publicUrl;
  } catch (e) {
    console.warn("Storage exception, falling back to base64.", e);
    return base64Image;
  }
};

export const savePhotoToDB = async (photo: PhotoData): Promise<boolean> => {
  // ALWAYS save to local backup first to ensure it's never lost
  saveLocalBackup(photo);

  try {
    const { error } = await supabase
      .from('photos')
      .insert([
        {
          id: photo.id,
          image_url: photo.imageUrl, // Ensure your DB column is image_url
          caption: photo.caption,
          date: photo.date,
          rotation: photo.rotation,
          z_index: photo.zIndex,
          x: photo.x,
          y: photo.y,
          timestamp: photo.timestamp
        }
      ]);

    if (error) {
        console.error("Supabase DB Insert Failed (using local backup):", error.message);
        return false;
    }
    return true;
  } catch (e) {
    console.error("Unexpected error saving to DB:", e);
    return false;
  }
};

export const deletePhotoFromSupabase = async (id: string) => {
  deleteLocalBackup(id); // Delete locally immediately

  try {
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    // Attempt storage delete (fire and forget)
    supabase.storage
      .from('retro-uploads')
      .remove([`public/${id}.png`]).then(() => {});

  } catch (e) {
    console.warn("Error deleting from cloud", e);
  }
};

export const subscribeToPhotos = (onUpdate: (photos: PhotoData[]) => void) => {
  // 1. Immediately load local backup so user sees their photos
  const localPhotos = getLocalBackup();
  onUpdate(localPhotos.sort((a, b) => b.timestamp - a.timestamp));

  // 2. Fetch Cloud Data
  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(100);
    
    const currentLocal = getLocalBackup();

    if (error || !data) {
        console.warn("Supabase Fetch Failed or Empty. Keeping Local Backup.");
        return;
    }

    const cloudPhotos: PhotoData[] = data.map((row: any) => ({
      id: row.id,
      imageUrl: row.image_url,
      caption: row.caption,
      date: row.date,
      rotation: row.rotation,
      zIndex: row.z_index,
      x: row.x,
      y: row.y,
      timestamp: row.timestamp
    }));

    // Merge Cloud and Local
    const merged = mergePhotos(cloudPhotos, currentLocal);
    onUpdate(merged);
  };

  fetchPhotos();

  // 3. Subscribe to Realtime Changes
  const channel = supabase
    .channel('public:photos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, (payload) => {
       console.log('Realtime update received!', payload);
       fetchPhotos(); 
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};