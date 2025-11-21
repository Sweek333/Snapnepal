import { createClient } from '@supabase/supabase-js';
import { PhotoData } from '../types';

const supabaseUrl = 'https://rbwlnnspktdijewmdivj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJid2xubnNwa3RkaWpld21kaXZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM2ODAyNjEsImV4cCI6MjA3OTI1NjI2MX0.VKJ_ZA8r56PhQhoTZ_b6TupIS_bCtlBsvxyblDJfBNs';

export const supabase = createClient(supabaseUrl, supabaseKey);

const LOCAL_BACKUP_KEY = 'retro_snap_backup_gallery';

// Helper to get local backup
const getLocalBackup = (): PhotoData[] => {
  try {
    const stored = localStorage.getItem(LOCAL_BACKUP_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper to save to local backup
const saveLocalBackup = (photo: PhotoData) => {
  const current = getLocalBackup();
  const updated = [photo, ...current];
  localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(updated));
};

const deleteLocalBackup = (id: string) => {
    const current = getLocalBackup();
    const updated = current.filter(p => p.id !== id);
    localStorage.setItem(LOCAL_BACKUP_KEY, JSON.stringify(updated));
};

// Helper to convert base64 to Blob for upload
const base64ToBlob = (base64: string, mimeType: string = 'image/png') => {
  // Handle data URI prefix if present
  const byteString = atob(base64.includes(',') ? base64.split(',')[1] : base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
};

export const uploadPhotoToSupabase = async (base64Image: string, filename: string): Promise<string | null> => {
  try {
    const blob = base64ToBlob(base64Image);
    
    // Try to upload to 'retro-uploads' bucket
    const { data, error } = await supabase.storage
      .from('retro-uploads') 
      .upload(`public/${filename}.png`, blob, {
        contentType: 'image/png',
        upsert: true
      });

    if (error) {
      console.warn("Supabase Storage Upload failed (Bucket likely missing). Using Base64 fallback.");
      // FALLBACK: Return the base64 string directly. 
      return base64Image;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('retro-uploads')
      .getPublicUrl(`public/${filename}.png`);

    return publicUrl;
  } catch (e) {
    console.warn("Storage exception, falling back to base64:", e);
    return base64Image;
  }
};

export const savePhotoToDB = async (photo: PhotoData): Promise<boolean> => {
  try {
    // Mapping camelCase to snake_case for DB
    const { error } = await supabase
      .from('photos')
      .insert([
        {
          id: photo.id,
          image_url: photo.imageUrl,
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
        // Error 42P01 means table doesn't exist
        console.warn("Supabase DB Insert Failed (likely missing table 'photos'). Saving to LocalStorage instead.", error.message);
        saveLocalBackup(photo);
        return false; // return false to indicate cloud failure
    }
    return true;
  } catch (e) {
    console.error("Unexpected error saving to DB:", e);
    saveLocalBackup(photo);
    return false;
  }
};

export const deletePhotoFromSupabase = async (id: string) => {
  try {
    // 1. Try Delete from DB
    const { error: dbError } = await supabase
      .from('photos')
      .delete()
      .eq('id', id);

    if (dbError) {
        console.warn("Supabase DB Delete failed, trying local backup deletion.");
        deleteLocalBackup(id);
    }

    // 2. Delete from Storage (fire and forget)
    try {
      await supabase.storage
        .from('retro-uploads')
        .remove([`public/${id}.png`]);
    } catch (e) {}

  } catch (e) {
    deleteLocalBackup(id);
  }
};

export const subscribeToPhotos = (onUpdate: (photos: PhotoData[]) => void) => {
  let usedFallback = false;

  // Fetch initial data
  const fetchPhotos = async () => {
    const { data, error } = await supabase
      .from('photos')
      .select('*')
      .order('timestamp', { ascending: false });
    
    if (error) {
        console.warn("Supabase Fetch Failed (likely missing table). Loading Local Backup.");
        usedFallback = true;
        const localPhotos = getLocalBackup();
        onUpdate(localPhotos);
        return;
    }

    if (data) {
      // Map snake_case back to camelCase
      const mappedPhotos: PhotoData[] = data.map((row: any) => ({
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
      onUpdate(mappedPhotos);
    }
  };

  fetchPhotos();

  // Realtime subscription
  const channel = supabase
    .channel('public:photos')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'photos' }, () => {
      if (!usedFallback) {
        fetchPhotos(); // Refresh list on any change
      }
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};